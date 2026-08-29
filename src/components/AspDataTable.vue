<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

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

  // --- Per-row hooks (§3.88, task #4318) -------------------------------------
  // rowAttrs(row, index) → object of attributes spread onto the data <tr> (test
  // hooks / data-*). Carries NO styling opinion. The component's own bindings
  // are reserved and win: class/key/tabindex/aria-rowindex/data-row-index/role
  // and the click/keydown handlers are stripped from the returned object, so a
  // consumer can never clobber the interactive / virtualization / a11y contract.
  rowAttrs: { type: Function, default: null },
  // rowState(row, index) → 'muted' | 'active' | null. A CLOSED, token-backed
  // emphasis vocabulary the component styles itself (data-table__row--muted /
  // --active) — deliberately NOT an open rowClass hatch. Any value outside the
  // closed set is ignored. The enum is extended only by a design-of-record
  // amendment (§3.85 closed-allowlist reasoning applied to rows).
  rowState: { type: Function, default: null },

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

// --- Horizontal-overflow discoverability cue (#4529) -------------------------
// `.data-table__scroll` is an `overflow-x: auto` box, but a native scrollbar is
// thin / auto-hiding on many configs (mac trackpad, mobile, several GTK themes),
// so a table that extends past the viewport can read as truncated rather than
// scrollable. These two booleans gate a trailing/leading edge-fade that appears
// only when content actually overflows and fades out at each true end, turning
// the §3.87/§3.88 "horizontal scroll is fine because nothing is lost" ruling
// (#4432) into something the viewer can see is scrollable.
const overflowStart = ref(false)
const overflowEnd = ref(false)
// The colour the edge-fade dissolves into: the ACTUAL background this table sits
// on. The component sets no background of its own (`color: inherit`), so a single
// hardcoded fade colour would band on any surface but the one it was tuned for —
// the light page (#e4e4e4) and a dark AspCard (#424242) are the two sanctioned
// worst cases. Resolved the same way AspChart resolves its surface luminance:
// walk ancestors to the first non-transparent background. Empty string falls the
// CSS back to `--surface-page`. Re-resolved on mount, resize and theme flip.
const surfaceColor = ref('')

const resolveSurfaceColor = () => {
  if (typeof getComputedStyle === 'undefined') return
  let node = scrollEl.value
  while (node) {
    const bg = getComputedStyle(node).backgroundColor
    const m = /^rgba?\(([^)]+)\)$/i.exec(bg)
    if (m) {
      const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number)
      const a = p[3] != null ? p[3] : 1
      if (a > 0 && p.length >= 3) {
        surfaceColor.value = bg
        return
      }
    }
    node = node.parentElement
  }
  surfaceColor.value = ''
}

// A 1px epsilon absorbs sub-pixel rounding at the boundary so the cue does not
// flicker on/off when a scroll lands almost-but-not-quite at an edge.
const EDGE_EPSILON = 1
const measureOverflow = () => {
  const el = scrollEl.value
  if (!el) return
  const maxScroll = el.scrollWidth - el.clientWidth
  const overflows = maxScroll > EDGE_EPSILON
  overflowStart.value = overflows && el.scrollLeft > EDGE_EPSILON
  overflowEnd.value = overflows && el.scrollLeft < maxScroll - EDGE_EPSILON
}

const onScroll = () => {
  if (scrollEl.value) scrollTop.value = scrollEl.value.scrollTop
  measureOverflow()
}
const measureViewport = () => {
  if (scrollEl.value) viewportH.value = scrollEl.value.clientHeight
}

// The overflow state on load, and after a resize, does not depend on any scroll
// event ever firing, so it is measured directly. A ResizeObserver covers both a
// container-width change (columns become reachable / unreachable) and a
// content-width change from a row/column set swap.
let resizeObserver = null
let themeObserver = null
onMounted(() => {
  measureViewport()
  measureOverflow()
  resolveSurfaceColor()
  const el = scrollEl.value
  if (el && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => measureOverflow())
    resizeObserver.observe(el)
  }
  // Re-resolve the fade colour when the app flips `data-theme` on the root:
  // --surface-* tokens flip with the theme, so a colour resolved once would
  // otherwise band after a theme change (same reason AspChart re-themes).
  if (typeof MutationObserver !== 'undefined') {
    themeObserver = new MutationObserver(() => resolveSurfaceColor())
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    })
  }
})

// A change to the rendered row set can change the content width (and so the
// overflow state) without a scroll or resize — recompute after the DOM settles.
watch(
  () => displayRows.value.length,
  () => nextTick(measureOverflow),
)

onBeforeUnmount(() => {
  if (resizeObserver) resizeObserver.disconnect()
  if (themeObserver) themeObserver.disconnect()
})

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

// --- Per-row hooks (§3.88) ----------------------------------------------------
// Keys the component owns on the data <tr>; a consumer's rowAttrs cannot set
// them (class/style/handlers would otherwise MERGE in Vue rather than lose to
// the component, so stripping — not ordering alone — is what enforces the
// contract). Matched case-insensitively; any on*-prefixed handler is stripped.
const RESERVED_ROW_ATTRS = new Set([
  'class', 'style', 'key', 'tabindex', 'aria-rowindex',
  'data-row-index', 'role',
])
const isReservedRowAttr = (k) =>
  RESERVED_ROW_ATTRS.has(String(k).toLowerCase()) || /^on[a-z]/i.test(k)

const rowAttrsFor = (row, index) => {
  if (!props.rowAttrs) return null
  const raw = props.rowAttrs(row, index)
  if (!raw || typeof raw !== 'object') return null
  const clean = {}
  for (const k of Object.keys(raw)) {
    if (isReservedRowAttr(k)) {
      if (import.meta.env?.DEV)
        // eslint-disable-next-line no-console
        console.warn(`[AspDataTable] rowAttrs: reserved key "${k}" ignored — the component owns it.`)
      continue
    }
    clean[k] = raw[k]
  }
  return clean
}

// Closed emphasis vocabulary; anything else is ignored (never rendered as a raw
// class). Returns the modifier class, or null.
const ROW_STATES = new Set(['muted', 'active'])
const rowStateClass = (row, index) => {
  if (!props.rowState) return null
  const s = props.rowState(row, index)
  if (s == null) return null
  if (!ROW_STATES.has(s)) {
    if (import.meta.env?.DEV)
      // eslint-disable-next-line no-console
      console.warn(`[AspDataTable] rowState: "${s}" is not one of muted|active|null — ignored.`)
    return null
  }
  return `data-table__row--${s}`
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
  <!-- The viewport wrapper is the non-scrolling positioning context for the
       edge-fade cues (#4529); it must not scroll, so the ::before/::after stay
       pinned to the visible edges rather than travelling with the content. -->
  <div
    class="data-table__viewport"
    :class="{
      'data-table__viewport--overflow-start': overflowStart,
      'data-table__viewport--overflow-end': overflowEnd,
    }"
    :style="surfaceColor ? { '--asp-dt-surface': surfaceColor } : null"
  >
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
              v-bind="rowAttrsFor(row, startIndex + i)"
              class="data-table__row"
              :class="[{ 'data-table__row--interactive': interactive }, rowStateClass(row, startIndex + i)]"
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
  </div>
</template>

<style scoped>
/* Non-scrolling positioning context for the horizontal-overflow edge cues
   (#4529). The fades are painted on ::before/::after here — NOT inside
   .data-table__scroll — so they stay pinned to the visible edges instead of
   scrolling away with the table body. */
.data-table__viewport {
  position: relative;
  width: 100%;
}

.data-table__scroll {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

/* Trailing / leading overflow cue: a soft fade to the surface's own background
   (var(--asp-dt-surface), resolved in JS to whatever surface the table sits on;
   falls back to the page ground). Opacity 0 by default so a table that fits
   shows nothing; the --overflow-start / --overflow-end classes fade the relevant
   edge in only while there is more to scroll toward. */
.data-table__viewport::before,
.data-table__viewport::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2.5rem;
  pointer-events: none;
  opacity: 0;
  transition: opacity 120ms ease;
  z-index: 1;
}
.data-table__viewport::before {
  left: 0;
  background: linear-gradient(to right, var(--asp-dt-surface, var(--surface-page)), transparent);
}
.data-table__viewport::after {
  right: 0;
  background: linear-gradient(to left, var(--asp-dt-surface, var(--surface-page)), transparent);
}
.data-table__viewport--overflow-start::before {
  opacity: 1;
}
.data-table__viewport--overflow-end::after {
  opacity: 1;
}

/* The cue is a discoverability aid; a viewer who prefers reduced motion should
   not get the crossfade animation (the cue still appears, just without it). */
@media (prefers-reduced-motion: reduce) {
  .data-table__viewport::before,
  .data-table__viewport::after {
    transition: none;
  }
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

/* Row emphasis (rowState §3.88) — a CLOSED, token-backed vocabulary owned by the
   component, not a consumer class hatch. Both members are relative to the
   surface's own ink (--text-muted is a currentColor mix) or a brand tint, so
   they hold their contrast in light AND dark, and both stay distinct from the
   grey --interactive hover-fill above. */
.data-table__row--muted td {
  color: var(--text-muted);
}
/* A muted row reads as de-emphasized, so it must not take the interactive
   hover-fill — that would re-emphasize it on hover. */
.data-table--interactive tbody tr.data-table__row--muted:hover {
  background: transparent;
}

.data-table__row--active td {
  /* A low-emphasis brand tint over whatever surface the row sits on — NOT a
     saturated fill — so row text keeps its AA contrast in both themes. */
  background: color-mix(in srgb, var(--brand-primary) 12%, transparent);
}
/* A left accent bar so --active reads even where the tint is subtle and
   regardless of hue perception; box-shadow on the first cell renders reliably
   where a <tr> box-shadow would not. */
.data-table__row--active td:first-child {
  box-shadow: inset 3px 0 0 0 var(--brand-primary);
}

/* Empty */
.data-table__empty-row td {
  text-align: center;
  padding: var(--space-2xl) var(--space-md);
}
.data-table__empty { color: var(--text-muted); }
</style>
