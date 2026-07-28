// A 500-row table (over the virtualization threshold) and a 5-row table (under
// it), so the spec can prove the windowed one bounds the DOM while the small one
// renders plainly. The two live in labelled sections so the spec can scope to
// each. (#2779-A1)
import { createApp, h } from 'vue'

import '../../../build/tokens.css'
import { AspDataTable } from '../../../src/index.js'

const columns = [
  { key: 'id', label: '#', align: 'right', width: '4rem' },
  { key: 'name', label: 'Name' },
  { key: 'owner', label: 'Owner' },
]

const big = Array.from({ length: 500 }, (_, i) => ({
  id: i + 1,
  name: `Row ${i + 1}`,
  owner: i % 2 ? 'engineer' : 'aspirant',
}))

const small = Array.from({ length: 5 }, (_, i) => ({
  id: i + 1,
  name: `Small ${i + 1}`,
  owner: 'aspirant',
}))

createApp({
  setup() {
    return () =>
      h('div', { style: 'padding:24px' }, [
        h('section', { id: 'big' }, [
          h(AspDataTable, { columns, rows: big, rowKey: 'id', caption: 'big' }),
        ]),
        h('section', { id: 'small', style: 'margin-top:24px' }, [
          h(AspDataTable, { columns, rows: small, rowKey: 'id', caption: 'small' }),
        ]),
      ])
  },
}).mount('#app')
