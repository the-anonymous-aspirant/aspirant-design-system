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

// A 1x1 amber PNG, inline — a stand-in for a resolved `/api/uploads/<id>` src
// in this offline story. The `image` field itself is the caller's decision
// (server-sniffed mime type only, #3641 c#17806); the box scales it to the
// fixed 40x40 regardless of the source's real dimensions.
const THUMB_SRC =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
const thumbDraft = ref('Here is the screenshot you asked for.')
const withThumb = ref([
  { key: 't1', name: 'screenshot-2026-08-10.png', meta: '412 KB', status: 'done', image: { src: THUMB_SRC, alt: 'screenshot-2026-08-10.png' } },
  { key: 't2', name: 'route-p95.csv', meta: '8 KB', status: 'done' },
  { key: 't3', name: 'broken-src.png', meta: '3 KB', status: 'done', image: { src: '/does-not-exist.png', alt: 'broken-src.png' } },
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
        <code>{ key?, name, meta?, status?, image? }</code> where <code>meta</code> is already
        formatted by the caller — byte arithmetic and upload vocabulary belong to whoever owns the
        upload.
      </p>
      <p>
        <strong>Thumbnail is opt-in per entry (system_3 #3641).</strong> When a caller sets
        <code>image: { src, alt }</code>, the chip reserves a fixed 40x40 box ahead of the name —
        the box's size never depends on the image's own dimensions, so a 4000px photo and a 16px
        icon occupy an identical box and nothing reflows as different entries' images resolve at
        different times. This component renders whatever <code>src</code> it is given and does not
        decide what counts as "an image" — that gate (server-sniffed mime type from the upload
        route, never anything client-declared) is the caller's, per the #3641 security ruling
        (comment #17806 on that task: an <code>&lt;img&gt;</code> pointed directly at the hardened
        <code>/api/uploads/&lt;id&gt;</code> route is safe because the upload allow-list already
        excludes every image type that can carry script — SVG has no magic-byte signature and is
        rejected at upload, so a raster format loaded via <code>&lt;img&gt;</code> never reaches the
        HTML parser). A <code>blob:</code>/<code>data:</code> re-host stays categorically out — the
        caller must point <code>src</code> directly at the route so the server's own
        <code>Content-Type</code> stays attached to the bytes. See the last variant below for what a
        failed load does: the box is removed from the layout entirely, reverting to the same chip
        shape an entry with no <code>image</code> renders.
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

    <Variant title="Attachments — with thumbnail (image entry, plain entry, broken-src degrade)">
      <AspCard>
        <AspComposer v-model="thumbDraft" v-model:attachments="withThumb" placeholder="Message…" />
      </AspCard>
      <p style="margin-top: 8px; color: var(--text-muted);">
        First chip: resolved thumbnail. Second: no <code>image</code> field, unchanged chip.
        Third: <code>image.src</code> 404s — the box removes itself, reverting to a plain chip.
      </p>
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
