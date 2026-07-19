// `now` is injected so the readings are deterministic. A component that reads
// the wall clock internally cannot be asserted at a boundary.
import { createApp, h } from 'vue'

import '../../../build/tokens.css'
import { AspTimeSince } from '../../../src/index.js'

const NOW = Date.parse('2026-07-19T12:00:00.000Z')
const at = (s) => new Date(NOW + s * 1000).toISOString()

createApp({
  setup() {
    return () =>
      h('div', { style: 'padding:24px;display:flex;flex-direction:column;gap:8px' }, [
        h('div', { id: 'elapsed' }, h(AspTimeSince, { datetime: at(-120), now: NOW })),
        h('div', { id: 'duration' }, h(AspTimeSince, { variant: 'duration', datetime: at(-1320), now: NOW })),
        h('div', { id: 'countdown' }, h(AspTimeSince, { variant: 'countdown', datetime: at(180), now: NOW })),
        h('div', { id: 'empty' }, h(AspTimeSince, { datetime: null, now: NOW })),
      ])
  },
}).mount('#app')
