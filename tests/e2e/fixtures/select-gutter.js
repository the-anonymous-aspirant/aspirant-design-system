// Two AspSelects in a 16px-gutter row (system_3 #10854, design_conventions
// §3.151): one at the left edge, one in the right half, as the console's
// Overview Epic and Tasks label filters sit at 390px. Their options are wider
// than the room to the right trigger's right. ?searchable=1 turns on search;
// ?bottom=1 puts the row near the viewport's bottom, so the panels open above.
import { createApp, h, ref } from 'vue'

import '../../../build/tokens.css'
import { AspSelect } from '../../../src/index.js'

const LONG = [
  'Retroactive invoice app for user flowah: PayPal import, categorise, issue German invoices',
  'Admin page: per-service memory, disk, last-used and start/stop for the cell',
  'Gmail to data lake, on demand: OAuth, encrypted high-sensitivity ingest',
  'Changelog per-PR fragments: end docs/CHANGELOG.md merge conflicts',
  'Cell temperature and fan speed over time on the health page',
  'Short one',
]
const options = LONG.map((label, i) => ({ value: `o${i}`, label }))
const q = new URLSearchParams(location.search)
const searchable = q.get('searchable') === '1'

createApp({
  setup() {
    const left = ref(null)
    const right = ref(null)
    const select = (model, test) =>
      h('div', [
        h(AspSelect, {
          modelValue: model.value,
          'onUpdate:modelValue': (v) => (model.value = v),
          options,
          searchable,
          placeholder: 'Choose',
          'aria-label': test,
          'data-test': test,
        }),
      ])
    return () =>
      h('div', { class: q.get('bottom') === '1' ? 'bottom' : 'page' }, [
        h('div', { class: 'row' }, [select(left, 'left-select'), select(right, 'right-select')]),
      ])
  },
}).mount('#app')
