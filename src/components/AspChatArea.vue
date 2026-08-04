<script setup>
import { computed, nextTick, ref, watch } from 'vue'

import AspBubble from './AspChatBubble.vue'
import AspCheckbox from './AspCheckbox.vue'
import AspComposer from './AspComposer.vue'
import AspEmptyState from './AspEmptyState.vue'

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
   * Stream order. Newest-first is round-2 P1, now ratified for the agent-pane
   * monitoring surface (conventions §3.20 P1, operator sign-off 2026-07-20).
   * The default stays `chronological` because P1 is SCOPED to that surface --
   * a caller doing the monitoring job opts in; every other mount is unchanged.
   */
  order: {
    type: String,
    default: 'chronological',
    validator: (v) => ['chronological', 'newest-first'].includes(v),
  },
  /**
   * Where the composer sits. `bottom` is the conventional chat position and the
   * default, so every existing mount is untouched. `top` is the §3.20 P1
   * monitoring surface: the composer moves above the (newest-first) stream so
   * the latest message and the reply affordance are both above the fold and
   * neither needs a scroll. Pair it with `order="newest-first"` -- the two are
   * one decision (§3.20 P1), and §3.12 makes the pairing parity-definitional
   * across both mounts, so a caller sets the same pair on each.
   */
  composerPosition: {
    type: String,
    default: 'bottom',
    validator: (v) => ['top', 'bottom'].includes(v),
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
  /**
   * Render-window size (crash-safety §3.25/§3.29, task #2779-A2). Only the newest
   * `windowSize` entries are materialised as bubbles; older ones load on a real
   * "Load N earlier" button. This is the RENDER window and is independent of the
   * FETCH window a consumer's limit dropdown sets — the two coexist. A thread of
   * `windowSize` or fewer renders whole, with no button and no position line, so
   * every existing mount is untouched.
   */
  windowSize: { type: Number, default: 50 },
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
 * Equal keys keep INPUT order (sort stability, guaranteed since ES2019), and
 * that is load-bearing rather than cosmetic: the backend orders turns at full
 * microsecond precision, but Date.parse only carries milliseconds, so two rows
 * within the same millisecond are a tie HERE while the payload already knows
 * their order. Any explicit tie-break (id lexicography, source name) re-decides
 * that order from information the backend did not sort by -- which is how
 * same-minute turns rendered inverted (#3007). Returning 0 also covers the
 * both-unparseable case, where Infinity - Infinity is NaN and the comparator
 * would otherwise go inconsistent. Cross-source same-instant pairs land
 * transcript-first via the concat order below, matching the backend merge
 * ("transcript turns precede same-instant comments").
 */
const merged = computed(() => {
  const tag = (rows, source) => (rows || []).map((entry) => ({ ...entry, source }))
  const all = [...tag(props.messages, 'transcript'), ...tag(props.comments, 'comment')]

  all.sort((a, b) => {
    const ta = timeOf(a)
    const tb = timeOf(b)
    return ta === tb ? 0 : ta - tb
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

// --- Tail-anchored render window (§3.25/§3.29, #2779-A2) ---------------------
// Only the newest `shown` of the `visible` entries are materialised as bubbles;
// the rest load on the button below. New entries at the live edge appear
// automatically because the slice is always taken from the newest end, so the
// window stays anchored to the bottom (chronological) / top (newest-first)
// without a re-anchor step.
const streamEl = ref(null)
const shown = ref(props.windowSize)

const total = computed(() => visible.value.length)
const isWindowed = computed(() => total.value > props.windowSize)

const windowedVisible = computed(() => {
  if (total.value <= shown.value) return visible.value
  // The live edge is the newest end; slice keeps the newest `shown`. In
  // chronological order the newest sit at the tail, in newest-first at the head.
  return props.order === 'newest-first'
    ? visible.value.slice(0, shown.value)
    : visible.value.slice(total.value - shown.value)
})

const olderCount = computed(() => total.value - windowedVisible.value.length)
// Honest position from the canonical total (§3.25 / §3.23-rule-7): the newest
// `shown` are positions (total-shown+1)…total whichever way the stream is
// ordered, so a reader sees where the window sits, never a running counter.
const firstShown = computed(() =>
  total.value ? total.value - windowedVisible.value.length + 1 : 0,
)
const loadLabel = computed(() => `Load ${Math.min(props.windowSize, olderCount.value)} earlier`)

// Materialise the next chunk of older entries WITHOUT moving the reading
// position (§3.25). Older entries prepend ABOVE the view only in chronological
// order, so the scroll compensation is applied there; in newest-first they
// append below the (top-anchored) newest, leaving the reading position put.
async function loadEarlier() {
  const el = streamEl.value
  const prependsAbove = props.order !== 'newest-first'
  const beforeH = el ? el.scrollHeight : 0
  const beforeTop = el ? el.scrollTop : 0
  shown.value += props.windowSize
  await nextTick()
  if (el && prependsAbove) {
    el.scrollTop = beforeTop + (el.scrollHeight - beforeH)
  }
}

// A shrinking thread (filter toggle, source swap) must not strand `shown` above
// a set it no longer covers — clamp it back so olderCount reads honestly. Growth
// is never clamped, so loaded context survives new arrivals at the live edge.
watch(total, (n) => {
  if (shown.value > Math.max(props.windowSize, n)) shown.value = Math.max(props.windowSize, n)
})

const toggleKind = (value, on) => {
  const current = props.visibleKinds ?? []
  emit('update:visibleKinds', on ? [...current, value] : current.filter((k) => k !== value))
}

// The composer's own submit/Enter-to-send/empty guard now live in AspComposer;
// this component just re-emits the primitive's `send` and `update:modelValue`.
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

    <!-- The composer renders ABOVE the stream on the monitoring surface (§3.20
         P1). It is placed in the DOM at its visual position rather than moved
         with CSS `order`, so keyboard focus order matches reading order (WCAG
         2.4.3): on the monitoring surface the operator tabs to the reply field
         first. `bottom` (the default) keeps the composer last, unchanged. -->
    <!-- The one composer grammar, mounted as the AspComposer primitive (§3.47).
         `chat-area__composer` is kept as the class the composer's form carries
         (Vue merges it onto the primitive's root <form>): it is the stable hook
         the AspChatArea e2e suite selects on and the element whose position the
         top/bottom placement tests measure. -->
    <AspComposer
      v-if="composerPosition === 'top'"
      class="chat-area__composer"
      :model-value="modelValue"
      :placeholder="composerPlaceholder"
      :send-label="sendLabel"
      :disabled="disabled"
      @update:model-value="(v) => emit('update:modelValue', v)"
      @send="(v) => emit('send', v)"
    >
      <!-- Forward a leading-controls affordance (§3.62) down to the composer
           primitive, but ONLY when the parent supplies one — so an AspChatArea
           with no composer-leading slot passes NO slot to AspComposer and its
           empty-slot-unchanged guarantee holds. -->
      <template v-if="$slots['composer-leading']" #leading-controls>
        <slot name="composer-leading" />
      </template>
    </AspComposer>

    <!-- aria-live so a message arriving while the operator is elsewhere on the
         page is announced rather than silently appended. `polite`, not
         `assertive`: a chat stream must not interrupt. -->
    <div
      ref="streamEl"
      class="chat-area__stream"
      role="log"
      aria-live="polite"
      :aria-busy="loading"
    >
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

      <template v-else>
        <!-- Honest position from the canonical total, not a running counter
             (§3.25 / §3.23-rule-7). Shown only while the thread is windowed. -->
        <p v-if="isWindowed" class="chat-area__position" data-testid="chat-position">
          showing {{ firstShown }}–{{ total }} of {{ total }}
        </p>

        <!-- Chronological: older sits ABOVE, so the button leads the list. It is
             ABSENT (not disabled) once nothing older remains (§3.23). -->
        <button
          v-if="olderCount && order !== 'newest-first'"
          type="button"
          class="chat-area__load-earlier"
          data-testid="load-earlier"
          @click="loadEarlier"
        >
          {{ loadLabel }}
        </button>

        <ul class="chat-area__list">
          <AspBubble
            v-for="entry in windowedVisible"
            :key="`${entry.source}-${entry.id}`"
            :kind="entry.kind"
            :sender="entry.sender"
            :timestamp="entry.timestamp"
            :streaming="entry.id === streamingId"
            :collapsed="entry.collapsed ?? false"
            :data-source="entry.source"
          >
            <slot name="message" :entry="entry">{{ entry.body }}</slot>
          </AspBubble>
        </ul>

        <!-- Newest-first: older sits BELOW the top-anchored newest, so the button
             trails the list. -->
        <button
          v-if="olderCount && order === 'newest-first'"
          type="button"
          class="chat-area__load-earlier"
          data-testid="load-earlier"
          @click="loadEarlier"
        >
          {{ loadLabel }}
        </button>
      </template>
    </div>

    <AspComposer
      v-if="composerPosition === 'bottom'"
      class="chat-area__composer"
      :model-value="modelValue"
      :placeholder="composerPlaceholder"
      :send-label="sendLabel"
      :disabled="disabled"
      @update:model-value="(v) => emit('update:modelValue', v)"
      @send="(v) => emit('send', v)"
    >
      <template v-if="$slots['composer-leading']" #leading-controls>
        <slot name="composer-leading" />
      </template>
    </AspComposer>
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

/* Honest position line (§3.25). Full stream ink — no dimming — so it clears AA
   on the dark surface the stream guarantees, same as the bubbles. */
.chat-area__position {
  margin: 0;
  align-self: center;
  font-size: var(--text-xs);
  color: inherit;
}

/* "Load N earlier" — a real, focusable, ≥44px control on the stream's dark
   surface. Its fill derives from the ink (currentColor) rather than binding a
   surface token, so it reads as an inset control without assuming polarity
   (#2418), and stays legible whichever theme the surface renders in. */
.chat-area__load-earlier {
  align-self: center;
  min-height: 44px;
  padding: var(--space-2xs) var(--space-md);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, currentColor 8%, transparent);
  color: inherit;
  font: inherit;
  font-size: var(--text-sm);
  cursor: pointer;
}
.chat-area__load-earlier:hover {
  background: color-mix(in srgb, currentColor 15%, transparent);
}
.chat-area__load-earlier:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
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

/* The composer's layout, textarea sizing (§3.42) and send-button floor now live
   in AspComposer.vue — this component composes that primitive rather than
   restating its grammar (§3.47). */
</style>
