// A 500-row table (over the virtualization threshold) and a 5-row table (under
// it), so the spec can prove the windowed one bounds the DOM while the small one
// renders plainly. The two live in labelled sections so the spec can scope to
// each. (#2779-A1)
//
// Additional sections (#4318 / §3.88) exercise the per-row hooks: rowAttrs
// (attribute pass-through + reserved-key guard) and rowState (closed emphasis
// vocabulary), including under virtualization with absolute row indices.
//
// The #9133 sections (§3.119) exercise the phone card list: cards at a 390px
// and 639px container, a table at 640px, the identity floor at 768 and 1024
// against the console's `max-width: 0` slack trick (with an undeclared twin as
// the control), and card mode under virtualization. The #4529 overflow sections
// set narrow: 'scroll', the matrix opt-out, since a 12-column table in a 320px
// box is otherwise a card list.
import { createApp, h, ref } from 'vue'

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

// A wide table (12 fixed-width columns) for the #4529 horizontal-overflow cue —
// dropped in a narrow (max-width) container in the fixture so it overflows.
const wide = Array.from({ length: 12 }, (_, i) => ({
  key: `c${i}`,
  label: `Column ${i + 1}`,
  width: '10rem',
}))
const wideRows = Array.from({ length: 4 }, (_, r) => {
  const row = {}
  wide.forEach((c, i) => {
    row[c.key] = `r${r + 1}-${i + 1}`
  })
  return row
})

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

// --- #9133 card mode ---------------------------------------------------------
// A record table: identity, four secondary columns and a numeric figure.
const cardCols = [
  { key: 'name', label: 'Agent', role: 'identity' },
  { key: 'kind', label: 'Kind' },
  { key: 'owner', label: 'Owner' },
  { key: 'started', label: 'Session started' },
  { key: 'count', label: 'Count', role: 'figure', align: 'right' },
]
const cardRows = Array.from({ length: 6 }, (_, i) => ({
  id: i + 1,
  name: i === 0 ? 'system_3_manager with a long identity that has to wrap' : `agent_${i + 1}`,
  kind: i % 2 ? 'spawn' : 'heartbeat',
  owner: i % 2 ? 'aspirant_engineer' : 'design_agent',
  started: `2026-10-29 1${i}:0${i}Z`,
  count: 1000 * (i + 1) + 234567,
}))
const bigCards = Array.from({ length: 500 }, (_, i) => ({
  id: i + 1,
  name: i % 7 ? `agent_${i + 1}` : `agent_${i + 1} with a longer name that wraps onto a second line`,
  kind: 'spawn',
  owner: 'aspirant_engineer',
  started: '2026-10-29 12:00Z',
  count: i,
}))

// A /tasks-shaped table, columns and values as the console's /tasks renders
// them, under the console's slack trick. `floorCols` declares the identity;
// `slackCols` is the same table undeclared, the control that shows the
// collapse the floor prevents (#9104 B1-1: 64px on the served console).
const slackBase = [
  { key: 'assignee', label: 'Assignee' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'complexity', label: 'Complexity' },
  { key: 'labels', label: 'Labels', width: '11rem' },
  { key: 'updated', label: 'Updated', align: 'right' },
]
const floorCols = [{ key: 'task', label: 'Task', truncate: true, role: 'identity' }, ...slackBase]
const slackCols = [{ key: 'task', label: 'Task', truncate: true }, ...slackBase]
const slackRows = Array.from({ length: 4 }, (_, i) => ({
  task: `#913${i} Design spec: AspDataTable phone card list, column roles and identity floor`,
  assignee: 'aspirant_engineer',
  status: 'in_progress',
  priority: 'operator ask',
  complexity: 'medium',
  labels: 'design-spec frontend-touching',
  updated: '2026-10-29 18:09',
}))

const clicked = ref('')
// `?only=<section id>` renders one section, so a spec can check the document's
// own horizontal scroll at a phone viewport without the wide sections.
const only = new URLSearchParams(location.search).get('only')
if (only) document.body.style.margin = '0'

createApp({
  setup() {
    const cardTable = (id, width, extra = {}) =>
      h('section', { id, style: `margin-top:24px; width:${width}px` }, [
        h(AspDataTable, { columns: cardCols, rows: cardRows, rowKey: 'id', ...extra }),
      ])
    return () =>
      h('div', { style: only ? '' : 'padding:24px' }, sections().filter((v) => !only || v.props?.id === only))
    function sections() {
      return [
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
        // #4529 horizontal-overflow edge cue. A wide table (12 fixed-width cols)
        // inside a narrow container overflows → the viewport toggles
        // --overflow-start / --overflow-end as it scrolls. On a LIGHT surface and
        // a DARK card surface, so the spec can also prove the fade colour
        // (--asp-dt-surface) resolves to each surface's own background.
        h(
          'section',
          {
            id: 'overflow-light',
            style: 'margin-top:24px; max-width:320px; background: var(--surface-page); padding:8px',
          },
          [h(AspDataTable, { columns: wide, rows: wideRows, rowKey: 'c0', caption: 'overflow', narrow: 'scroll' })],
        ),
        h(
          'section',
          {
            id: 'overflow-dark',
            style:
              'margin-top:24px; max-width:320px; background: var(--surface-card); color: var(--text-on-dark); padding:8px',
          },
          [h(AspDataTable, { columns: wide, rows: wideRows, rowKey: 'c0', caption: 'overflow', narrow: 'scroll' })],
        ),
        // A table that FITS its container: no overflow either way, so neither cue
        // class is ever set.
        h('section', { id: 'fits', style: 'margin-top:24px; max-width:800px' }, [
          h(AspDataTable, { columns, rows: small, rowKey: 'id', caption: 'fits' }),
        ]),
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
        // --- #9133 ---
        cardTable('cards-390', 390, {
          interactive: true,
          rowAttrs: (row) => ({ 'data-test-row-id': row.id }),
          rowState: (row, i) => (i === 1 ? 'active' : null),
          onRowClick: (row) => {
            clicked.value = String(row.id)
          },
        }),
        h('output', { id: 'clicked' }, clicked.value),
        cardTable('cards-639', 639),
        cardTable('cards-640', 640),
        cardTable('scroll-390', 390, { narrow: 'scroll' }),
        h('section', { id: 'floor-768', class: 'slack', style: 'margin-top:24px; width:768px' }, [
          h(AspDataTable, { columns: floorCols, rows: slackRows, density: 'compact' }),
        ]),
        h('section', { id: 'floor-1024', class: 'slack', style: 'margin-top:24px; width:1024px' }, [
          h(AspDataTable, { columns: floorCols, rows: slackRows, density: 'compact' }),
        ]),
        h('section', { id: 'slack-768', class: 'slack', style: 'margin-top:24px; width:768px' }, [
          h(AspDataTable, { columns: slackCols, rows: slackRows, density: 'compact' }),
        ]),
        h('section', { id: 'bigcards', style: 'margin-top:24px; width:390px' }, [
          h(AspDataTable, { columns: cardCols, rows: bigCards, rowKey: 'id' }),
        ]),
      ]
    }
  },
}).mount('#app')
