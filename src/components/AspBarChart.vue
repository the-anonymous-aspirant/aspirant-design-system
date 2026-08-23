<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import AspChart from './AspChart.vue'
import { AA, AA_NON_TEXT, deriveInk, parseColor, toRgbString } from '../utils/color_contrast.js'
import {
  BAR_THICKNESS,
  HEIGHTS,
  STATES,
  STATE_TOKENS,
  VARIANTS,
  buildBarOptions,
  buildLineOptions,
  computeExtremeMarks,
  extremesPlugin,
  thresholdPlugin,
} from '../utils/bar_chart_options.js'

// AspBarChart — an opinionated PRESET over AspChart(type: bar), not a second
// chart engine (system_3 #2380, spec #2227, conventions §3.10).
//
// Two things about this component are non-obvious and load-bearing:
//
// 1. THE AXIS LABELS ARE DOM, NOT CANVAS. The y unit label and the x range
//    label are rendered as real elements around the canvas rather than as
//    Chart.js scale titles. Three reasons, in increasing order of importance:
//    Chart.js cannot render a y-axis title unrotated (the spec asks for it
//    "stacked at the axis"); CSS positions them exactly where §3.10 wants them;
//    and — the real one — DOM text is reachable by the shipped contrast probe,
//    which walks text nodes and cannot see a pixel painted on a canvas. Every
//    label moved out of the canvas is a label the matrix can actually measure.
//
// 2. THE INK IS DERIVED, NOT PICKED. Tick text and axis lines are painted onto
//    the canvas, so they cannot inherit per surface the way a CSS custom
//    property would. The component resolves the container's real background and
//    derives an ink that clears AA against it (§3.18 derive-and-adjust; a
//    two-ink light/dark pick is explicitly ruled insufficient). This is why the
//    component reads computed style at mount rather than trusting a token.

const props = defineProps({
  /** Chart.js data object: `{ labels, datasets }`. */
  data: { type: Object, required: true },
  /** `regular` for Performance rows, `compact` for Health cells. */
  variant: {
    type: String,
    default: 'regular',
    validator: (v) => VARIANTS.includes(v),
  },
  /**
   * The series' value encoding (§3.66) — `magnitude` (a count of events, e.g.
   * an hourly flow) or `position` (a level/stock, e.g. a live backlog size).
   * Only the `sparkline` variant reads this: `position` swaps the mark from a
   * zero-baseline bar to a focused-range line (`buildLineOptions`), because a
   * bar's baseline can never honestly lift off zero (§3.23) but a stock's
   * natural range can sit well above it. `regular`/`compact` ignore this prop
   * and always render bars — they have no line treatment.
   *
   * Defaults to `magnitude` (bar) so a caller that never sets this — the
   * common case — keeps today's safe zero-based reading; a mis-declared
   * series therefore reads as a flat/compressed bar rather than a silently
   * truncated axis.
   */
  encoding: {
    type: String,
    default: 'magnitude',
    validator: (v) => ['magnitude', 'position'].includes(v),
  },
  /**
   * Health state. When set, bars take the §3.12 metric-state colour
   * (`great` soft-blue, `normal` solid brand amber, `unhealthy` red — see
   * STATE_TOKENS) instead of the stateless default's alpha amber.
   */
  state: {
    type: String,
    default: null,
    validator: (v) => v == null || STATES.includes(v),
  },
  /**
   * X-axis domain (conventions §3.19).
   *
   * `category` (default) keeps today's treatment exactly — dense, rotation-fed
   * labels for strings with no natural abbreviation. `time` switches to the
   * §3.19 grammar: unrotated labels on wall-clock boundaries, at whatever
   * ladder interval the measured width affords.
   *
   * Opt-in rather than sniffed from the data. A chart whose labels merely LOOK
   * like times ("14h", "6d") is a categorical chart, and guessing wrong would
   * silently restyle a caller who never asked for it.
   */
  xAxis: {
    type: String,
    default: 'category',
    validator: (v) => ['category', 'time'].includes(v),
  },
  /**
   * One timestamp per bar (epoch ms, ISO string, or Date) — the domain `time`
   * mode reads. Required by `time` mode and ignored by `category`.
   *
   * Separate from `data.labels` on purpose: the labels are what the TOOLTIP
   * says ("14:00", "bucket 3"), and the axis needs the instant behind them.
   * Overloading one field would force the caller to choose between a readable
   * hover and a correct axis.
   */
  timestamps: { type: Array, default: null },
  /** Unit label stacked at the y axis, e.g. `ms`. */
  unit: { type: String, default: '' },
  /** Range label centered under the baseline, e.g. `last 30 hours`. */
  range: { type: String, default: '' },
  /** Horizontal threshold rule; labelled on hover. */
  threshold: { type: Number, default: null },
  /** Text for the threshold rule's hover label. Defaults to the value + unit. */
  thresholdLabel: { type: String, default: '' },
  /** Override the variant's height. Number (px) or any CSS length. */
  height: { type: [String, Number], default: null },
  /**
   * Mark each dataset's min and max slots with colour-differentiated glyphs
   * (system_3 #4021, operator ruling c20597): a ▲ in the max hue and a ▼ in
   * the min hue, drawn by `extremesPlugin`, with the slot's value drawn ON the
   * mark in the same derived ink (§3.66c / #4080). Hue + shape carry the signal
   * on their own, so the channel survives monochrome and colourblind reads and
   * the value is an additive third layer, not a replacement. The hues come from
   * `--chart-extreme-max` / `--chart-extreme-min` (Okabe–Ito vermillion and
   * reddish-purple fallbacks) and are derived against the real surface like
   * every other ink (§3.18). A dataset that is flat, or has fewer than two numeric values,
   * gets no marks — silence, never a lying marker. A dataset whose numeric
   * values are all ≤ 0 (the diverging contract's negated half) swaps the
   * semantic min/max so "max" always means "most of the thing counted".
   */
  markExtremes: { type: Boolean, default: false },
  /**
   * §3.66a: render TWO meaningfully-paired FLOW series (e.g. created vs done)
   * as overlaid zero-based LINES sharing one y-axis, both above the baseline —
   * the reading is "how do the two rates compare and where do they cross". Both
   * datasets are passed POSITIVE (no diverging negation); the sparkline reuses
   * the MAGNITUDE domain (zero-based), never §3.66's focused-range position
   * domain. Each line carries an inline end-of-series name label in its own hue
   * (the required non-colour channel, §3.21). A >5× window-ratio between the two
   * series' extremes falls back to the diverging paired-bar rendering, evaluated
   * per card at render time — a line pinned near the axis floor reads as flat.
   * Only the two-series `sparkline` reads this; ignored elsewhere.
   */
  pairedFlow: { type: Boolean, default: false },
  /** Chart.js options, deep-merged OVER this preset. */
  options: { type: Object, default: () => ({}) },
  /** Accessible name for the chart. Strongly recommended. */
  ariaLabel: { type: String, default: '' },
})

const root = ref(null)
// Bumped whenever the resolved theme changes, to force a re-derive. The derived
// inks depend on the container's painted background, which AspChart's own
// token re-read does not cover.
const themeTick = ref(0)
let themeObserver = null

const chartHeight = computed(() => props.height ?? HEIGHTS[props.variant] ?? HEIGHTS.regular)

// The one dispatch point (§3.49): a caller declares `variant`+`encoding`, this
// component picks the mark. Nothing outside this file chooses between a bar
// and a line primitive, so a future glance card cannot render a level as a
// magnitude by omission.
const isLineMark = computed(() => props.variant === 'sparkline' && props.encoding === 'position')

// §3.66a — a paired flow. The line/bar discriminator is the WINDOW ratio, the
// larger series' peak over the smaller's (`max(a)/max(b)`, §3.66a decision "the
// discriminator is measured against the window's extremes"): a ratio over 5×,
// or a zero-peak series (Infinity), pins one line at the floor and reads as
// flat, so it falls back to the diverging paired bars. Evaluated at render time
// from the same data driving the chart — never a per-card flag.
const FLOW_RATIO_CAP = 5
const flowRatio = computed(() => {
  const ds = props.data.datasets || []
  if (ds.length !== 2) return 0
  const peak = (d) => {
    const nums = (d.data || []).filter((v) => typeof v === 'number').map((v) => Math.abs(v))
    return nums.length ? Math.max(...nums) : 0
  }
  const a = peak(ds[0])
  const b = peak(ds[1])
  const hi = Math.max(a, b)
  const lo = Math.min(a, b)
  return lo === 0 ? Infinity : hi / lo
})
const isPaired = computed(
  () =>
    props.pairedFlow &&
    props.variant === 'sparkline' &&
    (props.data.datasets || []).length === 2
)
// Overlaid lines when the ratio clears the cap; the diverging paired-bar
// fallback otherwise.
const pairedAsLines = computed(() => isPaired.value && flowRatio.value <= FLOW_RATIO_CAP)
const pairedAsBars = computed(() => isPaired.value && !pairedAsLines.value)
// A line primitive renders a position stock (§3.66) OR a paired flow (§3.66a).
const asLineMark = computed(() => isLineMark.value || pairedAsLines.value)

// --- surface resolution -----------------------------------------------------
// Walk to the first opaque ancestor background, exactly as the contrast probe
// does. AspCard is --surface-card, which is DARK even in the light theme, so
// "what theme is it" is the wrong question — "what did this actually land on"
// is the right one.
const resolvedBackground = () => {
  if (!root.value || typeof getComputedStyle === 'undefined') return [255, 255, 255, 1]
  const layers = []
  for (let n = root.value; n; n = n.parentElement) {
    const c = parseColor(getComputedStyle(n).backgroundColor)
    if (!c || c[3] === 0) continue
    layers.push(c)
    if (c[3] === 1) break
  }
  let base = layers.pop() || [255, 255, 255, 1]
  while (layers.length) {
    const top = layers.pop()
    const a = top[3]
    base = [
      top[0] * a + base[0] * (1 - a),
      top[1] * a + base[1] * (1 - a),
      top[2] * a + base[2] * (1 - a),
      1,
    ]
  }
  return base
}

const token = (name, fallback = '') => {
  if (!root.value || typeof getComputedStyle === 'undefined') return fallback
  return getComputedStyle(root.value).getPropertyValue(name).trim() || fallback
}

// --- derived paint ----------------------------------------------------------
const paint = computed(() => {
  // Touch the tick so a theme flip recomputes; the value itself is unused.
  void themeTick.value

  const bg = resolvedBackground()
  const fontFamily = token('--font-family-base', 'system-ui, sans-serif')

  // §3.10 names --border-subtle on light surfaces and --text-muted on dark
  // cards. Those are the INTENT; deriveInk is what makes the intent land. The
  // spec's own choice is the starting hue, not the final answer.
  const preferredLine = parseColor(token('--border-subtle', '#cccccc')) || [204, 204, 204, 1]
  const preferredInk = parseColor(token('--text-muted', '#6c757d')) || [108, 117, 125, 1]

  // Tick text is text: AA. An axis line is a graphical object: AA_NON_TEXT.
  // Holding a 1px rule to the text threshold would darken it into a border the
  // design does not want.
  const axisInk = toRgbString(deriveInk(preferredInk, bg, AA))
  const axisLine = toRgbString(deriveInk(preferredLine, bg, AA_NON_TEXT))

  // Bars are graphical objects, so they derive against the plot background at
  // the NON-TEXT threshold — the same derive-and-adjust rule as the chrome,
  // applied to the painted half of the MIXED role.
  //
  // This is load-bearing, not belt-and-braces. --brand-primary-alpha is amber
  // at ~51% alpha; composited onto the light page surface it measures 1.22:1,
  // which is a bar chart with no visible bars. §3.10 names it "amber-alpha on
  // dark cards" — the alpha treatment was specified FOR the card surface, and
  // taking it as an unconditional fill is what produces the invisible case.
  // The state fills fail too (success green is 2.10:1 on the light page), so
  // all four go through the same derivation rather than special-casing one.
  const barToken = props.state ? STATE_TOKENS[props.state] : '--brand-primary-alpha'
  const preferredFill = parseColor(token(barToken, '#ffb30082')) || [255, 179, 0, 0.51]
  const barFill = toRgbString(deriveInk(preferredFill, bg, AA_NON_TEXT))

  const tooltipBg = token('--surface-card', '#424242')
  const tooltipInkPreferred = parseColor(token('--text-on-dark', '#ffffff')) || [255, 255, 255, 1]
  const tooltipBgParsed = parseColor(tooltipBg) || [66, 66, 66, 1]
  // The tooltip is its own surface, so its ink derives against the tooltip
  // background — not against the page the chart sits on.
  const tooltipInk = toRgbString(deriveInk(tooltipInkPreferred, tooltipBgParsed, AA))

  return { bg, fontFamily, axisInk, axisLine, barFill, tooltipBg, tooltipInk }
})

// The Okabe-Ito series fallbacks, mirroring AspChart's palette() guard, for a
// missing token build. Index i → dataset i's default fill.
const SERIES_FALLBACKS = ['#ffb300', '#0072b2', '#009e73', '#d55e00']

// One fill PER dataset, each DERIVED against the real surface (principle #2 at
// the top of this file: the ink is derived, not picked). Which token a dataset
// starts from is the grammar the at-a-glance cards need:
//   • an explicit `backgroundColor` on the dataset wins untouched (caller override);
//   • a `state` colours every bar with its metric-state token (unchanged);
//   • two-or-more datasets take the series palette (--chart-series-1, -2, …) so
//     the diverging flow card reads created-vs-done in distinct hues;
//   • a single sparkline takes --chart-series-1 (the at-a-glance amber, #3129);
//   • a single regular/compact chart keeps --brand-primary-alpha — this
//     variant's default fill is deliberately left exactly as it was.
const barFills = computed(() => {
  void themeTick.value
  const bg = resolvedBackground()
  // §3.78 item 2 (#4187): series colors are surface-resolved — the dark-surface
  // set (`--chart-series-*-on-dark`) on a dark background, the light-surface set
  // otherwise, selected by the resolved background's luminance (not the theme).
  // This sparkline sits on the dark KPI card, so it takes the dark set and its
  // hues match AspChart's. deriveInk below leaves the already-clearing value
  // essentially untouched, keeping the AA safety net.
  const lin = (v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  const seriesSuffix =
    0.2126 * lin(bg[0]) + 0.7152 * lin(bg[1]) + 0.0722 * lin(bg[2]) < 0.4 ? '-on-dark' : '-on-light'
  const datasets = props.data.datasets || []
  const multi = datasets.length > 1
  return datasets.map((ds, i) => {
    if (ds.backgroundColor != null) return ds.backgroundColor
    let name
    let fallback
    if (props.state) {
      name = STATE_TOKENS[props.state]
      fallback = SERIES_FALLBACKS[0]
    } else if (multi) {
      name = `--chart-series-${i + 1}${seriesSuffix}`
      fallback = SERIES_FALLBACKS[i % SERIES_FALLBACKS.length]
    } else if (props.variant === 'sparkline') {
      name = `--chart-series-1${seriesSuffix}`
      fallback = SERIES_FALLBACKS[0]
    } else {
      name = '--brand-primary-alpha'
      fallback = '#ffb30082'
    }
    const preferred = parseColor(token(name, fallback)) || parseColor(fallback) || [255, 179, 0, 0.51]
    return toRgbString(deriveInk(preferred, bg, AA_NON_TEXT))
  })
})

// The two extreme-marker inks, derived against the real background exactly as
// the series inks are — the component owns AA here so no caller ever passes a
// raw colour array that would bypass the derivation (#4021).
//
// §3.66d B2: derived against the 4.5:1 TEXT floor (`AA`), not the 3:1 graphical
// floor (`AA_NON_TEXT`) the retired triangle used. The VALUE is now the primary
// channel and it is TEXT, so it must clear the text floor; the same ink paints
// the locator dot, and a graphical mark that clears the text floor also clears
// its own (§3.65 — a token clears the floor of the role it is sanctioned for,
// and adding the text role re-opens that floor). Measured pre-fix against
// `--surface-card` #424242: max #da7220 = 3.07:1, min #cc79a7 = 3.28:1 — both
// cleared 3:1, both failed 4.5:1. The base hues are UNTOUCHED (§3.66b stands);
// only the floor the derivation targets changes.
const extremeInks = computed(() => {
  void themeTick.value
  const bg = resolvedBackground()
  const mk = (name, fallback) => {
    const preferred = parseColor(token(name, fallback)) || parseColor(fallback)
    return toRgbString(deriveInk(preferred, bg, AA))
  }
  return {
    max: mk('--chart-extreme-max', '#d55e00'),
    // #cc79a7 (Okabe-Ito reddish-purple), NOT #0072b2 (Okabe-Ito blue), per
    // system_3 §3.66b / task #4050. Blue is what `--chart-series-2` inks, and
    // on a two-dataset chart the second series takes exactly that token
    // (SERIES_FALLBACKS[1] above) — so a blue min marker on such a chart was
    // painted the same hue as the series it marks, collapsing the colour
    // channel c20597 made PRIMARY and leaving only the ▼ shape it named as the
    // colourblind FALLBACK. The consumer that surfaced it is system_3's
    // task_flow / pr_flow cards, whose created/done pair is amber/blue.
    //
    // #cc79a7 is `--chart-series-5`, already in this palette and already
    // carrying its AA-non-text guarantee, rather than a hex invented here; the
    // rule the ruling drew is that an extreme token may reuse a series hex
    // (extreme-max is #d55e00 == series-4) as long as it does not collide with
    // a hue actually PAINTED on the same card. Before moving either token
    // again, check that against every consumer, not just this one.
    min: mk('--chart-extreme-min', '#cc79a7'),
  }
})

// §3.66a fallback: over the 5× cap the paired flow reverts to diverging bars,
// so the second series is negated to draw below the shared zero baseline. The
// negation is applied HERE, once, so the domain (`buildBarOptions`), the marks
// (`computeExtremeMarks`) and the render (`themedData`) all see one set of
// values. The line path (`pairedAsLines`) keeps both series positive.
const chartData = computed(() => {
  if (!pairedAsBars.value) return props.data
  return {
    ...props.data,
    datasets: (props.data.datasets || []).map((ds, i) =>
      i === 1 ? { ...ds, data: (ds.data || []).map((v) => (typeof v === 'number' ? -v : v)) } : ds
    ),
  }
})

const extremeMarks = computed(() => {
  if (!props.markExtremes) return []
  const inks = extremeInks.value
  // Pure math in the utils module (unit-tested there); inks applied here
  // because the component owns the §3.18 derivation.
  // §3.66d B3: the min-suppression rule is encoding-aware — a magnitude flow
  // drops a zero-valued min, a position stock keeps every level.
  return computeExtremeMarks(chartData.value.datasets, { encoding: props.encoding }).map((m) => ({
    ...m,
    color: m.kind === 'max' ? inks.max : inks.min,
  }))
})

// §3.66a end-of-series name labels: each line's series name at its last point,
// in its own hue. §3.66g (#4127) retired these on the paired-flow render (the
// word is redundant with the big-number figure's own same-ink label one line
// up), so this is no longer wired into the chart — it is kept, unused, and
// still exposed below for tests/a future consumer, the way §3.66b/c/d's marker
// machinery was left in place.
const flowEndLabels = computed(() => {
  if (!pairedAsLines.value) return []
  return (props.data.datasets || []).map((ds, i) => ({
    datasetIndex: i,
    text: ds.label || `series ${i + 1}`,
    color: barFills.value[i],
  }))
})

const themedData = computed(() => ({
  ...chartData.value,
  datasets: (chartData.value.datasets || []).map((ds, i) => {
    const ink = barFills.value[i]
    // A bar fills its own area (`backgroundColor`, no border). A line paints
    // an ink stroke and stays unfilled — it is a trend line, not an area
    // chart — so it goes through `borderColor`/`pointBackgroundColor` instead.
    // The line primitive serves both a position stock (§3.66) and a paired
    // flow (§3.66a).
    const base = asLineMark.value
      ? { borderColor: ink, backgroundColor: 'transparent', pointBackgroundColor: ink, fill: false }
      : { backgroundColor: ink, borderWidth: 0 }
    return { ...base, ...ds }
  }),
}))

// Recursive merge — later wins; arrays replace rather than concatenate.
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v)
const mergeDeep = (target, source) => {
  const out = { ...target }
  for (const key of Object.keys(source || {})) {
    if (isObj(source[key]) && isObj(target[key])) out[key] = mergeDeep(target[key], source[key])
    else if (source[key] !== undefined) out[key] = source[key]
  }
  return out
}

const chartOptions = computed(() => {
  const p = paint.value
  const preset = isLineMark.value
    ? buildLineOptions({
        axisInk: p.axisInk,
        axisLine: p.axisLine,
        tooltipBg: p.tooltipBg,
        tooltipInk: p.tooltipInk,
        fontFamily: p.fontFamily,
        unit: props.unit,
        // The §3.66 position domain (focused, both-ends padded) inside the
        // preset — the line sibling of the bar's §3.60 magnitude headroom.
        data: props.data,
      })
    : buildBarOptions({
        variant: props.variant,
        axisInk: p.axisInk,
        axisLine: p.axisLine,
        tooltipBg: p.tooltipBg,
        tooltipInk: p.tooltipInk,
        fontFamily: p.fontFamily,
        unit: props.unit,
        xAxis: props.xAxis,
        timestamps: props.timestamps,
        // A diverging sparkline (two series, the second painted negative) hides
        // its axes, so it earns a single faint rule at y=0 as the up/down
        // reference. §3.66a: a paired flow rendered as LINES is NOT diverging —
        // both series are positive on one zero-based axis, so it takes the plain
        // magnitude domain, not the symmetric diverging one. The >5× fallback
        // (`pairedAsBars`) IS diverging and keeps the rule.
        zeroBaseline:
          props.variant === 'sparkline' &&
          (props.data.datasets || []).length > 1 &&
          !pairedAsLines.value,
        // The data drives the §3.60 value-axis headroom (`suggestedMax`, or the
        // symmetric diverging bounds) inside the preset. `chartData` carries the
        // §3.66a fallback negation so the domain matches what is painted.
        data: chartData.value,
      })

  if (typeof props.threshold === 'number') {
    preset.plugins.aspThreshold = {
      value: props.threshold,
      color: p.axisLine,
      label: props.thresholdLabel || `threshold: ${props.threshold}${props.unit ? ` ${props.unit}` : ''}`,
      labelBg: p.tooltipBg,
      labelInk: p.tooltipInk,
      fontFamily: p.fontFamily,
    }
  }

  if (props.markExtremes) {
    preset.plugins.aspExtremes = { marks: extremeMarks.value, fontFamily: p.fontFamily }
    // §3.66e: NO layout padding. The old ▲/▼ sat ~10px past the bar end and
    // needed 12px top/bottom headroom — but that padding ate half the 48px
    // cell, which is why the glyph drew in a ~13px band. §3.66d retires the
    // poking triangle for a locator DOT at the data point plus a value drawn
    // INSIDE chartArea (the #4095 clamp), so the mark needs no reservation
    // outside the plot; the §3.60 `suggestedMax` headroom keeps the top mark
    // clear of the ceiling. Reclaiming this padding is the plot-budget fix.
  }

  // §3.66g (#4127): the inline end-of-series name labels are retired on the
  // paired-flow render — the big-number figure above the chart already states
  // each series' name once, in the same ink, so a second on-graph label is the
  // redundancy the operator named. `flowEndLabelPlugin`/`flowEndLabels` are left
  // in place (unused), the same way §3.66b/c/d's marker machinery was, available
  // for a future consumer; identity for non-visual/hover-only readers now rides
  // the chart aria-label (set by the consumer) and the tooltip's per-dataset
  // label (added to buildBarOptions — the paired-flow render's actual options
  // path — and buildLineOptions, guarded to fire only on >1 dataset), neither of
  // which named the series before.

  // Three ordered layers: AspChart's theme defaults (applied inside AspChart),
  // then this preset, then the consumer's `options`. Merging the consumer's
  // options in HERE — rather than passing them through separately — is what
  // keeps the consumer able to override any preset value. Getting this
  // backwards would make the preset a fork in all but name.
  return mergeDeep(preset, props.options)
})

// The plugin is passed per-instance rather than registered globally, so a host
// app that also uses plain AspChart is unaffected by this component's existence.
const chartPlugins = computed(() => [
  ...(typeof props.threshold === 'number' ? [thresholdPlugin] : []),
  ...(props.markExtremes ? [extremesPlugin] : []),
  // §3.66g (#4127): flowEndLabelPlugin no longer wired on the paired-flow
  // render (colour + the big-number figure carry series identity; see the
  // preset note above). The plugin export stays in bar_chart_options.js.
])

onMounted(() => {
  themeTick.value += 1
  if (typeof MutationObserver === 'undefined') return
  themeObserver = new MutationObserver(() => {
    themeTick.value += 1
  })
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'class'],
  })
})

onBeforeUnmount(() => {
  if (themeObserver) themeObserver.disconnect()
})

// Exposed for the contrast spec: the derived values are the thing under test,
// and reading them here asserts what the component actually paints rather than
// what a test recomputes from tokens and hopes matches.
// `extremeInks` is exposed for the same reason `barFills` is: the §3.66b
// no-collision invariant is about the DERIVED paint, and a test that recomputed
// it from the token values would not be measuring what the chart draws.
defineExpose({
  paint,
  barFills,
  extremeInks,
  chartOptions,
  themedData,
  barThickness: BAR_THICKNESS,
  isLineMark,
  // §3.66a — exposed so a spec asserts the render DECISION (lines vs the >5×
  // diverging fallback) and the end-of-series labels the component derived.
  asLineMark,
  pairedAsLines,
  pairedAsBars,
  flowRatio,
  flowEndLabels,
})
</script>

<template>
  <div
    ref="root"
    class="asp-bar-chart"
    :class="[
      `asp-bar-chart--${variant}`,
      state && `asp-bar-chart--${state}`,
      asLineMark && 'asp-bar-chart--line',
    ]"
  >
    <!--
      The unit label is stacked ABOVE the y axis rather than centered against
      it: at compact's 48px there is no vertical room to center a rotated or
      stacked label, and a label that only fits one variant is not a shared
      grammar.

      It sits in normal flow, not absolutely positioned over the plot. The
      absolute version overlapped the topmost y tick on every single chart —
      invisible to all 33 assertions, obvious in the first screenshot. Chart.js
      places that tick at the very top of the canvas, so there is no clear
      corner to overlay.
    -->
    <div
      v-if="unit"
      class="asp-bar-chart__unit"
      :style="{ color: paint.axisInk }"
      aria-hidden="true"
    >
      {{ unit }}
    </div>
    <div class="asp-bar-chart__plot">
      <AspChart
        :type="asLineMark ? 'line' : 'bar'"
        :data="themedData"
        :options="chartOptions"
        :plugins="chartPlugins"
        :height="chartHeight"
        :aria-label="ariaLabel"
      />
    </div>
    <!--
      Both axis labels take the DERIVED ink rather than `var(--text-muted)`.

      Two reasons, and the second is why this is a style binding rather than a
      stylesheet rule. First, they are axis chrome: they should be the same ink
      as the tick values they label, and the tick values are canvas paint that
      cannot read a CSS variable. Second, --text-muted is
      `color-mix(in srgb, currentColor 80%, transparent)` — it inherits INK, not
      surface, so on any container that does not itself establish a text colour
      it collapses toward the UA default and renders at 1.17:1. That is not
      hypothetical: it is what the screenshot of this component showed on the
      dark page surface, and it stayed green through 34 assertions that only
      ever measured derived colours.
    -->
    <div v-if="range" class="asp-bar-chart__range" :style="{ color: paint.axisInk }">
      {{ range }}
    </div>
  </div>
</template>

<style scoped>
.asp-bar-chart {
  width: 100%;
  font-family: var(--font-family-base);
}

.asp-bar-chart__plot {
  position: relative;
}

/*
 * In flow above the plot. It costs ~1 line of height, which the variant heights
 * already account for — the rendered-height assertion in bar-chart.spec.js
 * measures the WHOLE component against the 320px baseline, so this cannot
 * quietly reintroduce the height P8 objected to.
 */
.asp-bar-chart__unit {
  margin-bottom: var(--space-xs);
  font-size: var(--text-xs);
  line-height: var(--font-line-height-tight);
  /* Overridden inline with the derived ink; this is the no-JS fallback. */
  color: var(--text-muted);
}

/*
 * --text-xs is the smallest type token the system ships. The compact variant
 * does NOT step down further: inventing a --text-2xs to fit a 48px cell would
 * be a new type step introduced by one component, and the tokens-only rule
 * exists precisely to stop that.
 */
.asp-bar-chart__range {
  margin-top: var(--space-xs);
  text-align: center;
  font-size: var(--text-xs);
  /* Overridden inline with the derived ink; this is the no-JS fallback. */
  color: var(--text-muted);
}
</style>
