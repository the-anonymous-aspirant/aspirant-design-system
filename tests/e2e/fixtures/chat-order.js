// The #3007 payload-order fixture. Every entry sits in the SAME displayed
// minute (14:38), because minute-level display is the shipped design of record
// and cannot disambiguate the order -- the underlying payload order must
// survive the render on its own.
//
// The entries arrive through the single `messages` prop, pre-merged and
// pre-sorted, exactly as system_3's conversation surfaces deliver the backend
// read model (`/api/conversation/{name}/transcript`). The backend sorted them
// at full MICROSECOND precision; Date.parse only carries milliseconds, so the
// pairs below are deliberate ties at the precision the component can see:
//
//   - o1 / o2: the operator-reported repro shape -- prose then comment,
//     761 ms apart within one displayed minute. Not a tie; pins the base case.
//   - t1 / t2: two comment rows in the same millisecond whose numeric ids
//     order OPPOSITE to their id lexicography ('comment-13308' < 'comment-9999'
//     as strings). An id tie-break renders these inverted.
//   - t3 / t4: a comment and a uuid-keyed prose turn in the same millisecond.
//     A source or id tie-break re-decides this pair; payload order must win.
//   - u1 / u2: two undated rows. Both parse to the same sentinel; they must
//     keep payload order at the stream's end, not scramble.
import { createApp, h, ref } from 'vue'

import '../../../build/tokens.css'
import { AspChatArea } from '../../../src/index.js'

const PAYLOAD = [
  {
    id: 'b7e2aa10-uuid',
    created_at: '2026-07-30T14:38:12.087Z',
    kind: 'agent',
    sender: 'system_3_manager',
    body: 'payload 1 manager prose',
    timestamp: '16:38',
  },
  {
    id: 'comment-13308',
    created_at: '2026-07-30T14:38:12.848872+00:00',
    kind: 'operator',
    sender: 'you',
    body: 'payload 2 operator comment',
    timestamp: '16:38',
  },
  {
    id: 'comment-9999',
    created_at: '2026-07-30T14:38:20.100200+00:00',
    kind: 'operator',
    sender: 'you',
    body: 'payload 3 older same-ms comment',
    timestamp: '16:38',
  },
  {
    id: 'comment-13309',
    created_at: '2026-07-30T14:38:20.100900+00:00',
    kind: 'operator',
    sender: 'you',
    body: 'payload 4 newer same-ms comment',
    timestamp: '16:38',
  },
  {
    id: 'comment-500',
    created_at: '2026-07-30T14:38:30.500Z',
    kind: 'operator',
    sender: 'you',
    body: 'payload 5 comment before prose',
    timestamp: '16:38',
  },
  {
    id: 'aa00cd34-uuid',
    created_at: '2026-07-30T14:38:30.500700+00:00',
    kind: 'agent',
    sender: 'system_3_manager',
    body: 'payload 6 same-ms prose',
    timestamp: '16:38',
  },
  {
    id: 'z-undated-1',
    created_at: null,
    kind: 'system',
    sender: 'system',
    body: 'payload 7 undated first',
    timestamp: '',
  },
  {
    id: 'a-undated-2',
    created_at: null,
    kind: 'system',
    sender: 'system',
    body: 'payload 8 undated second',
    timestamp: '',
  },
]

createApp({
  setup() {
    const order = ref('chronological')

    return () =>
      h('div', { style: 'padding:24px' }, [
        h(AspChatArea, {
          messages: PAYLOAD,
          order: order.value,
          modelValue: '',
        }),
        h(
          'button',
          { id: 'drive-newest', type: 'button', onClick: () => (order.value = 'newest-first') },
          'newest first'
        ),
        h(
          'button',
          { id: 'drive-oldest', type: 'button', onClick: () => (order.value = 'chronological') },
          'oldest first'
        ),
      ])
  },
}).mount('#app')
