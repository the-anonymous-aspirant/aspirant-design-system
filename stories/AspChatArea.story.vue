<script setup>
import { ref } from 'vue'
import AspChatArea from '../src/components/AspChatArea.vue'
import AspChatBubble from '../src/components/AspChatBubble.vue'
import AspCard from '../src/components/AspCard.vue'

// Interleaved on purpose: comment, transcript, comment, transcript. A demo
// whose comments all sorted after the transcript would look correct under a
// component that never merged at all.
const MESSAGES = [
  {
    id: 'm1',
    created_at: '2026-07-19T10:00:00Z',
    kind: 'agent',
    sender: 'aspirant_engineer',
    body: 'Picked up #2381. Reading the ratified §3.12 ruling first.',
    timestamp: '10:00',
  },
  {
    id: 'm2',
    created_at: '2026-07-19T10:02:00Z',
    kind: 'tool',
    sender: 'bash',
    body: 'grep -n "brand-primary-alpha" build/tokens.css',
    timestamp: '10:02',
  },
  {
    id: 'm3',
    created_at: '2026-07-19T10:05:00Z',
    kind: 'agent',
    sender: 'aspirant_engineer',
    body: 'Both fills are alphas. Measuring them composited before I build anything.',
    timestamp: '10:05',
  },
  {
    id: 'm4',
    created_at: '2026-07-19T10:07:00Z',
    kind: 'system',
    sender: 'system',
    body: 'Contrast matrix: 9 passed.',
    timestamp: '10:07',
  },
]

const COMMENTS = [
  {
    id: 'c1',
    created_at: '2026-07-19T10:01:00Z',
    kind: 'operator',
    sender: 'operator',
    body: 'Does the amber tint survive on the light page?',
    timestamp: '10:01',
  },
  {
    id: 'c2',
    created_at: '2026-07-19T10:06:00Z',
    kind: 'operator',
    sender: 'operator',
    body: 'Good. Ship it behind the probe.',
    timestamp: '10:06',
  },
]

const FILTERS = [
  { value: 'agent', label: 'conversation prose' },
  { value: 'tool', label: 'tool-calls' },
  { value: 'system', label: 'system' },
  { value: 'operator', label: 'operator' },
]

// Machine noise collapsed, signal expanded — the §3.15 parity the collapsed
// variant exists for. The consumer bakes the kind suffix into the sender, so
// the one-line summary reads 'bash · tool call' before it is opened. The agent
// prose and the operator comment carry no `collapsed`, so they render in full.
const MIXED = [
  {
    id: 'x1',
    created_at: '2026-07-19T10:00:00Z',
    kind: 'agent',
    sender: 'aspirant_engineer',
    body: 'Picked up #2381. Measuring the two fills before I build anything.',
    timestamp: '10:00',
  },
  {
    id: 'x2',
    created_at: '2026-07-19T10:02:00Z',
    kind: 'tool',
    sender: 'bash · tool call',
    body: 'grep -n "brand-primary-alpha" build/tokens.css',
    timestamp: '10:02',
    collapsed: true,
  },
  {
    id: 'x3',
    created_at: '2026-07-19T10:02:30Z',
    kind: 'tool',
    sender: 'bash · tool result',
    body: 'build/tokens.css:214:  --brand-primary-alpha: rgba(255, 179, 0, 0.16);',
    timestamp: '10:02',
    collapsed: true,
  },
  {
    id: 'x4',
    created_at: '2026-07-19T10:05:00Z',
    kind: 'agent',
    sender: 'aspirant_engineer',
    body: 'Both fills are alphas, so their contrast is a function of the backdrop.',
    timestamp: '10:05',
  },
]

const MIXED_COMMENTS = [
  {
    id: 'xc1',
    created_at: '2026-07-19T10:06:00Z',
    kind: 'operator',
    sender: 'operator',
    body: 'Good — collapse the machinery, keep the prose open.',
    timestamp: '10:06',
  },
]

const draft = ref('')
const kinds = ref(null)
const sent = ref([])
const onSend = (text) => {
  sent.value = [text, ...sent.value].slice(0, 3)
  draft.value = ''
}

// A long thread (over the default windowSize of 50) for the §3.25/§3.29 render
// window: only the newest 50 render, older load on the "Load N earlier" button.
const LONG_THREAD = Array.from({ length: 120 }, (_, i) => ({
  id: `L${i + 1}`,
  created_at: `2026-07-19T${String(9 + Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00Z`,
  kind: i % 3 === 0 ? 'tool' : 'agent',
  sender: 'aspirant_engineer',
  body: `Turn ${i + 1} of a long transcript.`,
  timestamp: '',
}))
</script>

<template>
  <Story title="Components/AspChatArea">
    <template #docs>
      <p>
        <strong>Purpose:</strong> the conversation surface (<code>docs/COMPONENTS.md</code> §16) —
        the Agents view and the Overview manager embed.
      </p>
      <p>
        <strong>The point of this component is the merge.</strong> The operator's own messages live
        in the <code>comments</code> table; the agent's live in the session transcript. A view that
        renders only the transcript shows the operator a conversation with their own half deleted —
        that is <strong>#2348</strong>, the defect this exists to fix. So the two sources are
        separate props and the interleave is the component's guarantee: a caller cannot forget to
        merge, or merge wrongly, because it is not their job.
      </p>
      <p>
        <strong>Both bubble variants set their own background <em>and</em> ink</strong>
        (amendment #9766). Neither inherits ambient ink.
      </p>
      <p>
        <strong>Why the own bubble is not <code>--brand-primary-alpha</code>.</strong> The §3.12
        ruling names two fills and <em>both are alphas</em> — they composite over whatever is
        beneath, so their contrast becomes a function of a backdrop the component cannot see.
        Measured across the six real backdrops, no single ink survives: black is
        <strong>4.15:1</strong> on the dark page, white is <strong>1.55:1</strong> on the light
        page. The ink would have to flip by backdrop. That is the #2417/#2419 mechanism.
        <code>--brand-primary-200</code> is that alpha composited over white to within
        <code>rgb(255,224,130)</code> vs <code>rgb(255,216,125)</code> — the ruling's own
        appearance, but opaque and with no dark override, so it measures the same wherever it is
        dropped. Ink is <code>--text-on-fixed-light</code>, exactly as <code>AspButton</code>'s
        primary does it (#2417): brand amber is light in every theme, so its ink must not flip.
      </p>
      <p>
        <strong>The inbound fill is unchanged from the ruling</strong> — it keeps
        <code>--surface-card-inner</code>, but the <em>area</em> supplies the opaque surface beneath
        it. That token is a black 30% wash in light and a white 6% wash in dark — opposite
        polarities — so over an ambient light page it lands at <strong>3.82:1</strong> with
        <strong>2.85:1</strong> timestamps. Over the area's own surface it is 13.54:1 / 9.05:1. The
        matrix renders the area on the light page <em>and</em> in a dark card and asserts the two
        measure <strong>identically</strong>, not merely that both clear AA — both could pass while
        still varying with the backdrop, and that variance is the defect.
      </p>
      <p>
        <strong>The monitoring surface (§3.20 P1).</strong> The agent pane is a monitoring surface,
        not a chat: the stream runs <code>order="newest-first"</code> and
        <code>composer-position="top"</code> together, so the newest message and the reply
        affordance are both above the fold without a scroll. The two are one ratified decision
        (operator sign-off 2026-07-20); the defaults stay <code>chronological</code> / bottom
        because P1 is scoped to that surface, and §3.12 makes the pairing parity-definitional across
        both mounts, so a caller sets the same pair on each.
      </p>
    </template>

    <Variant title="Merged stream">
      <AspChatArea
        v-model="draft"
        v-model:visible-kinds="kinds"
        :messages="MESSAGES"
        :comments="COMMENTS"
        :filter-options="FILTERS"
        @send="onSend"
      />
      <p v-if="sent.length" style="margin-top: 8px; font-size: 0.8rem; opacity: 0.7">
        sent: {{ sent.join(' · ') }}
      </p>
    </Variant>

    <Variant title="Inside a card (the backdrop the matrix compares against)">
      <AspCard>
        <AspChatArea :messages="MESSAGES" :comments="COMMENTS" />
      </AspCard>
    </Variant>

    <Variant title="Newest first">
      <AspChatArea :messages="MESSAGES" :comments="COMMENTS" order="newest-first" />
    </Variant>

    <Variant title="Monitoring surface (§3.20 P1: newest-first + composer on top)">
      <AspChatArea
        v-model="draft"
        :messages="MESSAGES"
        :comments="COMMENTS"
        order="newest-first"
        composer-position="top"
        @send="onSend"
      />
    </Variant>

    <Variant title="Collapsed machinery (§3.15: noise is texture on a turn)">
      <AspChatArea :messages="MIXED" :comments="MIXED_COMMENTS" />
      <p style="margin-top: 8px; font-size: 0.8rem; opacity: 0.7">
        Tool calls/results render as muted one-line summaries; click one to expand it. The agent
        prose and operator comment carry no <code>collapsed</code>, so they stay open.
      </p>
    </Variant>

    <Variant title="Streaming">
      <AspChatArea :messages="MESSAGES" :comments="COMMENTS" streaming-id="m4" />
    </Variant>

    <Variant title="Loading">
      <AspChatArea loading />
    </Variant>

    <Variant title="Empty">
      <AspChatArea :messages="[]" :comments="[]" />
    </Variant>

    <Variant title="Bubbles alone">
      <!-- Bubbles are not standalone: the inbound fill is translucent and needs
           the area's opaque surface, so the specimen keeps one. -->
      <div style="background: var(--surface-card); padding: 12px; border-radius: 8px">
        <ul
          style="
            list-style: none;
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            gap: 8px;
          "
        >
          <AspChatBubble kind="agent" sender="aspirant_engineer" timestamp="10:00">
            Inbound — recessed inner surface, left-aligned, amber sender tag.
          </AspChatBubble>
          <AspChatBubble kind="operator" sender="operator" timestamp="10:01">
            Own — brand tint, right-aligned, fixed-light ink.
          </AspChatBubble>
          <AspChatBubble kind="tool" sender="bash" timestamp="10:02" streaming>
            Streaming caret
          </AspChatBubble>
          <AspChatBubble kind="tool" sender="bash · tool call" timestamp="10:03" collapsed>
            Collapsed — a muted one-line summary; click to expand this body.
          </AspChatBubble>
        </ul>
      </div>
    </Variant>

    <Variant title="Windowed thread (§3.25 render window)">
      <p style="margin-bottom: 8px; color: var(--text-muted);">
        A 120-turn transcript. Only the newest <code>windowSize</code> (default 50) render; the
        rest load on the real, focusable <strong>Load N earlier</strong> button (≥44px, absent —
        not disabled — once nothing older remains). The "showing X–Y of Z" line reads the canonical
        total, never a running counter. Open devtools: ~50 bubbles are in the DOM, not 120. A thread
        of 50 or fewer renders whole with no button and no position line.
      </p>
      <AspChatArea :messages="LONG_THREAD" aria-label="Long transcript" />
    </Variant>
  </Story>
</template>
