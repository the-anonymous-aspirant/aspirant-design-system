// §3.119 R6 (system_3 #9138): a truncation reveal never stringifies an
// object, and a hover that carries meaning renders through AspTooltip.
//   #table    AspDataTable truncate cells: an object, a scalar, an empty value
//             and a column with a title(row) hook
//   #badges   status, dot and chip-with-tip badges, then 100 status badges
//             between two buttons (the tab-order check)
//   #time     AspTimeSince
//   #rail     a collapsed AspSidebar (?expanded=1 renders it expanded)
import { createApp, h, ref } from 'vue'

import '../../../build/tokens.css'
import {
  AspBadge,
  AspDataTable,
  AspSidebar,
  AspSidebarLink,
  AspTimeSince,
} from '../../../src/index.js'

const q = new URLSearchParams(location.search)
const collapsed = ref(q.get('expanded') !== '1')

const columns = [
  { key: 'inputs', label: 'Inputs', truncate: true },
  { key: 'name', label: 'Name', truncate: true },
  { key: 'note', label: 'Note', truncate: true },
  { key: 'hooked', label: 'Hooked', truncate: true, title: (row) => (row.name === 'b' ? null : `hook:${row.name}`) },
]
const rows = [
  { name: 'a', inputs: { task_id: 9138, kind: 'spawn' }, note: '', hooked: { x: 1 } },
  { name: 'b', inputs: [1, 2], note: null, hooked: 'y' },
]

createApp({
  setup() {
    return () =>
      h('div', [
        h('section', { id: 'table' }, [h(AspDataTable, { columns, rows, rowKey: 'name' })]),
        h('section', { id: 'badges' }, [
          h(AspBadge, { variant: 'status', status: 'positive', id: 'b-status' }, () => 'done'),
          ' ',
          h(AspBadge, { variant: 'dot', status: 'negative', id: 'b-dot' }, () => 'failed'),
          ' ',
          h(AspBadge, { variant: 'chip', tip: 'A label chip', id: 'b-chip' }, () => 'design-spec'),
          ' ',
          h(AspBadge, { variant: 'chip', id: 'b-plain' }, () => 'no legend'),
          h('div', { id: 'many' }, [
            h('button', { id: 'before-many' }, 'before'),
            ...Array.from({ length: 100 }, (_, i) =>
              h(AspBadge, { variant: 'status', status: ['positive', 'caution', 'negative', 'neutral'][i % 4] }, () => `s${i}`),
            ),
            h('button', { id: 'after-many' }, 'after'),
          ]),
        ]),
        h('section', { id: 'time' }, [
          h(AspTimeSince, { datetime: '2026-10-29T18:09:30Z', variant: 'elapsed', live: false }),
        ]),
        h('section', { id: 'rail', style: 'height: 320px; position: relative' }, [
          h(
            AspSidebar,
            { collapsed: collapsed.value },
            {
              default: () =>
                ['Overview', 'Tasks'].map((label, i) =>
                  h(AspSidebarLink, { to: `#${label}`, label, icon: ['⌂', '☰'][i] }),
                ),
            },
          ),
        ]),
      ])
  },
}).mount('#app')
