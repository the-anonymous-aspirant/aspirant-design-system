// The identity-floor switch (system_3 #11626, design_conventions §3.165).
// A Transactions-like table: one declared identity ("Who and what for") and
// fixed-width columns that add up to 700px, inside a box whose width the spec
// sets on #box. ?layout=auto drops the consumer's `table-layout: fixed`;
// ?identity=0 leaves the identity undeclared; ?narrow=scroll is the matrix
// opt-out; ?slots=1 is the card-list empty-field case (a slot that renders
// nothing for some rows, one that renders an empty wrapper, and a checkbox).
import { createApp, h } from 'vue'

import '../../../build/tokens.css'
import { AspDataTable } from '../../../src/index.js'

const params = new URLSearchParams(location.search)
const declare = params.get('identity') !== '0'
const width = params.get('width') || '1024'

// 90 + 150 + 140 + 120 + 100 + 100 = 700px of fixed columns.
const COLUMNS = [
  { key: 'paid_on', label: 'Date', width: '90px' },
  { key: 'who', label: 'Who and what for', ...(declare ? { role: 'identity' } : {}) },
  { key: 'method', label: 'Method', width: '150px' },
  { key: 'category', label: 'Category', width: '140px' },
  { key: 'invoice', label: 'Invoice', width: '120px' },
  { key: 'in', label: 'In', width: '100px', align: 'right' },
  { key: 'out', label: 'Out', width: '100px', align: 'right', role: 'figure' },
]
const ROWS = [
  ['2026-09-28', 'Max Platzhalter · Tattoo (small) and a follow-up session', 'Bank transfer', 'Paid work', 'Draft', '€60.00', ''],
  ['2026-09-20', 'Bahn · Leipzig and back for the Siebdruck workshop', 'Card', 'Travel', '', '', '-€89.90'],
  ['2026-09-12', 'Galerie Beispiel · Tattoo', 'Bank transfer', 'Paid work', '2026-006', '€220.00', ''],
  ['2026-08-19', 'Studio Erfunden · Tattoo (big)', 'PayPal', 'Paid work', '2026-004', '€480.00', ''],
].map(([paid_on, who, method, category, invoice, inAmt, out], i) => ({ id: i + 1, paid_on, who, method, category, invoice, in: inAmt, out }))

// ?slots=1: the Book's case. "In" and "Out" are slot columns that render
// their amount only for their own direction (a false v-if otherwise), "Note"
// renders an empty wrapper, and "Pick" renders a checkbox with no text.
const SLOT_COLUMNS = [
  { key: 'who', label: 'Who and what for', role: 'identity' },
  { key: 'paid_on', label: 'Date' },
  { key: 'in', label: 'In' },
  { key: 'out', label: 'Out' },
  { key: 'note', label: 'Note' },
  { key: 'pick', label: 'Pick' },
]
const slotTable = () =>
  h(AspDataTable, { columns: SLOT_COLUMNS, rows: ROWS, rowKey: 'id', narrow: 'cards' }, {
    'cell-in': ({ row }) => (row.in ? h('span', { class: 'amount-in' }, row.in) : null),
    'cell-out': ({ row }) => (row.out ? [h('span', { class: 'amount-out' }, row.out)] : []),
    'cell-note': () => h('span', { class: 'note' }),
    'cell-pick': ({ row }) => h('input', { type: 'checkbox', 'aria-label': `Pick ${row.id}` }),
  })

createApp({
  setup() {
    return () =>
      h('div', { id: 'box', class: params.get('layout') === 'auto' ? 'auto' : 'fixed', style: `width:${width}px` }, [
        params.get('slots')
          ? slotTable()
          : h(AspDataTable, { columns: COLUMNS, rows: ROWS, rowKey: 'id', narrow: params.get('narrow') || 'cards' }),
      ])
  },
}).mount('#app')
