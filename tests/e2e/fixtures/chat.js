// The merge fixture. Timestamps are deliberately INTERLEAVED across the two
// sources -- comment, transcript, comment, transcript -- so a component that
// concatenated instead of merging would produce a visibly different order and
// the spec would catch it. Two sources appended in creation order would pass a
// weaker fixture where all comments happened to sort after all messages.
//
// One pair (m3 / c3) shares an identical created_at, because equal timestamps
// are the case that decides whether the sort is stable or jitters between
// renders.
import { createApp, h, ref } from 'vue'

import '../../../build/tokens.css'
import { AspChatArea } from '../../../src/index.js'

const MESSAGES = [
  { id: 'm1', created_at: '2026-07-19T10:00:00Z', kind: 'agent', sender: 'engineer', body: 'transcript one', timestamp: '10:00' },
  { id: 'm2', created_at: '2026-07-19T10:02:00Z', kind: 'tool', sender: 'bash', body: 'transcript two', timestamp: '10:02' },
  { id: 'm3', created_at: '2026-07-19T10:04:00Z', kind: 'agent', sender: 'engineer', body: 'transcript three', timestamp: '10:04' },
  // No created_at at all: a real transcript can carry a null timestamp, and
  // NaN comparisons silently scramble a sort rather than failing loudly.
  { id: 'm4', created_at: null, kind: 'system', sender: 'system', body: 'transcript undated', timestamp: '' },
]

const COMMENTS = [
  { id: 'c1', created_at: '2026-07-19T10:01:00Z', kind: 'operator', sender: 'operator', body: 'comment one', timestamp: '10:01' },
  { id: 'c2', created_at: '2026-07-19T10:03:00Z', kind: 'operator', sender: 'operator', body: 'comment two', timestamp: '10:03' },
  { id: 'c3', created_at: '2026-07-19T10:04:00Z', kind: 'user', sender: 'operator', body: 'comment tied', timestamp: '10:04' },
]

const FILTERS = [
  { value: 'agent', label: 'conversation prose' },
  { value: 'tool', label: 'tool-calls' },
  { value: 'operator', label: 'operator' },
  { value: 'user', label: 'user' },
  { value: 'system', label: 'system' },
]

createApp({
  setup() {
    const draft = ref('')
    const sent = ref('none')
    const kinds = ref(null)
    const order = ref('chronological')

    return () =>
      h('div', { style: 'padding:24px' }, [
        h(AspChatArea, {
          messages: MESSAGES,
          comments: COMMENTS,
          filterOptions: FILTERS,
          order: order.value,
          visibleKinds: kinds.value,
          streamingId: 'm3',
          modelValue: draft.value,
          'onUpdate:modelValue': (v) => (draft.value = v),
          'onUpdate:visibleKinds': (v) => (kinds.value = v),
          onSend: (v) => {
            sent.value = v
            draft.value = ''
          },
        }),
        // Readouts and drivers, so the spec asserts behaviour without reaching
        // into component internals.
        h('p', { id: 'sent' }, sent.value),
        h(
          'button',
          { id: 'drive-newest', type: 'button', onClick: () => (order.value = 'newest-first') },
          'newest first'
        ),
        h(
          'button',
          {
            id: 'drive-filter',
            type: 'button',
            // Enabling filtering with prose-only is what turns the empty state
            // from "no messages" into "filtered".
            onClick: () => (kinds.value = ['agent']),
          },
          'filter to prose'
        ),
        h(
          'button',
          { id: 'drive-filter-none', type: 'button', onClick: () => (kinds.value = []) },
          'filter to nothing'
        ),
      ])
  },
}).mount('#app')
