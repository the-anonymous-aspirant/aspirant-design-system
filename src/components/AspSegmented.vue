<script setup>
// AspSegmented — a single-select strip primitive (tab / mode / filter toggles).
// Design-of-record §3.89 (Q1). Selection is a DECLARED single-select state on a
// purpose-built strip, NOT a variant-flip of AspButton: unselected members stay
// calm, the selected one carries a neutral token-backed emphasis (a currentColor
// mix + a thin brand underline), so the accent budget (§1) is not spent on a
// choice. The strip declares WHICH pattern it is via `as`:
//   - as="radiogroup" (default) → role=radiogroup + role=radio/aria-checked, for
//     a mode/filter select that does NOT switch a named panel.
//   - as="tabs" → role=tablist + role=tab/aria-selected/aria-controls, only where
//     a real tabpanel exists.
// Ink is `inherit`/currentColor-relative (§3.18), so the strip composites on both
// the light page and the signature dark card.
import { computed, ref } from 'vue'

const props = defineProps({
  // [{ value, label, disabled?, icon?, controls? }]. `controls` is the id of the
  // tabpanel a member drives (tabs mode only).
  options: { type: Array, required: true },
  // The selected option's `value` — typically a string or number key.
  modelValue: { type: [String, Number, Boolean], default: null },
  size: { type: String, default: 'md', validator: (v) => ['sm', 'md'].includes(v) },
  as: {
    type: String,
    default: 'radiogroup',
    validator: (v) => ['radiogroup', 'tabs'].includes(v),
  },
  // Accessible name for the group (a radiogroup/tablist should be named).
  ariaLabel: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const isTabs = computed(() => props.as === 'tabs')
const groupRole = computed(() => (isTabs.value ? 'tablist' : 'radiogroup'))
const itemRole = computed(() => (isTabs.value ? 'tab' : 'radio'))

const isSelected = (opt) => opt.value === props.modelValue
const isDisabled = (opt) => props.disabled || !!opt.disabled

// One tab-stop for the whole group (roving tabindex): the selected member owns
// it, or the first enabled member when nothing is selected yet.
const rovingIndex = computed(() => {
  const sel = props.options.findIndex((o) => isSelected(o) && !isDisabled(o))
  if (sel !== -1) return sel
  return props.options.findIndex((o) => !isDisabled(o))
})

const btnRefs = ref([])
const setRef = (el, i) => {
  if (el) btnRefs.value[i] = el
}
const focusIndex = (i) => btnRefs.value[i]?.focus()

const select = (opt) => {
  if (isDisabled(opt)) return
  if (opt.value !== props.modelValue) emit('update:modelValue', opt.value)
}

// Arrow keys move focus AND selection (WAI-ARIA automatic activation for both
// radiogroup and tablist), wrapping and skipping disabled members.
const step = (from, dir) => {
  const n = props.options.length
  let i = from
  for (let k = 0; k < n; k++) {
    i = (i + dir + n) % n
    if (!isDisabled(props.options[i])) {
      select(props.options[i])
      focusIndex(i)
      return
    }
  }
}
const toEdge = (edge) => {
  const n = props.options.length
  const order =
    edge === 'home' ? [...Array(n).keys()] : [...Array(n).keys()].reverse()
  for (const i of order) {
    if (!isDisabled(props.options[i])) {
      select(props.options[i])
      focusIndex(i)
      return
    }
  }
}

const onKeydown = (e, index) => {
  switch (e.key) {
    case 'ArrowRight':
    case 'ArrowDown':
      e.preventDefault()
      step(index, 1)
      break
    case 'ArrowLeft':
    case 'ArrowUp':
      e.preventDefault()
      step(index, -1)
      break
    case 'Home':
      e.preventDefault()
      toEdge('home')
      break
    case 'End':
      e.preventDefault()
      toEdge('end')
      break
    case ' ':
    case 'Enter':
      e.preventDefault()
      select(props.options[index])
      break
    default:
      break
  }
}
</script>

<template>
  <div
    class="segmented"
    :class="[`segmented--${size}`, { 'segmented--disabled': disabled }]"
    :role="groupRole"
    :aria-label="ariaLabel || undefined"
  >
    <button
      v-for="(opt, i) in options"
      :key="opt.value"
      :ref="(el) => setRef(el, i)"
      type="button"
      class="segmented__item"
      :class="{ 'segmented__item--selected': isSelected(opt) }"
      :role="itemRole"
      :aria-checked="!isTabs ? isSelected(opt) : undefined"
      :aria-selected="isTabs ? isSelected(opt) : undefined"
      :aria-controls="isTabs && opt.controls ? opt.controls : undefined"
      :tabindex="i === rovingIndex ? 0 : -1"
      :disabled="isDisabled(opt)"
      @click="select(opt)"
      @keydown="onKeydown($event, i)"
    >
      <span v-if="opt.icon" class="segmented__icon" aria-hidden="true">{{ opt.icon }}</span>
      <span class="segmented__label">{{ opt.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.segmented {
  display: inline-flex;
  align-items: stretch;
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: transparent;
  font-family: var(--font-family-base);
  /* Ink follows the surface (§3.18): the strip inherits the consumer's ink, so
     it reads on the light page and on the dark card alike. */
  color: inherit;
}

.segmented__item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2xs);
  border: none;
  background: transparent;
  /* Unselected members are calm — a muted, currentColor-relative ink. */
  color: var(--text-muted);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  line-height: 1;
  padding: var(--space-2xs) var(--space-sm);
  border-radius: var(--radius-sm);
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.segmented--sm .segmented__item {
  padding: var(--space-2xs) var(--space-xs);
  font-size: var(--text-xs);
}

.segmented__item:hover:not(:disabled):not(.segmented__item--selected) {
  /* A hover that is lighter than the selected fill, so the two never read alike. */
  background: color-mix(in srgb, currentColor 6%, transparent);
  color: inherit;
}

.segmented__item--selected {
  /* Full (un-muted) ink + a neutral surface-relative fill + a thin brand
     underline as the "you are here" cue. Not a brand fill — accent-budget honest
     (§1); the fill is a currentColor mix so it darkens on light and lightens on
     dark, and the member text keeps AA over it. */
  color: inherit;
  background: color-mix(in srgb, currentColor 12%, transparent);
  box-shadow: inset 0 -2px 0 0 var(--brand-primary);
}

.segmented__item:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
}
/* Keep the selected underline visible while focused. */
.segmented__item--selected:focus-visible {
  box-shadow: var(--shadow-focus), inset 0 -2px 0 0 var(--brand-primary);
}

.segmented__item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.segmented--disabled {
  opacity: 0.6;
}

@media (prefers-reduced-motion: reduce) {
  .segmented__item {
    transition: none;
  }
}
</style>
