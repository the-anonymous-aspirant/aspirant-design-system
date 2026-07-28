// A 120-message thread (over the default windowSize of 50) and a 10-message one
// (under it), so the spec can prove the long thread windows its render — newest
// 50 in the DOM, older on a real "Load earlier" button — while the short thread
// renders whole with no button and no position line. (#2779-A2)
import { createApp, h, ref } from 'vue'

import '../../../build/tokens.css'
import { AspChatArea } from '../../../src/index.js'

// msg 1 is oldest, msg 120 newest (created_at increases with the number).
const big = Array.from({ length: 120 }, (_, i) => ({
  id: `m${i + 1}`,
  created_at: `2026-07-19T${String(Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00Z`,
  kind: 'agent',
  sender: 'engineer',
  body: `msg ${i + 1}`,
  timestamp: '',
}))

const small = Array.from({ length: 10 }, (_, i) => ({
  id: `s${i + 1}`,
  created_at: `2026-07-19T08:${String(i).padStart(2, '0')}:00Z`,
  kind: 'agent',
  sender: 'engineer',
  body: `small ${i + 1}`,
  timestamp: '',
}))

createApp({
  setup() {
    const order = ref('chronological')
    return () =>
      h('div', { style: 'padding:24px' }, [
        h('section', { id: 'big' }, [
          h(AspChatArea, { messages: big, order: order.value, ariaLabel: 'big thread' }),
        ]),
        h(
          'button',
          { id: 'drive-newest', type: 'button', onClick: () => (order.value = 'newest-first') },
          'newest first'
        ),
        h('section', { id: 'small', style: 'margin-top:24px' }, [
          h(AspChatArea, { messages: small, ariaLabel: 'small thread' }),
        ]),
      ])
  },
}).mount('#app')
