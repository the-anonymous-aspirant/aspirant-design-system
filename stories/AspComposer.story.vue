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
  </Story>
</template>
