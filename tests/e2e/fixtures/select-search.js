// A searchable AspSelect (system_3 #10748, design_conventions §3.149), plus a
// live readout of the bound value so the spec asserts selection without
// reaching into internals. About 30 long options, each with a `search` text
// past its 40-character label, as the Overview's epic filter will pass.
// ?grouped=1 puts the options in two groups; ?plain=1 leaves `searchable` off;
// ?bottom=1 puts the trigger near the viewport's bottom, so it opens above.
import { createApp, h, ref } from 'vue'

import '../../../build/tokens.css'
import { AspSelect } from '../../../src/index.js'

const TITLES = [
  'Retroactive invoice app for user flowah: PayPal import, categorise, issue German invoices',
  'Admin page: per-service memory, disk, last-used and start/stop for the cell',
  'Gmail to data lake, on demand: OAuth, encrypted high-sensitivity ingest',
  'Changelog per-PR fragments: end docs/CHANGELOG.md merge conflicts',
  'Valuation statement: OCR fallback for raster scans and reprinted vectors',
  'Translator: language pairs, glossary and a review step before export',
  'Card editor: PDF export with a printable bleed and crop marks',
  'Health page: golden-group placement and the weekly metric review',
  'Fleet worker rules: dwell, stall and the operator hold surface',
  'Design system: AspSelect option groups with a visible label',
  'Transactions tab: one list of money in and out, newest first',
  'Book: count what she chose, with presets and a muted line',
  'N26 import: transfer confirmations and account statements',
  'Expense receipts: upload, view and delete for good',
  'Client book: payer matching and the close-match stop',
  'Verify lane: admission gate, queue tickets and detached runs',
  'Security review: whole-repo veto and the clear verb',
  'Disposable e2e stack for the invoicing app walks',
  'Cell temperature and fan speed over time on the health page',
  'Commander OCR fan-out bounded by priority on the shared host',
  'Corpus authoring: derivation contracts and lane checks',
  'Auto-merge gate: origin labels and verified-locally evidence',
  'Operator conversation anchor and the needs-you queue',
  'Activity log retention and the anomaly spool flush',
  'Memory index budget and the domain slot cap',
  'Benchmark: model routing evidence and judge reruns',
  'Weekly cell health review and its proxied-route rows',
  'Dogfood gate: evidence markers before the done transition',
  'Pane injection guard and the attribution of typed text',
  'Start-hook provenance, sentinels and the reconcile row',
]
const OPTIONS = TITLES.map((t, i) => {
  const id = 8300 + i * 37
  const head = t.length > 40 ? `${t.slice(0, 39)}…` : t
  return { value: `e${id}`, label: `#${id} ${head}`, search: t }
})
OPTIONS[3].disabled = true

const params = new URLSearchParams(location.search)
const grouped = params.get('grouped')
  ? [
      { group: 'Invoicing', options: OPTIONS.slice(0, 15) },
      { group: 'Platform', options: OPTIONS.slice(15) },
    ]
  : OPTIONS

createApp({
  setup() {
    const value = ref(null)
    return () =>
      h('div', { style: params.get('bottom') ? 'padding:calc(100vh - 90px) 24px 24px' : 'padding:24px' }, [
        h(AspSelect, {
          label: 'Epic',
          options: grouped,
          placeholder: 'All epics',
          searchable: !params.get('plain'),
          searchPlaceholder: 'Number or title',
          modelValue: value.value,
          'onUpdate:modelValue': (v) => (value.value = v),
        }),
        h('output', { id: 'value' }, String(value.value)),
        h('button', { id: 'outside', type: 'button', style: 'margin-top:20rem;display:block' }, 'outside'),
      ])
  },
}).mount('#app')
