<script setup>
import { computed, ref, watch } from 'vue'

// AspDataTable — DS-themed sortable table. Ports the system_3 _partials/table.html
// + _sort_header.html macros (system_3_frontend_spec.md criterion 27 column
// sorting; system_3_ux_conventions.md §8 per-row actionable cells). The system_3
// macro sorts server-side via HTMX; this component sorts CLIENT-SIDE by default
// (the Vue-idiomatic path) while emitting `sort` and supporting a controlled
// sortBy/sortDir + `manualSort` so a server-paginating consumer can take over.
//
// columns: [{ key, label, sortable?=true, align?='left', truncate?=false, width? }]
// rows:    array of plain objects keyed by column.key.

const props = defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, default: () => [] },
  density: {
    type: String,
    default: 'default',
    validator: (v) => ['default', 'compact'].includes(v),
  },
  interactive: { type: Boolean, default: false },
  // Controlled sort state (optional v-model:sort-by / v-model:sort-dir).
  sortBy: { type: String, default: '' },
  sortDir: {
    type: String,
    default: 'asc',
    validator: (v) => ['asc', 'desc'].includes(v),
  },
  // When true the component does not reorder rows itself — it only emits `sort`
  // and renders `rows` as given (server-side / external sorting).
  manualSort: { type: Boolean, default: false },
  // Row key: a column key (string) or a fn(row, index) → key. Defaults to index.
  rowKey: { type: [String, Function], default: '' },
  caption: { type: String, default: '' },
})

const emit = defineEmits(['sort', 'update:sortBy', 'update:sortDir', 'row-click'])

// Internal sort state seeded from props; kept in sync when the parent controls it.
const curSortBy = ref(props.sortBy)
const curSortDir = ref(props.sortDir)
watch(() => props.sortBy, (v) => { curSortBy.value = v })
watch(() => props.sortDir, (v) => { curSortDir.value = v })

const isSortable = (col) => col.sortable !== false

const onSort = (col) => {
  if (!isSortable(col)) return
  let dir = 'asc'
  if (curSortBy.value === col.key) {
    dir = curSortDir.value === 'asc' ? 'desc' : 'asc'
  }
  curSortBy.value = col.key
  curSortDir.value = dir
  emit('update:sortBy', col.key)
  emit('update:sortDir', dir)
  emit('sort', { key: col.key, dir })
}

// Numeric-aware comparator; nulls / undefined sort last regardless of direction.
const compare = (a, b) => {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  const na = typeof a === 'number' ? a : Number(a)
  const nb = typeof b === 'number' ? b : Number(b)
  if (!Number.isNaN(na) && !Number.isNaN(nb) && a !== '' && b !== '') return na - nb
  return String(a).localeCompare(String(b))
}

const displayRows = computed(() => {
  if (props.manualSort || !curSortBy.value) return props.rows
  const key = curSortBy.value
  const factor = curSortDir.value === 'desc' ? -1 : 1
  // Copy before sort — never mutate the incoming prop array.
  return [...props.rows].sort((r1, r2) => compare(r1[key], r2[key]) * factor)
})

const keyFor = (row, index) => {
  if (typeof props.rowKey === 'function') return props.rowKey(row, index)
  if (props.rowKey) return row[props.rowKey] ?? index
  return index
}

const ariaSortFor = (col) => {
  if (curSortBy.value !== col.key) return isSortable(col) ? 'none' : undefined
  return curSortDir.value === 'asc' ? 'ascending' : 'descending'
}

const onRowClick = (row, index, event) => {
  if (props.interactive) emit('row-click', row, index, event)
}
const onRowKeydown = (row, index, event) => {
  if (props.interactive && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault()
    emit('row-click', row, index, event)
  }
}

const tableClasses = computed(() => ({
  'data-table': true,
  [`data-table--${props.density}`]: true,
  'data-table--interactive': props.interactive,
}))
</script>

<template>
  <div class="data-table__scroll">
    <table :class="tableClasses">
      <caption v-if="caption" class="data-table__caption">{{ caption }}</caption>
      <thead>
        <tr>
          <th
            v-for="col in columns"
            :key="col.key"
            :class="[`data-table__th--${col.align || 'left'}`, { 'data-table__th--sortable': isSortable(col) }]"
            :style="col.width ? { width: col.width } : null"
            :aria-sort="ariaSortFor(col)"
            scope="col"
          >
            <button
              v-if="isSortable(col)"
              type="button"
              class="data-table__sort"
              :aria-label="`Sort by ${col.label}${curSortBy === col.key ? `, currently ${curSortDir === 'asc' ? 'ascending' : 'descending'}` : ''}`"
              @click="onSort(col)"
            >
              <slot :name="`header-${col.key}`" :column="col">{{ col.label }}</slot>
              <span class="data-table__indicator" aria-hidden="true">{{
                curSortBy === col.key ? (curSortDir === 'asc' ? '▲' : '▼') : ''
              }}</span>
            </button>
            <template v-else>
              <slot :name="`header-${col.key}`" :column="col">{{ col.label }}</slot>
            </template>
          </th>
        </tr>
      </thead>
      <tbody>
        <template v-if="displayRows.length">
          <tr
            v-for="(row, index) in displayRows"
            :key="keyFor(row, index)"
            :class="{ 'data-table__row--interactive': interactive }"
            :tabindex="interactive ? 0 : undefined"
            @click="onRowClick(row, index, $event)"
            @keydown="onRowKeydown(row, index, $event)"
          >
            <td
              v-for="col in columns"
              :key="col.key"
              :class="[
                `data-table__td--${col.align || 'left'}`,
                { 'data-table__td--truncate': col.truncate },
              ]"
              :style="col.width ? { maxWidth: col.width } : null"
              :title="col.truncate ? String(row[col.key] ?? '') : undefined"
            >
              <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]" :index="index">
                {{ row[col.key] }}
              </slot>
            </td>
          </tr>
        </template>
        <tr v-else class="data-table__empty-row">
          <td :colspan="columns.length">
            <slot name="empty">
              <span class="data-table__empty">No data.</span>
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.data-table__scroll {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-family-base);
  font-size: var(--text-sm);
  color: var(--text-on-light);
}

.data-table__caption {
  caption-side: top;
  text-align: left;
  padding: var(--space-xs) var(--space-sm);
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.data-table th,
.data-table td {
  padding: var(--space-sm) var(--space-md);
  text-align: left;
  border-bottom: 1px solid var(--border-subtle);
  vertical-align: middle;
}

.data-table--compact th,
.data-table--compact td {
  padding: var(--space-2xs) var(--space-sm);
}

.data-table thead th {
  font-weight: var(--font-weight-medium);
  color: var(--text-muted);
  white-space: nowrap;
  border-bottom-width: 2px;
}

/* Alignment */
.data-table__th--right,
.data-table__td--right { text-align: right; }
.data-table__th--center,
.data-table__td--center { text-align: center; }

/* Sortable header button */
.data-table__sort {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2xs);
  padding: 0;
  margin: 0;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
  appearance: none;
}
.data-table__sort:hover { color: var(--text-on-light); }
.data-table__sort:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
  border-radius: var(--radius-sm);
}
.data-table__indicator {
  font-size: 0.7em;
  line-height: 1;
  min-width: 0.8em;
}

/* Truncation */
.data-table__td--truncate {
  max-width: 16ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Interactive rows */
.data-table--interactive tbody tr { cursor: pointer; }
.data-table__row--interactive:hover { background: var(--surface-elevated); }
.data-table__row--interactive:focus-visible {
  outline: none;
  box-shadow: inset 0 0 0 2px var(--focus-ring-color, var(--brand-primary));
}

/* Empty */
.data-table__empty-row td {
  text-align: center;
  padding: var(--space-2xl) var(--space-md);
}
.data-table__empty { color: var(--text-muted); }
</style>
