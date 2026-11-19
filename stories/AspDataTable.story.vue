<script setup>
import { ref } from 'vue'
import AspCheckbox from '../src/components/AspCheckbox.vue'
import AspDataTable from '../src/components/AspDataTable.vue'

const columns = [
  { key: 'id', label: '#', align: 'right', width: '3rem' },
  { key: 'name', label: 'Name' },
  { key: 'owner', label: 'Owner' },
  { key: 'status', label: 'Status' },
  { key: 'updated', label: 'Updated', align: 'right' },
]

const rows = [
  { id: 1, name: 'Quarterly audit', owner: 'aspirant', status: 'positive', updated: '2026-07-10' },
  { id: 2, name: 'Token pipeline', owner: 'engineer', status: 'caution', updated: '2026-07-11' },
  { id: 3, name: 'Penpot round-trip spike', owner: 'aspirant', status: 'negative', updated: '2026-07-09' },
  { id: 10, name: 'Design system v0', owner: 'engineer', status: 'neutral', updated: '2026-07-12' },
]

const longRows = [
  { key: 'a', text: 'A very long cell value that should be truncated with an ellipsis and a title tooltip' },
  { key: 'b', text: 'Short' },
]
const longCols = [
  { key: 'key', label: 'Key', width: '4rem' },
  { key: 'text', label: 'Text', truncate: true, width: '18ch' },
]

// Wide table (many fixed-width columns) shown inside a deliberately narrow
// container so the content overflows horizontally — exercises the #4529
// edge-fade discoverability cue.
const wideCols = Array.from({ length: 12 }, (_, i) => ({
  key: `c${i}`,
  label: `Column ${i + 1}`,
  width: '10rem',
}))
const wideRows = Array.from({ length: 4 }, (_, r) => {
  const row = {}
  wideCols.forEach((c, i) => {
    row[c.key] = `r${r + 1}·${i + 1}`
  })
  return row
})

// 500 rows — the §3.28 fetch window. Above the 100-row threshold the table
// windows its <tbody> to ~viewport+overscan; the DOM holds a few dozen <tr>,
// not 500. (#2779-A1)
const manyRows = Array.from({ length: 500 }, (_, i) => ({
  id: i + 1,
  name: `Row ${i + 1}`,
  owner: i % 2 ? 'engineer' : 'aspirant',
  status: ['positive', 'caution', 'negative', 'neutral'][i % 4],
  updated: `2026-07-${String((i % 28) + 1).padStart(2, '0')}`,
}))

const lastClicked = ref('(none)')

// §3.119 / #9136 — a 2-column breakdown, full width vs sized to its content.
const breakdownCols = [
  { key: 'status', label: 'Status' },
  { key: 'count', label: 'Count', align: 'right' },
]
const breakdownRows = [
  { status: 'open', count: 42 },
  { status: 'in_progress', count: 8 },
  { status: 'parked', count: 1290 },
]

// §3.119 / #9133 — phone card list. Columns declare a role: one identity (top
// left), one figure (top right); the rest stack as label-value pairs.
const roleCols = [
  { key: 'name', label: 'Name', role: 'identity' },
  { key: 'owner', label: 'Owner' },
  { key: 'status', label: 'Status' },
  { key: 'updated', label: 'Updated' },
  { key: 'count', label: 'Count', role: 'figure', align: 'right' },
]
const roleRows = rows.map((r, i) => ({ ...r, count: 1200 * (i + 1) + 37 }))
// A /tasks-shaped table for the ≥640px identity floor: one identity, five
// secondary columns with long unbroken values.
const floorCols = [
  { key: 'task', label: 'Task', role: 'identity', truncate: true },
  { key: 'assignee', label: 'Assignee' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'complexity', label: 'Complexity' },
  { key: 'updated', label: 'Updated', align: 'right' },
]
const floorRows = Array.from({ length: 3 }, (_, i) => ({
  task: `#913${i} Design spec: AspDataTable phone card list, column roles and identity floor`,
  assignee: 'aspirant_engineer',
  status: 'in_progress',
  priority: 'operator_requested',
  complexity: 'medium_9_to_180_minutes',
  updated: '2026-10-29',
}))

// §3.119 O1 / #9769 — a 3-column table (identity + secondary + figure), the
// console's /agents-active "By state" shape: used to be stuck in table mode
// at any width; now cards below 640px.
const threeColCols = [
  { key: 'status', label: 'Status', role: 'identity' },
  { key: 'help', label: 'Meaning' },
  { key: 'n', label: 'Count', role: 'figure', align: 'right' },
]
const threeColRows = [
  { status: 'idle', help: 'Session alive, no active task assignment and no pending spawn.', n: 3 },
  { status: 'working', help: 'Actively running a task-bound Claude session right now.', n: 5 },
  { status: 'wedged', help: 'Session alive but has not advanced its task in over an hour.', n: 1 },
]

// §3.119 T2 / #9769 — a secondary cell with no value (no priority, no labels)
// renders no label on the card, while a sibling secondary column with a value
// still shows its own.
const emptySecondaryCols = [
  { key: 'name', label: 'Task', role: 'identity' },
  { key: 'priority', label: 'Priority' },
  { key: 'labels', label: 'Labels' },
  { key: 'count', label: 'Count', role: 'figure', align: 'right' },
]
const emptySecondaryRows = [
  { name: 'Fix the login redirect', priority: '', labels: 'bug', count: 3 },
  { name: 'Draft the Q3 roadmap', priority: 'operator ask', labels: '', count: 7 },
]

// #4318 / §3.88 — per-row hooks demos.
// §3.165 (system_3 #11626): a Transactions-like table, its identity declared
// and 700px of fixed-width columns, in `table-layout: fixed` as the Invoices
// app sets it. At 800px the identity cannot keep its 24ch floor, so it cards;
// at 950px it is a table.
const crushCols = [
  { key: 'paid_on', label: 'Date', width: '90px' },
  { key: 'who', label: 'Who and what for', role: 'identity' },
  { key: 'method', label: 'Method', width: '150px' },
  { key: 'category', label: 'Category', width: '140px' },
  { key: 'invoice', label: 'Invoice', width: '120px' },
  { key: 'in', label: 'In', width: '100px', align: 'right' },
  { key: 'out', label: 'Out', width: '100px', align: 'right', role: 'figure' },
]
const crushRows = [
  { id: 1, paid_on: '2026-09-28', who: 'Max Platzhalter · Tattoo (small) and a follow-up session', method: 'Bank transfer', category: 'Paid work', invoice: 'Draft', in: '€60.00', out: '' },
  { id: 2, paid_on: '2026-09-20', who: 'Bahn · Leipzig and back for the Siebdruck workshop', method: 'Card', category: 'Travel', invoice: '', in: '', out: '-€89.90' },
  { id: 3, paid_on: '2026-09-12', who: 'Galerie Beispiel · Tattoo', method: 'Bank transfer', category: 'Paid work', invoice: '2026-006', in: '€220.00', out: '' },
]
const crushWidth = ref(800)

// A select column (§3.132 Decision 6, task #11747): Transactions' shape. 40 +
// 90 + 140 + 120 + 100 = 490px of fixed columns, so a 656px box cards too.
// Row 2 cannot be selected (its cell renders nothing); row 3's identity wraps.
const selectCols = [
  { key: 'select', label: '', sortable: false, width: '40px', role: 'select' },
  { key: 'paid_on', label: 'Date paid', width: '90px' },
  { key: 'who', label: 'Who and what for', sortable: false, role: 'identity' },
  { key: 'category', label: 'Category', width: '140px' },
  { key: 'invoice', label: 'Invoice', width: '120px' },
  { key: 'amount', label: 'Amount', width: '100px', align: 'right', role: 'figure' },
]
const selectRows = [
  { id: 1, paid_on: '2026-09-28', who: 'Max Platzhalter · Tattoo (small)', category: 'Paid work', invoice: '', amount: '€60.00', selectable: true },
  { id: 2, paid_on: '2026-09-20', who: 'Galerie Beispiel · Tattoo', category: 'Paid work', invoice: '2026-006', amount: '€220.00', selectable: false },
  { id: 3, paid_on: '2026-09-12', who: 'Studio Erfunden · Wandbild für das Treppenhaus, zweiter Abschnitt, mit Gerüst', category: 'Paid work', invoice: '', amount: '€480.00', selectable: true },
  { id: 4, paid_on: '2026-08-19', who: 'Bahn · Leipzig and back', category: 'Travel', invoice: '', amount: '-€89.90', selectable: true },
]
const ticked = ref([])
const toggleTick = (id, on) => {
  ticked.value = on ? [...ticked.value, id] : ticked.value.filter((x) => x !== id)
}
const selectClicked = ref('(none)')

const rowAttrsDemo = (row) => ({ 'data-test-row-id': row.id, 'data-test-source': row.owner })
const rowStateDemo = (row, i) => (i === 1 ? 'active' : i === 3 ? 'muted' : null)

// Inline status pill for the #cell-status slot demo (kept self-contained;
// AspBadge would be the real consumer here once both land on main).
const statusText = { positive: 'Active', caution: 'Draft', negative: 'Failed', neutral: 'Archived' }
const statusStyle = (v) => ({
  positive: 'background: var(--feedback-success-bg); color: var(--feedback-success-text);',
  caution: 'background: var(--feedback-warning-bg); color: var(--feedback-warning-text);',
  negative: 'background: var(--feedback-error-bg); color: var(--feedback-error-text);',
  neutral: 'background: var(--feedback-neutral-bg); color: var(--feedback-neutral-text);',
}[v])
</script>

<template>
  <Story title="Components/AspDataTable">
    <template #docs>
      <p><strong>Purpose:</strong> DS-themed sortable table. Ports the system_3 <code>table.html</code> + <code>_sort_header.html</code> macros; sorts client-side by default and emits <code>sort</code> for server-driven consumers.</p>
      <p><strong>When to use:</strong> any tabular list. Pass <code>columns</code> config + <code>rows</code>; render custom cells via <code>#cell-&lt;key&gt;</code> scoped slots.</p>
      <p><strong>When not to use:</strong> a vertical stack of records — use <code>AspList</code>.</p>
    </template>

    <Variant title="Sortable (default)">
      <AspDataTable :columns="columns" :rows="rows">
        <template #cell-status="{ value }">
          <span
            :style="`display:inline-block;padding:0.1rem 0.5rem;border-radius:var(--radius-pill);font-size:var(--text-xs);${statusStyle(value)}`"
          >{{ statusText[value] }}</span>
        </template>
      </AspDataTable>
      <p style="margin-top: 8px; color: var(--text-muted);">Click a header to sort; click again to reverse.</p>
    </Variant>

    <Variant title="Compact density + interactive rows">
      <AspDataTable
        :columns="columns"
        :rows="rows"
        density="compact"
        interactive
        row-key="id"
        @row-click="(row) => (lastClicked = row.name)"
      >
        <template #cell-status="{ value }">
          <span
            :style="`display:inline-block;padding:0.1rem 0.5rem;border-radius:var(--radius-pill);font-size:var(--text-xs);${statusStyle(value)}`"
          >{{ statusText[value] }}</span>
        </template>
      </AspDataTable>
      <p style="margin-top: 8px; color: var(--text-muted);">Last clicked row: {{ lastClicked }}</p>
    </Variant>

    <Variant title="Cell truncation">
      <AspDataTable :columns="longCols" :rows="longRows" row-key="key" />
      <p style="margin-top: 8px; color: var(--text-muted);">The long cell truncates with an ellipsis; hover for the full text (title attr).</p>
    </Variant>

    <Variant title="Virtualized (500 rows)">
      <p style="margin-bottom: 8px; color: var(--text-muted);">
        Above the <code>virtualizeThreshold</code> (default <strong>100</strong> rows) the
        <code>&lt;tbody&gt;</code> renders only a windowed slice (~viewport + overscan) inside a
        scroll viewport (<code>maxHeight</code>), with top/bottom spacer rows holding the full
        extent. Rows are pinned to <code>rowHeight</code> (default 40px) so the spacer math is
        exact. Open devtools: the DOM holds a few dozen <code>&lt;tr&gt;</code>, not 500, while
        <code>aria-rowcount</code> stays the canonical total. Below the threshold the table renders
        plainly and browser Ctrl-F finds every row.
      </p>
      <AspDataTable :columns="columns" :rows="manyRows" row-key="id">
        <template #cell-status="{ value }">
          <span
            :style="`display:inline-block;padding:0.1rem 0.5rem;border-radius:var(--radius-pill);font-size:var(--text-xs);${statusStyle(value)}`"
          >{{ statusText[value] }}</span>
        </template>
      </AspDataTable>
    </Variant>

    <Variant title="Window-scrolled virtual (phone list, §3.120 Q11)">
      <p style="margin-bottom: 8px; color: var(--text-muted);">
        <code>scroll-root="window"</code> keeps the virtualisation but reads its window from the
        PAGE scroll, with no <code>maxHeight</code> cap: a phone list under a filter block has one
        scroller, the page, instead of a second box inside it. The default <code>self</code> is the
        capped viewport above.
      </p>
      <AspDataTable :columns="columns" :rows="manyRows" row-key="id" scroll-root="window">
        <template #cell-status="{ value }">
          <span
            :style="`display:inline-block;padding:0.1rem 0.5rem;border-radius:var(--radius-pill);font-size:var(--text-xs);${statusStyle(value)}`"
          >{{ statusText[value] }}</span>
        </template>
      </AspDataTable>
    </Variant>

    <Variant title="Horizontal-overflow edge cue">
      <p style="margin-bottom: 8px; color: var(--text-muted);">
        When a table is wider than its container, <code>.data-table__scroll</code> scrolls
        horizontally — but a native scrollbar is thin / auto-hiding on many configs, so the extra
        columns can read as truncated rather than scrollable. A soft trailing-edge fade (to the
        surface's own background) signals “more to the right”; scroll and it fades in on the leading
        edge too, then fades out at each true end. A table that fits its container shows no cue.
      </p>
      <div style="max-width: 22rem; border: 1px dashed var(--border-subtle); padding: 8px;">
        <AspDataTable :columns="wideCols" :rows="wideRows" row-key="c0" narrow="scroll" />
      </div>
      <p style="margin: 8px 0; color: var(--text-muted);">Same table on a dark card surface:</p>
      <div data-theme="dark" style="max-width: 22rem; background: var(--surface-card); color: var(--text-on-dark); padding: 8px;">
        <AspDataTable :columns="wideCols" :rows="wideRows" row-key="c0" narrow="scroll" />
      </div>
      <p style="margin: 12px 0 8px; color: var(--text-muted);">A narrow table that fits — no cue:</p>
      <div style="max-width: 22rem; border: 1px dashed var(--border-subtle); padding: 8px;">
        <AspDataTable :columns="longCols" :rows="longRows" row-key="key" />
      </div>
    </Variant>

    <Variant title="Card list below a 640px container (§3.119)">
      <p style="margin-bottom: 8px; color: var(--text-muted);">
        When the table's <strong>own container</strong> is narrower than 640px and it has more than
        two columns, each row renders as a card: the <code>identity</code> column top-left (it
        wraps, never truncates), the <code>figure</code> top-right (mono when numeric, never
        truncates), the rest stacked as label-value pairs. The header row is hidden, so sorting moves
        into one "Sort by" select. Row hooks, <code>rowState</code> and keyboard activation apply to
        the card as they do to the row.
      </p>
      <div style="width: 390px; border: 1px dashed var(--border-subtle);">
        <AspDataTable :columns="roleCols" :rows="roleRows" row-key="id" interactive :row-state="rowStateDemo" @row-click="(row) => (lastClicked = row.name)" />
      </div>
      <p style="margin: 8px 0; color: var(--text-muted);">Last clicked card: {{ lastClicked }}</p>
      <div data-theme="dark" style="width: 390px; background: var(--surface-page); padding: 8px 0;">
        <AspDataTable :columns="roleCols" :rows="roleRows" row-key="id" />
      </div>
    </Variant>

    <Variant title="Card / table boundary (639px vs 640px container)">
      <div style="width: 639px; border: 1px dashed var(--border-subtle); margin-bottom: 16px;">
        <AspDataTable :columns="roleCols" :rows="roleRows" row-key="id" caption="639px container: cards" />
      </div>
      <div style="width: 640px; border: 1px dashed var(--border-subtle);">
        <AspDataTable :columns="roleCols" :rows="roleRows" row-key="id" caption="640px container: table" />
      </div>
    </Variant>

    <Variant title="A 3-column table also cards (§3.119 O1, task #9769)">
      <p style="margin-bottom: 8px; color: var(--text-muted);">
        The card-mode band widened from &gt;3 to &gt;2 columns: a declared identity plus at least
        one other column is enough to be worth stacking. A 3-column table — the console's
        <code>/agents-active</code> "By state" shape — used to be stuck in table mode at any width,
        where its narrow explanatory column truncated with an ellipsis below the ≥640px yield
        floor. Below 640px it now cards, and the secondary column's text wraps instead.
      </p>
      <div style="width: 390px; border: 1px dashed var(--border-subtle);">
        <AspDataTable :columns="threeColCols" :rows="threeColRows" row-key="status" />
      </div>
    </Variant>

    <Variant title="Empty secondary cells render no label (§3.119 T2, task #9769)">
      <p style="margin-bottom: 8px; color: var(--text-muted);">
        A card-mode secondary cell whose resolved value is <code>null</code>/<code>undefined</code>/
        <code>''</code>/an empty array renders neither its label nor its value — no "Priority" row
        with nothing after it. A sibling secondary column that does have a value still shows its
        label. <code>0</code> and <code>false</code> are real values and stay visible.
      </p>
      <div style="width: 390px; border: 1px dashed var(--border-subtle);">
        <AspDataTable :columns="emptySecondaryCols" :rows="emptySecondaryRows" row-key="name" />
      </div>
    </Variant>

    <Variant title="Cards when the identity cannot keep its floor (§3.165, task #11626)">
      <p style="margin-bottom: 8px; color: var(--text-muted);">
        At 640px and wider, a table with a declared identity shows its cards when, after its other
        columns have yielded, the identity is narrower than 24ch or the table is wider than its box.
        Here every other column has a fixed width (700px in all) in <code>table-layout: fixed</code>.
        Drag the width: it cards below about 894px and returns to the table only once the box is as
        wide as the table last needed, so it does not flicker. A card draws no label for an empty
        cell (the "In" or "Out" it does not have).
      </p>
      <label style="display: block; margin-bottom: 8px;">
        Box width: {{ crushWidth }}px
        <input v-model.number="crushWidth" type="range" min="600" max="1100" step="2" style="width: 320px;">
      </label>
      <div class="crush-box" :style="{ width: `${crushWidth}px`, border: '1px dashed var(--border-subtle)' }">
        <AspDataTable :columns="crushCols" :rows="crushRows" row-key="id" />
      </div>
    </Variant>

    <Variant title="A select column leads the card (§3.132 D6, task #11747)">
      <p style="margin-bottom: 8px; color: var(--text-muted);">
        A column declared <code>role: 'select'</code> (at most one, and the first column) holds the
        row's checkbox. In a card it sits on the first line, before the identity, in a column of the
        same width on every card, so every identity starts on one edge, also where the cell renders
        nothing (row 2). When the identity wraps (row 3) the checkbox stays with its first line. A
        click on it ticks it and does not reach the row. The table itself does not change.
      </p>
      <p style="margin: 8px 0; color: var(--text-muted);">Ticked: {{ ticked.join(', ') || '(none)' }}. Last clicked row: {{ selectClicked }}</p>
      <template v-for="theme in ['light', 'dark']" :key="theme">
        <div :data-theme="theme" style="background: var(--surface-page); color: var(--text-body); padding: 8px 0; margin-bottom: 16px;">
          <template v-for="w in [504, 656]" :key="w">
            <p style="margin: 8px 0; color: var(--text-muted);">{{ theme }}, a {{ w }}px box</p>
            <div class="crush-box" :style="{ width: `${w}px`, border: '1px dashed var(--border-subtle)', marginBottom: '16px' }">
              <AspDataTable :columns="selectCols" :rows="selectRows" row-key="id" interactive @row-click="(row) => (selectClicked = row.who)">
                <template #cell-select="{ row }">
                  <AspCheckbox
                    v-if="row.selectable"
                    :model-value="ticked.includes(row.id)"
                    :aria-label="`Select row ${row.id}`"
                    @update:model-value="toggleTick(row.id, $event)"
                  />
                </template>
              </AspDataTable>
            </div>
          </template>
        </div>
      </template>
    </Variant>

    <Variant title="narrow=&quot;scroll&quot; (homogeneous matrix)">
      <p style="margin-bottom: 8px; color: var(--text-muted);">
        A matrix where every column is the same kind of figure opts out with
        <code>narrow="scroll"</code>: it keeps the sideways scroll and the #4529 edge fade at every
        width (#4432, narrowed by §3.119).
      </p>
      <div style="width: 390px; border: 1px dashed var(--border-subtle);">
        <AspDataTable :columns="roleCols" :rows="roleRows" row-key="id" narrow="scroll" />
      </div>
    </Variant>

    <Variant title="Identity floor at 640px and wider">
      <p style="margin-bottom: 8px; color: var(--text-muted);">
        A declared <code>role: 'identity'</code> keeps <code>min-width: 24ch</code>; the secondary
        columns yield first. Without a declared identity the first column has no floor.
      </p>
      <div style="width: 768px; border: 1px dashed var(--border-subtle);">
        <AspDataTable :columns="floorCols" :rows="floorRows" density="compact" />
      </div>
    </Variant>

    <Variant title="Breakdown table: fit=&quot;content&quot; vs the default fill (§3.119)">
      <p style="margin-bottom: 8px; color: var(--text-muted);">
        A breakdown of a few columns sizes to its content with <code>fit="content"</code>, so the
        figure sits beside its label. The default <code>fill</code> spans the container. Right-aligned
        columns render right-aligned, header and cells, so the counts line up by digit.
      </p>
      <AspDataTable :columns="breakdownCols" :rows="breakdownRows" fit="content" caption="fit=&quot;content&quot;" />
      <div style="margin-top: 16px;">
        <AspDataTable :columns="breakdownCols" :rows="breakdownRows" caption="fit=&quot;fill&quot; (default)" />
      </div>
    </Variant>

    <Variant title="Empty slot">
      <AspDataTable :columns="columns" :rows="[]">
        <template #empty>
          <span style="color: var(--text-muted);">No records match — try widening your filters.</span>
        </template>
      </AspDataTable>
    </Variant>

    <Variant title="Per-row test hooks (rowAttrs)">
      <p style="margin-bottom: 8px; color: var(--text-muted);">
        <code>rowAttrs(row, i)</code> spreads plain attributes (e.g. <code>data-test-row-id</code>,
        <code>data-test-source</code>) onto each data <code>&lt;tr&gt;</code>. Reserved keys
        (<code>class</code>/<code>tabindex</code>/<code>data-row-index</code>/handlers) are stripped —
        attributes only, no styling opinion. Inspect a row in devtools to see the hooks.
      </p>
      <AspDataTable :columns="columns" :rows="rows" row-key="id" :row-attrs="rowAttrsDemo">
        <template #cell-status="{ value }">
          <span
            :style="`display:inline-block;padding:0.1rem 0.5rem;border-radius:var(--radius-pill);font-size:var(--text-xs);${statusStyle(value)}`"
          >{{ statusText[value] }}</span>
        </template>
      </AspDataTable>
    </Variant>

    <Variant title="Row emphasis (rowState: muted / active)">
      <p style="margin-bottom: 8px; color: var(--text-muted);">
        <code>rowState(row, i) → 'muted' | 'active' | null</code> is a closed, token-backed vocabulary
        the DS styles itself — <strong>not</strong> a raw <code>rowClass</code> hatch.
        <code>active</code> = current-row highlight (a low-emphasis brand tint + left accent bar);
        <code>muted</code> = a de-emphasised summary / remainder row. Shown in both themes; both stay
        WCAG-AA and distinct from the interactive hover-fill.
      </p>
      <AspDataTable :columns="columns" :rows="rows" row-key="id" :row-state="rowStateDemo">
        <template #cell-status="{ value }">
          <span
            :style="`display:inline-block;padding:0.1rem 0.5rem;border-radius:var(--radius-pill);font-size:var(--text-xs);${statusStyle(value)}`"
          >{{ statusText[value] }}</span>
        </template>
      </AspDataTable>
      <div data-theme="dark" style="background: var(--surface-page); padding: 16px; margin-top: 16px;">
        <AspDataTable :columns="columns" :rows="rows" row-key="id" :row-state="rowStateDemo">
          <template #cell-status="{ value }">
            <span
              :style="`display:inline-block;padding:0.1rem 0.5rem;border-radius:var(--radius-pill);font-size:var(--text-xs);${statusStyle(value)}`"
            >{{ statusText[value] }}</span>
          </template>
        </AspDataTable>
      </div>
    </Variant>

    <Variant title="Dark theme">
      <div data-theme="dark" style="background: var(--surface-page); padding: 16px;">
        <AspDataTable :columns="columns" :rows="rows" interactive>
          <template #cell-status="{ value }">
            <span
              :style="`display:inline-block;padding:0.1rem 0.5rem;border-radius:var(--radius-pill);font-size:var(--text-xs);${statusStyle(value)}`"
            >{{ statusText[value] }}</span>
          </template>
        </AspDataTable>
      </div>
    </Variant>
  </Story>
</template>

<style>
/* What the Invoices app does to its own tables (§3.165 variant). */
.crush-box table {
  table-layout: fixed;
  width: 100%;
}
</style>
