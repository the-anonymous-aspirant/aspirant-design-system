<script setup>
import AspButton from './AspButton.vue'

// AspComposer — the one message-composer grammar, extracted from AspChatArea
// (docs/COMPONENTS.md §16; conventions §3.42/§3.47).
//
// THE POINT OF THIS COMPONENT IS THAT THE GRAMMAR IS SHARED, NOT COPIED. The
// composer <form> — multi-line <textarea rows="3"> + amber primary submit +
// Enter-to-send — used to live inline inside AspChatArea, duplicated at both
// composer positions. A second surface that wants the same write affordance
// (the operator's task-comment composer, #3034) must not fork a second
// grammar; it mounts THIS primitive. So the grammar is a component, and both
// AspChatArea positions now compose it too.
//
// DRAFT OWNERSHIP: the parent owns the draft (v-model). The composer is
// stateless about the text — it renders `modelValue`, emits `update:modelValue`
// on input, and emits `send` with the current value on submit. That keeps the
// draft-outlives-failure contract (§3.23) the caller's to honour: a failed send
// simply does not clear the parent's draft ref.

const props = defineProps({
  /** Draft text (v-model). The PARENT owns it — the composer never mutates. */
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Message…' },
  sendLabel: { type: String, default: 'Send' },
  /** In-flight / guard: disables both the field and the submit. */
  disabled: { type: Boolean, default: false },
  /**
   * Per-composer error message, rendered below the field in role="alert". Null
   * (the default) renders nothing. The message is the caller's — a send that
   * failed keeps its draft and sets this; the composer only displays it.
   */
  error: { type: String, default: null },
})

const emit = defineEmits(['update:modelValue', 'send'])

// submit() owns the empty/disabled guard, so a blank or whitespace-only message
// never sends — whichever way submit is reached (button, form-submit, Enter).
const submit = () => {
  if (props.disabled || !props.modelValue.trim()) return
  emit('send', props.modelValue)
}

// A single-line <input> submits its form on Enter for free; a <textarea> does
// not -- Enter inserts a newline. So the composer keeps Enter-to-send by hand,
// and reserves Shift/Ctrl/Meta+Enter for the newline (the Jinja composer's
// enter_to_send.js contract, §3.12).
const onComposerKeydown = (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
    event.preventDefault()
    submit()
  }
}
</script>

<template>
  <form class="asp-composer" @submit.prevent="submit">
    <div class="asp-composer__row">
      <div class="asp-composer__field">
        <textarea
          class="asp-composer__input"
          rows="3"
          :value="modelValue"
          :placeholder="placeholder"
          :disabled="disabled"
          :aria-label="placeholder"
          @input="(e) => emit('update:modelValue', e.target.value)"
          @keydown="onComposerKeydown"
        />
      </div>
      <div class="asp-composer__controls">
        <!-- Leading-controls slot (§3.62): rendered LEFT of Send, for a mount
             that hangs an extra affordance on the composer (e.g. the inline
             "+ artifact" trigger). The v-if keeps the row a plain right-aligned
             Send for the two plain-text mounts — an ABSENT slot renders identically
             to the pre-slot composer, because the leading container that carried
             the `margin-right: auto` push is simply not in the tree. -->
        <div v-if="$slots['leading-controls']" class="asp-composer__leading">
          <slot name="leading-controls" />
        </div>
        <AspButton
          class="asp-composer__send"
          type="submit"
          variant="primary"
          :disabled="disabled || !modelValue.trim()"
        >
          {{ sendLabel }}
        </AspButton>
      </div>
    </div>

    <!-- Draft-outlives-failure surface (§3.23): the message the caller sets when
         a send fails, announced to assistive tech. Absent (not empty) when
         there is no error, so a screen reader is not handed a blank alert. -->
    <p v-if="error" class="asp-composer__error" role="alert">{{ error }}</p>
  </form>
</template>

<style scoped>
.asp-composer {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xs);
}

/* The field and send stack vertically (§3.49): the textarea takes the full
   width, the send sits BELOW it, right-aligned. This supersedes §3.42's
   horizontal/top-aligned placement for the AspComposer primitive — the stack is
   mobile-first by construction and holds at every viewport width, so the send
   can never overlap the field (the horizontal layout risked that at narrow
   widths). §3.42's never-stretch-full-height rule still holds: the send stays a
   fixed 44px control (see .asp-composer__send), just relocated below the field. */
.asp-composer__row {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--space-xs);
}

.asp-composer__field {
  flex: 1;
  min-width: 0;
}

/*
 * The composer is a multi-line <textarea>, not a single-line input (§3.42): a
 * chat/comment surface's entry box is inherently multi-line-worthy, and "twice
 * as big / easier to type into, especially on mobile" (operator #2842) is a
 * request for TYPING ROOM, not a taller one-line box. rows="3" + min-height
 * give a fixed floor; resize: vertical lets the operator drag it taller. No JS
 * auto-grow this pass (§3.42) -- that is a separate enhancement.
 */
.asp-composer__input {
  /* The floor as a component-scoped custom property, mirroring AspInput's
     --asp-input-height precedent (§3.10): a call site overrides it without a
     fork. The name is kept from AspChatArea (--asp-chat-composer-min-height) so
     any existing call-site override survives the extraction unchanged.
     4.5rem/72px is ~2.1x the old 34px input and clears the 44px WCAG touch
     target the 34px input failed. */
  --asp-chat-composer-min-height: 4.5rem;
  display: block;
  width: 100%;
  min-width: 0;
  min-height: var(--asp-chat-composer-min-height);
  padding: var(--space-xs) var(--space-sm);
  background: var(--surface-card-inner);
  color: var(--text-on-dark);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font-family: var(--font-family-base);
  /* 16px, not --text-sm: below 16px iOS Safari auto-zooms the viewport on
     focus, a real mobile-typing irritation this sizing exists to remove. */
  font-size: var(--text-base);
  line-height: 1.4;
  resize: vertical;
  appearance: none;
}

.asp-composer__input::placeholder {
  /* Muted placeholder on the dark composer surface: the on-dark ink at half
     opacity, matching AspInput's muted-placeholder treatment. */
  color: var(--text-on-dark);
  opacity: 0.5;
}

.asp-composer__input:focus {
  /* A visible focus indicator is required even though the resting border is
     transparent -- same two-tone ring AspInput uses (ink border + focus ring). */
  outline: none;
  border-color: var(--text-body);
  box-shadow: var(--shadow-focus);
}

/* The controls row sits below the full-width textarea. Send is right-aligned
   (justify-content: flex-end); the optional leading-controls slot (§3.62) is
   pushed to the FAR left by its own `margin-right: auto`, so the two are at
   opposite ends with the row's gap only ever between them when both are present.
   With the slot absent the leading container is not rendered at all, leaving a
   lone right-aligned Send — byte-identical to the pre-slot composer. */
.asp-composer__controls {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-xs);
}

/* The leading slot's own auto margin absorbs the free space, so it anchors left
   and Send stays right regardless of how much the slot holds. `align-items:
   center` on the row vertically centres a shorter ghost trigger against the
   44px Send. */
.asp-composer__leading {
  margin-right: auto;
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

/* Send stays a thumb-sized control -- NOT stretched to the textarea's
   height/width, which would over-spend the 10% accent (§1 60/30/10) and misread
   as more important than the message (§3.42/§3.49). Just the 44px touch floor;
   the controls row now owns its right-alignment. */
.asp-composer__send {
  min-height: 44px;
}

/* The error rides below the field, in the ambient ink so it is legible on
   whatever surface the caller mounts the composer over (the composer itself is
   surface-agnostic — only the textarea declares its own dark fill). */
.asp-composer__error {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--feedback-error);
}
</style>
