// Every live vocab fill as a chip and a dot, plus the boundary case, rendered
// through the real component so the probe measures what actually ships.
import { createApp, h } from 'vue'

import '../../../build/tokens.css'
import { AspBadge } from '../../../src/index.js'
import { LIVE_VOCAB_FILLS } from './vocab_fills.js'

createApp({
  setup() {
    return () =>
      h('div', { style: 'padding:24px;display:flex;flex-direction:column;gap:8px' }, [
        h('div', { id: 'chips', style: 'display:flex;flex-wrap:wrap;gap:8px' },
          LIVE_VOCAB_FILLS.map((c) =>
            h(AspBadge, { variant: 'chip', color: c, key: c, 'data-fill': c }, () => c)
          )
        ),
        h('div', { id: 'dots', style: 'display:flex;flex-wrap:wrap;gap:8px' },
          LIVE_VOCAB_FILLS.map((c) =>
            h(AspBadge, { variant: 'dot', color: c, key: c, ariaLabel: c }, () => c)
          )
        ),
        // Regression: the four token-driven variants must be untouched.
        h('div', { id: 'semantic', style: 'display:flex;gap:8px' }, [
          h(AspBadge, { variant: 'status', status: 'positive' }, () => 'status'),
          h(AspBadge, { variant: 'chip' }, () => 'chip'),
          h(AspBadge, { variant: 'filter' }, () => 'filter'),
          h(AspBadge, { variant: 'dot', status: 'caution' }, () => 'dot'),
        ]),
        // Bad data must fall back, not render something arbitrary.
        h('div', { id: 'malformed' }, [
          h(AspBadge, { variant: 'chip', color: 'not-a-colour' }, () => 'fallback'),
        ]),
      ])
  },
}).mount('#app')
