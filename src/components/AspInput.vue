<script>
// Module scope: one counter shared by every instance. Code in `<script setup>`
// re-runs per instance, so the id seed cannot live there.
let idCounter = 0
</script>

<script setup>
import { computed } from 'vue'
import AspIcon from './AspIcon.vue'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  type: {
    type: String,
    default: 'text',
    validator: (v) => ['text', 'search', 'number'].includes(v),
  },
  placeholder: { type: String, default: null },
  label: { type: String, default: null },
  hint: { type: String, default: null },
  // A non-empty string renders as the error message; a bare `true` styles the
  // field as invalid without adding message text (the caller shows it elsewhere).
  error: { type: [String, Boolean], default: '' },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

// Vue's useId() is 3.5+, but the peer range allows ^3.4 — so mint ids here.
const uid = `asp-input-${++idCounter}`

const hasError = computed(() => props.error !== '' && props.error !== false)
const errorText = computed(() =>
  typeof props.error === 'string' && props.error !== '' ? props.error : null
)
// Error supersedes hint: only one message line is shown at a time.
const hintText = computed(() => (hasError.value ? null : props.hint))

const messageId = computed(() => {
  if (errorText.value) return `${uid}-error`
  if (hintText.value) return `${uid}-hint`
  return undefined
})

const onInput = (event) => emit('update:modelValue', event.target.value)
</script>

<template>
  <div class="field" :class="{ 'field--disabled': disabled }">
    <label v-if="label" class="field__label" :for="uid">
      {{ label }}
      <span v-if="required" class="field__required" aria-hidden="true">*</span>
    </label>

    <div
      class="field__control"
      :class="{
        'field__control--error': hasError,
        'field__control--search': type === 'search',
      }"
    >
      <AspIcon v-if="type === 'search'" name="search" size="sm" class="field__icon" />
      <input
        :id="uid"
        class="field__input"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :aria-required="required || undefined"
        :aria-invalid="hasError || undefined"
        :aria-describedby="messageId"
        v-bind="$attrs"
        @input="onInput"
      >
    </div>

    <p v-if="errorText" :id="messageId" class="field__message field__message--error">
      {{ errorText }}
    </p>
    <p v-else-if="hintText" :id="messageId" class="field__message field__message--hint">
      {{ hintText }}
    </p>
  </div>
</template>

<style scoped>
.field {
  /* §3.10 filter canon: 34px control height. Overridable per call site. */
  --asp-input-height: 34px;
  display: flex;
  flex-direction: column;
  gap: var(--space-2xs);
  font-family: var(--font-family-base);
}

.field__label {
  /* `inherit`, not an absolute ink: this element sets no background of its own,
     so it renders on whatever surface the consumer drops it into. AspCard's
     default surface is DARK even in the light theme, where --text-on-light and
     --surface-card are both #424242 — an absolute ink there renders text in
     exactly its own background colour (measured 1:1, invisible). Inheriting
     takes the ink the surface-setter already declared, which is correct on the
     page, on a card, and on any surface added later. */
  color: inherit;
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  line-height: 1.3;
}

.field__required {
  color: var(--feedback-error-text);
}

.field__control {
  display: flex;
  align-items: center;
  gap: var(--space-2xs);
  height: var(--asp-input-height);
  padding: 0 var(--space-sm);
  background: var(--surface-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast),
    background var(--transition-fast);
}

/*
 * Focus indicator, two-tone by necessity. `--shadow-focus` alone is #5a94ff at
 * 2px, which measures 2.80:1 against `--surface-elevated` and 2.32:1 against
 * `--surface-page` — both under the 3:1 WCAG 1.4.11 non-text minimum. Pairing
 * the ring with a `--text-on-light` border gives the indicator an AA-passing
 * boundary on the inner edge (9.6:1 vs the field background) and keeps the
 * ring itself at 3.4:1 against that border, so the composite passes in both
 * themes without redefining the shared token (which would restyle every
 * component that already consumes it).
 */
.field__control:focus-within {
  border-color: var(--text-on-light);
  box-shadow: var(--shadow-focus);
}

.field__control--error {
  background: var(--feedback-error-bg);
  border-color: var(--feedback-error-solid);
}

.field__icon {
  color: var(--text-muted);
  flex: none;
}

.field__input {
  flex: 1 1 auto;
  min-width: 0;
  height: 100%;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text-on-light);
  font-family: inherit;
  font-size: var(--text-sm);
  line-height: 1;
  appearance: none;
}

.field__input:focus {
  /* The ring lives on .field__control via :focus-within. */
  outline: none;
}

.field__input::placeholder {
  color: var(--text-muted);
  opacity: 1;
}

/* Suppress the WebKit search decorations so the leading AspIcon is the only
   affordance and the control keeps its 34px box. */
.field__input[type='search']::-webkit-search-decoration,
.field__input[type='search']::-webkit-search-cancel-button {
  appearance: none;
}

.field--disabled .field__label,
.field--disabled .field__message {
  opacity: 0.6;
}

.field__control:has(.field__input:disabled) {
  opacity: 0.6;
  cursor: not-allowed;
}

.field__input:disabled {
  cursor: not-allowed;
}

.field__message {
  margin: 0;
  font-size: var(--text-xs);
  line-height: 1.4;
}

.field__message--hint {
  color: var(--text-muted);
}

.field__message--error {
  color: var(--feedback-error-text);
}

@media (prefers-reduced-motion: reduce) {
  .field__control {
    transition: none;
  }
}
</style>
