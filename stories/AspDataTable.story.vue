<script setup>
import { ref } from 'vue'
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

const lastClicked = ref('(none)')

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

    <Variant title="Empty slot">
      <AspDataTable :columns="columns" :rows="[]">
        <template #empty>
          <span style="color: var(--text-muted);">No records match — try widening your filters.</span>
        </template>
      </AspDataTable>
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
