// A 500-row table (over the virtualization threshold) and a 5-row table (under
// it), so the spec can prove the windowed one bounds the DOM while the small one
// renders plainly. The two live in labelled sections so the spec can scope to
// each. (#2779-A1)
//
// Additional sections (#4318 / §3.88) exercise the per-row hooks: rowAttrs
// (attribute pass-through + reserved-key guard) and rowState (closed emphasis
// vocabulary), including under virtualization with absolute row indices.
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

// rowAttrs: real test hooks PLUS a deliberate attempt to clobber reserved keys,
// so the spec can prove the component's own bindings win (the reserved keys are
// stripped, never rendered).
const attrsFn = (row) => ({
  'data-test-row-id': row.id,
  'data-test-source': row.owner,
  class: 'consumer-hacked',
  tabindex: 99,
  'data-row-index': 999,
  role: 'presentation',
  onClick: () => {
    window.__consumerClicked = true
  },
})

// rowState: a closed vocabulary. Row 2 returns an out-of-set value that must be
// ignored (no raw class leaks).
const stateFn = (row, i) => (i === 0 ? 'muted' : i === 1 ? 'active' : i === 2 ? 'bogus' : null)

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
        h('section', { id: 'attrs', style: 'margin-top:24px' }, [
          h(AspDataTable, { columns, rows: small, rowKey: 'id', rowAttrs: attrsFn }),
        ]),
        // rowState on a LIGHT token surface and a DARK token surface, so the AA
        // check exercises the emphasis in both — the table inherits the surface's
        // ink, and --muted/--active must stay AA on each.
        h(
          'section',
          {
            id: 'state',
            style:
              'margin-top:24px; background: var(--surface-elevated); color: var(--text-on-light); padding: 8px',
          },
          [h(AspDataTable, { columns, rows: small, rowKey: 'id', rowState: stateFn })],
        ),
        h(
          'section',
          {
            id: 'state-dark',
            style:
              'margin-top:24px; background: var(--surface-card); color: var(--text-on-dark); padding: 8px',
          },
          [h(AspDataTable, { columns, rows: small, rowKey: 'id', rowState: stateFn })],
        ),
        // Virtualized: hooks must key off the ABSOLUTE index, not the window-local
        // one — rowAttrs stamps the absolute index, rowState marks row 250 active.
        h('section', { id: 'bighooks', style: 'margin-top:24px' }, [
          h(AspDataTable, {
            columns,
            rows: big,
            rowKey: 'id',
            rowAttrs: (row, i) => ({ 'data-abs': i }),
            rowState: (row, i) => (i === 250 ? 'active' : null),
          }),
        ]),
      ])
  },
}).mount('#app')
