<script setup>
import { ref } from 'vue'
import AspComposer from '../src/components/AspComposer.vue'
import AspCard from '../src/components/AspCard.vue'

// One draft per variant, because the parent owns the draft (v-model) — the
// composer is stateless about the text.
const idle = ref('')
const typed = ref('@aspirant_engineer can you pick this up? The composer keeps the leading @handle verbatim so the mention routes.')
const busy = ref('Posting this comment…')
const errored = ref('This one failed to post — the draft outlives the failure.')

// The interactive variant echoes what a real parent does: it clears its draft
// on a successful send and records what was sent.
const live = ref('')
const lastSent = ref('nothing yet')
const onSend = (text) => {
  lastSent.value = text
  live.value = ''
}

// Attachments are the parent's, exactly like the draft. These entries are what a
// caller hands down: a name, a caller-FORMATTED meta string, and a status. Note
// there is no File here and no byte arithmetic — the composer renders text.
const attachDraft = ref('Here is the screenshot you asked for.')
const attached = ref([
  { key: 'a1', name: 'screenshot-2026-08-10.png', meta: '412 KB', status: 'done' },
  { key: 'a2', name: 'route-p95.csv', meta: 'uploading 40%', status: 'uploading' },
  { key: 'a3', name: 'crash-dump.bin', meta: 'type not accepted', status: 'error' },
])
// Bound but EMPTY: paperclip, no strip. The distinction the `undefined` default
// buys, made visible side by side with the unbound variants above.
const emptyAttachDraft = ref('')
const emptyAttached = ref([])
// The interactive variant does what a real parent does: appends what `attach`
// handed it, and drops what `remove` names.
const liveAttachDraft = ref('')
const liveAttached = ref([])
const onAttach = (files) => {
  liveAttached.value = [
    ...liveAttached.value,
    ...files.map((file, i) => ({
      key: `live-${liveAttached.value.length + i}`,
      name: file.name || 'pasted file',
      meta: `${Math.round(file.size / 1024)} KB`,
      status: 'pending',
    })),
  ]
}
</script>

<template>
  <Story title="Components/AspComposer">
    <template #docs>
      <p>
        <strong>Purpose:</strong> the one message-composer grammar
        (<code>docs/COMPONENTS.md</code> §16; conventions §3.42/§3.47) — a multi-line
        <code>&lt;textarea rows="3"&gt;</code> + amber primary submit + Enter-to-send. Extracted from
        <code>AspChatArea</code>, which used to inline it (duplicated at both composer positions) and
        now composes this primitive. A second surface that wants the same write affordance mounts
        <code>AspComposer</code> rather than forking a second grammar (§3.47).
      </p>
      <p>
        <strong>The parent owns the draft.</strong> The composer renders <code>modelValue</code>,
        emits <code>update:modelValue</code> on input, and emits <code>send</code> with the current
        value on submit — it never mutates the text. That keeps the
        <strong>draft-outlives-failure</strong> contract (§3.23) the caller's to honour: a failed
        send simply does not clear the parent's draft, and the caller sets <code>error</code>.
      </p>
      <p>
        <strong>Enter-to-send (§3.42).</strong> A <code>&lt;textarea&gt;</code> does not submit its
        form on Enter for free, so the composer keeps Enter-to-send by hand and reserves
        <strong>Shift/Ctrl/Meta+Enter</strong> for a newline. <code>submit()</code> guards on
        <code>disabled || !modelValue.trim()</code>, so a blank or whitespace-only draft never
        sends. The Send button pins to the top of the taller field and stays thumb-sized (44px touch
        floor), not stretched to the textarea's full height. Use the Histoire theme switcher to see
        idle / typed / disabled / error in both light and dark.
      </p>
      <p>
        <strong>Attachments are optional and parent-owned (system_3 #3112).</strong> The
        <code>attachments</code> prop defaults to <code>undefined</code>, and that default is the
        contract: an unbound mount renders no paperclip, no strip and no spacer, so the
        task-comment composer never grows a control that would do nothing when clicked (§3.23).
        Binding the prop buys the paperclip; entries buy the strip — a bound-but-EMPTY array shows
        the button and no container. Picker, drag-drop and paste all arrive as one
        <code>attach</code> event carrying raw <code>File</code>s; the ✕ emits both
        <code>update:attachments</code> (the shortened array, for a v-model caller) and
        <code>remove</code> (the entry, for a caller that must abort an in-flight upload).
      </p>
      <p>
        <strong>The composer renders text, not bytes.</strong> Each entry is
        <code>{ key?, name, meta?, status? }</code> where <code>meta</code> is already formatted by
        the caller — byte arithmetic and upload vocabulary belong to whoever owns the upload. And
        deliberately <strong>no thumbnail</strong>: uploaded bytes are only ever reached through the
        server's read-back route, whose <code>Content-Disposition: attachment</code> +
        <code>nosniff</code> headers are what make them inert. An <code>&lt;img&gt;</code>,
        <code>blob:</code> or <code>data:</code> preview built here would re-open exactly that
        vector (system_3 #3110 security ruling), so the chip is name + meta + remove.
      </p>
    </template>

    <!-- The textarea sets its own dark fill (--surface-card-inner / --text-on-dark), so the
         composer is legible standalone; the card here just gives it a realistic surround. -->
    <Variant title="Idle (empty draft — send disabled)">
      <AspCard>
        <AspComposer v-model="idle" placeholder="Leave a comment…" send-label="Post" />
      </AspCard>
    </Variant>

    <Variant title="Typed (send enabled, @handle verbatim)">
      <AspCard>
        <AspComposer v-model="typed" placeholder="Leave a comment…" send-label="Post" />
      </AspCard>
    </Variant>

    <Variant title="Disabled / busy (field + send disabled)">
      <AspCard>
        <AspComposer v-model="busy" placeholder="Leave a comment…" send-label="Post" disabled />
      </AspCard>
    </Variant>

    <Variant title="Error (message shown, draft intact)">
      <AspCard>
        <AspComposer
          v-model="errored"
          placeholder="Leave a comment…"
          send-label="Post"
          error="Could not post the comment (500). Try again."
        />
      </AspCard>
    </Variant>

    <Variant title="Interactive (Enter to send, Shift+Enter for newline)">
      <AspCard>
        <AspComposer v-model="live" placeholder="Type, then Enter…" send-label="Post" @send="onSend" />
      </AspCard>
      <p style="margin-top: 8px; color: var(--text-muted);">Last sent: {{ lastSent }}</p>
    </Variant>

    <Variant title="Attachments — bound with entries (chips above the field)">
      <AspCard>
        <AspComposer v-model="attachDraft" v-model:attachments="attached" placeholder="Message…" />
      </AspCard>
    </Variant>

    <Variant title="Attachments — bound but empty (paperclip, NO strip)">
      <AspCard>
        <AspComposer
          v-model="emptyAttachDraft"
          v-model:attachments="emptyAttached"
          placeholder="Message…"
        />
      </AspCard>
    </Variant>

    <Variant title="Attachments — interactive (pick, drop or paste a file)">
      <AspCard>
        <AspComposer
          v-model="liveAttachDraft"
          v-model:attachments="liveAttached"
          placeholder="Attach, then send…"
          @attach="onAttach"
          @send="liveAttachDraft = ''"
        />
      </AspCard>
      <p style="margin-top: 8px; color: var(--text-muted);">
        {{ liveAttached.length }} pending. Drop a file anywhere on the composer, paste a
        screenshot into the field, or use the paperclip — all three arrive as one
        <code>attach</code> event.
      </p>
    </Variant>
  </Story>
</template>
