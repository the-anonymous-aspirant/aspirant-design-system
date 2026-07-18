<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

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
  flipIfClipped()
  scrollActiveIntoView()
}

const closePanel = ({ focusTrigger = true } = {}) => {
  if (!open.value) return
  open.value = false
  activeIndex.value = -1
  flipped.value = false
  emit('close')
  if (focusTrigger) root.value?.querySelector('.select__trigger')?.focus()
}

const toggle = () => (open.value ? closePanel() : openPanel())

// --- edge flip --------------------------------------------------------------

// Panel opens downward by default and flips up when it would be clipped. Read
// once per open rather than on scroll: the panel closes on outside interaction
// anyway, so a live-repositioning loop would cost more than it buys.
const flipped = ref(false)
const flipIfClipped = () => {
  const el = panel.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const trigger = root.value.getBoundingClientRect()
  const spaceBelow = window.innerHeight - trigger.bottom
  flipped.value = rect.height > spaceBelow && trigger.top > spaceBelow
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
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocPointerDown, true))

// A disabled select must not stay open.
watch(() => props.disabled, (d) => d && closePanel({ focusTrigger: false }))
</script>

<template>
  <div ref="root" class="select" :class="{ 'select--open': open, 'select--disabled': disabled }">
    <label v-if="label" class="select__label" :for="`${uid}-trigger`">{{ label }}</label>

    <button
      :id="`${uid}-trigger`"
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
  font-size: var(--text-xs);
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
  border: 1px solid var(--border-subtle);
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

.select__panel {
  position: absolute;
  top: calc(100% + var(--space-2xs));
  left: 0;
  z-index: 20;
  min-width: 100%;
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

.select__panel--flipped {
  top: auto;
  bottom: calc(100% + var(--space-2xs));
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
