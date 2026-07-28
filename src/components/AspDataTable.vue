<script setup>
import { computed, onMounted, ref, watch } from 'vue'

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

  // --- Virtualization (crash-safety §3.25/§3.29, task #2779-A1) ---------------
  // Above `virtualizeThreshold` rows the <tbody> renders only a windowed slice
  // (~viewport + overscan) with top/bottom spacer rows holding the full scroll
  // extent, so the DOM node count is bounded to the viewport rather than to the
  // fetched page (up to the 500-row §3.28 window). Below the threshold the table
  // renders plainly — no scroll viewport, and browser Ctrl-F still finds every
  // row. Transparent to consumers: the defaults leave small tables untouched.
  virtualizeThreshold: { type: Number, default: 100 },
  // Fixed row height in px — the spacer unit. Rows are pinned to this height in
  // virtual mode so the spacer math stays exact (no scroll jitter). Consumers
  // with taller rows pass a matching estimate.
  rowHeight: { type: Number, default: 40 },
  // Scroll-viewport height, applied ONLY in virtual mode (below the threshold
  // the table keeps its natural height and its own page scroll).
  maxHeight: { type: String, default: '60vh' },
  // Rows rendered beyond the viewport on each side, to cover fast scrolls.
  overscan: { type: Number, default: 8 },
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
  resetScroll()
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

// --- Virtualization state ----------------------------------------------------
// The window is computed over `displayRows` (the SORTED set), so sort/filter and
// the §3.28 manualSort→refetch path are unaffected — windowing only bounds how
// many of those rows are materialised as DOM.
const scrollEl = ref(null)
const scrollTop = ref(0)
const viewportH = ref(0)

const virtualize = computed(() => displayRows.value.length > props.virtualizeThreshold)

const onScroll = () => {
  if (scrollEl.value) scrollTop.value = scrollEl.value.scrollTop
}
const measureViewport = () => {
  if (scrollEl.value) viewportH.value = scrollEl.value.clientHeight
}
onMounted(measureViewport)

const startIndex = computed(() =>
  virtualize.value
    ? Math.max(0, Math.floor(scrollTop.value / props.rowHeight) - props.overscan)
    : 0,
)
const endIndex = computed(() => {
  if (!virtualize.value) return displayRows.value.length
  // Fall back to a full-ish window before the viewport is measured, so the first
  // paint is not empty; the measure on mount then tightens it.
  const perView = Math.ceil((viewportH.value || 800) / props.rowHeight)
  return Math.min(displayRows.value.length, startIndex.value + perView + props.overscan * 2)
})

const windowedRows = computed(() =>
  virtualize.value
    ? displayRows.value.slice(startIndex.value, endIndex.value)
    : displayRows.value,
)
const topPad = computed(() => (virtualize.value ? startIndex.value * props.rowHeight : 0))
const bottomPad = computed(() =>
  virtualize.value ? (displayRows.value.length - endIndex.value) * props.rowHeight : 0,
)

// aria-rowcount is the CANONICAL total (§3.25): the header row + every data row,
// regardless of how many are currently materialised — never the windowed slice.
const ariaRowCount = computed(() =>
  virtualize.value ? displayRows.value.length + 1 : undefined,
)
// Reset the viewport to the top when the row set is reordered, so a sort does
// not leave the operator staring at the middle of the newly-ordered list.
const resetScroll = () => {
  if (scrollEl.value) scrollEl.value.scrollTop = 0
  scrollTop.value = 0
}

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
  'data-table--virtual': virtualize.value,
}))
</script>

<template>
  <div
    ref="scrollEl"
    class="data-table__scroll"
    :class="{ 'data-table__scroll--virtual': virtualize }"
    :style="virtualize ? { maxHeight } : null"
    @scroll="onScroll"
  >
    <table
      :class="tableClasses"
      :style="virtualize ? { '--asp-dt-row-h': `${rowHeight}px` } : null"
      :aria-rowcount="ariaRowCount"
    >
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
          <!-- Top spacer holds the height of the rows scrolled off above, so the
               scrollbar reflects the full set while only the window is in DOM.
               aria-hidden: it is scroll padding, not a row. -->
          <tr v-if="topPad" class="data-table__spacer" aria-hidden="true">
            <td :colspan="columns.length" :style="{ height: `${topPad}px` }" />
          </tr>
          <tr
            v-for="(row, i) in windowedRows"
            :key="keyFor(row, startIndex + i)"
            class="data-table__row"
            :class="{ 'data-table__row--interactive': interactive }"
            :tabindex="interactive ? 0 : undefined"
            :aria-rowindex="virtualize ? startIndex + i + 2 : undefined"
            :data-row-index="startIndex + i"
            @click="onRowClick(row, startIndex + i, $event)"
            @keydown="onRowKeydown(row, startIndex + i, $event)"
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
              <slot
                :name="`cell-${col.key}`"
                :row="row"
                :value="row[col.key]"
                :index="startIndex + i"
              >
                {{ row[col.key] }}
              </slot>
            </td>
          </tr>
          <!-- Bottom spacer holds the height of the rows below the window. -->
          <tr v-if="bottomPad" class="data-table__spacer" aria-hidden="true">
            <td :colspan="columns.length" :style="{ height: `${bottomPad}px` }" />
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

/* Virtual mode (§3.25/§3.29, #2779): the scroll wrapper becomes the vertical
   viewport. None of this applies below the threshold, where the table renders
   at its natural height with the page as the scroll context. */
.data-table__scroll--virtual {
  overflow-y: auto;
}

/* Pin data-row cells to the spacer unit so the spacer math is exact — a row that
   grew past rowHeight would drift the scrollbar. Spacer and empty rows are
   exempt (they carry their own heights). */
.data-table--virtual tbody tr.data-table__row td {
  height: var(--asp-dt-row-h);
  max-height: var(--asp-dt-row-h);
  overflow: hidden;
}

/* Spacer rows are pure scroll padding: no cell chrome, height set inline. */
.data-table__spacer td {
  padding: 0;
  border: none;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-family-base);
  font-size: var(--text-sm);
  /* `inherit`, not an absolute ink: this element sets no background of its own,
     so it renders on whatever surface the consumer drops it into. AspCard's
     default surface is DARK even in the light theme, where --text-on-light and
     --surface-card are both #424242 — an absolute ink there renders text in
     exactly its own background colour (measured 1:1, invisible). Inheriting
     takes the ink the surface-setter already declared, which is correct on the
     page, on a card, and on any surface added later. */
  color: inherit;
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
.data-table__sort:hover { text-decoration: underline; }
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
