<script setup>
import { computed, onMounted, ref, watch } from 'vue'

// AspCheckbox — the checkbox primitive. The §3.10 conversation-filter sets
// (prose / tool-calls / …) keep their checkbox affordance inside the filter row
// and compose from this.
//
// Built on a real <input type="checkbox"> rather than a div with
// role="checkbox". The native control brings keyboard handling, the
// indeterminate state, form participation and label association for free, and
// every one of those is a thing a custom implementation gets subtly wrong.
// `appearance: none` lets it be styled directly, so there is no visually-hidden
// input paired with a decorative box that can drift out of sync with it.

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** Tri-state display. Visual + a11y only — it does not change modelValue. */
  indeterminate: { type: Boolean, default: false },
  label: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  /** Accessible name when the component is used without a visible label. */
  ariaLabel: { type: String, default: null },
})

const emit = defineEmits(['update:modelValue'])

const input = ref(null)

// `indeterminate` is a DOM property, not an attribute — it cannot be set from
// the template and is invisible to :checked. Mirror it onto the element and
// keep it in sync.
//
// The initial sync is an onMounted, not `watch(..., { immediate: true })`: the
// immediate callback runs during setup, when the template ref is still null,
// so a checkbox mounted already-indeterminate would render unmixed.
const syncIndeterminate = () => {
  if (input.value) input.value.indeterminate = props.indeterminate
}

onMounted(syncIndeterminate)
watch(() => props.indeterminate, syncIndeterminate, { flush: 'post' })

// Re-assert after a toggle: the browser clears `indeterminate` on user input,
// so a parent that still passes indeterminate=true would otherwise see the
// state silently drop.
const onChange = (event) => {
  emit('update:modelValue', event.target.checked)
  syncIndeterminate()
}

const ariaChecked = computed(() => (props.indeterminate ? 'mixed' : undefined))
</script>

<template>
  <label class="checkbox" :class="{ 'checkbox--disabled': disabled }">
    <input
      ref="input"
      type="checkbox"
      class="checkbox__box"
      :checked="modelValue"
      :disabled="disabled"
      :aria-checked="ariaChecked"
      :aria-label="!label && !$slots.default ? ariaLabel || undefined : undefined"
      @change="onChange"
    >
    <span v-if="label || $slots.default" class="checkbox__label">
      <slot>{{ label }}</slot>
    </span>
  </label>
</template>

<style scoped>
/*
 * The label wraps the input, so clicking the text toggles natively — no click
 * handler, no `for`/`id` pair to keep unique across instances.
 */
.checkbox {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  font-family: var(--font-family-base);
  font-size: var(--text-sm);
  cursor: pointer;
  /* Sits on the ambient surface, so it takes the ambient ink. */
  color: inherit;
}

.checkbox--disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

/*
 * The box IS a surface-setter — it declares a background, so it declares the
 * ink that goes on it. The checkmark is drawn in --text-on-fixed-light because
 * the checked fill is --brand-primary, which is amber and light in EVERY theme;
 * an ink that flipped with the theme would put light-on-light in dark mode.
 * That is the #2417 lesson, and it applies here for the same reason.
 */
.checkbox__box {
  appearance: none;
  flex: none;
  width: 1rem;
  height: 1rem;
  margin: 0;
  background: var(--surface-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  cursor: inherit;
  display: grid;
  place-content: center;
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast);
}

.checkbox__box::before {
  content: '';
  width: 0.625rem;
  height: 0.625rem;
  transform: scale(0);
  transition: transform var(--transition-fast);
  background: var(--text-on-fixed-light);
  /* Checkmark, drawn rather than typed: a glyph would inherit the font stack
     and shift with it. */
  clip-path: polygon(14% 44%, 0 65%, 40% 100%, 100% 16%, 82% 0, 39% 62%);
}

.checkbox__box:checked,
.checkbox__box:indeterminate {
  background: var(--brand-primary);
  border-color: var(--brand-primary);
}

.checkbox__box:checked::before {
  transform: scale(1);
}

/* Indeterminate reads as a bar, and must win over :checked when both apply. */
.checkbox__box:indeterminate::before {
  transform: scale(1);
  clip-path: polygon(0 40%, 100% 40%, 100% 60%, 0 60%);
}

.checkbox__box:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
  /*
   * Paired border, matching AspInput and AspSelect. --shadow-focus alone is
   * #5a94ff, which measures under the 3:1 WCAG 1.4.11 non-text minimum against
   * the light surfaces; the border gives the indicator an AA-passing edge.
   */
  border-color: var(--text-body);
}

.checkbox__label {
  /* Inherits from .checkbox, which inherits the ambient surface's ink. */
  color: inherit;
}
</style>
