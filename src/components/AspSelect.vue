<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useAttrs, watch } from 'vue'

// §3.95: the trigger is the labelable control, so a consumer's fall-through
// attrs (an `id` that an external `<label for>` targets, an `aria-describedby`)
// must reach the `<button>`, not the wrapper `<div>` — a non-labelable element
// where a `<label for>` associates with nothing (#4477's defect). inheritAttrs
// is off and $attrs is forwarded onto the trigger, exactly as AspInput/
// AspTextarea forward onto their inner control.
defineOptions({ inheritAttrs: false })

// AspSelect — the dropdown-of-record (system_3_design_conventions.md §3.10).
// The trigger carries the same filter-control treatment as AspInput (34px,
// --surface-elevated, radius 8, --border-subtle) and reads `Label ▾`; the open
// panel sits on --surface-card with a shadow, capped height, internal scroll.
//
// Keyboard is handled here rather than in a shared composable. The brief asked
// to compose a `useKeyboard`, but no such composable exists and authoring a
// general one for a single consumer would be guessing at the shape of callers
// two and three. If AspMenu or a combobox later want this behaviour, extract it
// from the implementations that actually agree.

const props = defineProps({
  modelValue: { type: [String, Number, null], default: null },
  /** `[{ value, label, disabled? }]` */
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Select' },
  label: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  /** Accessible name when no visible `label` is given. */
  ariaLabel: { type: String, default: null },
})

const emit = defineEmits(['update:modelValue', 'open', 'close'])

const uid = `asp-select-${Math.random().toString(36).slice(2, 9)}`
const attrs = useAttrs()

// The component's OWN <label for> association owns the trigger id whenever a
// `label` prop is present — the internal association wins and a consumer id
// must not break it (criterion 3). With no `label`, a consumer `id` forwards
// to the trigger so an external `<label for="x">` can name it (criterion 4).
const triggerId = computed(() => (props.label ? `${uid}-trigger` : attrs.id || `${uid}-trigger`))

const root = ref(null)
const panel = ref(null)
const open = ref(false)
const activeIndex = ref(-1)

const selectable = computed(() => props.options.filter((o) => !o.disabled))
const selected = computed(() => props.options.find((o) => o.value === props.modelValue) || null)
const triggerText = computed(() => selected.value?.label ?? props.placeholder)
const optionId = (i) => `${uid}-option-${i}`

// --- open/close -------------------------------------------------------------

const openPanel = async () => {
  if (props.disabled || open.value) return
  open.value = true
  emit('open')
  // Start on the selected option so ↑/↓ move relative to it, not from the top.
  activeIndex.value = Math.max(
    props.options.findIndex((o) => o.value === props.modelValue),
    0
  )
  await nextTick()
  placePanel()
  scrollActiveIntoView()
  window.addEventListener('scroll', onViewportChange, true)
  window.addEventListener('resize', onViewportChange)
}

const closePanel = ({ focusTrigger = true } = {}) => {
  if (!open.value) return
  open.value = false
  activeIndex.value = -1
  flipped.value = false
  stopFollowing()
  emit('close')
  if (focusTrigger) root.value?.querySelector('.select__trigger')?.focus()
}

const toggle = () => (open.value ? closePanel() : openPanel())

// --- placement --------------------------------------------------------------

// The panel is `position: fixed` at coordinates taken from the trigger, so no
// ancestor's overflow can clip it. As an absolute box it was cut off by any
// scroll container it sat in, whichever way it opened: an AspSelect in an
// AspDataTable cell near the window bottom flipped up and hid its options
// behind the table's own edge (system_3 #8402). It stays in this component's
// DOM rather than being teleported, so the outside-click test, focus and a
// consumer's scoped `:deep(.select__panel)` rules are unchanged.
//
// Opens downward unless the panel does not fit below and there is more room
// above; its height is capped to the room on the chosen side, and it is kept
// inside the window horizontally. Placed at open and again on any scroll or
// resize while open.
const flipped = ref(false)
const EDGE = 8

// A transform, filter, perspective or containment on an ancestor makes that
// ancestor the containing block of a fixed descendant, so viewport
// coordinates must be taken relative to it.
const fixedContainingBlock = (el) => {
  for (let node = el.parentElement; node && node !== document.documentElement; node = node.parentElement) {
    const cs = getComputedStyle(node)
    if (
      cs.transform !== 'none' ||
      cs.perspective !== 'none' ||
      cs.filter !== 'none' ||
      (cs.backdropFilter && cs.backdropFilter !== 'none') ||
      /paint|layout|strict|content/.test(cs.contain) ||
      /transform|perspective|filter/.test(cs.willChange)
    ) {
      return node
    }
  }
  return null
}

const placePanel = () => {
  const el = panel.value
  const trigger = root.value?.querySelector('.select__trigger')
  if (!el || !trigger) return
  const t = trigger.getBoundingClientRect()
  if (t.bottom < 0 || t.top > window.innerHeight) {
    closePanel({ focusTrigger: false })
    return
  }
  // The panel's margin-top is the gap to the trigger, in both orientations.
  const gap = parseFloat(getComputedStyle(el).marginTop) || 0
  const spaceBelow = window.innerHeight - t.bottom - gap - EDGE
  const spaceAbove = t.top - gap - EDGE

  // Its height under the component's own 15rem cap, read from scrollHeight so
  // nothing is mutated: briefly lifting the cap on every scroll would reset
  // the panel's own scroll position.
  el.style.minWidth = `${t.width}px`
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  const natural = Math.min(el.scrollHeight, 15 * rem)
  flipped.value = natural > spaceBelow && spaceAbove > spaceBelow
  const space = Math.max(flipped.value ? spaceAbove : spaceBelow, 0)
  el.style.setProperty('--select-panel-space', `${Math.floor(space)}px`)
  const height = Math.min(natural, space)

  // A containing block positions from its padding box, inside its border.
  const cb = fixedContainingBlock(el)
  const cbRect = cb && cb.getBoundingClientRect()
  const origin = cb ? { left: cbRect.left + cb.clientLeft, top: cbRect.top + cb.clientTop } : { left: 0, top: 0 }
  const width = el.getBoundingClientRect().width
  const left = Math.min(t.left, window.innerWidth - width - EDGE)
  el.style.left = `${Math.max(left, EDGE) - origin.left}px`
  // Upward, the box must end one gap above the trigger; its margin moves it
  // down by one gap, so its top is set two gaps higher.
  el.style.top = `${(flipped.value ? t.top - height - gap * 2 : t.bottom) - origin.top}px`
}

let frame = 0
const onViewportChange = () => {
  if (frame) return
  frame = requestAnimationFrame(() => {
    frame = 0
    if (open.value) placePanel()
  })
}

const stopFollowing = () => {
  window.removeEventListener('scroll', onViewportChange, true)
  window.removeEventListener('resize', onViewportChange)
  if (frame) cancelAnimationFrame(frame)
  frame = 0
}

const scrollActiveIntoView = () => {
  panel.value?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
}

// --- selection --------------------------------------------------------------

const select = (option) => {
  if (!option || option.disabled) return
  emit('update:modelValue', option.value)
  closePanel()
}

const moveActive = async (delta) => {
  if (!selectable.value.length) return
  if (!open.value) return openPanel()
  // Walk over disabled entries rather than landing on them.
  let i = activeIndex.value
  for (let step = 0; step < props.options.length; step += 1) {
    i = (i + delta + props.options.length) % props.options.length
    if (!props.options[i].disabled) break
  }
  activeIndex.value = i
  await nextTick()
  scrollActiveIntoView()
}

const onKeydown = (event) => {
  if (props.disabled) return
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      moveActive(1)
      break
    case 'ArrowUp':
      event.preventDefault()
      moveActive(-1)
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      if (open.value) select(props.options[activeIndex.value])
      else openPanel()
      break
    case 'Escape':
      if (open.value) {
        event.preventDefault()
        closePanel()
      }
      break
    case 'Tab':
      // Tab commits nothing and must not trap focus.
      closePanel({ focusTrigger: false })
      break
    default:
      break
  }
}

// --- click outside ----------------------------------------------------------

const onDocPointerDown = (event) => {
  if (open.value && root.value && !root.value.contains(event.target)) {
    closePanel({ focusTrigger: false })
  }
}

onMounted(() => document.addEventListener('pointerdown', onDocPointerDown, true))
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointerDown, true)
  stopFollowing()
})

// A disabled select must not stay open.
watch(() => props.disabled, (d) => d && closePanel({ focusTrigger: false }))
</script>

<template>
  <div ref="root" class="select" :class="{ 'select--open': open, 'select--disabled': disabled }">
    <label v-if="label" class="select__label" :for="`${uid}-trigger`">{{ label }}</label>

    <button
      v-bind="$attrs"
      :id="triggerId"
      type="button"
      class="select__trigger"
      role="combobox"
      :aria-expanded="open"
      :aria-controls="`${uid}-panel`"
      :aria-activedescendant="open && activeIndex >= 0 ? optionId(activeIndex) : undefined"
      :aria-label="!label ? ariaLabel || placeholder : undefined"
      :disabled="disabled"
      @click="toggle"
      @keydown="onKeydown"
    >
      <span class="select__value" :class="{ 'select__value--placeholder': !selected }">
        {{ triggerText }}
      </span>
      <span class="select__caret" aria-hidden="true">▾</span>
    </button>

    <ul
      v-show="open"
      :id="`${uid}-panel`"
      ref="panel"
      class="select__panel"
      :class="{ 'select__panel--flipped': flipped }"
      role="listbox"
      :aria-label="label || ariaLabel || placeholder"
      @keydown="onKeydown"
    >
      <li
        v-for="(option, i) in options"
        :id="optionId(i)"
        :key="option.value"
        class="select__option"
        :class="{
          'select__option--active': i === activeIndex,
          'select__option--selected': option.value === modelValue,
          'select__option--disabled': option.disabled,
        }"
        role="option"
        :aria-selected="option.value === modelValue"
        :aria-disabled="option.disabled || undefined"
        :data-active="i === activeIndex"
        @click="select(option)"
        @mousemove="activeIndex = option.disabled ? activeIndex : i"
      >
        {{ option.label }}
      </li>

      <li v-if="!options.length" class="select__empty" role="presentation">No options</li>
    </ul>
  </div>
</template>

<style scoped>
.select {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  gap: var(--space-2xs);
  font-family: var(--font-family-base);
}

.select__label {
  /* §3.95: one caption treatment across the field-control family — identical to
     AspInput/AspTextarea's `.field__label`. The former `--text-xs` was silent
     divergence, not a documented variant; a form built from all three showed
     two caption sizes. Locked by the caption-parity e2e test. */
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  line-height: 1.3;
  /* Sits on the ambient surface, so it takes the ambient ink. */
  color: inherit;
}

/*
 * Trigger and panel are both SURFACE-SETTERS: each declares a background, so
 * each must declare the ink paired with that background. Components that set
 * no background inherit instead (see AspDataTable, AspBadge).
 *
 * That distinction is the whole of #2415 and it is easy to get backwards here.
 * The panel's --surface-card is DARK even in the light theme; if it inherited
 * the ambient ink it would paint dark text on its own dark panel and reproduce
 * the 1:1 invisible-text defect in a brand-new component.
 */
.select__trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  /* §3.10 filter canon: 34px control height. Overridable per call site. */
  height: var(--asp-select-height, 34px);
  min-width: 10rem;
  padding: 0 var(--space-sm);
  background: var(--surface-elevated);
  color: var(--text-body);
  /*
   * The rest boundary is what identifies these as operable controls, so it
   * carries the WCAG 1.4.11 non-text 3:1 floor rather than --border-subtle's
   * decorative one. --border-subtle (#cccccc) measured 1.26:1 against the
   * light page and 1.53:1 against this component's own --surface-elevated
   * fill: on the light theme the control had no visible edge on either side.
   * See system_3 corpus §3.72 / task #4061 for the measurements, including why
   * no FLAT value can also clear 3:1 against --surface-card in the light theme
   * (page and card straddle mid-luminance; the best possible flat grey tops
   * out at 2.80:1). On a card the near-white fill carries the boundary at
   * 8.6:1, which is why the flat token is still the right shape here.
   */
  border: 1px solid var(--border-control);
  border-radius: var(--radius-md);
  font: inherit;
  font-size: var(--text-sm);
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.select__trigger:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
  /* Paired border, per AspInput: --shadow-focus alone is under the 3:1
     non-text minimum against both light surfaces. */
  border-color: var(--text-body);
}

.select--disabled .select__trigger {
  cursor: not-allowed;
  opacity: 0.55;
}

.select__value--placeholder {
  color: var(--text-muted);
}

.select__caret {
  font-size: var(--text-xs);
  line-height: 1;
}

/* Fixed, with top/left/min-width set from the trigger at open (placePanel):
   no ancestor's overflow can clip it (#8402). The margin is the gap to the
   trigger; --select-panel-space caps the height to the room on its side. */
.select__panel {
  position: fixed;
  z-index: 20;
  margin-top: var(--space-2xs);
  max-height: min(15rem, var(--select-panel-space, 15rem));
  /* A surface-setter sets its own alignment too: it renders in the consumer's
     DOM, and a centred ancestor (aspirant-client's #app) centred the options. */
  text-align: left;
  overflow-y: auto;
  margin: 0;
  padding: var(--space-2xs) 0;
  list-style: none;
  background: var(--surface-card);
  color: var(--text-on-dark);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
}


.select__option {
  padding: var(--space-2xs) var(--space-sm);
  font-size: var(--text-sm);
  cursor: pointer;
  /* Inherits the panel's ink — the panel is the surface-setter. */
  color: inherit;
}

/*
 * The active-option highlight DARKENS rather than tinting amber.
 * --brand-primary-alpha is amber at ~51%, which over the dark panel composites
 * to a light amber-brown and drops the panel's white ink to 3.87:1 — caught by
 * the open-panel contrast fixture, in this very component. --surface-card-inner
 * is the DS's existing "inner surface on a card" token and darkens instead, so
 * the inherited ink stays legible.
 *
 * The brand cue moves to an inset amber bar, which carries the accent without
 * putting it behind text.
 */
.select__option--active {
  background: var(--surface-card-inner);
  box-shadow: inset 2px 0 0 var(--brand-primary);
}

.select__option--selected {
  font-weight: var(--font-weight-bold);
}

.select__option--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.select__empty {
  padding: var(--space-2xs) var(--space-sm);
  font-size: var(--text-sm);
  color: var(--text-muted);
}
</style>
