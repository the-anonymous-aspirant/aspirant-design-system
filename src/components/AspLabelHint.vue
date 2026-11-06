<script setup>
// AspLabelHint: the "?" beside a field label that answers "what does this
// field mean?" (#9927; system_3 #10033, design_agent c62075). One mark, one
// hit area and one tap behaviour for every hinted label (D5): AspInput,
// AspTextarea and AspSelect render it beside their <label>, and a consumer
// puts it beside a plain label (a <dt>, a <span>) the same way.
//
// - A real <button>, beside the label, never inside it: a mark inside
//   <label for> activated the label on a tap, which focused the control and
//   closed the tooltip at once (measured on all three, #10033).
// - A tap toggles: a tap on a closed mark opens it, a second tap closes it;
//   a tap elsewhere or Escape closes it (AspTooltip's focusout and Esc).
//   Keyboard focus opens it, as before.
// - The visible mark is the #9927 circle, unchanged. Its hit area is larger:
//   44px wide below 768px and 24px from 768px up, from 11px above the label
//   row to the top of the control. It sits under every control (z-index 0
//   against the controls' 1), so a control always wins its own tap.
//
// Layout contract: put it in a row with `position: relative` and
// `display: flex; align-items: center`, after the label. The row is the
// hit area's containing block; the field family's label rows are exactly
// that.
import { ref } from 'vue'
import AspTooltip from './AspTooltip.vue'

const props = defineProps({
  /** The hint text shown in the tooltip. */
  content: { type: String, required: true },
  /** The field's label, for the accessible name "More about <label>". */
  label: { type: String, default: '' },
  /** An extra class on the mark itself (the family's own hook names). */
  markClass: { type: String, default: '' },
})

const tipId = `asp-label-hint-${Math.random().toString(36).slice(2, 9)}`
const open = ref(false)

// Whether the mark already had focus (its tooltip open) when this press
// began, read before the browser moves focus for the press.
let openAtPress = false

const onPointerdown = (event) => {
  openAtPress = document.activeElement === event.currentTarget
}

const onClick = (event) => {
  const mark = event.currentTarget
  // Safari does not focus a button on a tap, so focus is set here; a press
  // on a mark that was already open closes it.
  if (openAtPress) mark.blur()
  else mark.focus()
  openAtPress = false
}
</script>

<template>
  <AspTooltip
    :content="props.content"
    :tip-id="tipId"
    style="display: inline-flex"
    @visible-change="open = $event"
  >
    <button
      type="button"
      class="label-hint"
      :class="props.markClass"
      :aria-label="props.label ? `More about ${props.label}` : 'More about this field'"
      :aria-expanded="open ? 'true' : 'false'"
      :aria-controls="tipId"
      data-asp-label-hint
      @pointerdown="onPointerdown"
      @click="onClick"
    >
      ?
    </button>
  </AspTooltip>
</template>

<style scoped>
/* The visible mark, as #9927 drew it: a 14px circle, the muted ink (which is
   currentColor-based, so it follows the setter as the label does), a 10px "?".
   A <button> now, so the UA's button styles are reset. */
.label-hint {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 14px;
  height: 14px;
  margin: 0 0 0 var(--space-2xs);
  padding: 0;
  border: 1px solid var(--text-muted);
  border-radius: 50%;
  background: none;
  color: var(--text-muted);
  font: inherit;
  font-size: 10px;
  font-weight: var(--font-weight-medium);
  line-height: 1;
  cursor: help;
  touch-action: manipulation;
  --label-hint-gap: var(--space-2xs);
  --label-hint-reach: 11px;
  --label-hint-width: 44px;
}

/* The hit area. Its containing block is the label row: from 11px above the
   row to the gap's end, the control's top. Across, `left: auto` keeps the
   flex static position, centred on the mark. */
.label-hint::before {
  content: '';
  position: absolute;
  z-index: 0;
  top: calc(-1 * var(--label-hint-reach));
  left: auto;
  width: var(--label-hint-width);
  height: calc(100% + var(--label-hint-reach) + var(--label-hint-gap));
}

@media (min-width: 768px) {
  .label-hint {
    --label-hint-width: 24px;
  }
}

.label-hint:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
}
</style>
