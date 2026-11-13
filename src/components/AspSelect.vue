<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useAttrs, watch } from 'vue'
import AspLabelHint from './AspLabelHint.vue'

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
  /**
   * `[{ value, label, disabled? }]`, or grouped (system_3 #10701):
   * `[{ group: 'In', options: [{ value, label, disabled? }, ...] }, ...]`.
   * A group renders as `role="group"` with a visible label that is never an
   * option: not focusable, not selectable, not walked by the arrows. Every
   * group needs its `group` label, which names the `role="group"`; an
   * unlabelled group is not a supported shape.
   * A grouped list may also hold plain options (system_3 #10712), e.g.
   * `[{ value: 'all', label: 'All categories' }, { group: 'In', options }, ...]`:
   * they render in the order given, outside any group, with no heading, and
   * their trigger reads the bare label.
   * Any option may carry `search`, a string matched in addition to its label
   * when `searchable` is on (system_3 #10748): e.g. an epic's full title
   * behind a label cut at 40 characters.
   */
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Select' },
  label: { type: String, default: '' },
  // Same `labelHint` contract as AspInput (#9927): a short explanation shown
  // next to the label on hover/focus. Omitted by default, no visual change.
  labelHint: { type: String, default: null },
  disabled: { type: Boolean, default: false },
  /** Accessible name when no visible `label` is given. */
  ariaLabel: { type: String, default: null },
  /**
   * Opt-in search (design_conventions §3.149, system_3 #10748): a field at the
   * top of the open panel narrows the options. Off by default; with it off the
   * component renders and behaves exactly as before.
   */
  searchable: { type: Boolean, default: false },
  searchPlaceholder: { type: String, default: 'Type to filter' },
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

// The panel is a run of sections: a labelled `role="group"` for each
// `{ group, options }` entry, and a plain section for each run of plain
// options, which render straight into the listbox (system_3 #10712,
// design_agent c66693: "All categories" above In and Out). A flat list is one
// plain section. `flat` is every option in display order, once: every index
// below (the active option, aria-activedescendant, the arrows) counts options
// only, never group labels.
const isGroup = (o) => !!o && Array.isArray(o.options)
const sections = computed(() => {
  const out = []
  let index = 0
  props.options.forEach((o, oi) => {
    if (isGroup(o)) {
      out.push({
        label: o.group,
        id: `${uid}-group-${oi}`,
        items: o.options.map((option) => ({ option, index: index++ })),
      })
      return
    }
    let run = out[out.length - 1]
    if (!run || run.label !== null) {
      run = { label: null, id: `${uid}-plain-${oi}`, items: [] }
      out.push(run)
    }
    run.items.push({ option: o, index: index++ })
  })
  return out
})
const flat = computed(() => sections.value.flatMap((s) => s.items.map(({ option }) => option)))

const selectable = computed(() => flat.value.filter((o) => !o.disabled))
const selected = computed(() => flat.value.find((o) => o.value === props.modelValue) || null)
// A grouped selection names its group on the closed trigger, "Out · Other"
// (design_agent c66607 on system_3 #10701): the open panel's heading says
// which kind an option is, the closed trigger has no heading. A plain option,
// in a flat list or above the groups, reads its bare label; only a group with
// a label lends it, so a malformed unlabelled group can't print "undefined · ".
const selectedGroup = computed(() => {
  if (!selected.value) return null
  return (
    sections.value.find((s) => s.label !== null && s.items.some(({ option }) => option === selected.value)) || null
  )
})
const triggerText = computed(() => {
  if (!selected.value) return props.placeholder
  const group = selectedGroup.value?.label
  return group ? `${group} · ${selected.value.label}` : selected.value.label
})
const optionId = (i) => `${uid}-option-${i}`

// --- search (§3.149, system_3 #10748) ---------------------------------------
// Matching ignores case; every word she types must appear, in any order, in
// the label or the option's `search` text. Matches keep their order, and a
// group shows only while one of its options matches. Indexes stay global, so
// optionId and activeIndex mean the same thing with or without a filter.
const query = ref('')
const field = ref(null)
const list = ref(null)
let openPointerType = ''
const words = computed(() => query.value.trim().toLowerCase().split(/\s+/).filter(Boolean))
const matches = (o) => {
  const hay = `${o.label ?? ''} ${o.search ?? ''}`.toLowerCase()
  return words.value.every((w) => hay.includes(w))
}
const visibleSections = computed(() => {
  if (!props.searchable || !words.value.length) return sections.value
  return sections.value
    .map((s) => ({ ...s, items: s.items.filter(({ option }) => matches(option)) }))
    .filter((s) => s.items.length)
})
// The enabled options the arrows may land on, in display order.
const walkable = computed(() =>
  visibleSections.value.flatMap((s) => s.items.filter(({ option }) => !option.disabled).map(({ index }) => index))
)
const noMatch = computed(() => props.searchable && words.value.length > 0 && !visibleSections.value.length)
const noMatchText = computed(() => (noMatch.value ? `No match for "${query.value.trim()}"` : ''))
const fieldLabel = computed(() => `Filter ${props.label || props.ariaLabel || props.placeholder}`)
const isPrintable = (event) => event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey

// --- open/close -------------------------------------------------------------

// `focusField` and `text` only act on a searchable select: the field takes
// focus unless the panel opened from a touch (§3.149 Decision 6), and a
// printable key on the closed trigger arrives already typed.
const openPanel = async ({ focusField = false, text = '' } = {}) => {
  if (props.disabled || open.value) return
  open.value = true
  emit('open')
  // Start on the selected option so ↑/↓ move relative to it, not from the top.
  activeIndex.value = Math.max(
    flat.value.findIndex((o) => o.value === props.modelValue),
    0
  )
  if (props.searchable && text) query.value = text
  await nextTick()
  placePanel()
  scrollActiveIntoView()
  if (props.searchable && focusField) field.value?.focus()
  window.addEventListener('scroll', onViewportChange, true)
  window.addEventListener('resize', onViewportChange)
}

const closePanel = ({ focusTrigger = true } = {}) => {
  if (!open.value) return
  open.value = false
  activeIndex.value = -1
  flipped.value = false
  sideChosen = false
  openHeight = 0
  if (props.searchable && panel.value) panel.value.style.height = ''
  // The typed text is dropped on every close (§3.149 Decision 5).
  query.value = ''
  openPointerType = ''
  stopFollowing()
  emit('close')
  if (focusTrigger) root.value?.querySelector('.select__trigger')?.focus()
}

const toggle = () => {
  if (open.value) return closePanel()
  // A touch open leaves the field unfocused, so a phone keeps its keyboard
  // down (§3.149 Decision 6); a mouse open focuses it.
  const touch = openPointerType === 'touch'
  openPointerType = ''
  openPanel({ focusField: !touch })
}
const onTriggerPointerDown = (event) => {
  openPointerType = event.pointerType || ''
}

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
// A searchable panel chooses its side once, at open, and keeps it until it
// closes: narrowing and resizing never flip it, and the field she types into
// never moves (§3.149 Decision 3; design_agent c67019 on #10748). A panel
// opened above the trigger keeps its opening height until it closes, so its
// field stays where it opened AND its bottom edge stays against the trigger;
// fewer matches leave panel fill under them (design_agent c67045). A resize
// still caps that height to the room above.
let sideChosen = false
let openHeight = 0

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
  // the panel's own scroll position. A searchable panel scrolls its list, not
  // itself, so its natural height is the field row plus the list's content.
  el.style.minWidth = `${t.width}px`
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  const content = props.searchable
    ? (el.querySelector('.select__search')?.offsetHeight || 0) + (list.value?.scrollHeight || 0)
    : el.scrollHeight
  const natural = Math.min(content, 15 * rem)
  const holdSide = props.searchable && sideChosen
  if (!holdSide) flipped.value = natural > spaceBelow && spaceAbove > spaceBelow
  const space = Math.max(flipped.value ? spaceAbove : spaceBelow, 0)
  el.style.setProperty('--select-panel-space', `${Math.floor(space)}px`)
  let height = Math.min(natural, space)
  if (props.searchable) {
    if (!sideChosen) {
      sideChosen = true
      openHeight = height
    } else if (flipped.value) {
      height = Math.min(openHeight, space)
    }
    // Above: the box keeps that height, so neither edge moves while she types.
    // Below: it shortens from the bottom as before.
    el.style.height = flipped.value ? `${height}px` : ''
  }

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
  if (!open.value) return openPanel({ focusField: true })
  if (props.searchable) {
    // The arrows walk only the matches (§3.149 Decision 5).
    const vis = walkable.value
    if (!vis.length) {
      activeIndex.value = -1
      return
    }
    const pos = vis.indexOf(activeIndex.value)
    const next = pos === -1 ? (delta > 0 ? 0 : vis.length - 1) : (pos + delta + vis.length) % vis.length
    activeIndex.value = vis[next]
    await nextTick()
    scrollActiveIntoView()
    return
  }
  // Walk over disabled entries rather than landing on them.
  let i = activeIndex.value
  const list = flat.value
  for (let step = 0; step < list.length; step += 1) {
    i = (i + delta + list.length) % list.length
    if (!list[i].disabled) break
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
      if (open.value) select(flat.value[activeIndex.value])
      else openPanel({ focusField: true })
      break
    case 'Escape':
      if (open.value) {
        // Consumed: closing the list is all this Escape does. Left to bubble,
        // an enclosing AspModal dismissed itself too (system_3 #10761). A
        // closed select lets Escape through.
        event.preventDefault()
        event.stopPropagation()
        closePanel()
      }
      break
    case 'Tab':
      // Tab commits nothing and must not trap focus.
      closePanel({ focusTrigger: false })
      break
    default:
      // A printable key on the trigger types into the field (§3.149
      // Decision 6): it opens a closed panel with that character, and after a
      // touch open it moves focus into the field.
      if (props.searchable && isPrintable(event)) {
        event.preventDefault()
        if (!open.value) {
          openPanel({ focusField: true, text: event.key })
        } else {
          query.value += event.key
          field.value?.focus()
        }
      }
      break
  }
}

// The field's own keys: the arrows walk the matches, Enter picks, Escape and
// Tab close. Every other key, Space included, types.
const onFieldKeydown = (event) => {
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
      event.preventDefault()
      if (activeIndex.value >= 0 && walkable.value.includes(activeIndex.value)) select(flat.value[activeIndex.value])
      break
    case 'Escape':
      // Consumed, as on the trigger (system_3 #10761).
      event.preventDefault()
      event.stopPropagation()
      closePanel()
      break
    case 'Tab':
      closePanel({ focusTrigger: false })
      break
    default:
      break
  }
}

// As the text narrows the list, the first match becomes the active option,
// and the panel is placed again because its height changed.
watch(query, async () => {
  if (!open.value || !props.searchable) return
  activeIndex.value = walkable.value.length ? walkable.value[0] : -1
  await nextTick()
  placePanel()
  scrollActiveIntoView()
})

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
    <!-- The hint is a button beside the label, never inside it (#10033). -->
    <div v-if="label" class="select__label-row">
      <label class="select__label" :for="`${uid}-trigger`">
        {{ label }}
      </label>
      <AspLabelHint v-if="labelHint" :content="labelHint" :label="label" mark-class="select__label-hint" />
    </div>

    <button
      v-bind="$attrs"
      :id="triggerId"
      type="button"
      class="select__trigger"
      role="combobox"
      :aria-expanded="open"
      :aria-controls="`${uid}-panel`"
      :aria-activedescendant="open && !searchable && activeIndex >= 0 ? optionId(activeIndex) : undefined"
      :aria-label="!label ? ariaLabel || placeholder : undefined"
      :disabled="disabled"
      @pointerdown="onTriggerPointerDown"
      @click="toggle"
      @keydown="onKeydown"
    >
      <span class="select__value" :class="{ 'select__value--placeholder': !selected }">
        {{ triggerText }}
      </span>
      <span class="select__caret" aria-hidden="true">▾</span>
    </button>

    <!-- Searchable (§3.149, system_3 #10748): the field is the panel's first
         row and stays put while the list scrolls under it. While open it is
         the control that owns the listbox, so the trigger stops pointing at
         the active option (one pointer at a time). -->
    <div
      v-if="searchable"
      v-show="open"
      :id="`${uid}-popup`"
      ref="panel"
      class="select__panel select__panel--searchable"
      :class="{ 'select__panel--flipped': flipped }"
    >
      <div class="select__search">
        <input
          ref="field"
          v-model="query"
          class="select__search-input"
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-autocomplete="list"
          :aria-controls="`${uid}-panel`"
          :aria-activedescendant="activeIndex >= 0 ? optionId(activeIndex) : undefined"
          :aria-label="fieldLabel"
          :placeholder="searchPlaceholder"
          autocomplete="off"
          spellcheck="false"
          @keydown="onFieldKeydown"
        >
      </div>
      <ul
        :id="`${uid}-panel`"
        ref="list"
        class="select__list"
        role="listbox"
        :aria-label="label || ariaLabel || placeholder"
      >
        <template v-for="s in visibleSections" :key="s.id">
          <li v-if="s.label !== null" class="select__group" role="group" :aria-labelledby="s.id">
            <span :id="s.id" class="select__group-label" role="presentation">{{ s.label }}</span>
            <ul class="select__group-options" role="presentation">
              <li
                v-for="{ option, index: i } in s.items"
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
            </ul>
          </li>
          <template v-else>
            <li
              v-for="{ option, index: i } in s.items"
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
          </template>
        </template>
        <!-- Not an option and not reachable by the arrows; the panel stays
             open (§3.149 Decision 5). -->
        <li v-if="noMatch" class="select__empty select__empty--nomatch" role="presentation">{{ noMatchText }}</li>
        <li v-else-if="!flat.length" class="select__empty" role="presentation">No options</li>
      </ul>
    </div>

    <ul
      v-else
      v-show="open"
      :id="`${uid}-panel`"
      ref="panel"
      class="select__panel"
      :class="{ 'select__panel--flipped': flipped }"
      role="listbox"
      :aria-label="label || ariaLabel || placeholder"
      @keydown="onKeydown"
    >
      <template v-for="s in sections" :key="s.id">
        <!-- A group (system_3 #10701) is a labelled role="group"; its label is
             presentation only, so it is never an option. -->
        <li
          v-if="s.label !== null"
          class="select__group"
          role="group"
          :aria-labelledby="s.id"
        >
          <span :id="s.id" class="select__group-label" role="presentation">{{ s.label }}</span>
          <ul class="select__group-options" role="presentation">
            <li
              v-for="{ option, index: i } in s.items"
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
          </ul>
        </li>
        <!-- Plain options sit straight in the listbox, outside any group. -->
        <template v-else>
          <li
            v-for="{ option, index: i } in s.items"
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
        </template>
      </template>

      <li v-if="!flat.length" class="select__empty" role="presentation">No options</li>
    </ul>

    <!-- The no-match line, announced when it appears (§3.149 Decision 7). -->
    <span v-if="searchable" class="select__live" aria-live="polite">{{ open ? noMatchText : '' }}</span>
  </div>
</template>

<style scoped>

/* The label row (system_3 #10033): the label, then AspLabelHint's "?"
   centred on the label line (design_agent c62082: 1.2px above where it sat on
   the text baseline, so its 24px 2.5.8 circle clears the control with 0.8px
   to spare). The row is the hit area's containing block. */
.select__label-row {
  position: relative;
  display: flex;
  align-items: center;
}

/* Above AspLabelHint's hit area (z-index 0), so a control always wins its own
   tap, even where the hit area reaches up over the field above (#10033). */
.select__trigger {
  position: relative;
  z-index: 1;
}
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
  /* §3.122 P9 / §1.9: phone-first text size — the selected value is
     --text-base (16px) below 768px per operator ruling c57324 (design
     primarily for a fairphone), --text-sm from 768px up. (Also avoids iOS
     auto-zoom on focus — a side effect, not the reason.) */
  font-size: var(--text-base);
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

@media (min-width: 768px) {
  .select__trigger {
    font-size: var(--text-sm);
  }
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
  /* §3.122 P9 / §1.9: phone-first text size — the option list's text is
     --text-base (16px) below 768px per operator ruling c57324 (design
     primarily for a fairphone), --text-sm from 768px up. (Also avoids iOS
     auto-zoom on focus — a side effect, not the reason.) */
  font-size: var(--text-base);
  cursor: pointer;
  /* Inherits the panel's ink — the panel is the surface-setter. */
  color: inherit;
}

@media (min-width: 768px) {
  .select__option {
    font-size: var(--text-sm);
  }
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

/* Option groups (system_3 #10701). The label keeps the panel's full ink, so
   it passes contrast on the dark panel in both themes; size, weight and case
   set it apart from the options. It is not a hover or click target. */
.select__group {
  list-style: none;
}

/* The same divider between two groups and where a run of plain options meets
   a group, either way round (#10712, design_agent c66693). */
.select__group + .select__group,
.select__option + .select__group,
.select__group + .select__option {
  margin-top: var(--space-2xs);
  border-top: 1px solid var(--surface-card-inner);
}

.select__group-label {
  display: block;
  padding: var(--space-2xs) var(--space-sm) 0;
  font-size: var(--text-xs);
  font-weight: var(--font-weight-bold);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: default;
}

.select__group-options {
  list-style: none;
  margin: 0;
  padding: 0;
}

.select__empty {
  padding: var(--space-2xs) var(--space-sm);
  font-size: var(--text-sm);
  color: var(--text-muted);
}

/* Searchable (§3.149, system_3 #10748). The panel holds the field row and a
   list that scrolls under it, so the panel itself does not scroll. */
.select__panel--searchable {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
}

.select__search {
  flex: none;
  padding: var(--space-2xs) var(--space-2xs) var(--space-2xs);
}

/* AspInput's field-control treatment and tokens (D10). The field sets its own
   background, so it sets its own ink and placeholder ink (§3.18). */
.select__search-input {
  display: block;
  width: 100%;
  box-sizing: border-box;
  height: var(--asp-input-height, 34px);
  padding: 0 var(--space-sm);
  background: var(--surface-elevated);
  color: var(--text-body);
  border: 1px solid var(--border-control);
  border-radius: var(--radius-md);
  font: inherit;
  /* §3.135 field-control size: 16px below 768px, --text-sm from 768px. */
  font-size: var(--text-base);
  appearance: none;
}

@media (min-width: 768px) {
  .select__search-input {
    font-size: var(--text-sm);
  }
}

.select__search-input::placeholder {
  color: var(--text-muted);
  opacity: 1;
}

.select__search-input:focus {
  outline: none;
  border-color: var(--text-body);
  box-shadow: var(--shadow-focus);
}

.select__list {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  margin: 0;
  padding: 0 0 var(--space-2xs);
  list-style: none;
}

.select__live {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
