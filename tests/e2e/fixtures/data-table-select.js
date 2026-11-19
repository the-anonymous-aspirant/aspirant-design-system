// A select column (system_3 #11747, §3.132 Decision 6): Transactions' shape.
// The first column holds the row's checkbox and declares `role: 'select'`;
// "Who and what for" is the identity and "Amount" the figure. The other
// columns have fixed widths, so in a box wider than 640px the table still
// cards where the identity cannot keep its 24ch (§3.165).
//
// Row 2 cannot be selected: its select cell renders nothing. Row 3's identity
// is long enough to wrap in a card. The table is interactive; #clicks counts
// row clicks and #ticked lists the ticked rows.
//
// ?width=<px> sets #box; ?select=0 leaves the first column undeclared (a
// secondary cell, as before this role); ?sortable=1 leaves the select column
// sortable and shows the card sort bar from one row; ?theme=dark.
import { createApp, h, ref } from 'vue'

import '../../../build/tokens.css'
import { AspCheckbox, AspDataTable } from '../../../src/index.js'

const params = new URLSearchParams(location.search)
const declare = params.get('select') !== '0'
const width = params.get('width') || '504'
const sortable = params.get('sortable') === '1'

// 40 + 90 + 140 + 120 + 100 = 490px of fixed columns, plus the identity.
const COLUMNS = [
  { key: 'select', label: '', ...(sortable ? {} : { sortable: false }), width: '40px', ...(declare ? { role: 'select' } : {}) },
  { key: 'paid_on', label: 'Date paid', width: '90px' },
  { key: 'who', label: 'Who and what for', sortable: false, role: 'identity' },
  { key: 'category', label: 'Category', width: '140px' },
  { key: 'invoice', label: 'Invoice', width: '120px' },
  { key: 'amount', label: 'Amount', width: '100px', align: 'right', role: 'figure' },
]
const ROWS = [
  { id: 1, paid_on: '2026-09-28', who: 'Max Platzhalter · Tattoo (small)', category: 'Paid work', invoice: '', amount: '€60.00', selectable: true },
  { id: 2, paid_on: '2026-09-20', who: 'Galerie Beispiel · Tattoo', category: 'Paid work', invoice: '2026-006', amount: '€220.00', selectable: false },
  { id: 3, paid_on: '2026-09-12', who: 'Studio Erfunden · Wandbild für das Treppenhaus, zweiter Abschnitt, mit Gerüst', category: 'Paid work', invoice: '', amount: '€480.00', selectable: true },
  { id: 4, paid_on: '2026-08-19', who: 'Bahn · Leipzig and back', category: 'Travel', invoice: '', amount: '-€89.90', selectable: true },
]

createApp({
  setup() {
    const ticked = ref([])
    const clicks = ref(0)
    const toggle = (id, on) => {
      ticked.value = on ? [...ticked.value, id] : ticked.value.filter((x) => x !== id)
    }
    return () =>
      h('div', [
        h('div', { id: 'box', class: 'fixed', style: `width:${width}px` }, [
          h(
            AspDataTable,
            { columns: COLUMNS, rows: ROWS, rowKey: 'id', interactive: true, ...(sortable ? { cardSortMinRows: 1 } : {}), onRowClick: () => (clicks.value += 1) },
            {
              'cell-select': ({ row }) =>
                row.selectable
                  ? h(AspCheckbox, {
                      modelValue: ticked.value.includes(row.id),
                      ariaLabel: `Select row ${row.id}`,
                      'data-test': `select-${row.id}`,
                      'onUpdate:modelValue': (on) => toggle(row.id, on),
                    })
                  : null,
            },
          ),
        ]),
        h('p', { id: 'clicks' }, String(clicks.value)),
        h('p', { id: 'ticked' }, ticked.value.join(',')),
      ])
  },
}).mount('#app')
