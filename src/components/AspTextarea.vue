<script>
// Module scope: one counter shared by every instance, same reasoning as
// AspInput.vue — code in `<script setup>` re-runs per instance, so the id seed
// cannot live there.
let idCounter = 0
</script>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import AspLabelHint from './AspLabelHint.vue'

// AspTextarea — the multi-line field-editor primitive, extracted from the
// `<textarea rows="3">` that used to live trapped inside AspComposer.vue
// (system_3 #3677, corpus §3.47-1: a control trapped inside a bigger
// component is EXTRACTED into a primitive, never copied).
//
// Mirrors AspInput's contract (modelValue / label / hint / error / required /
// disabled / id-minting / aria wiring) so a caller already familiar with
// AspInput needs no new mental model for the multi-line case. The one thing
// this component does NOT do is intercept Enter — that semantic belongs to
// whatever composes this primitive (AspComposer keeps Enter-to-send itself);
// a bare AspTextarea always inserts a newline on Enter, which is what makes it
// correct for a field editor (a task description, an artifact body) rather
// than a chat composer.

defineOptions({ inheritAttrs: false })

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: null },
  label: { type: String, default: null },
  // Same `labelHint` contract as AspInput/AspSelect (#9927): a short
  // explanation shown next to the label on hover/focus. Omitted by default,
  // no visual change.
  labelHint: { type: String, default: null },
  hint: { type: String, default: null },
  // A non-empty string renders as the error message; a bare `true` styles the
  // field as invalid without adding message text (the caller shows it elsewhere).
  error: { type: [String, Boolean], default: '' },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  // The floor, in rows — same role as AspComposer's old `rows="3"`. Sets the
  // native `rows` attribute, so the initial box is already the right height
  // before any JS runs (no layout jump on the first keystroke).
  rows: { type: Number, default: 3 },
  // The ceiling, in rows, before the box stops growing and scrolls internally
  // instead. 10 rows is a sane cap for a long-form field editor (a task
  // description, an artifact body) — enough typing room without a single
  // field being able to grow to fill the whole viewport.
  maxRows: { type: Number, default: 10 },
  /**
   * The setter the field resolves its required mark against (§3.121, §3.119;
   * system_3 #9189). 'auto' reads it from the DOM: inside an AspCard (any
   * variant but the transparent `ghost`) the mark takes the dark-setter ink,
   * anywhere else the page one. 'page' and 'card' force it, for a hand-rolled
   * surface the selector cannot see. Same prop as AspInput's.
   */
  surface: {
    type: String,
    default: 'auto',
    validator: (v) => ['auto', 'page', 'card'].includes(v),
  },
})

const emit = defineEmits(['update:modelValue'])

// Vue's useId() is 3.5+, but the peer range allows ^3.4 — so mint ids here,
// same as AspInput.
const uid = `asp-textarea-${++idCounter}`

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

const textareaEl = ref(null)

// The max height in px, measured off the element's own computed style so it
// tracks whatever font-size/line-height tokens resolve to rather than
// hardcoding a pixel guess that drifts from the type scale.
const maxHeightPx = (el) => {
  const cs = window.getComputedStyle(el)
  const lineHeight = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4
  const paddingY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)
  const borderY = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth)
  return lineHeight * props.maxRows + paddingY + borderY
}

// Grow-to-content: reset to `auto` so `scrollHeight` reports the content's
// true height (not the previously-set explicit height), then clamp to the
// max and let the browser scroll internally past it.
const resize = () => {
  const el = textareaEl.value
  if (!el) return
  el.style.height = 'auto'
  const max = maxHeightPx(el)
  const next = Math.min(el.scrollHeight, max)
  el.style.height = `${next}px`
  el.style.overflowY = el.scrollHeight > max ? 'auto' : 'hidden'
}

onMounted(() => nextTick(resize))
// A programmatic reset of `modelValue` (e.g. the caller clears a draft after
// send) must shrink the box back down too, not just a user keystroke.
watch(() => props.modelValue, () => nextTick(resize))

const onInput = (event) => {
  emit('update:modelValue', event.target.value)
  resize()
}

// The imperative contract of the text-entry family (§3.96), mirroring
// AspInput's block exactly. A `ref` on this component yields the component
// instance, not the inner `<textarea>`, so without the exposure a caller's
// `x.focus()` is `undefined` and a click-to-focus affordance (an inline
// composer that focuses on open) degrades silently — build green, render
// assertion green, the caret never arrives. The §3.96 family-parity test locks
// these names against AspInput's so the two never drift.
defineExpose({
  /** The inner `<textarea>` element, for the rare caller that needs the node itself. */
  el: textareaEl,
  focus: (options) => textareaEl.value?.focus(options),
  select: () => textareaEl.value?.select(),
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

    <textarea
      :id="uid"
      ref="textareaEl"
      class="field__textarea"
      :class="{ 'field__textarea--error': hasError }"
      :rows="rows"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :aria-required="required || undefined"
      :aria-invalid="hasError || undefined"
      :aria-describedby="messageId"
      v-bind="$attrs"
      @input="onInput"
    />

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
.field__textarea {
  position: relative;
  z-index: 1;
}
.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xs);
  font-family: var(--font-family-base);
}

.field__label {
  /* `inherit`, not an absolute ink — see AspInput.vue for the #2415 reasoning
     (a surface-agnostic element must take the ink the surface-setter already
     declared, not assume its own). */
  color: inherit;
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  line-height: 1.3;
}

.field__required {
  color: var(--feedback-error-text);
}
/* Dark setter, dark-setter ink (§3.121); same reading as AspInput's mark,
   AspModal's panel included (#9203). */
:where(.card:not(.card--variant-ghost), .modal__panel) .field:not(.field--surface-page) .field__required,
.field--surface-card .field__required {
  color: var(--feedback-error-text-on-dark);
}



.field__textarea {
  display: block;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  padding: var(--space-xs) var(--space-sm);
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
  font-family: inherit;
  /* §3.122 P9 / §1.9: phone-first text size — typed text is --text-base
     (16px) below 768px per operator ruling c57324 (design primarily for a
     fairphone), --text-sm from 768px up. (Also avoids iOS auto-zoom on
     focus — a side effect, not the reason.) */
  font-size: var(--text-base);
  line-height: 1.4;
  resize: none;
  appearance: none;
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast),
    background var(--transition-fast);
}

@media (min-width: 768px) {
  .field__textarea {
    font-size: var(--text-sm);
  }
}

.field__textarea::placeholder {
  color: var(--text-muted);
  opacity: 1;
}

.field__textarea:focus {
  outline: none;
  border-color: var(--text-body);
  box-shadow: var(--shadow-focus);
}

.field__textarea--error {
  background: var(--feedback-error-bg);
  border-color: var(--feedback-error-solid);
}

.field--disabled .field__label,
.field--disabled .field__message {
  opacity: 0.6;
}

.field__textarea:disabled {
  opacity: 0.6;
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

:where(.card:not(.card--variant-ghost), .modal__panel) .field:not(.field--surface-page) .field__textarea--error,
.field--surface-card .field__textarea--error {
  background: var(--surface-elevated);
  border-color: var(--feedback-error-on-dark);
  box-shadow: inset 0 0 0 1px var(--feedback-error-text);
}

:where(.card:not(.card--variant-ghost), .modal__panel) .field:not(.field--surface-page) .field__textarea--error:focus,
.field--surface-card .field__textarea--error:focus {
  box-shadow:
    inset 0 0 0 1px var(--feedback-error-text),
    var(--shadow-focus);
}

@media (prefers-reduced-motion: reduce) {
  .field__textarea {
    transition: none;
  }
}
</style>
