<script>
// Module scope: one counter shared by every instance. Code in `<script setup>`
// re-runs per instance, so the id seed cannot live there.
let idCounter = 0
</script>

<script setup>
import { computed, ref } from 'vue'
import AspIcon from './AspIcon.vue'
import AspLabelHint from './AspLabelHint.vue'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  // §3.85: a CLOSED allowlist of the single-line text-entry family, never an
  // open string. Each of the seven renders in the identical box and differs
  // only in what the browser does with the keystrokes — masking, inputmode,
  // the soft keyboard, autofill. The native-widget types are excluded on
  // purpose: date/time/datetime-local/month/week, color, range, file,
  // checkbox, radio, and submit/reset/button each summon native chrome this
  // box does not govern, so admitting one would render a mismatched widget
  // inside a control claiming to be a text field. Any of those is its own
  // component.
  type: {
    type: String,
    default: 'text',
    validator: (v) =>
      ['text', 'search', 'number', 'password', 'email', 'tel', 'url'].includes(v),
  },
  placeholder: { type: String, default: null },
  label: { type: String, default: null },
  // A short explanation of what the field is, shown next to the label on
  // hover/focus rather than as a permanent `hint` line (#9927 — a per-field
  // "what is this" affordance, distinct from `hint`'s always-visible
  // guidance text). Omitted by default: every existing caller renders
  // unchanged.
  labelHint: { type: String, default: null },
  hint: { type: String, default: null },
  // A non-empty string renders as the error message; a bare `true` styles the
  // field as invalid without adding message text (the caller shows it elsewhere).
  error: { type: [String, Boolean], default: '' },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  /**
   * The setter the field resolves its required mark against (§3.121, §3.119;
   * system_3 #9189). 'auto' reads it from the DOM: inside an AspCard (any
   * variant but the transparent `ghost`) the mark takes the dark-setter ink,
   * anywhere else the page one. 'page' and 'card' force it, for a hand-rolled
   * surface the selector cannot see.
   */
  surface: {
    type: String,
    default: 'auto',
    validator: (v) => ['auto', 'page', 'card'].includes(v),
  },
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

// `ref` on this component yields the component instance, not the inner
// `<input>`, so a caller writing `ref="x"` + `x.focus()` gets a silent no-op
// unless the methods are exposed. Callers that focus a field on open — an
// inline rename, an inline create — depend on it, and nothing in a test
// suite fails when focus quietly stops happening, so the capability has to
// be part of the contract rather than something a consumer reaches around.
const inputEl = ref(null)

defineExpose({
  /** The inner `<input>` element, for the rare caller that needs the node itself. */
  el: inputEl,
  focus: (options) => inputEl.value?.focus(options),
  select: () => inputEl.value?.select(),
})
</script>

<template>
  <div
    class="field"
    :class="{ 'field--disabled': disabled, [`field--surface-${surface}`]: surface !== 'auto' }"
  >
    <!-- The hint is a button beside the label, never inside it (system_3
         #10033): inside <label for>, a tap on it focused the control. -->
    <div v-if="label" class="field__label-row">
      <label class="field__label" :for="uid">
        {{ label }}
        <span v-if="required" class="field__required" aria-hidden="true">*</span>
      </label>
      <AspLabelHint v-if="labelHint" :content="labelHint" :label="label" mark-class="field__label-hint" />
    </div>

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
        ref="inputEl"
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

/* The label row (system_3 #10033): the label, then AspLabelHint's "?"
   centred on the label line (design_agent c62082: 1.2px above where it sat on
   the text baseline, so its 24px 2.5.8 circle clears the control with 0.8px
   to spare). The row is the hit area's containing block. */
.field__label-row {
  position: relative;
  display: flex;
  align-items: center;
}

/* Above AspLabelHint's hit area (z-index 0), so a control always wins its own
   tap, even where the hit area reaches up over the field above (#10033). */
.field__control {
  position: relative;
  z-index: 1;
}
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


/* The mark is part of the field, so a dark setter gives it the dark-setter
   ink (§3.121): #8b0f10 measured 1.04:1 on #424242. Same setter reading as
   AspComposer's field (#9134). AspModal's panel paints the same --surface-card
   without being a .card (#9203). */
:where(.card:not(.card--variant-ghost), .modal__panel) .field:not(.field--surface-page) .field__required,
.field--surface-card .field__required {
  color: var(--feedback-error-text-on-dark);
}

.field__control {
  display: flex;
  align-items: center;
  gap: var(--space-2xs);
  height: var(--asp-input-height);
  padding: 0 var(--space-sm);
  background: var(--surface-elevated);
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
  border-color: var(--text-body);
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
  color: var(--text-body);
  font-family: inherit;
  /* §3.122 P9 / §1.9: phone-first text size — typed text is --text-base
     (16px) below 768px per operator ruling c57324 (design primarily for a
     fairphone), --text-sm from 768px up. (Also avoids iOS auto-zoom on
     focus — a side effect, not the reason.) */
  font-size: var(--text-base);
  line-height: 1;
  appearance: none;
}

@media (min-width: 768px) {
  .field__input {
    font-size: var(--text-sm);
  }
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

/*
 * The error state on a dark setter (system_3 #10026, design_agent c61986):
 * §3.121's reading for the required mark, applied to the message and the
 * errored control. On AspModal's panel the page tokens measured 1.0:1 for
 * the message (#8b0f10 on #424242) and 1.1:1 for the typed text on
 * --feedback-error-bg (report 850). On a dark setter the message takes the
 * on-dark ink; the control keeps its normal fill, so the typed text keeps
 * its usual contrast, and carries the state by a 2px edge drawn two-tone,
 * like the focus indicator above: the outer 1px border sits on the setter
 * and takes --feedback-error-on-dark (--feedback-error-solid is 1.79:1 on
 * #424242, under the 3:1 a control's edge owes); the inner 1px inset ring
 * sits on the fill and takes the themed --feedback-error-text, because in
 * the light theme the fill is near-white and #ff7a7c measured 2.40:1 on it
 * (no flat hue clears 3:1 against both #424242 and #f9f9f9 with margin).
 * The inset ring thickens the edge without shifting the layout, so the
 * state is thickness as well as hue. No token is minted.
 */
:where(.card:not(.card--variant-ghost), .modal__panel) .field:not(.field--surface-page) .field__message--error,
.field--surface-card .field__message--error {
  color: var(--feedback-error-text-on-dark);
}

:where(.card:not(.card--variant-ghost), .modal__panel) .field:not(.field--surface-page) .field__control--error,
.field--surface-card .field__control--error {
  background: var(--surface-elevated);
  border-color: var(--feedback-error-on-dark);
  box-shadow: inset 0 0 0 1px var(--feedback-error-text);
}

:where(.card:not(.card--variant-ghost), .modal__panel) .field:not(.field--surface-page) .field__control--error:focus-within,
.field--surface-card .field__control--error:focus-within {
  box-shadow:
    inset 0 0 0 1px var(--feedback-error-text),
    var(--shadow-focus);
}

@media (prefers-reduced-motion: reduce) {
  .field__control {
    transition: none;
  }
}
</style>
