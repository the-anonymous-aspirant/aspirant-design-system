<script setup>
import { ref } from 'vue'
import AspSelect from '../src/components/AspSelect.vue'
import AspInput from '../src/components/AspInput.vue'

const OPTIONS = [
  { value: 'all', label: 'All agents' },
  { value: 'engineer', label: 'system_3_engineer' },
  { value: 'manager', label: 'system_3_manager' },
  { value: 'designer', label: 'design_agent' },
  { value: 'retired', label: 'retired_agent', disabled: true },
]

const basic = ref(null)
const selected = ref('engineer')
const disabled = ref('all')
const empty = ref(null)
const filterAgent = ref('all')
const filterSearch = ref('')
const long = ref(null)
// Option groups (system_3 #10701): "Other" exists on both sides, which is why
// Transactions' filter needs real groups rather than one flat list.
const GROUPED = [
  { group: 'In', options: [
    { value: 'in:paid_work', label: 'Paid work' },
    { value: 'in:gift', label: 'Gift' },
    { value: 'in:other', label: 'Other' },
  ] },
  { group: 'Out', options: [
    { value: 'out:materials', label: 'materials and supplies' },
    { value: 'out:other', label: 'other' },
    { value: 'out:travel', label: 'travel' },
  ] },
]
const grouped = ref(null)
// A plain option above the groups (system_3 #10712): Transactions' "All
// categories" belongs to neither side, so it sits outside both, unheaded.
const MIXED = [{ value: 'all', label: 'All categories' }, ...GROUPED]
const mixed = ref('all')
const manyOptions = Array.from({ length: 24 }, (_, i) => ({
  value: `row-${i}`,
  label: `artifact-${String(i).padStart(3, '0')}.py`,
}))
// Searchable (system_3 #10748, §3.149): about 30 long epic titles, labels cut
// at 40 characters as the Overview cuts them, the full title as `search`.
const EPIC_TITLES = [
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
const EPICS = [
  { value: 'all', label: 'All epics' },
  ...EPIC_TITLES.map((t, i) => {
    const id = 8300 + i * 37
    return { value: `e${id}`, label: `#${id} ${t.length > 40 ? `${t.slice(0, 39)}…` : t}`, search: t }
  }),
]
const epic = ref('all')
</script>

<template>
  <Story title="Components/AspSelect">
    <template #docs>
      <p>
        <strong>Purpose:</strong> the dropdown-of-record
        (<code>system_3_design_conventions.md</code> §3.10) — every dropdown, in and out of filter
        rows. The trigger carries the same filter-control treatment as
        <code>AspInput</code> (34px, <code>--surface-elevated</code>, radius 8,
        <code>--border-subtle</code>) and reads <code>Label ▾</code>.
      </p>
      <p>
        <strong>When to use:</strong> a choice from a fixed, known set.
        <strong>When not to use:</strong> free text (<code>AspInput</code>), or a set large
        enough to need typeahead — that wants a combobox, which is not built.
      </p>
      <p>
        <strong>Surface note.</strong> The open panel sits on
        <code>--surface-card</code>, which is <em>dark even in the light theme</em>, so the panel
        sets its own ink (<code>--text-on-dark</code>) rather than inheriting the ambient one.
        Options inherit from the panel. This is the distinction behind #2415: a component that sets
        a background must set the ink with it; one that does not, inherits. The active-option
        highlight darkens (<code>--surface-card-inner</code>) instead of tinting amber, because
        amber at 51% over the dark panel drops the option text to 3.87:1.
      </p>
      <p>
        <strong>Keyboard:</strong> ↑/↓ move (skipping disabled), Enter/Space select, Esc closes
        without selecting, Tab closes and moves on. Click-outside closes.
      </p>
    </template>

    <Variant title="Default">
      <AspSelect v-model="basic" label="Agent" :options="OPTIONS" placeholder="All agents" />
    </Variant>

    <Variant title="Selected">
      <AspSelect v-model="selected" label="Agent" :options="OPTIONS" />
    </Variant>

    <Variant title="Disabled">
      <AspSelect v-model="disabled" label="Agent" :options="OPTIONS" disabled />
    </Variant>

    <Variant title="Empty">
      <AspSelect v-model="empty" label="Labels" :options="[]" placeholder="No labels" />
    </Variant>

    <Variant title="Grouped options">
      <AspSelect v-model="grouped" label="Category" :options="GROUPED" placeholder="All categories" />
      <p class="note">
        Each group is a <code>role="group"</code> named by its label; the label is never an option.
      </p>
      <div data-theme="dark" class="dark-pane">
        <AspSelect v-model="grouped" label="Category" :options="GROUPED" placeholder="All categories" />
      </div>
    </Variant>

    <Variant title="Grouped, with a leading plain option">
      <AspSelect v-model="mixed" label="Category" :options="MIXED" />
      <p class="note">
        A plain option sits outside every group, with no heading; its trigger reads the bare label.
      </p>
      <div data-theme="dark" class="dark-pane">
        <AspSelect v-model="mixed" label="Category" :options="MIXED" />
      </div>
    </Variant>

    <Variant title="Searchable">
      <AspSelect v-model="epic" label="Epic" :options="EPICS" searchable search-placeholder="Number or title" />
      <p class="note">
        Type a word or a number: each word must appear, in any order, in the label or the option's full title.
      </p>
      <div data-theme="dark" class="dark-pane">
        <AspSelect v-model="epic" label="Epic" :options="EPICS" searchable search-placeholder="Number or title" />
      </div>
    </Variant>

    <Variant title="Scrolling panel (24 options)">
      <AspSelect v-model="long" label="Artifact" :options="manyOptions" placeholder="Pick one" />
    </Variant>

    <Variant title="Filter row (§3.10 parity with AspInput)">
      <div class="filter-row">
        <AspSelect v-model="filterAgent" :options="OPTIONS" placeholder="All agents" />
        <AspInput v-model="filterSearch" type="search" placeholder="search" />
      </div>
      <p class="note">
        Both controls are 34px on <code>--surface-elevated</code> — the filter canon is that they
        line up without per-page adjustment.
      </p>
    </Variant>

    <Variant title="Dark theme">
      <div data-theme="dark" class="dark-pane">
        <AspSelect v-model="selected" label="Agent" :options="OPTIONS" />
      </div>
    </Variant>

    <Variant title="Unstyled structure">
      <p class="note">
        Renders without <code>styles.css</code> as a labelled button plus a listbox — structurally
        correct, unstyled.
      </p>
      <AspSelect v-model="basic" label="Agent" :options="OPTIONS" />
    </Variant>
  </Story>
</template>

<style scoped>
.filter-row {
  display: flex;
  align-items: flex-end;
  gap: var(--space-sm);
}

.dark-pane {
  padding: var(--space-lg);
  background: var(--surface-page);
}

.note {
  margin-top: var(--space-sm);
  font-size: var(--text-sm);
  color: var(--text-muted);
}
</style>
