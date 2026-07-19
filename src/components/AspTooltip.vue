<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

// AspTooltip — the standardized hover/focus tooltip (#2383). Promotes the
// long-deferred `AsTooltip` backlog entry in docs/COMPONENTS.md §backlog.
//
// The visual target is the system_3 health page's `[data-tip]::after` treatment
// (frontend/static/system3.css:1004), which the operator asked to standardize
// app-wide: a small dark chip with a hairline border, tight 12px text, a soft
// drop shadow and a short opacity fade. Everything here is that treatment
// re-expressed in DS tokens.
//
// Teleported to <body> for the same reason AspModal is: the call sites are
// icons inside cards, table cells and chart canvases, and any ancestor with
// `overflow: hidden`, `transform` or `filter` would clip the chip or reparent
// its containing block. That is also why the position is computed in JS against
// `getBoundingClientRect()` rather than written as CSS offsets — once the node
// lives on <body>, no CSS rule can see where the trigger is.
//
// The `::after` original cannot do any of this: a pseudo-element is trapped in
// its trigger's stacking and overflow context and has no way to flip when it
// would leave the viewport. Those two are the defects this component exists to
// fix; the styling is carried over unchanged.
//
// Contrast role: PAINTS (system_3_design_conventions.md §3.18). The chip
// declares --surface-card, which is DARK in BOTH themes, so it must also
// declare the ink that pairs with it (--text-on-dark) instead of inheriting the
// ambient one. Inheriting is the #2415 failure: dark ink on a dark chip, 1:1.

// Two root nodes (the anchor and the teleported chip), so a fallthrough `id` or
// `class` has no single element to land on and Vue would drop it with a warning.
// Route them at the anchor, which is the part that lives at the call site.
defineOptions({ inheritAttrs: false })

const props = defineProps({
  /** Tooltip text. Ignored when the `content` slot is used. */
  content: { type: String, default: '' },
  /** Preferred side. Flips to the opposite side when it would leave the viewport. */
  position: {
    type: String,
    default: 'top',
    validator: (v) => ['top', 'right', 'bottom', 'left'].includes(v),
  },
  /**
   * Hover open delay, ms. Stops a chip firing under every icon the pointer
   * crosses on its way somewhere else. Keyboard focus ignores it — a deliberate
   * Tab is not an accidental traverse, so making it wait reads as broken.
   */
  openDelay: { type: Number, default: 120 },
  /** Suppress the tooltip without unwrapping the trigger at the call site. */
  disabled: { type: Boolean, default: false },
})

const slots = defineSlots()

const uid = `asp-tooltip-${Math.random().toString(36).slice(2, 9)}`

const anchor = ref(null)
const chip = ref(null)
const visible = ref(false)
// Held back until the first measurement lands — see `place()`.
const placed = ref(false)
const side = ref(props.position)
const coords = ref({ left: 0, top: 0 })

let openTimer = null

const hasContent = computed(() => Boolean(props.content))

// --- placement --------------------------------------------------------------

// Gap between trigger and chip, and the minimum breathing room kept against the
// viewport edge. Both in px because they feed arithmetic, not a stylesheet.
const GAP = 6
const EDGE = 8

const OPPOSITE = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }

const offsetFor = (want, a, w, h) => {
  if (want === 'top') return { left: a.left + a.width / 2 - w / 2, top: a.top - h - GAP }
  if (want === 'bottom') return { left: a.left + a.width / 2 - w / 2, top: a.bottom + GAP }
  if (want === 'left') return { left: a.left - w - GAP, top: a.top + a.height / 2 - h / 2 }
  return { left: a.right + GAP, top: a.top + a.height / 2 - h / 2 }
}

const fits = (want, a, w, h, vw, vh) => {
  if (want === 'top') return a.top - h - GAP >= EDGE
  if (want === 'bottom') return a.bottom + h + GAP <= vh - EDGE
  if (want === 'left') return a.left - w - GAP >= EDGE
  return a.right + w + GAP <= vw - EDGE
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

/**
 * Measure the chip where it already stands and move it to the right place.
 *
 * The chip is rendered first and positioned second because its size depends on
 * its content and the viewport-relative wrap — there is nothing to measure
 * until it is in the DOM. `placed` keeps it invisible for that one frame so the
 * un-positioned first paint never reaches the screen as a flash at 0,0.
 */
const place = () => {
  const a = anchor.value?.getBoundingClientRect()
  const c = chip.value?.getBoundingClientRect()
  if (!a || !c) return

  const vw = document.documentElement.clientWidth
  const vh = document.documentElement.clientHeight
  const { width: w, height: h } = c

  // Flip only if the opposite side is genuinely better. Flipping into a side
  // that also does not fit just moves the clipping somewhere less expected.
  let want = props.position
  if (!fits(want, a, w, h, vw, vh) && fits(OPPOSITE[want], a, w, h, vw, vh)) {
    want = OPPOSITE[want]
  }
  side.value = want

  // Then slide along the cross axis to stay on screen. A chip on a trigger near
  // the right edge is still readable shifted left; one running off the edge is
  // not, and this is the case the pseudo-element original could not handle.
  const { left, top } = offsetFor(want, a, w, h)
  coords.value = {
    left: clamp(left, EDGE, Math.max(EDGE, vw - w - EDGE)),
    top: clamp(top, EDGE, Math.max(EDGE, vh - h - EDGE)),
  }
  placed.value = true
}

// --- open/close -------------------------------------------------------------

const clearTimer = () => {
  if (openTimer !== null) {
    clearTimeout(openTimer)
    openTimer = null
  }
}

const show = ({ immediate = false } = {}) => {
  if (props.disabled || (!hasContent.value && !slotHasContent())) return
  clearTimer()
  if (visible.value) return
  if (immediate || props.openDelay <= 0) {
    visible.value = true
    return
  }
  openTimer = setTimeout(() => {
    openTimer = null
    visible.value = true
  }, props.openDelay)
}

// Closing is always immediate. A close delay would leave the chip hanging over
// whatever the pointer moved on to, and the chip is `pointer-events: none`, so
// there is no hover-the-tooltip case to keep it alive for.
const hide = () => {
  clearTimer()
  visible.value = false
  placed.value = false
}

const slotHasContent = () => Boolean(slots.content)

const onKeydown = (event) => {
  // Esc dismisses a focus-triggered tooltip without moving focus away, per APG.
  if (event.key === 'Escape' && visible.value) {
    event.stopPropagation()
    hide()
  }
}

// Scroll is captured so a scroll in ANY ancestor scroller repositions the chip,
// not just the document — the chip is on <body> and does not travel with the
// trigger. `passive` keeps this off the scrolling critical path.
const trackViewport = (on) => {
  if (typeof window === 'undefined') return
  const fn = on ? window.addEventListener : window.removeEventListener
  fn.call(window, 'scroll', place, { capture: true, passive: true })
  fn.call(window, 'resize', place, { passive: true })
}

watch(visible, async (isVisible) => {
  if (isVisible) {
    await nextTick()
    place()
    trackViewport(true)
  } else {
    trackViewport(false)
  }
})

// A trigger unmounted while its tooltip is up (row removed, route change) must
// not leave a chip orphaned on <body> or the scroll listeners attached.
onBeforeUnmount(() => {
  clearTimer()
  trackViewport(false)
})

// Disabling mid-hover has to retract a chip that is already up.
watch(
  () => props.disabled,
  (isDisabled) => {
    if (isDisabled) hide()
  }
)
</script>

<template>
  <span
    ref="anchor"
    v-bind="$attrs"
    class="asp-tooltip-anchor"
    :aria-describedby="visible ? uid : undefined"
    @mouseenter="show()"
    @mouseleave="hide"
    @focusin="show({ immediate: true })"
    @focusout="hide"
    @keydown="onKeydown"
  >
    <slot />
  </span>

  <Teleport to="body">
    <Transition name="asp-tooltip-fade">
      <div
        v-if="visible"
        :id="uid"
        ref="chip"
        class="asp-tooltip"
        :class="[`asp-tooltip--${side}`, { 'asp-tooltip--placed': placed }]"
        role="tooltip"
        :style="{ left: `${coords.left}px`, top: `${coords.top}px` }"
      >
        <slot name="content">{{ content }}</slot>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/*
 * The anchor is a passive wrapper: `display: contents` would drop the box the
 * placement math measures, so it is an inline-block that takes its size from
 * whatever it wraps and contributes no spacing of its own.
 */
.asp-tooltip-anchor {
  display: inline-block;
  max-width: 100%;
}
</style>

<style>
/*
 * Teleported to <body>, so these rules cannot rely on any ancestor of the call
 * site — every value is a token read off :root. Unscoped for the same reason:
 * the chip is not a descendant of this component's rendered tree, so a scoped
 * attribute selector would not match it.
 *
 * This is the system_3 health-page `[data-tip]::after` treatment in tokens:
 * dark chip, hairline border, 12px text, soft shadow, short fade.
 */
.asp-tooltip {
  position: fixed;
  /* Above --z-index-modal, so a tooltip on a control INSIDE a dialog is not
     painted behind the dialog it belongs to. */
  z-index: var(--z-index-tooltip);
  width: max-content;
  max-width: 16rem;
  padding: var(--space-xs) var(--space-sm);
  background: var(--surface-card);
  /* --surface-card is dark in both themes, so the ink is declared, not
     inherited — the chip is a surface-setter. */
  color: var(--text-on-dark);
  /* A hairline mixed from the chip's own ink: on a dark surface a lighter edge
     reads as a lift, and it holds in both themes without a [data-theme] rule.
     --surface-card-inner was the obvious pick and is wrong here — it is a
     DARKENING overlay in the light theme, so the edge vanished. */
  border: 1px solid color-mix(in srgb, var(--text-on-dark) 24%, transparent);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-md);
  font-family: var(--font-family-base);
  font-size: var(--text-xs);
  font-weight: var(--font-weight-regular);
  line-height: var(--font-line-height-normal);
  text-align: left;
  white-space: normal;
  overflow-wrap: anywhere;
  /* Never intercept the pointer: the chip can overlap its own trigger at the
     clamped edge positions, and eating that hover would make it flicker. */
  pointer-events: none;
  /* Held back for the measure frame — see `place()`. */
  visibility: hidden;
}

.asp-tooltip--placed {
  visibility: visible;
}

.asp-tooltip-fade-enter-active,
.asp-tooltip-fade-leave-active {
  transition: opacity var(--transition-fast) ease-out;
}

.asp-tooltip-fade-enter-from,
.asp-tooltip-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .asp-tooltip-fade-enter-active,
  .asp-tooltip-fade-leave-active {
    transition: none;
  }
}
</style>
