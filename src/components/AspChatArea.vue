<script setup>
import { computed } from 'vue'

import AspBubble from './AspChatBubble.vue'
import AspButton from './AspButton.vue'
import AspCheckbox from './AspCheckbox.vue'
import AspEmptyState from './AspEmptyState.vue'
import AspInput from './AspInput.vue'

// AspChatArea — the conversation surface (docs/COMPONENTS.md §16).
//
// THE POINT OF THIS COMPONENT IS THE MERGE. The operator's own messages live in
// the `comments` table; the agent's live in the session transcript. A view that
// renders only the transcript shows the operator a conversation with their own
// half deleted -- which is #2348, the defect this component exists to fix. So
// the two sources are separate PROPS and the interleave is this component's
// guarantee, not the caller's: a caller cannot forget to merge, and cannot
// merge wrongly, because it is not their job.
//
// SURFACE ROLE: the stream declares an opaque surface (--surface-card, dark in
// both themes) and its ink, following AspCard. That is load-bearing rather than
// decorative -- AspChatBubble's inbound fill is a translucent wash whose
// polarity flips with the theme, so it is legible only over a surface something
// guarantees. This component is that guarantee.

const props = defineProps({
  /** Session transcript entries: { id, created_at, kind, sender, body }. */
  messages: { type: Array, default: () => [] },
  /**
   * Rows from the `comments` table, same shape. Kept a SEPARATE prop rather
   * than pre-merged by the caller so the interleave is verifiable here.
   */
  comments: { type: Array, default: () => [] },
  /**
   * Stream order. Newest-first is round-2 P1 and is NOT yet confirmed by the
   * operator, so it ships as a capability with chronological as the default --
   * the prop exists, the default does not pre-empt the decision.
   */
  order: {
    type: String,
    default: 'chronological',
    validator: (v) => ['chronological', 'newest-first'].includes(v),
  },
  /** Kinds currently shown. `null` disables filtering entirely. */
  visibleKinds: { type: Array, default: null },
  /** Filter checkboxes to offer: [{ value, label }]. */
  filterOptions: { type: Array, default: () => [] },
  /** Renders the skeleton instead of the stream. */
  loading: { type: Boolean, default: false },
  /** id of the entry currently streaming. */
  streamingId: { type: [String, Number], default: null },
  /** Composer text (v-model). */
  modelValue: { type: String, default: '' },
  composerPlaceholder: { type: String, default: 'Message…' },
  sendLabel: { type: String, default: 'Send' },
  disabled: { type: Boolean, default: false },
  emptyHeading: { type: String, default: 'No messages' },
  ariaLabel: { type: String, default: 'Conversation' },
})

const emit = defineEmits(['update:modelValue', 'update:visibleKinds', 'send'])

const timeOf = (entry) => {
  const t = Date.parse(entry?.created_at)
  // An unparseable or missing timestamp sorts to the end rather than to 1970.
  // NaN would make every comparison false and silently scramble the order --
  // the one failure this component must not have.
  return Number.isNaN(t) ? Infinity : t
}

/**
 * The merge. Both sources are tagged with their origin before sorting, because
 * `source` is what the story, the tests and any consumer use to prove the
 * interleave actually happened -- an ordered list alone cannot show it.
 *
 * Ties are broken by source then id, so two rows written in the same
 * millisecond keep a stable order across renders instead of swapping.
 */
const merged = computed(() => {
  const tag = (rows, source) => (rows || []).map((entry) => ({ ...entry, source }))
  const all = [...tag(props.messages, 'transcript'), ...tag(props.comments, 'comment')]

  all.sort((a, b) => {
    const d = timeOf(a) - timeOf(b)
    if (d !== 0) return d
    if (a.source !== b.source) return a.source < b.source ? -1 : 1
    return String(a.id) < String(b.id) ? -1 : 1
  })

  return props.order === 'newest-first' ? all.reverse() : all
})

const visible = computed(() =>
  props.visibleKinds === null
    ? merged.value
    : merged.value.filter((entry) => props.visibleKinds.includes(entry.kind))
)

// An empty stream and a stream emptied BY THE FILTERS are different situations
// and get different copy -- "no messages" in front of an active filter reads as
// a bug. AspEmptyState carries the distinction as a variant.
const isFiltered = computed(() => merged.value.length > 0 && visible.value.length === 0)

const toggleKind = (value, on) => {
  const current = props.visibleKinds ?? []
  emit('update:visibleKinds', on ? [...current, value] : current.filter((k) => k !== value))
}

const submit = () => {
  if (props.disabled || !props.modelValue.trim()) return
  emit('send', props.modelValue)
}
</script>

<template>
  <section class="chat-area" :aria-label="ariaLabel">
    <div v-if="filterOptions.length" class="chat-area__filters">
      <AspCheckbox
        v-for="opt in filterOptions"
        :key="opt.value"
        :label="opt.label"
        :model-value="visibleKinds === null || visibleKinds.includes(opt.value)"
        :disabled="visibleKinds === null"
        @update:model-value="(on) => toggleKind(opt.value, on)"
      />
    </div>

    <!-- aria-live so a message arriving while the operator is elsewhere on the
         page is announced rather than silently appended. `polite`, not
         `assertive`: a chat stream must not interrupt. -->
    <div class="chat-area__stream" role="log" aria-live="polite" aria-busy="loading">
      <div v-if="loading" class="chat-area__skeleton" aria-hidden="true">
        <div
          v-for="n in 3"
          :key="n"
          class="chat-area__skeleton-row"
          :class="`chat-area__skeleton-row--${n % 2 ? 'in' : 'own'}`"
        />
      </div>

      <AspEmptyState
        v-else-if="!visible.length"
        :heading="isFiltered ? 'No matching messages' : emptyHeading"
        :message="isFiltered ? 'Every message is hidden by the current filters.' : ''"
        :variant="isFiltered ? 'filtered' : 'empty'"
      />

      <ul v-else class="chat-area__list">
        <AspBubble
          v-for="entry in visible"
          :key="`${entry.source}-${entry.id}`"
          :kind="entry.kind"
          :sender="entry.sender"
          :timestamp="entry.timestamp"
          :streaming="entry.id === streamingId"
          :data-source="entry.source"
        >
          <slot name="message" :entry="entry">{{ entry.body }}</slot>
        </AspBubble>
      </ul>
    </div>

    <form class="chat-area__composer" @submit.prevent="submit">
      <div class="chat-area__composer-field">
        <AspInput
          :model-value="modelValue"
          :placeholder="composerPlaceholder"
          :disabled="disabled"
          :aria-label="composerPlaceholder"
          @update:model-value="(v) => emit('update:modelValue', v)"
        />
      </div>
      <AspButton type="submit" variant="primary" :disabled="disabled || !modelValue.trim()">
        {{ sendLabel }}
      </AspButton>
    </form>
  </section>
</template>

<style scoped>
.chat-area {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  min-width: 0;
}

.chat-area__filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs) var(--space-sm);
}

/*
 * The opaque surface the bubbles composite over. Same pair as AspCard: the
 * surface is dark in BOTH themes, so the ink is the fixed on-dark value rather
 * than the ambient one, which flips.
 */
.chat-area__stream {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  overflow-y: auto;
  max-height: 60vh;
  padding: var(--space-sm);
  border-radius: var(--radius-lg);
  background: var(--surface-card);
  color: var(--text-on-dark);
}

.chat-area__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  margin: 0;
  padding: 0;
  list-style: none;
}

.chat-area__skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.chat-area__skeleton-row {
  height: 2.5rem;
  border-radius: var(--radius-md);
  /* Derives from the ink rather than binding a surface token, so it reads as a
     placeholder on this surface without assuming its polarity (#2418). */
  background: color-mix(in srgb, currentColor 12%, transparent);
}

.chat-area__skeleton-row--in {
  width: 60%;
}

.chat-area__skeleton-row--own {
  width: 45%;
  align-self: flex-end;
}

.chat-area__composer {
  display: flex;
  align-items: flex-start;
  gap: var(--space-xs);
}

.chat-area__composer-field {
  flex: 1;
  min-width: 0;
}
</style>
