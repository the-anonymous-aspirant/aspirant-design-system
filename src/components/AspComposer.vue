<script setup>
import { computed, ref } from 'vue'

import AspButton from './AspButton.vue'
import AspIcon from './AspIcon.vue'

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
// ATTACHMENTS (optional, system_3 #3112): the same grammar extends to files
// WITHOUT becoming a second composer. `attachments` is undefined by default, so
// a mount that never attaches anything renders precisely what it rendered before
// the prop existed — no paperclip, no strip, no spacer. That default is what
// keeps the task-comment mount from growing a control that would do nothing when
// clicked (§3.23's dead-control defect). The composer renders and emits; it
// holds no File, performs no upload, and formats no byte count — see the
// `attachments` prop docstring for the entry shape and why the caller formats.
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
  /**
   * Pending attachments (v-model:attachments). OPTIONAL, and the default is
   * `undefined` rather than `[]` on purpose: `undefined` means the mount has no
   * attach affordance AT ALL — no paperclip, no strip, not even a spacer — so
   * every existing mount (TaskDetail's comment composer, the plain chat mounts)
   * renders exactly what it rendered before this prop existed. Binding the prop
   * is what buys the affordance; the entries are what buy the strip. An empty
   * ARRAY is therefore meaningfully different from `undefined`: paperclip, no
   * strip.
   *
   * Entry shape — the minimum this component can render, deliberately NOT the
   * caller's upload-item shape:
   *   { key?, name, meta?, status? }
   * `name` is the only required field. `meta` is a caller-FORMATTED secondary
   * string ('12.4 KB', 'uploading 40%', 'too large — 30 MB'): byte formatting
   * and upload vocabulary belong to the caller that owns the upload, not to a
   * presentation primitive. `status` ∈ pending|uploading|done|error tints the
   * chip and nothing else.
   *
   * OWNERSHIP, same as the draft: the parent owns the array. This component
   * never pushes, never uploads, never holds a File — it renders the entries and
   * emits. A caller whose source of truth is a composable can bind `:attachments`
   * one-way and listen to `remove`; a caller holding a plain ref can use
   * `v-model:attachments` and ignore `remove`. Both are supported because both
   * emits fire on the same gesture.
   */
  attachments: { type: Array, default: undefined },
  /** Accessible name for the attach button; also its tooltip. */
  attachLabel: { type: String, default: 'Attach file' },
  /**
   * `accept` for the hidden file input. The allow-list is the SERVER's (the
   * upload endpoint re-validates by content), so this is a picker convenience,
   * never the guard.
   */
  accept: { type: String, default: null },
  /** Whether the picker takes more than one file per open. */
  multiple: { type: Boolean, default: true },
})

const emit = defineEmits([
  'update:modelValue',
  'send',
  'update:attachments',
  'attach',
  'remove',
])

// The affordance is bound-vs-unbound, not empty-vs-non-empty (see the prop
// docstring). `props.attachments === undefined` is the only test — a caller
// that binds `[]` gets the paperclip.
const attachEnabled = computed(() => props.attachments !== undefined)

const fileInput = ref(null)

const openPicker = () => {
  if (props.disabled) return
  // Reset first: picking the SAME file twice in a row fires no `change` event
  // otherwise, and the operator's second attach would silently do nothing.
  if (fileInput.value) fileInput.value.value = ''
  fileInput.value?.click()
}

// One exit for all three routes (picker, drop, paste): the parent gets raw
// `File`s and decides what to do with them. Nothing is emitted for an empty
// pick, so a cancelled picker is not an event the parent has to filter.
const emitFiles = (files) => {
  const list = Array.from(files ?? []).filter(Boolean)
  if (!list.length) return
  emit('attach', list)
}

const onPicked = (event) => emitFiles(event.target?.files)

const removeAt = (index) => {
  const current = props.attachments ?? []
  const entry = current[index]
  // Both emits, one gesture: `update:attachments` serves the v-model caller,
  // `remove` serves the caller that must release something (abort an in-flight
  // upload) rather than just shorten a list.
  emit('update:attachments', current.filter((_, i) => i !== index))
  emit('remove', entry)
}

// --- drag / drop -------------------------------------------------------------
// dragenter/dragleave fire for every child element the pointer crosses, so a
// boolean flips off while the pointer is still inside the form. Counting enters
// minus leaves is the standard fix. `dragActive` is presentation-only local
// state — it says nothing about the attachments, which stay the parent's.
const dragActive = ref(false)
let dragDepth = 0

const onDragEnter = (event) => {
  if (!attachEnabled.value || props.disabled) return
  event.preventDefault()
  dragDepth += 1
  dragActive.value = true
}

const onDragOver = (event) => {
  if (!attachEnabled.value || props.disabled) return
  // Without preventDefault the browser navigates to the dropped file instead of
  // firing `drop` on the composer.
  event.preventDefault()
}

const onDragLeave = (event) => {
  if (!attachEnabled.value || props.disabled) return
  event.preventDefault()
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) dragActive.value = false
}

const onDrop = (event) => {
  if (!attachEnabled.value || props.disabled) return
  event.preventDefault()
  dragDepth = 0
  dragActive.value = false
  const dt = event.dataTransfer
  if (!dt) return
  if (dt.files && dt.files.length) {
    emitFiles(dt.files)
    return
  }
  // The `items` walk additionally catches an image dragged straight out of
  // another browser tab, which arrives with no entry in `files`.
  emitFiles(
    Array.from(dt.items ?? [])
      .filter((i) => i.kind === 'file')
      .map((i) => i.getAsFile())
  )
}

// --- paste -------------------------------------------------------------------
// A screenshot on the clipboard arrives as a `file`-kind item. Anything else —
// the text the operator actually meant to paste into the draft — is left alone
// and NOT preventDefault-ed, so binding this handler cannot hijack a text paste.
const onPaste = (event) => {
  if (!attachEnabled.value || props.disabled) return
  const files = Array.from(event.clipboardData?.items ?? [])
    .filter((i) => i.kind === 'file')
    .map((i) => i.getAsFile())
    .filter(Boolean)
  if (!files.length) return
  event.preventDefault()
  emitFiles(files)
}

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
  <form
    class="asp-composer"
    :class="{ 'asp-composer--drag': dragActive }"
    @submit.prevent="submit"
    @dragenter="onDragEnter"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <!-- Pending attachments ride ABOVE the field, so the operator reads what is
         attached before the text they are attaching it to. Rendered only when
         there is something to render: a bound-but-empty array shows the
         paperclip and NO container, because an empty strip is a spacer that
         lies about state. -->
    <ul
      v-if="attachEnabled && attachments.length"
      class="asp-composer__attachments"
      data-testid="composer-attachments"
      :aria-label="`Pending attachments (${attachments.length})`"
    >
      <li
        v-for="(entry, index) in attachments"
        :key="entry.key ?? entry.name ?? index"
        class="asp-composer__chip"
        :class="`asp-composer__chip--${entry.status ?? 'pending'}`"
        data-testid="composer-attachment"
        :data-status="entry.status ?? 'pending'"
      >
        <span class="asp-composer__chip-name" :title="entry.name">{{ entry.name }}</span>
        <!-- Caller-formatted; absent (not blank) when the caller has nothing to
             say, so the chip never renders a lone separator. -->
        <span v-if="entry.meta" class="asp-composer__chip-meta">{{ entry.meta }}</span>
        <button
          type="button"
          class="asp-composer__chip-remove"
          :aria-label="`Remove ${entry.name}`"
          :disabled="disabled"
          @click="removeAt(index)"
        >
          ✕
        </button>
      </li>
    </ul>

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
          @paste="onPaste"
        />
      </div>
      <div class="asp-composer__controls">
        <!-- Leading-controls slot (§3.62): rendered LEFT of Send, for a mount
             that hangs an extra affordance on the composer (e.g. the inline
             "+ artifact" trigger). The v-if keeps the row a plain right-aligned
             Send for the two plain-text mounts — an ABSENT slot renders identically
             to the pre-slot composer, because the leading container that carried
             the `margin-right: auto` push is simply not in the tree. -->
        <!-- The attach button is composer-NATIVE and rides in the same leading
             container, ahead of whatever the mount hangs there, so a mount with
             both (the agent pane: attach + "+ artifact") reads left-to-right as
             one control cluster rather than two competing ones. The container's
             v-if now covers either reason to exist; with neither, it is still
             absent from the DOM entirely and Send is still a lone
             right-aligned button. -->
        <div
          v-if="$slots['leading-controls'] || attachEnabled"
          class="asp-composer__leading"
        >
          <AspButton
            v-if="attachEnabled"
            class="asp-composer__attach"
            type="button"
            variant="ghost"
            size="sm"
            :disabled="disabled"
            :aria-label="attachLabel"
            :title="attachLabel"
            data-testid="composer-attach"
            @click="openPicker"
          >
            <AspIcon name="attach" size="sm" />
          </AspButton>
          <!-- The picker itself: kept out of the tab order and off-screen rather
               than `display:none`, because a hidden-but-focusable input is a
               control the operator can land on with no visible target. The
               visible, labelled button above is the affordance. -->
          <input
            v-if="attachEnabled"
            ref="fileInput"
            class="asp-composer__file-input"
            type="file"
            tabindex="-1"
            aria-hidden="true"
            :accept="accept || undefined"
            :multiple="multiple"
            data-testid="composer-file-input"
            @change="onPicked"
          >
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
  /* border-box, not the content-box default: width:100% + the 1px border
     below otherwise adds 2px beyond the parent's width, overflowing any
     container that does not itself carry spare gutter (system_3 #3616 — the
     agent-pane composer floored the viewport by exactly 2px at every width,
     border-left + border-right, with no other offender in the DOM). */
  box-sizing: border-box;
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

/* --- attachments (optional; only ever in the tree when `attachments` is bound) */

/* The attach button is a ghost icon control, so the amber 10% accent stays
   spent on Send alone (§1 60/30/10) — attaching is a secondary act. It still
   clears the 44px touch floor, same as Send: a control the operator taps must
   be tappable whether or not it is the primary one. */
.asp-composer__attach {
  min-height: 44px;
  min-width: 44px;
}

/* Off-screen rather than display:none — a `display:none` input cannot be
   `.click()`ed reliably in every engine, and the visually-hidden pattern keeps
   the picker driveable (including by Playwright's setInputFiles) while never
   painting. `tabindex="-1"` + `aria-hidden` keep it out of both the tab order
   and the accessibility tree; the labelled button is the affordance. */
.asp-composer__file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

.asp-composer__attachments {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2xs) var(--space-xs);
  margin: 0;
  padding: 0;
  list-style: none;
}

/* A chip derives its fill from the ambient ink (currentColor) rather than
   binding a surface token, so it reads as an inset control on whatever surface
   the composer is mounted over without assuming that surface's polarity
   (#2418, the same reasoning as AspChatArea's load-earlier control). */
.asp-composer__chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2xs);
  max-width: 100%;
  padding: var(--space-2xs) var(--space-xs);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, currentColor 8%, transparent);
  font-size: var(--text-sm);
}

/* Status tints the chip and nothing else — the WORD comes from the caller's
   `meta`, so colour is never the only carrier of the state (WCAG 1.4.1). */
.asp-composer__chip--error {
  border-color: var(--feedback-error);
  color: var(--feedback-error);
}

.asp-composer__chip-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 16rem;
}

.asp-composer__chip-meta {
  opacity: 0.75;
  font-size: var(--text-xs);
  white-space: nowrap;
}

/* The remove control is a real focusable button at the 44px floor. It carries a
   per-entry accessible name ("Remove <file>"), because five identical "Remove"
   buttons in a row are unusable to a screen-reader operator. */
.asp-composer__chip-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  margin: calc(var(--space-2xs) * -1) calc(var(--space-2xs) * -1)
    calc(var(--space-2xs) * -1) 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  line-height: 1;
  cursor: pointer;
}
.asp-composer__chip-remove:hover:not(:disabled) {
  color: var(--feedback-error);
}
.asp-composer__chip-remove:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
  border-radius: var(--radius-sm);
}
.asp-composer__chip-remove:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* Drag-over feedback rings the whole composer, not just the field: the drop
   target IS the whole form, so ringing a sub-part would point at the wrong
   thing. Outline, not border/padding, so nothing reflows as the pointer
   crosses. */
.asp-composer--drag {
  outline: 2px dashed var(--text-body);
  outline-offset: var(--space-2xs);
  border-radius: var(--radius-md);
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
