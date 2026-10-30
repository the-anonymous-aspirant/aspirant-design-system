// §3.99 Tier 1 / §3.119 decision 5 (system_3 #9139): every DS control clears
// 24 x 24 CSS px, and AspBackButton keeps its own box under a column flex
// parent. One mount per control the spec measures.
import { createApp, h } from 'vue'

import '../../../build/tokens.css'
import {
  AspBackButton,
  AspBadge,
  AspButton,
  AspDataTable,
  AspFreshness,
} from '../../../src/index.js'

createApp({
  setup() {
    return () =>
      h('div', [
        h('section', { id: 'sm' }, [h(AspButton, { size: 'sm', variant: 'secondary' }, () => 'Retry')]),
        h('section', { id: 'md' }, [h(AspButton, { size: 'md', variant: 'secondary' }, () => 'Retry')]),
        h('section', { id: 'fresh' }, [
          h(AspFreshness, { lastSuccessfulAt: '2026-10-29T18:00:00Z', now: Date.parse('2026-10-29T18:05:00Z') }),
        ]),
        h('section', { id: 'sort' }, [
          h(AspDataTable, {
            columns: [
              { key: 'name', label: 'Name' },
              { key: 'n', label: 'N', align: 'right' },
            ],
            rows: [{ name: 'a', n: 1 }],
          }),
        ]),
        h('section', { id: 'chip' }, [
          h(AspBadge, { variant: 'chip', removable: true }, () => 'design-spec'),
          ' ',
          h(AspBadge, { variant: 'chip' }, () => 'design-spec'),
        ]),
        h('section', { id: 'back' }, [h(AspBackButton, { position: 'inline', to: '#' })]),
      ])
  },
}).mount('#app')
