<script setup>
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import AspIcon from './AspIcon.vue'
import AspTooltip from './AspTooltip.vue'

// AspBreadcrumb — path navigation with middle-collapse (system_3 task #2576).
// Replaces system_3's `frontend/templates/_partials/breadcrumb.html`, and is
// specified for two consumers at once: a shallow route-derived trail (#2367-A3)
// and a deep user-driven browse over the data lake (#2536). The depth case is
// the one that shapes the component — retrofitting depth onto a shallow
// breadcrumb is where these break.
//
// Router-agnostic, like AspSidebarLink and AspBackButton: this package has no
// vue-router dependency, so `router-link` is used only when a router is present
// on globalProperties and the component degrades to a plain `<a href>` when it
// is not.
//
// Contrast role (system_3_design_conventions.md §3.18): INHERITS. The row paints
// no background and takes the ambient ink, so it must land legibly on the light
// page AND on --surface-card, which is dark even in the light theme. Two parts
// are exceptions and PAINT, so each declares its own ink: the hover/focus state
// and the overflow panel. Both are in the contrast matrix, the panel OPEN — a
// closed specimen never reaches its surface and would be green by construction.

const props = defineProps({
  /**
   * The path, root first, current last. `[{ label, to? }]` — an item with no
   * `to` renders as plain text, which is what the current item is.
   */
  items: { type: Array, default: () => [] },
  /** Accessible name for the landmark. */
  ariaLabel: { type: String, default: 'Breadcrumb' },
})

const emit = defineEmits(['navigate'])

const uid = `asp-breadcrumb-${Math.random().toString(36).slice(2, 9)}`
const panelId = `${uid}-panel`

const instance = getCurrentInstance()

// Detect vue-router at runtime without importing it, exactly as AspSidebarLink
// does — `$router` is installed on globalProperties by app.use(router). Read
// through a computed rather than referenced as `$router` in the template, which
// warns when no router is installed.
const hasRouter = computed(() =>
  Boolean(instance?.appContext?.config?.globalProperties?.$router)
)

/** `to` for router-link, `href` for the plain anchor — one shape either way. */
const linkProps = (to) => (hasRouter.value ? { to } : { href: to })

const root = ref(null)
const list = ref(null)

/** How many ancestors, counting from index 1, are currently collapsed away. */
const hidden = ref(0)
const truncated = ref(new Set())
const open = ref(false)

const lastIndex = computed(() => props.items.length - 1)
const isCurrent = (index) => index === lastIndex.value

/**
 * The collapse floor: the first item and the last two always survive, so at
 * most `length - 3` ancestors can be hidden. Root and current are the two
 * orientation anchors and the parent is what makes "up one" reachable; the
 * middle is the least load-bearing part of a path.
 *
 * It is a floor, not a fixed shape. Collapsing progressively — one ancestor at
 * a time, until the row fits — keeps more of the path visible on a wide
 * viewport than jumping straight to first + last two would, and still honours
 * the rule at every step.
 */
const maxHidden = computed(() => Math.max(props.items.length - 3, 0))

const shown = computed(() => {
  const indexed = props.items.map((item, index) => ({ item, index }))
  if (hidden.value <= 0) return indexed
  return [indexed[0], ...indexed.slice(1 + hidden.value)]
})

const hiddenItems = computed(() =>
  hidden.value > 0 ? props.items.slice(1, 1 + hidden.value).map((item, k) => ({ item, index: 1 + k })) : []
)

/**
 * The rendered row as a flat list, so the template does not have to reason
 * about where the overflow control sits relative to the items. The control
 * takes the position of the ancestors it stands in for: straight after root.
 */
const nodes = computed(() => {
  const out = shown.value.map((s) => ({ kind: 'item', ...s }))
  if (hidden.value > 0) out.splice(1, 0, { kind: 'overflow' })
  return out
})

// --- measurement -------------------------------------------------------------

// The row's width, not its item count, decides the collapse. A count threshold
// would collapse a 5-item path of short labels that fits comfortably, and leave
// a 3-item path of long ones overflowing.
//
// `overflow: hidden` on the list is what makes this readable: it clips rather
// than scrolls, so `scrollWidth > clientWidth` reports "the content does not
// fit" and the page itself never gains a horizontal scrollbar.

let measuring = false

const measureTruncation = () => {
  const next = new Set()
  for (const el of list.value?.querySelectorAll('.breadcrumb__label') ?? []) {
    // +1 absorbs sub-pixel rounding; without it, labels that fit exactly
    // report as truncated on fractional layouts and every item grows a tooltip.
    if (el.scrollWidth > el.clientWidth + 1) next.add(Number(el.dataset.index))
  }
  truncated.value = next
}

const measure = async () => {
  if (measuring || !list.value) return
  measuring = true
  try {
    // Always re-expand first. Measuring from the current collapsed state can
    // only ever collapse further, so a widened viewport would never recover the
    // ancestors it hid.
    hidden.value = 0
    await nextTick()

    const el = list.value
    while (hidden.value < maxHidden.value && el.scrollWidth > el.clientWidth + 1) {
      hidden.value += 1
      await nextTick()
    }

    measureTruncation()
  } finally {
    measuring = false
  }
}

let observer = null
let observedWidth = -1

onMounted(() => {
  measure()
  if (typeof ResizeObserver === 'undefined') return
  // The NAV is observed, not the list. The nav's width is set by the page; the
  // list's is set by its own content, which this component mutates — observing
  // that would be a feedback loop that re-fires on its own collapse.
  observer = new ResizeObserver(([entry]) => {
    const width = entry.contentRect.width
    if (width === observedWidth) return
    observedWidth = width
    measure()
  })
  observer.observe(root.value)
})

onBeforeUnmount(() => observer?.disconnect())

watch(() => props.items, measure, { deep: true })

// --- overflow panel ----------------------------------------------------------

const closePanel = ({ focusTrigger = true } = {}) => {
  if (!open.value) return
  open.value = false
  if (focusTrigger) root.value?.querySelector('.breadcrumb__overflow')?.focus()
}

const togglePanel = () => (open.value ? closePanel() : (open.value = true))

const onKeydown = (event) => {
  if (event.key === 'Escape' && open.value) {
    event.preventDefault()
    closePanel()
  }
}

const onDocPointerDown = (event) => {
  if (open.value && root.value && !root.value.contains(event.target)) {
    closePanel({ focusTrigger: false })
  }
}

onMounted(() => document.addEventListener('pointerdown', onDocPointerDown, true))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocPointerDown, true))

// Collapsing further while the panel is open would change what the panel lists
// underneath the reader. Close it and let them re-open on the new path shape.
watch(hidden, () => closePanel({ focusTrigger: false }))

// --- navigation --------------------------------------------------------------

const onNavigate = (entry, event) => {
  emit('navigate', { ...entry, event })
  closePanel({ focusTrigger: false })
}
</script>

<template>
  <nav ref="root" class="breadcrumb" :aria-label="ariaLabel" @keydown="onKeydown">
    <ol ref="list" class="breadcrumb__list">
      <template v-for="(node, position) in nodes">
        <li v-if="node.kind === 'overflow'" :key="`${uid}-overflow`" class="breadcrumb__item breadcrumb__item--overflow">
          <!-- Decorative: the screen reader reads "Home, Reports, Q3", not
               "Home chevron Reports". AspIcon is aria-hidden whenever no
               `label` is passed. -->
          <AspIcon class="breadcrumb__sep" name="separator" size="sm" />

          <button
            type="button"
            class="breadcrumb__overflow"
            :aria-expanded="open"
            :aria-controls="panelId"
            :aria-label="`Show ${hiddenItems.length} hidden path segments`"
            @click="togglePanel"
          >
            <span aria-hidden="true">…</span>
          </button>

          <ul v-show="open" :id="panelId" class="breadcrumb__panel">
            <li v-for="entry in hiddenItems" :key="entry.index" class="breadcrumb__panel-item">
              <component
                :is="hasRouter ? 'router-link' : 'a'"
                v-bind="linkProps(entry.item.to)"
                class="breadcrumb__panel-link"
                @click="onNavigate(entry, $event)"
              >
                {{ entry.item.label }}
              </component>
            </li>
          </ul>
        </li>

        <li v-else :key="node.index" class="breadcrumb__item">
          <AspIcon v-if="position > 0" class="breadcrumb__sep" name="separator" size="sm" />

          <!-- `disabled` rather than a conditional wrapper: a label that fits
               needs no tooltip, and unwrapping it conditionally would change
               the DOM shape under the measurement that decided it. -->
          <AspTooltip class="breadcrumb__tip" :content="node.item.label" :disabled="!truncated.has(node.index)">
            <span
              v-if="isCurrent(node.index) || !node.item.to"
              class="breadcrumb__label breadcrumb__label--current"
              :data-index="node.index"
              :aria-current="isCurrent(node.index) ? 'page' : undefined"
            >{{ node.item.label }}</span>

            <component
              :is="hasRouter ? 'router-link' : 'a'"
              v-else
              v-bind="linkProps(node.item.to)"
              class="breadcrumb__label breadcrumb__label--link"
              :data-index="node.index"
              @click="onNavigate(node, $event)"
            >{{ node.item.label }}</component>
          </AspTooltip>
        </li>
      </template>
    </ol>
  </nav>
</template>

<style scoped>
/*
 * Sets NO background. The row inherits the ambient ink, which is what lets the
 * same component land on the light page and inside a dark AspCard without
 * knowing which it is on — see AspBackButton and #2415 for what an absolute ink
 * here would do on the opposite polarity.
 */
.breadcrumb {
  font-family: var(--font-family-base);
  font-size: var(--text-sm);
}

.breadcrumb__list {
  display: flex;
  align-items: center;
  /* Never a second line, and never a horizontal scrollbar on the page. The
     clip is what `measure()` reads to decide the collapse. */
  flex-wrap: nowrap;
  overflow: hidden;
  gap: var(--space-2xs);
  /* No fixed height: the row grows with the type scale. */
  margin: 0;
  padding: 0;
  list-style: none;
}

.breadcrumb__item {
  display: flex;
  align-items: center;
  gap: var(--space-2xs);
  /* Lets the flex algorithm shrink an item below its content width, which is
     the precondition for `text-overflow: ellipsis` to fire at all. */
  min-width: 0;
}

.breadcrumb__item--overflow {
  position: relative;
  flex-shrink: 0;
}

.breadcrumb__sep {
  flex-shrink: 0;
  /* Dimmer than the items it stands between: a separator is punctuation, not
     content. --text-muted is an alpha over currentColor, so it dims relative to
     the ambient ink rather than picking a colour that only works on one side. */
  color: var(--text-muted);
}

.breadcrumb__tip {
  min-width: 0;
}

.breadcrumb__label {
  display: block;
  /* One long name must not force the whole path to collapse — it truncates and
     exposes its full text through AspTooltip instead. The floor is what makes
     the collapse reachable: without it the flex algorithm would shrink every
     label indefinitely and the row would never report as overflowing. */
  max-width: var(--asp-breadcrumb-label-max, 12rem);
  min-width: var(--asp-breadcrumb-label-min, 3rem);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/*
 * Ancestor links are blue per corpus §1.3 (blue = links and hints) — but NOT
 * raw --brand-accent. That token is #82b1ff, tuned for dark surfaces; on the
 * light page (#e4e4e4) it measures ~1.7:1, which is the #2419 shape.
 *
 * Same resolution AspProse's links already landed on, reused verbatim rather
 * than re-derived: mixing a dark accent step into currentColor keeps the blue
 * link identity while inheriting the surface's polarity — it darkens on the
 * light page and stays bright on a dark card. Two link treatments in one
 * library that were derived independently drift.
 */
.breadcrumb__label--link {
  color: color-mix(in srgb, var(--brand-accent-800) 30%, currentColor);
  /*
   * The persistent underline is the non-colour cue (WCAG 1.4.1, and the #2416
   * precedent where colour-only sorting was corrected to an underline). It is
   * what distinguishes an ancestor from the current item, and it is on in the
   * resting state on purpose: a distinction that only appears on hover is
   * invisible to a reader who never hovers, and absent from print.
   */
  text-decoration: underline;
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast), color var(--transition-fast);
}

/*
 * The current item is NOT a link: no underline, no accent, heavier weight, and
 * no hover affordance. Three cues, only one of which is weight — so the
 * distinction survives for a reader who cannot resolve the colour and for one
 * who never hovers.
 */
.breadcrumb__label--current {
  font-weight: var(--font-weight-bold);
  color: inherit;
}

/*
 * PAINTS. The hover/focus state is the one part of the row that sets a
 * background, so it owns the ink that pairs with it — and the pair has to work
 * on both polarities. `currentColor` at 10% is a wash of the ambient ink over
 * the ambient surface: it darkens on the light page and lightens on a dark
 * card, so it stays a tint of the surface it is on rather than a fixed colour
 * that inverts. The ink is left inherited because the wash moves the background
 * only slightly — measured in the contrast matrix, which hovers this selector.
 */
.breadcrumb__label--link:hover {
  background: color-mix(in srgb, currentColor 10%, transparent);
}

.breadcrumb__label--link:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
}

/*
 * The overflow control is a real button, not a static ellipsis: a deep lake
 * path whose middle is unreachable would fail #2536 outright. Keyboard-
 * reachable, aria-expanded, and its panel dismissible on Escape.
 */
.breadcrumb__overflow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  /* 44px minimum hit target, WCAG 2.5.8 — the same floor AspBackButton keeps. */
  min-width: 44px;
  min-height: 44px;
  padding: 0 var(--space-2xs);
  background: none;
  color: inherit;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font: inherit;
  font-size: var(--text-sm);
  line-height: 1;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.breadcrumb__overflow:hover {
  background: color-mix(in srgb, currentColor 10%, transparent);
}

.breadcrumb__overflow:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
  /* Paired border — --shadow-focus alone is under the 3:1 non-text minimum
     against both light surfaces (#2371). */
  border-color: currentColor;
}

/*
 * PAINTS. A panel is a surface, so it declares its ink instead of inheriting.
 * --surface-card is DARK in BOTH themes; inheriting the ambient ink here would
 * paint dark text on a dark panel and reproduce #2415 in a new component. Same
 * pairing AspSelect's panel uses.
 */
.breadcrumb__panel {
  position: absolute;
  top: calc(100% + var(--space-2xs));
  left: 0;
  z-index: var(--z-index-dropdown);
  min-width: 12rem;
  max-height: 15rem;
  overflow-y: auto;
  margin: 0;
  padding: var(--space-2xs) 0;
  list-style: none;
  background: var(--surface-card);
  color: var(--text-on-dark);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
}

.breadcrumb__panel-link {
  display: block;
  padding: var(--space-2xs) var(--space-sm);
  /* Inherits the panel's ink — the panel is the surface-setter. The accent mix
     is deliberately NOT reapplied here: it derives from currentColor, and
     currentColor on this panel is already the light ink the dark surface needs.
     The underline carries the link affordance on its own. */
  color: inherit;
  text-decoration: underline;
  white-space: nowrap;
}

.breadcrumb__panel-link:hover,
.breadcrumb__panel-link:focus-visible {
  background: var(--surface-card-inner);
  outline: none;
}

@media (prefers-reduced-motion: reduce) {
  .breadcrumb__label--link,
  .breadcrumb__overflow {
    transition: none;
  }
}
</style>
