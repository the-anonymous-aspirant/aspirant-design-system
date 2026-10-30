<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import AspButton from './AspButton.vue'
import AspSelect from './AspSelect.vue'
import { cardRoleOf, resolveRoles } from './dataTableRoles.js'

// AspDataTable — DS-themed sortable table. Ports the system_3 _partials/table.html
// + _sort_header.html macros (system_3_frontend_spec.md criterion 27 column
// sorting; system_3_ux_conventions.md §8 per-row actionable cells). The system_3
// macro sorts server-side via HTMX; this component sorts CLIENT-SIDE by default
// (the Vue-idiomatic path) while emitting `sort` and supporting a controlled
// sortBy/sortDir + `manualSort` so a server-paginating consumer can take over.
//
// columns: [{ key, label, sortable?=true, align?='left', truncate?=false, width?,
//            role?='secondary', title?: (row) => string | null }]
// rows:    array of plain objects keyed by column.key.
//
// Phone card list (§3.114 D6 as extended by §3.119, task #9133): when the
// table's OWN container is narrower than 640px and more than three columns are
// visible, each row renders as a card — identity top-left, figure top-right, the
// secondary cells stacked as label-value pairs. `role` names which column is
// which (dataTableRoles.js). `narrow="scroll"` keeps today's horizontal scroll at
// every width, for a homogeneous matrix (#4432, narrowed by §3.119).

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
  // 'fill' (default): the table spans its container. 'content': it sizes to
  // its columns' content, never wider than the container — for a breakdown
  // table of a few columns (§3.119, #9136).
  fit: {
    type: String,
    default: 'fill',
    validator: (v) => ['fill', 'content'].includes(v),
  },
  // Below a 640px container: 'cards' (the ruled default) or 'scroll' (a
  // homogeneous matrix keeps the sideways scroll and the #4529 edge fade).
  narrow: {
    type: String,
    default: 'cards',
    validator: (v) => ['cards', 'scroll'].includes(v),
  },

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
  // What virtual mode scrolls against (§3.120 Q11, system_3 #9182). 'self' (the
  // default) is the capped inner viewport above. 'window' keeps the windowing
  // but reads it from the PAGE scroll and drops the cap and the vertical
  // overflow, so a phone list under a filter block has one scroller: the page.
  scrollRoot: {
    type: String,
    default: 'self',
    validator: (v) => ['self', 'window'].includes(v),
  },
})

const emit = defineEmits(['sort', 'update:sortBy', 'update:sortDir', 'row-click'])

// Internal sort state seeded from props; kept in sync when the parent controls it.
const curSortBy = ref(props.sortBy)
const curSortDir = ref(props.sortDir)
watch(() => props.sortBy, (v) => { curSortBy.value = v })
watch(() => props.sortDir, (v) => { curSortDir.value = v })

const isSortable = (col) => col.sortable !== false

const applySort = (key, dir) => {
  curSortBy.value = key
  curSortDir.value = dir
  emit('update:sortBy', key)
  emit('update:sortDir', dir)
  emit('sort', { key, dir })
  resetScroll()
}

const onSort = (col) => {
  if (!isSortable(col)) return
  let dir = 'asc'
  if (curSortBy.value === col.key) {
    dir = curSortDir.value === 'asc' ? 'desc' : 'asc'
  }
  applySort(col.key, dir)
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

// --- Column roles and card mode (§3.119, #9133) ------------------------------
const roles = computed(() => resolveRoles(props.columns))
watch(
  () => roles.value.warnings,
  (warnings) => {
    if (!import.meta.env?.DEV) return
    // eslint-disable-next-line no-console
    for (const w of warnings) console.warn(`[AspDataTable] ${w}`)
  },
  { immediate: true },
)
const cardRole = (col) => cardRoleOf(col, roles.value)

// The switch is measured on the table's own wrapper, not the viewport, so a
// table inside a narrow card switches too. It is a ResizeObserver rather than a
// CSS container query: `container-type: inline-size` adds inline-size
// containment, which collapses the table to 0 width under a shrink-to-fit
// parent. A ResizeObserver callback runs after layout and before paint, so the
// first frame is already in the right mode.
const CARD_BREAKPOINT = 640
const viewportEl = ref(null)
const containerWidth = ref(0)
// A shrink-to-fit parent can make the two modes disagree about the width (the
// table is wide enough for table mode only while it is in card mode). Past a
// few flips inside one frame, stay in table mode rather than loop.
let flips = 0
let flipFrame = 0
const cardLocked = ref(false)
const cardMode = computed(
  () =>
    !cardLocked.value &&
    props.narrow === 'cards' &&
    props.columns.length > 3 &&
    containerWidth.value > 0 &&
    containerWidth.value < CARD_BREAKPOINT,
)
watch(cardMode, () => {
  flips += 1
  if (!flipFrame && typeof requestAnimationFrame !== 'undefined') {
    flipFrame = requestAnimationFrame(() => {
      flips = 0
      flipFrame = 0
    })
  }
  if (flips > 4) {
    cardLocked.value = true
    if (import.meta.env?.DEV)
      // eslint-disable-next-line no-console
      console.warn('[AspDataTable] card mode oscillated under a shrink-to-fit parent; staying in table mode.')
  }
})
const measureContainer = () => {
  if (viewportEl.value) containerWidth.value = viewportEl.value.getBoundingClientRect().width
}

// --- Secondary columns yield (≥640px, §3.119) --------------------------------
// With a declared identity at its 24ch floor, a table whose secondary columns
// will not fit would scroll sideways. Only then do the WIDEST secondary columns
// give up exactly the overflow: one cap C is found such that trimming every
// secondary column wider than C to C removes the overflow (water-filling), and
// only those columns truncate, with an ellipsis and a `title`. Narrower columns
// keep wrapping as before; the identity keeps its floor; the figure and any
// consumer-set `width` column are never capped. A table that fits is untouched.
const yieldCaps = ref(null)
// Several triggers (resize, rows, mode, fonts) can overlap; each call measures
// the UNCAPPED layout, and only the latest call writes, so caps never compound.
let yieldRun = 0
const measureYield = async () => {
  const run = ++yieldRun
  yieldCaps.value = null
  // A `narrow="scroll"` matrix keeps its sideways scroll; it never yields.
  if (cardMode.value || props.narrow === 'scroll' || !roles.value.identityDeclared || !scrollEl.value)
    return
  // Let the uncapped render land, so a container that grew can drop the caps.
  await nextTick()
  if (run !== yieldRun) return
  const el = scrollEl.value
  const overflow = el ? el.scrollWidth - el.clientWidth : 0
  if (overflow <= 1) return
  const cells =
    el.querySelector('thead tr')?.children ?? el.querySelector('tbody tr.data-table__row')?.children
  if (!cells) return
  const cols = []
  props.columns.forEach((col, i) => {
    if (col.width || col.key === roles.value.identity || col.key === roles.value.figure) return
    cols.push({ key: col.key, w: cells[i].offsetWidth, cell: cells[i] })
  })
  if (!cols.length) return
  const target = cols.reduce((sum, c) => sum + c.w, 0) - overflow
  const asc = cols.map((c) => c.w).sort((a, b) => a - b)
  let cap = 0
  let below = 0
  for (let i = 0; i < asc.length; i++) {
    const c = (target - below) / (asc.length - i)
    if (c <= asc[i]) {
      cap = c
      break
    }
    below += asc[i]
  }
  const caps = {}
  // A table cell's min-/max-width bound its whole box, padding included
  // (measured in Chromium), so the cap is applied as is.
  for (const c of cols) if (c.w > cap) caps[c.key] = Math.max(32, Math.floor(cap))
  yieldCaps.value = caps
}
const yields = (col) => yieldCaps.value?.[col.key] != null
// min-width too: a clipped cell's min-content no longer holds it, so a
// consumer's slack column (`width: 100%`) would squeeze it below the cap.
const yieldStyle = (col) => {
  if (!yields(col)) return null
  const px = `${yieldCaps.value[col.key]}px`
  return { minWidth: px, maxWidth: px }
}

const cellStyle = (col) => {
  if (cardMode.value) return null
  if (col.width) return { maxWidth: col.width }
  return yieldStyle(col)
}

// The native `title` on a truncated or yielding cell is a plain truncation
// reveal (§3.119 R6, #9138). A column's `title(row)` hook decides it; without
// one a scalar reveals String(v), anything else its compact JSON, and an empty
// value no title at all. `String()` on an object revealed "[object Object]" on
// every /logs Inputs cell (#9104 B3-5).
const titleFor = (col, row) => {
  if (typeof col.title === 'function') {
    const t = col.title(row)
    return t == null || t === '' ? undefined : String(t)
  }
  const v = row[col.key]
  if (v == null || v === '') return undefined
  if (typeof v !== 'object') return String(v)
  try {
    return JSON.stringify(v)
  } catch {
    return undefined
  }
}

const isNumeric = (v) =>
  (typeof v === 'number' && Number.isFinite(v)) ||
  (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)))

const cellClasses = (col, row) => {
  if (!cardMode.value) {
    return [
      `data-table__td--${col.align || 'left'}`,
      {
        'data-table__td--truncate': col.truncate,
        // The ≥640px floor binds a DECLARED identity only (dataTableRoles.js).
        'data-table__td--identity': roles.value.identityDeclared && col.key === roles.value.identity,
        'data-table__td--figure': col.key === roles.value.figure,
        'data-table__td--yield': yields(col),
      },
    ]
  }
  const role = cardRole(col)
  return [
    'data-table__card-cell',
    `data-table__card-cell--${role}`,
    { 'data-table__card-cell--mono': role === 'figure' && isNumeric(row[col.key]) },
  ]
}

// Card-mode sort: the header row is hidden, so the sortable columns move into
// one compact select plus a direction toggle. Both go through applySort, the
// path a header click takes.
const sortLabelId = `asp-dt-sort-${Math.random().toString(36).slice(2, 9)}`
const sortOptions = computed(() =>
  props.columns.filter(isSortable).map((c) => ({ value: c.key, label: c.label })),
)
const onCardSortKey = (key) => {
  if (key) applySort(key, 'asc')
}
const onCardSortDir = () => {
  if (curSortBy.value) applySort(curSortBy.value, curSortDir.value === 'asc' ? 'desc' : 'asc')
}

// --- Virtualization state ----------------------------------------------------
// The window is computed over `displayRows` (the SORTED set), so sort/filter and
// the §3.28 manualSort→refetch path are unaffected — windowing only bounds how
// many of those rows are materialised as DOM.
const scrollEl = ref(null)
const scrollTop = ref(0)
const viewportH = ref(0)

const virtualize = computed(() => displayRows.value.length > props.virtualizeThreshold)
const windowScroll = computed(() => virtualize.value && props.scrollRoot === 'window')
const selfScroll = computed(() => virtualize.value && props.scrollRoot !== 'window')

// Window-scrolled virtual mode: the same scrollTop/viewportH the spacer math
// reads, measured against the page — how far it has scrolled past the table's
// top, and the window height. Listeners live only while the mode is on.
const onWindowScroll = () => {
  if (!scrollEl.value) return
  scrollTop.value = Math.max(0, -scrollEl.value.getBoundingClientRect().top)
  viewportH.value = window.innerHeight
}
const bindWindow = (on) => {
  if (typeof window === 'undefined') return
  if (on) {
    window.addEventListener('scroll', onWindowScroll, { passive: true })
    window.addEventListener('resize', onWindowScroll)
    onWindowScroll()
  } else {
    window.removeEventListener('scroll', onWindowScroll)
    window.removeEventListener('resize', onWindowScroll)
  }
}

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
  // In window mode the wrapper only scrolls sideways; the page owns scrollTop.
  if (scrollEl.value && !windowScroll.value) scrollTop.value = scrollEl.value.scrollTop
  measureOverflow()
}
const measureViewport = () => {
  if (windowScroll.value) onWindowScroll()
  else if (scrollEl.value) viewportH.value = scrollEl.value.clientHeight
}

// The overflow state on load, and after a resize, does not depend on any scroll
// event ever firing, so it is measured directly. A ResizeObserver covers both a
// container-width change (columns become reachable / unreachable) and a
// content-width change from a row/column set swap.
let resizeObserver = null
let themeObserver = null
onMounted(() => {
  if (windowScroll.value) bindWindow(true)
  measureContainer()
  measureViewport()
  measureOverflow()
  measureYield()
  resolveSurfaceColor()
  // Widths measured before the web font loads are the fallback face's; the
  // overflow cue and the yield caps are measurements, so take them again.
  document.fonts?.ready.then(() => {
    measureOverflow()
    measureYield()
  })
  const el = scrollEl.value
  if (el && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      measureContainer()
      measureViewport()
      measureOverflow()
      measureYield()
    })
    resizeObserver.observe(el)
    if (viewportEl.value) resizeObserver.observe(viewportEl.value)
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
  () => nextTick(() => {
    measureOverflow()
    measureYield()
  }),
)
watch([cardMode, () => props.columns], () => nextTick(measureYield))

watch(windowScroll, (on) => nextTick(() => bindWindow(on)))

onBeforeUnmount(() => {
  bindWindow(false)
  if (resizeObserver) resizeObserver.disconnect()
  if (themeObserver) themeObserver.disconnect()
  if (flipFrame && typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(flipFrame)
})

// --- Card-mode virtualization (#9133) ------------------------------------------
// Table mode pins every row to `rowHeight`, so its spacer math is exact. A card's
// height varies (the identity wraps; it is never truncated), so card mode
// measures each rendered card into a per-index cache and estimates the rest from
// the column count. Prefix sums over the cache give the window and the spacers;
// the DOM stays bounded to the viewport as in table mode.
const cardHeights = ref([])
const cardEstimate = computed(() => {
  // padding + identity line + one label-value line per secondary cell + gap.
  const secondary = Math.max(0, props.columns.length - 1 - (roles.value.figure ? 1 : 0))
  return 16 + 22 + secondary * 22 + 4
})
const virtualCards = computed(() => virtualize.value && cardMode.value)
// The cache is per index into the SORTED rows, so any reorder, row-set change,
// mode change or width change invalidates it.
watch([displayRows, cardMode, containerWidth], () => {
  cardHeights.value = []
})
const cardOffsets = computed(() => {
  const n = displayRows.value.length
  const offsets = new Array(n + 1)
  offsets[0] = 0
  const h = cardHeights.value
  const est = cardEstimate.value
  for (let i = 0; i < n; i++) offsets[i + 1] = offsets[i] + (h[i] ?? est)
  return offsets
})
// The largest index whose card starts at or above `y`.
const cardIndexAt = (y) => {
  const offsets = cardOffsets.value
  let lo = 0
  let hi = offsets.length - 2
  if (hi < 0) return 0
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (offsets[mid] <= y) lo = mid
    else hi = mid - 1
  }
  return lo
}
const measureCards = () => {
  if (!virtualCards.value || !scrollEl.value) return
  const next = cardHeights.value.slice()
  let changed = false
  for (const el of scrollEl.value.querySelectorAll('tbody tr.data-table__row')) {
    const i = Number(el.dataset.rowIndex)
    const mb = parseFloat(getComputedStyle(el).marginBottom) || 0
    const h = el.getBoundingClientRect().height + mb
    if (Math.abs((next[i] ?? -1) - h) > 0.5) {
      next[i] = h
      changed = true
    }
  }
  if (changed) cardHeights.value = next
}

const startIndex = computed(() => {
  if (!virtualize.value) return 0
  if (virtualCards.value) return Math.max(0, cardIndexAt(scrollTop.value) - props.overscan)
  return Math.max(0, Math.floor(scrollTop.value / props.rowHeight) - props.overscan)
})
const endIndex = computed(() => {
  if (!virtualize.value) return displayRows.value.length
  // Fall back to a full-ish window before the viewport is measured, so the first
  // paint is not empty; the measure on mount then tightens it.
  if (virtualCards.value) {
    const last = cardIndexAt(scrollTop.value + (viewportH.value || 800))
    return Math.min(displayRows.value.length, last + 1 + props.overscan)
  }
  const perView = Math.ceil((viewportH.value || 800) / props.rowHeight)
  return Math.min(displayRows.value.length, startIndex.value + perView + props.overscan * 2)
})

const windowedRows = computed(() =>
  virtualize.value
    ? displayRows.value.slice(startIndex.value, endIndex.value)
    : displayRows.value,
)
const topPad = computed(() => {
  if (!virtualize.value) return 0
  if (virtualCards.value) return cardOffsets.value[startIndex.value]
  return startIndex.value * props.rowHeight
})
const bottomPad = computed(() => {
  if (!virtualize.value) return 0
  if (virtualCards.value) {
    const offsets = cardOffsets.value
    return offsets[offsets.length - 1] - offsets[endIndex.value]
  }
  return (displayRows.value.length - endIndex.value) * props.rowHeight
})
// Measure the cards the window just rendered; a changed height re-derives the
// offsets, which settles once every rendered card is measured.
watch([windowedRows, virtualCards], () => nextTick(measureCards), { flush: 'post' })

// Card mode has no header row, so the data rows start at aria-rowindex 1.
const headerRows = computed(() => (cardMode.value ? 0 : 1))

// aria-rowcount is the CANONICAL total (§3.25): the header row + every data row,
// regardless of how many are currently materialised — never the windowed slice.
const ariaRowCount = computed(() =>
  virtualize.value ? displayRows.value.length + headerRows.value : undefined,
)
// Reset the viewport to the top when the row set is reordered, so a sort does
// not leave the operator staring at the middle of the newly-ordered list.
const resetScroll = () => {
  if (windowScroll.value) {
    // Bring the table's top back into view only if the page is scrolled past it.
    const top = scrollEl.value?.getBoundingClientRect().top ?? 0
    if (top < 0) window.scrollBy(0, top)
    onWindowScroll()
    return
  }
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
  'data-table--fit-content': props.fit === 'content',
  'data-table--cards': cardMode.value,
  'data-table--cards-figure': cardMode.value && roles.value.figure != null,
}))
</script>

<template>
  <!-- The viewport wrapper is the non-scrolling positioning context for the
       edge-fade cues (#4529); it must not scroll, so the ::before/::after stay
       pinned to the visible edges rather than travelling with the content. -->
  <div
    ref="viewportEl"
    class="data-table__viewport"
    :class="{
      'data-table__viewport--overflow-start': overflowStart,
      'data-table__viewport--overflow-end': overflowEnd,
      'data-table__viewport--cards': cardMode,
    }"
    :style="surfaceColor ? { '--asp-dt-surface': surfaceColor } : null"
  >
    <!-- Card mode hides the header row, so its sort moves here (#9133). -->
    <div v-if="cardMode && sortOptions.length" class="data-table__card-sort">
      <span :id="sortLabelId" class="data-table__card-sort-label">Sort by</span>
      <AspSelect
        :model-value="curSortBy || null"
        :options="sortOptions"
        placeholder="Default order"
        :aria-labelledby="sortLabelId"
        class="data-table__card-sort-select"
        @update:model-value="onCardSortKey"
      />
      <AspButton
        variant="ghost"
        size="sm"
        class="data-table__card-sort-dir"
        :disabled="!curSortBy"
        :aria-label="curSortDir === 'asc' ? 'Sorted ascending; reverse' : 'Sorted descending; reverse'"
        @click="onCardSortDir"
      >
        {{ curSortDir === 'asc' ? '▲' : '▼' }}
      </AspButton>
    </div>
    <div
      ref="scrollEl"
      class="data-table__scroll"
      :class="{ 'data-table__scroll--virtual': selfScroll, 'data-table__scroll--window': windowScroll }"
      :style="selfScroll ? { maxHeight } : null"
      @scroll="onScroll"
    >
      <table
        :class="tableClasses"
        :style="virtualize ? { '--asp-dt-row-h': `${rowHeight}px` } : null"
        :aria-rowcount="ariaRowCount"
        :role="cardMode ? 'table' : undefined"
      >
        <caption v-if="caption" class="data-table__caption">{{ caption }}</caption>
        <thead v-if="!cardMode">
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              :class="[
                `data-table__th--${col.align || 'left'}`,
                {
                  'data-table__th--sortable': isSortable(col),
                  'data-table__th--identity': roles.identityDeclared && col.key === roles.identity,
                  'data-table__th--yield': yields(col),
                },
              ]"
              :style="col.width ? { width: col.width } : yieldStyle(col)"
              :title="yields(col) ? col.label : undefined"
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
                <!-- A yielding column's label truncates too; only then is it wrapped,
                     so a table that fits keeps its header DOM. -->
                <span v-if="yields(col)" class="data-table__th-label">
                  <slot :name="`header-${col.key}`" :column="col">{{ col.label }}</slot>
                </span>
                <slot v-else :name="`header-${col.key}`" :column="col">{{ col.label }}</slot>
                <span class="data-table__indicator" aria-hidden="true">{{
                  curSortBy === col.key ? (curSortDir === 'asc' ? '▲' : '▼') : ''
                }}</span>
              </button>
              <span v-else-if="yields(col)" class="data-table__th-label">
                <slot :name="`header-${col.key}`" :column="col">{{ col.label }}</slot>
              </span>
              <template v-else>
                <slot :name="`header-${col.key}`" :column="col">{{ col.label }}</slot>
              </template>
            </th>
          </tr>
        </thead>
        <tbody :role="cardMode ? 'rowgroup' : undefined">
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
              :role="cardMode ? 'row' : undefined"
              :aria-rowindex="virtualize ? startIndex + i + 1 + headerRows : undefined"
              :data-row-index="startIndex + i"
              @click="onRowClick(row, startIndex + i, $event)"
              @keydown="onRowKeydown(row, startIndex + i, $event)"
            >
              <td
                v-for="col in columns"
                :key="col.key"
                :class="cellClasses(col, row)"
                :style="cellStyle(col)"
                :title="(col.truncate || yields(col)) && !cardMode ? titleFor(col, row) : undefined"
                :role="cardMode ? 'cell' : undefined"
              >
                <!-- A secondary cell in a card is a label-value pair; the label
                     is the column label, since the header row is hidden. -->
                <template v-if="cardMode && cardRole(col) === 'secondary'">
                  <span class="data-table__card-label">{{ col.label }}</span>
                  <span class="data-table__card-value">
                    <slot
                      :name="`cell-${col.key}`"
                      :row="row"
                      :value="row[col.key]"
                      :index="startIndex + i"
                    >
                      {{ row[col.key] }}
                    </slot>
                  </span>
                </template>
                <slot
                  v-else
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
.data-table--virtual:not(.data-table--cards) tbody tr.data-table__row td {
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

/* Alignment (§3.119, system_3 #9136). Qualified by the table so the modifiers
   (0,2,0) outrank the base `.data-table th, .data-table td { text-align: left }`
   (0,1,1); unqualified they weighed (0,1,0) and every `align: 'right'` column
   rendered left-aligned, header and cells, so figures did not line up by digit
   (#9104 B4-2). Card mode sets its own cell alignment at (0,2,1). */
.data-table .data-table__th--right,
.data-table .data-table__td--right { text-align: right; }
.data-table .data-table__th--center,
.data-table .data-table__td--center { text-align: center; }

/* fit="content" (#9136): a breakdown table of a few columns sizes to its
   content, so a figure sits beside its subject (§3.55, §3.72) instead of
   500-880px away across a full-width card (#9104 B4-9). max-width keeps it
   inside its container. */
.data-table.data-table--fit-content {
  width: auto;
  max-width: 100%;
}

/* Sortable header button */
.data-table__sort {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2xs);
  /* A 24px hit area (§3.99 Tier 1, §3.119; system_3 #9139): with no padding
     the button was 17px tall. The header row grows only by what this needs. */
  min-height: 24px;
  min-width: 24px;
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

/* Identity floor and figure at 640px and wider (§3.119, #9133). `min-width`
   outranks `max-width`, so the floor holds against the 16ch truncate cap and a
   consumer's `max-width: 0` slack trick; the other columns yield first. Bound
   to a DECLARED identity only (dataTableRoles.js). */
.data-table td.data-table__td--identity,
.data-table th.data-table__th--identity {
  min-width: 24ch;
}
.data-table td.data-table__td--figure {
  white-space: nowrap;
}
.data-table td.data-table__td--yield,
.data-table th.data-table__th--yield {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.data-table__th--yield .data-table__sort {
  max-width: 100%;
  min-width: 0;
}
.data-table__th-label {
  display: inline-block;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}

/* --- Card mode (§3.114 D6 / §3.119, #9133) ----------------------------------
   Below a 640px container, a table of more than three columns renders each row
   as a card. Same DOM as table mode (the <tr> is the card), so rowAttrs,
   rowState, the click/keyboard handlers and tabindex apply unchanged; the
   explicit ARIA roles in the template keep the table semantics that a changed
   `display` would otherwise drop. Ink stays inherited (§3.18). */
.data-table--cards,
.data-table--cards tbody,
.data-table--cards .data-table__caption {
  display: block;
}
.data-table--cards .data-table__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  column-gap: var(--space-sm);
  row-gap: var(--space-2xs);
  padding: var(--space-sm) var(--space-md);
  margin-bottom: var(--space-xs);
  border-bottom: 1px solid var(--border-subtle);
}
.data-table--cards-figure .data-table__row {
  grid-template-columns: minmax(0, 1fr) auto;
}
.data-table--cards .data-table__row td {
  display: block;
  min-width: 0;
  max-width: none;
  padding: 0;
  border: none;
  text-align: left;
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
  overflow-wrap: anywhere;
}
.data-table--cards td.data-table__card-cell--identity {
  grid-column: 1 / -1;
  grid-row: 1;
  font-weight: var(--font-weight-medium);
}
.data-table--cards-figure td.data-table__card-cell--identity {
  grid-column: 1;
}
.data-table--cards td.data-table__card-cell--figure {
  grid-column: 2;
  grid-row: 1;
  text-align: right;
  white-space: nowrap;
  overflow-wrap: normal;
}
.data-table--cards td.data-table__card-cell--mono {
  font-family: var(--font-family-mono);
  font-variant-numeric: tabular-nums;
}
.data-table--cards td.data-table__card-cell--secondary {
  grid-column: 1 / -1;
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
  font-size: var(--text-sm);
}
.data-table__card-label {
  flex: 0 0 auto;
  font-size: var(--text-xs);
  color: var(--text-muted);
}
.data-table__card-value {
  flex: 1 1 auto;
  min-width: 0;
}
/* Row emphasis moves from the first cell to the card itself. */
.data-table--cards .data-table__row--active {
  background: color-mix(in srgb, var(--brand-primary) 12%, transparent);
  box-shadow: inset 3px 0 0 0 var(--brand-primary);
}
.data-table--cards .data-table__row--active td,
.data-table--cards .data-table__row--active td:first-child {
  background: transparent;
  box-shadow: none;
}
.data-table--cards .data-table__spacer,
.data-table--cards .data-table__spacer td,
.data-table--cards .data-table__empty-row,
.data-table--cards .data-table__empty-row td {
  display: block;
}

/* The sort bar sits outside the <table>, so it sets the table's face itself,
   and takes the cards' inline gutter so its label lines up with card text. */
.data-table__card-sort {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: 0 var(--space-md);
  margin-bottom: var(--space-xs);
  font-family: var(--font-family-base);
  font-size: var(--text-sm);
}
.data-table__card-sort-label {
  color: var(--text-muted);
}
</style>
