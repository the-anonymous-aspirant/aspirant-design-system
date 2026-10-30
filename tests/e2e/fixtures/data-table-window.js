// A phone list under a filter block (§3.120 Q11, system_3 #9182): an
// AspDataTable with `scroll-root="window"`, so the PAGE is the only scroller.
//   ?n=1000   rows (default 1000; 50 is below the virtualization threshold)
//   ?root=self  the default inner scroll box, for the before/after evidence
import { createApp, h } from 'vue'

import '../../../build/tokens.css'
import { AspDataTable } from '../../../src/index.js'

const q = new URLSearchParams(location.search)
const n = Number(q.get('n') || 1000)
const scrollRoot = q.get('root') || 'window'

const columns = [
  { key: 'id', label: '#', align: 'right', width: '4rem' },
  { key: 'name', label: 'Name', role: 'identity' },
  { key: 'owner', label: 'Owner' },
]
const rows = Array.from({ length: n }, (_, i) => ({
  id: i + 1,
  name: `Task ${i + 1}`,
  owner: i % 2 ? 'engineer' : 'aspirant',
}))

createApp({
  setup() {
    return () =>
      h('div', [
        h('div', { class: 'filters', 'aria-hidden': 'true' }, Array.from({ length: 7 }, () => h('div'))),
        h(AspDataTable, { columns, rows, rowKey: 'id', scrollRoot, caption: 'Tasks' }),
      ])
  },
}).mount('#app')
