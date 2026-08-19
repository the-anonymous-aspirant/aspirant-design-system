/**
 * The AspBarChart options preset, as a pure function.
 *
 * This is a Chart.js options object builder, deliberately kept out of the
 * component for the same reason `time_since.js` is: the operator's round-2
 * feedback (P8 — "charts are too tall, I want hover x/y values and more axis
 * labels") is a set of claims about NUMBERS, and numbers are far better
 * asserted at a boundary than inferred from a rendered canvas. `regular` being
 * shorter than the baseline and `compact` labelling every category are facts a
 * test can state outright here; through a canvas they would be a screenshot
 * opinion.
 */

import { normalizeValueDomain } from './normalize_value_domain.js'

/**
 * `AspChart`'s own default height, and therefore what the live Performance
 * graphs render at today. It is the baseline P8 called too tall — kept named
 * and exported so the reduction is asserted against the real prior value
 * rather than against a number retyped into a test.
 */
export const BASELINE_HEIGHT = 320

/**
 * `regular` — Performance rows, full-width card.
 * `compact` — Health cells; the ~180x48 cell the #2227 spec sizes.
 *
 * These size the CANVAS. The unit and range labels are DOM around it and add
 * roughly a line each, so a fully-labelled regular chart occupies ~220px
 * against the 320px baseline. `bar-chart.spec.js` asserts the rendered total,
 * not this number, so the labels cannot quietly give the height back.
 *
 * A bare Health cell that wants the literal 48px drops `unit` and `range`; the
 * labels are opt-in per instance.
 *
 * `sparkline` — the at-a-glance card trend glyph (#3129, design-of-record
 * §3.53). Same 48px cell as `compact`, but ALL axis furniture is suppressed
 * (no baseline line, no left edge, no tick text): the card's label + big
 * number carry the meaning and the chart is a pure trend shape. It also carries
 * the single-/dual-series colour grammar the at-a-glance cards need — see the
 * component's fill derivation.
 */
export const HEIGHTS = { regular: 180, compact: 48, sparkline: 48 }

export const VARIANTS = Object.keys(HEIGHTS)

/** The `state` prop's closed set, in worsening order. */
export const STATES = ['great', 'normal', 'unhealthy']

/**
 * State to the token each state's bars are filled from — §3.12's metric-state
 * colour map, ratified by the operator in round-2 (comment 8784): `great` is
 * the soft-blue accent (ideal range), `normal` the brand amber (acceptable but
 * not ideal), `unhealthy` red (outside the band).
 *
 * Soft-blue is elevated to the great-state signal here, which is §3.12's one
 * explicit deviation from §1.3's "links and hints only": amber is already the
 * brand midpoint and cannot simultaneously read "great", and green-for-good
 * would fight the 60/30/10 amber identity (§1.3). The deviation is scoped to
 * metric-state colouring — soft-blue's link/hint role everywhere else is
 * unchanged.
 *
 * `normal` is the SOLID `--brand-primary`, not the `--brand-primary-alpha` that
 * the stateless default (AspBarChart's no-state fill) paints: a chart carrying a
 * metric state is making a threshold claim and reads at full strength, where a
 * plain stateless chart stays translucent per §3.10.
 */
export const STATE_TOKENS = {
  great: '--brand-accent',
  normal: '--brand-primary',
  unhealthy: '--feedback-error',
}

/** Bar geometry from the current Performance treatment (#2227): ~9px bar, ~7px gap. */
export const BAR_THICKNESS = 9
export const BAR_GAP = 7

/**
 * Tick budget per variant.
 *
 * P8 asked for "denser x/y axis label values". The first implementation read
 * that as `autoSkip: false` — label every category, no exceptions. That is
 * wrong, and the storybook showed why within seconds: at 30 hourly categories
 * the labels render as `0h1h2h3h4h…29h`, a single unreadable smear. More
 * labels than can be read is fewer labels, and disabling Chart.js's collision
 * avoidance threw away the one thing it does correctly.
 *
 * So density is tuned, not forced. `autoSkip` stays ON — the library guarantees
 * no overlap — and the knobs push toward more labels within that guarantee.
 *
 * The knob that actually moves the number is `maxRotation`, and this took
 * measuring to find. Dropping `autoSkipPadding` from 3 to 1 changed nothing:
 * autoskip quantises to an integer skip ratio, so on 30 categories it lands on
 * "every 3rd" either way. Raising the rotation budget to 90 does move it,
 * because a rotated label's horizontal footprint is its line height rather than
 * its text width. Measured on the Performance page's own "last 30 hours" data
 * at the contested 340px width: **15 labels against the baseline's 10, zero
 * overlaps**, settling at 56°. Chart.js only rotates as far as it must, so a
 * five-category chart still renders flat.
 *
 * The test asserts that RENDERED count against a plain AspChart on the same
 * data at the same width, plus zero overlapping pairs. Asserting the flag value
 * instead is what let the smear through: it encoded the implementation choice,
 * not the operator's goal, so it could not tell "denser" from "illegible".
 *
 * `compact` goes the other way on purpose. A 48px-tall cell has no vertical
 * room for a tick ramp and no horizontal room for category labels; y falls back
 * to the min/max pair that #2227 names as the floor, and the x reading is
 * carried by the range label under the baseline instead. Denser is the rule for
 * the surface P8 was looking at, not a rule for every surface.
 */
export const TICKS = {
  regular: {
    y: { maxTicksLimit: 6 },
    x: { autoSkip: true, autoSkipPadding: 1, maxRotation: 90, minRotation: 0 },
  },
  compact: { y: { maxTicksLimit: 2 }, x: { display: false } },
  // The sparkline is a trend glyph: no ticks on either axis. Paired with the
  // suppressed axis borders in buildBarOptions, the cell renders bars only.
  sparkline: { y: { display: false }, x: { display: false } },
}

// ---------------------------------------------------------------------------
// §3.19 — time-axis tick grammar.
//
// The rotation treatment above is RIGHT for categorical labels and WRONG for
// time, and that distinction is the whole reason this section exists rather
// than a knob on TICKS. A categorical label (`unattributed`, `medium`) is a
// long string with no natural abbreviation, so rotating it is the only way to
// fit more of them. A time label abbreviates naturally — `06:00` is already
// the short form — so it earns density from a coarser INTERVAL instead, and
// §3.19 Decision 2 rules rotation out explicitly: a rotated label buys
// horizontal room at a legibility cost the operator's complaint does not
// accept.
//
// Three rules, each from §3.19, each a pure function below so the test can
// assert the DERIVED outcome rather than a flag:
//
//   1. Ticks land on wall-clock boundaries, never equal pixel divisions.
//      `03:47` is noise; `04:00` is a landmark the reader measures against.
//   2. Density is a budget derived from width, not a fixed count. The FINEST
//      ladder interval that fits wins — the complaint was too few labels, so
//      ties resolve upward in density.
//   3. Format follows the span, in three bands, and the middle band shows the
//      day name only where the day actually changes.
// ---------------------------------------------------------------------------

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** §3.19 Decision 1's ladder, finest first. Ticks land on multiples of one of these. */
export const TICK_LADDER = [
  MINUTE,
  5 * MINUTE,
  15 * MINUTE,
  30 * MINUTE,
  HOUR,
  3 * HOUR,
  6 * HOUR,
  12 * HOUR,
  DAY,
  7 * DAY,
]

/**
 * One `--space-sm` between adjacent labels — §3.19 calls this the minimum that
 * keeps two labels from reading as one string.
 */
export const TICK_GUTTER = 12

/**
 * §3.19: "Minimum size 10px; 8px axis text is below the readable floor
 * regardless of contrast ratio."
 *
 * Nothing here RAISES a size, because nothing lands below: canvas ticks take
 * Chart.js's 12px default and the DOM chrome takes `--text-xs` (0.75rem =
 * 12px). This is the floor asserted so a future token retune cannot drop under
 * it silently — which is the failure mode §3.19 is describing, not a change
 * this component needed.
 */
export const MIN_TICK_FONT_PX = 10

/** §3.19's floor: fewer than three slots means no interior landmark to offer. */
export const MIN_INTERIOR_BUDGET = 3

/**
 * Horizontal space reserved OUTSIDE the plot for the end ticks' labels, in
 * `time` mode only.
 *
 * The first and last ticks of the middle band carry the wide day-prefixed form
 * — and they must, because the band boundary is usually exactly where the day
 * changes, so it is the one tick whose day name carries the most information.
 * `Mon 00:00 · … · 00:00` would show two identical-looking midnights with no
 * way to tell they are 24h apart.
 *
 * A label centred on the outermost tick therefore overhangs the plot by about
 * half its width. Measured on the real canvas at 340px: the wide form renders
 * 65px, the last tick sits at px 304, and its right edge lands at 337 against
 * a 340px canvas — **3px of headroom, and that headroom was Chart.js's own
 * layout padding rather than anything this preset asked for.** A longer
 * weekday abbreviation in another locale, a font-stack change, or a tick-size
 * bump consumes it, and none of those are edits anyone would think to re-check
 * an axis against.
 *
 * So the space is reserved explicitly: half the measured wide form, 33px. The
 * geometry then holds because the layout committed to it, not because a
 * library internal happened to leave room. The rendered-bounds assertion in
 * `bar-chart.spec.js` stays as the guard, but it is no longer the only thing
 * preventing a silent regression — which was too much weight for one test.
 *
 * Sized to the overhang and NOT padded further, because this reservation is not
 * free: padding is taken out of the plot, which shrinks `plot_width`, which
 * lowers the budget, which coarsens the ladder. Reserving half-width plus the
 * 12px gutter (45px each side) was measured and it cost a rung — the 340px/24h
 * case fell from a 6h ladder back to 12h, re-breaking the density the budget
 * correction had just restored. The gutter floor governs the space BETWEEN
 * adjacent labels; the end label has no neighbour outward, so it needs its
 * overhang and nothing more.
 *
 * Each side is DERIVED from what that side already provides, rather than the
 * right being set to 33 and the left asserted to need nothing. Both sides carry
 * the same overhang; they differ only in what structure already absorbs it. The
 * left ends up at 0 today because the y-axis tick column is wider than the
 * overhang — an arithmetic result, not a property of the left edge. It stops
 * being 0 the moment that column narrows or the y axis is hidden
 * (`y.display: false`, a single-digit maximum, a tick-font change), and none of
 * those are edits anyone would think to re-check an x axis against. That is the
 * same failure shape as the borrowed Chart.js margin this replaced: correct
 * until something unrelated moves, silently clipped after.
 */

/** Wide form (`Mon 00:00`) measured on the reference render at 340px. */
export const TIME_AXIS_WIDE_LABEL_WIDTH = 65

/** The y-axis tick column the layout already allocates on that same render. */
export const TIME_AXIS_Y_AXIS_COLUMN = 36

/**
 * Per-side end reservation: half the wide label, minus whatever structure that
 * side already allocates, floored at zero.
 *
 * Parameterised rather than inlined so the counterfactual is testable — a
 * caller can ask what the padding becomes when the y-axis column narrows or
 * disappears, which is the case the constant below cannot express.
 */
export function timeAxisEndPadding({
  wideLabelWidth = TIME_AXIS_WIDE_LABEL_WIDTH,
  yAxisColumnWidth = TIME_AXIS_Y_AXIS_COLUMN,
  rightStructureWidth = 0,
} = {}) {
  const half = Math.ceil(wideLabelWidth / 2)
  return {
    left: Math.max(0, half - yAxisColumnWidth),
    right: Math.max(0, half - rightStructureWidth),
  }
}

/** Today: `{ left: 0, right: 33 }` — byte-identical to the previous scalar. */
export const TIME_AXIS_END_PADDING = timeAxisEndPadding()

/** The `xAxis` prop's closed set. `category` is the default — nothing existing shifts. */
export const X_AXES = ['category', 'time']

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const pad2 = (n) => String(n).padStart(2, '0')
const clockOf = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`

/**
 * §3.19 Decision 3's three bands. 24-hour clock, no am/pm, single-unit formats
 * — §2.7 terminal aesthetic, same grammar as `AspTimeSince`.
 */
export const bandFor = (span) => (span <= 6 * HOUR ? 'clock' : span <= 72 * HOUR ? 'dayClock' : 'date')

/**
 * The label form that RECURS across each band — what the budget is measured
 * against.
 *
 * Not the widest form, and that distinction is the whole correction here
 * (design_agent ruling, #2482). §3.19 as originally written asked for a single
 * scalar `max_label_width` while also specifying a repetition rule that makes
 * label width POSITIONAL. Those cannot both be honoured by one number: pricing
 * every slot as if it held the widest label charges the whole band for a form
 * that, by construction, at most one slot per calendar day carries. The result
 * is systematic under-labelling — which is the operator complaint that opened
 * #2470 in the first place.
 *
 * In the middle band the recurring form is the BARE clock; the day-prefixed
 * form appears only where the day changes. In the other two bands every label
 * has the same shape, so recurring and widest coincide.
 *
 * Still measured over every weekday/month name rather than assuming one is
 * widest — the answer is font-dependent, and guessing it is how a budget
 * quietly overcommits.
 */
export const RECURRING_LABELS = {
  clock: ['00:00'],
  dayClock: ['00:00'],
  date: MONTHS.map((m) => `30 ${m}`),
}

/**
 * The widest form each band can produce. NOT used for the budget — kept for the
 * pairwise gutter check, which is the rule that actually protects legibility.
 *
 * §3.19's 12px gutter is checked between labels that can genuinely be
 * ADJACENT, not against a uniform worst case. At a 6h interval two
 * day-prefixed labels are never neighbours: the repetition rule puts the day
 * name on the first tick of a calendar day only, so those are >=24h apart
 * while ticks are 6h apart. The pair that made the old arithmetic reject a 6h
 * ladder — wide against wide — cannot occur.
 */
export const WIDEST_LABELS = {
  clock: ['00:00'],
  dayClock: WEEKDAYS.map((w) => `${w} 00:00`),
  date: MONTHS.map((m) => `30 ${m}`),
}

/** Rough advance-width fallback for a headless caller with no canvas to measure with. */
const estimateWidth = (text) => text.length * 7

const toMs = (v) => (v instanceof Date ? v.getTime() : typeof v === 'string' ? Date.parse(v) : Number(v))

const startOfDay = (ts) => {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/**
 * Wall-clock multiples of `interval` lying within [start, end].
 *
 * Anchored at local midnight and walked a calendar day at a time rather than
 * stepped by raw milliseconds from the window's left edge. Stepping by raw ms
 * is what puts a tick at `03:47`: it makes the ticks regular in PIXELS, which
 * is precisely what Decision 1 rules out. Walking days also keeps the boundary
 * on the wall clock across a DST transition, where a fixed-ms step would slide
 * an hour and start labelling `05:00` as if it were `06:00`.
 *
 * The first tick is the first boundary at or after `start`. §3.19 says "inside
 * the window rather than the window's left edge" — that rules out
 * extrapolating a boundary BEFORE the window, not discarding one that happens
 * to coincide with its start. A window opening exactly at midnight gets its
 * midnight tick, which is what acceptance criterion 1 (`00:00 / 06:00 / 12:00
 * / 18:00 / 00:00` over 24h) requires.
 */
const boundariesIn = (start, end, interval) => {
  const out = []
  if (interval >= DAY) {
    const step = Math.round(interval / DAY)
    for (const d = new Date(startOfDay(start)); d.getTime() <= end; d.setDate(d.getDate() + step)) {
      if (d.getTime() >= start) out.push(d.getTime())
    }
    return out
  }
  for (const day = new Date(startOfDay(start)); day.getTime() <= end; day.setDate(day.getDate() + 1)) {
    const base = day.getTime()
    for (let t = base; t < base + DAY; t += interval) {
      if (t >= start && t <= end && out[out.length - 1] !== t) out.push(t)
    }
  }
  return out
}

/**
 * Format one tick, applying the middle band's repetition rule.
 *
 * §3.19: only the first tick of each calendar day carries the day name, and a
 * midnight tick always carries its day — so the reader sees where the day
 * flips without counting. `Tue 00:00 · 06:00 · 12:00 · 18:00 · Wed 00:00`: the
 * day appears exactly where it carries information.
 */
export const formatTick = (ts, band, prevTs = null) => {
  const d = new Date(ts)
  if (band === 'clock') return clockOf(d)
  if (band === 'date') return `${d.getDate()} ${MONTHS[d.getMonth()]}`

  const isMidnight = d.getHours() === 0 && d.getMinutes() === 0
  const dayChanged = prevTs === null || startOfDay(prevTs) !== startOfDay(ts)
  return dayChanged || isMidnight ? `${WEEKDAYS[d.getDay()]} ${clockOf(d)}` : clockOf(d)
}

/**
 * §3.19 Decisions 1–3, applied. Returns one entry PER CATEGORY — the label for
 * that bucket, or `''` for a bucket that is not a landmark.
 *
 * Returning a full-length array rather than a list of chosen ticks is what
 * makes acceptance criterion 5 assertable: the test reads back labels AND the
 * index each one landed on, so "the right labels in the wrong places" is a
 * failure the suite can actually see. A list of strings could not tell those
 * apart.
 *
 * @param {number[]|string[]|Date[]} o.timestamps  one per category, ascending
 * @param {number} o.plotWidth   the x scale's width in px — NOT the canvas width
 * @param {function} [o.measureLabel]  text -> px; supply a real canvas measurer
 */
export const selectTimeTicks = ({ timestamps = [], plotWidth = 0, measureLabel } = {}) => {
  const n = timestamps.length
  const labels = new Array(n).fill('')
  if (n === 0) return labels

  const ts = timestamps.map(toMs)
  if (ts.some((t) => !Number.isFinite(t))) return labels

  const start = ts[0]
  const end = ts[n - 1]
  const span = end - start
  const band = bandFor(span)

  // §3.19's floor is endpoint mode PLUS the range label — the range label is
  // already DOM the wrapper renders, so here that is first and last only.
  const endpointsOnly = () => {
    labels[0] = formatTick(start, band, null)
    if (n > 1) labels[n - 1] = formatTick(end, band, start)
    return labels
  }

  if (!(span > 0) || n < 2) return endpointsOnly()

  const measure = typeof measureLabel === 'function' ? measureLabel : estimateWidth
  // The RECURRING form, per the corrected §3.19 formulation. See
  // RECURRING_LABELS for why the widest form is the wrong scalar here.
  const recurringWidth = Math.max(...RECURRING_LABELS[band].map((s) => measure(s)))
  const slot = recurringWidth + TICK_GUTTER
  const budget = slot > 0 ? Math.floor(plotWidth / slot) : 0

  // Below two slots even the endpoints collide — a 96px chart drew
  // `Mon 0Tue 00:00`, two labels smeared into one string, which is the same
  // illegibility the density comment above records rather than a lesser
  // version of it. §3.19 stops at the budget<3 endpoint floor because the
  // surfaces it enumerates stop there, but the rule it states carries one rung
  // further on its own logic: when there is no room for a landmark, the range
  // label under the baseline is the whole reading. That is exactly what
  // compact's `x: { display: false }` already does, so this is the same limiting
  // case reached by arithmetic instead of by variant.
  if (budget < 2) return labels
  if (budget < MIN_INTERIOR_BUDGET) return endpointsOnly()

  // FINEST that fits, so the ladder is walked ascending and the first hit wins.
  // Coarsest-available would satisfy the arithmetic and miss the point: the
  // complaint was too FEW labels.
  const interval = TICK_LADDER.find((I) => Math.floor(span / I) + 1 <= budget)
  if (!interval) return endpointsOnly()

  const bucket = span / (n - 1)
  const nearestIndex = (mark) => {
    const i = Math.round((mark - start) / bucket)
    if (i < 0 || i > n - 1) return -1
    // Guard against labelling a bucket that is not actually near the boundary
    // — with irregular buckets the nearest one can be half a window away.
    return Math.abs(ts[i] - mark) <= bucket / 2 ? i : -1
  }

  let prev = null
  for (const mark of boundariesIn(start, end, interval)) {
    const i = nearestIndex(mark)
    if (i < 0) continue
    // Format the BOUNDARY, not the bucket it attaches to. Buckets need not be
    // aligned to the wall clock — a window opening at 00:17 has its 06:00
    // landmark sitting on the 06:17 bucket — and formatting the bucket puts
    // `06:17` on the axis, which is the exact arbitrary instant Decision 1
    // exists to forbid. The bucket chooses the POSITION; the boundary supplies
    // the TEXT.
    labels[i] = formatTick(mark, band, prev)
    prev = mark
  }

  // A ladder that produced nothing placeable still owes the reader the frame.
  return labels.some(Boolean) ? labels : endpointsOnly()
}

/**
 * The rendered x-tick config for `time` mode.
 *
 * `autoSkip` goes OFF here — and that is not a repeat of the mistake the TICKS
 * comment above records. Autoskip is Chart.js's collision avoidance for labels
 * it must place at every category; §3.19 removes the collision at the source by
 * choosing an interval whose tick count already fits the measured width, so the
 * callback blanks the non-landmark buckets and there is nothing left to skip.
 * Leaving autoskip on would let the library drop a landmark and reintroduce
 * exactly the arbitrary-instant axis Decision 1 forbids.
 *
 * The budget needs the plot width, which only exists at render — so it is
 * computed inside the callback off the live scale, and memoised per (scale,
 * width) because Chart.js invokes the callback once per tick.
 */
const timeTickLabels = new WeakMap()

const timeTicks = (timestamps) => ({
  autoSkip: false,
  maxRotation: 0,
  minRotation: 0,
  callback(_value, index) {
    const cached = timeTickLabels.get(this)
    const width = Math.round(this.width || 0)
    if (cached && cached.width === width && cached.timestamps === timestamps) {
      return cached.labels[index] ?? ''
    }

    // Measure with the canvas the ticks are actually painted on, at the font
    // they are actually painted in. A character-count estimate is what makes a
    // budget wrong by one on a proportional face — and being wrong by one is
    // the difference between a 6h ladder and a 12h one.
    const ctx = this.ctx
    const f = this.options?.ticks?.font || {}
    const measureLabel = ctx
      ? (text) => {
          ctx.save()
          ctx.font = `${f.size || 12}px ${f.family || 'sans-serif'}`
          const w = ctx.measureText(text).width
          ctx.restore()
          return w
        }
      : undefined

    const labels = selectTimeTicks({ timestamps, plotWidth: width, measureLabel })
    timeTickLabels.set(this, { width, timestamps, labels })
    return labels[index] ?? ''
  },
})

/**
 * Build the Chart.js options for a bar preset.
 *
 * Every colour arrives already resolved and already derived against the real
 * container background — see `color_contrast.deriveInk`. This function does no
 * colour reasoning of its own, which is what keeps it pure and what keeps the
 * contrast decision in one place.
 *
 * @param {object}  o
 * @param {string}  o.variant      'regular' | 'compact'
 * @param {string}  o.axisInk      derived ink for tick text and the legend
 * @param {string}  o.axisLine     derived colour for the 1px x/y axis lines
 * @param {string}  o.tooltipBg    tooltip surface
 * @param {string}  o.tooltipInk   tooltip text
 * @param {string}  o.fontFamily
 * @param {string}  [o.unit]       unit suffix for the y reading in the tooltip
 * @param {boolean} [o.animate]
 * @param {string}  [o.xAxis]      'category' (default) | 'time' — §3.19 grammar
 * @param {Array}   [o.timestamps] one per category; required by `time` mode
 * @param {boolean} [o.zeroBaseline] paint a single faint rule at y=0 — the
 *   up/down reference the diverging sparkline needs once its axes are hidden.
 *   Drawn for EVERY two-series window, not only ones that straddle zero
 *   (design_agent, #3129): with all axis furniture suppressed the amber-up /
 *   blue-down polarity says WHICH series, never WHERE zero sits, so a one-sided
 *   window (an all-created or all-done hour) with no rule would imply
 *   "bottom = zero" — a lie when the true baseline is above the bars. The rule
 *   rides Chart.js's zero tick, which `beginAtZero` always puts on the axis:
 *   in the interior when the data straddles, and pinned to the top or bottom
 *   edge when it does not — verified painting a full-width line in all three
 *   cases (bar-chart.spec.js "the zero rule paints ..."). NOT a no-op on
 *   all-positive data — it lands at the baseline, where zero genuinely is.
 * @param {object}  [o.data] the chart data (`{datasets:[{data}]}`) — supplied,
 *   the §3.60 value-axis normalization is computed and emitted: a `suggestedMax`
 *   top-headroom for a plain bar (the baseline stays 0), symmetric
 *   `suggestedMin`/`suggestedMax` outward from the interior zero for the
 *   diverging (`zeroBaseline`) two-series case. Omitted, the y scale auto-fits
 *   exactly as before, so the no-data call path (unit tests, a consumer that
 *   passes no data) is byte-identical.
 */

/**
 * Promote a `normalizeValueDomain` fragment's SOFT bounds (`suggestedMin`/
 * `suggestedMax`) to HARD ones (`min`/`max`) for the axis-less sparkline (§3.66e
 * A2). A magnitude fragment carries only `suggestedMax`, so its baseline is
 * pinned to 0 (matching `beginAtZero`); a diverging fragment carries both. A
 * fragment already hard (position, or empty) passes through unchanged, so this
 * is a no-op everywhere a hard bound or no bound was emitted.
 */
export const pinSoftBounds = (d = {}) => {
  const out = { ...d }
  if ('suggestedMax' in out) {
    out.max = out.suggestedMax
    delete out.suggestedMax
  }
  if ('suggestedMin' in out) {
    out.min = out.suggestedMin
    delete out.suggestedMin
  }
  // A magnitude fragment carries only `suggestedMax`; its baseline stays 0 via
  // the caller's `beginAtZero`, so no explicit `min` is set (a hard max is all
  // that is needed to stop the widening — the min was never the widened bound).
  return out
}

export const buildBarOptions = ({
  variant = 'regular',
  axisInk,
  axisLine,
  tooltipBg,
  tooltipInk,
  fontFamily,
  unit = '',
  animate = true,
  xAxis = 'category',
  timestamps = null,
  zeroBaseline = false,
  data = null,
} = {}) => {
  const v = VARIANTS.includes(variant) ? variant : 'regular'
  const font = { family: fontFamily }
  // The sparkline is a bare trend glyph: no axis lines, no ticks (TICKS.sparkline
  // already blanks the ticks; this drops the two 1px borders they share a scale
  // with). regular/compact keep both borders exactly as before.
  const noAxis = v === 'sparkline'

  // §3.60 value-axis range-normalization at the ONE bar choke point, so every
  // AspBarChart consumer inherits the headroom. A bar is a magnitude encoding:
  // the baseline stays at 0 (beginAtZero, below) and only a top `suggestedMax`
  // is added — lifting the min would be the §3.23 truncated-axis lie. The
  // diverging sparkline keeps zero INTERIOR and gains headroom on both ends.
  // Emitting `suggested*` (not hard min/max) keeps a consumer's explicit
  // `y:{min,max}` (e.g. Performance's `{0,100}`) winning through the merge.
  const valueDomain = data
    ? normalizeValueDomain(data, {
        encoding: zeroBaseline ? 'magnitude-diverging' : 'magnitude',
        unit,
      })
    : {}

  // §3.66e: on the axis-less sparkline the rendered y-domain must be EXACTLY the
  // one `normalizeValueDomain` returned. A displayed axis emits soft `suggested*`
  // so a consumer's hard `y:{min,max}` still wins the merge — but with the axis
  // hidden, Chart.js's nice-tick pass then widens the render far past the
  // helper's domain (measured: single-series suggestedMax 14 → 20; diverging
  // ±8 → ±50), which is half of why the glyph drew in a ~13px band. The
  // sparkline has no consumer override to protect, so pin the emitted bounds
  // hard here; every other variant keeps `suggested*` untouched.
  const yDomain = noAxis ? pinSoftBounds(valueDomain) : valueDomain

  // `time` mode replaces ONLY the regular variant's x ticks. compact keeps
  // `display: false`: §3.19 derives that from its own budget floor (a 48px
  // cell has room for no interior landmark), so the reading is carried by the
  // range label under the baseline, exactly as it is today. Reaching in to add
  // ticks there would break the rule this mode implements.
  const timeMode = xAxis === 'time' && v === 'regular' && Array.isArray(timestamps)
  const ticks = timeMode ? { ...TICKS[v], x: timeTicks(timestamps) } : TICKS[v]

  return {
    maintainAspectRatio: false,
    // Reserved only in `time` mode. `category` must stay byte-identical — its
    // labels are rotated and autoskipped, so they never overhang the way a
    // centred end tick does, and adding padding there would change a treatment
    // this work is explicitly not allowed to touch.
    // Both sides are derived from the same expression; the asymmetry is the
    // result, not the rule. The left end label overhangs into the y-axis tick
    // column the layout already allocates (36px on the reference render against
    // a ~27px overhang), so its reservation floors at 0. The right edge has no
    // such structural allowance — it is where the borrowed Chart.js margin was
    // — so it carries the full 33px. Reserving 33px on BOTH sides was tried and
    // costs a ladder rung: it leaves a 238px plot, and a 6h ladder needs 240px
    // at the measured 36px bare label, so the 340px/24h case fell back to 12h
    // over two pixels. Deriving per side is what buys the density back without
    // making "the left needs nothing" a standing assumption.
    ...(timeMode ? { layout: { padding: { ...TIME_AXIS_END_PADDING } } } : {}),
    // §3.66e: a 2px top/bottom breath on the axis-less sparkline. The plot still
    // clears the 90%-of-48 floor (chartArea ≈ 44px), but a data mark or the
    // diverging y=0 rule that lands on the domain's own edge (a one-sided
    // all-created/all-done window puts zero at the bottom/top) renders a hair
    // inside the canvas rather than clipping to nothing against it. Not the old
    // 12px marker-headroom padding (which ate half the cell) — just enough that
    // an edge feature paints.
    ...(noAxis ? { layout: { padding: { top: 2, bottom: 2 } } } : {}),
    // §3.66e/a: on the axis-less sparkline a line mark is a point-less trend
    // glyph (matching buildLineOptions) — default 3px points would both clutter
    // the 48px cell and make Chart.js reserve ~6px of the plot budget for point
    // overflow. The §3.66a paired lines still get their min/max LOCATOR DOTS
    // from extremesPlugin, drawn independently of Chart.js point elements.
    // Harmless on the bar sparkline (bars have no point/line elements).
    ...(noAxis
      ? { elements: { point: { radius: 0, hoverRadius: 3 }, line: { borderWidth: 2 } } }
      : {}),
    animation: animate ? undefined : false,
    // The bar owns the hit box, but the tooltip should follow the cursor along
    // the category even when it is above the bar's top edge — a 48px compact
    // cell has bars only a few pixels tall, and requiring a direct hit would
    // make the P8 hover reading practically unreachable there.
    interaction: { mode: 'index', intersect: false },
    plugins: {
      // Single-series bar charts caption themselves through the unit and range
      // labels the wrapper renders as DOM. A legend restating one dataset name
      // costs vertical space, which is the thing P8 asked for less of.
      legend: { display: false },
      tooltip: {
        backgroundColor: tooltipBg,
        titleColor: tooltipInk,
        bodyColor: tooltipInk,
        borderColor: axisLine,
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        titleFont: font,
        bodyFont: font,
        displayColors: false,
        callbacks: {
          // P8 asked for "the actual x AND y values". Chart.js's default shows
          // the category as an untitled heading and the value prefixed by the
          // dataset name, which reads as one value with a caption. Naming both
          // axes makes the pair explicit.
          title: (items) => (items.length ? `x: ${items[0].label}` : ''),
          label: (item) => {
            const y = item.parsed.y
            return `y: ${y}${unit ? ` ${unit}` : ''}`
          },
        },
      },
    },
    // Bar geometry. `barThickness` pins the bar; the gap follows from the
    // category width, so the ratio is what is expressed here.
    datasets: {
      bar: {
        barThickness: BAR_THICKNESS,
        categoryPercentage: BAR_THICKNESS / (BAR_THICKNESS + BAR_GAP),
        barPercentage: 1,
      },
    },
    scales: {
      x: {
        // "Axes are drawn, not implied" (#2227): the axis LINE is on, the grid
        // is off. The previous treatment had it backwards — faint grid lines
        // across the plot and no axis, which is what "we don't clearly see the
        // x-axis and y-axis" was describing. The sparkline is the one variant
        // that inverts this on purpose — a trend glyph draws no axis at all.
        // §3.66e: an axis-less sparkline reserves NO space for its x scale — a
        // hidden-tick scale still claimed ~8px of the 48px cell below the plot.
        // `display: false` drops the whole reservation; the scale still maps
        // data to pixels, so bars/lines and the extremes plugin are unaffected.
        // regular/compact keep the displayed axis exactly as before.
        display: !noAxis,
        border: { display: !noAxis, color: axisLine, width: 1 },
        grid: { display: false },
        ticks: { color: axisInk, font, ...ticks.x },
      },
      y: {
        beginAtZero: true,
        // §3.60 top-headroom (plain bar) or symmetric outward bounds (diverging).
        // Empty object when no data was supplied — the scale then auto-fits as
        // before. Placed after beginAtZero and before the overridable ticks so a
        // consumer's `options.scales.y` still merges last and wins (AspBarChart).
        // On the sparkline this is hard-pinned (§3.66e A2, `pinSoftBounds`); on
        // every other variant it is the soft `suggested*` fragment, unchanged.
        ...yDomain,
        border: { display: !noAxis, color: axisLine, width: 1 },
        // The diverging sparkline is the only chart that paints a gridline: a
        // single faint rule at y=0, so the up/down split has a reference once
        // the axis borders are gone. Scriptable so ONLY the zero tick draws;
        // every other variant keeps the grid off exactly as before. The zero
        // tick is always present here because beginAtZero forces 0 into the
        // range — interior on a straddling window, pinned to an edge on a
        // one-sided one — so the rule is drawn for every two-series window, not
        // just ones that cross zero (design_agent #3129; the rendered
        // full-width-line assertions are the guarantee, not this comment).
        grid: zeroBaseline
          ? {
              display: true,
              drawTicks: false,
              color: (ctx) => (ctx.tick && ctx.tick.value === 0 ? axisLine : 'transparent'),
              lineWidth: (ctx) => (ctx.tick && ctx.tick.value === 0 ? 1 : 0),
            }
          : { display: false },
        ticks: { color: axisInk, font, ...ticks.y },
      },
    },
  }
}

/**
 * Build the Chart.js options for the sparkline's LINE mark (§3.66) — the
 * position-encoded sibling of the bar sparkline `buildBarOptions` builds. A
 * STOCK metric (a level, not an hourly event count) is honest as a focused,
 * padded range, not a zero-based bar: lifting a BAR's baseline off zero would
 * be the §3.23 truncated-axis lie (§3.60), so for a stock the MARK changes
 * from bar to line instead of re-domaining the bar.
 *
 * Same axis-less/height/tooltip grammar as the bar sparkline (`TICKS.sparkline`,
 * `HEIGHTS.sparkline`, the `x:`/`y:` tooltip callbacks) — only the mark and the
 * y-domain source differ. The domain comes from the ONE `normalizeValueDomain`
 * helper (§3.47), asked for `position` encoding instead of the bar's
 * `magnitude`; no second domain path exists.
 *
 * There is no `variant`, `xAxis`, `timestamps`, or `zeroBaseline` knob here —
 * the line mark exists only for the sparkline surface, which has no
 * regular/compact/time-axis mode of its own.
 *
 * @param {object} o
 * @param {string}  o.axisInk
 * @param {string}  o.axisLine
 * @param {string}  o.tooltipBg
 * @param {string}  o.tooltipInk
 * @param {string}  o.fontFamily
 * @param {string}  [o.unit]
 * @param {boolean} [o.animate]
 * @param {object}  [o.data]  Chart.js `{datasets:[{data}]}` — feeds the
 *   position domain. Omitted, the y scale auto-fits (no bounds), same as the
 *   bar preset's no-data path.
 */
export const buildLineOptions = ({
  axisInk,
  axisLine,
  tooltipBg,
  tooltipInk,
  fontFamily,
  unit = '',
  animate = true,
  data = null,
} = {}) => {
  const font = { family: fontFamily }
  const valueDomain = data ? normalizeValueDomain(data, { encoding: 'position', unit }) : {}

  return {
    maintainAspectRatio: false,
    // §3.66e: the position-line sparkline is axis-less too, so it fills its cell
    // the same way the bar sparkline does — a 2px top/bottom breath keeps an
    // extreme value mark off the exact canvas edge; the x scale below reserves
    // nothing. (`buildLineOptions` is sparkline-only, so this is unconditional.)
    layout: { padding: { top: 2, bottom: 2 } },
    animation: animate ? undefined : false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: tooltipBg,
        titleColor: tooltipInk,
        bodyColor: tooltipInk,
        borderColor: axisLine,
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        titleFont: font,
        bodyFont: font,
        displayColors: false,
        // Same x:/y: grammar as the bar sparkline's tooltip (P8).
        callbacks: {
          title: (items) => (items.length ? `x: ${items[0].label}` : ''),
          label: (item) => {
            const y = item.parsed.y
            return `y: ${y}${unit ? ` ${unit}` : ''}`
          },
        },
      },
    },
    // A trend line, not a scatter: points stay off, a hover dot appears on
    // proximity (via the index-mode interaction above, not a point hit).
    elements: {
      point: { radius: 0, hoverRadius: 3 },
      line: { borderWidth: 2 },
    },
    scales: {
      x: {
        // §3.66e: reserve no height for the hidden x scale (see buildBarOptions).
        display: false,
        border: { display: false },
        grid: { display: false },
        ticks: { color: axisInk, font, ...TICKS.sparkline.x },
      },
      y: {
        // Position domain is already HARD (`min`/`max` from normalizeValueDomain),
        // so no `pinSoftBounds` pass is needed — nothing here to nice-widen.
        ...valueDomain,
        border: { display: false },
        grid: { display: false },
        ticks: { color: axisInk, font, ...TICKS.sparkline.y },
      },
    },
  }
}

/**
 * A horizontal threshold rule, as an inline Chart.js plugin.
 *
 * Inline rather than `chartjs-plugin-annotation`: the plugin is ~30kb for one
 * line, and chart.js is already an OPTIONAL peer dependency of this library
 * (package.json `peerDependenciesMeta`). Adding a second charting dependency to
 * draw a rectangle would push cost onto every consumer for one component's
 * feature.
 *
 * It is labelled when the pointer is near the LINE — not merely somewhere in
 * the plot — which is what "threshold-line hover" asks for and what keeps the
 * label from fighting the value tooltip for the same pointer position.
 *
 * Hover is tracked INSIDE the plugin, via `afterEvent`, rather than being fed
 * in as a reactive prop. Feeding it in would put the hover flag inside the
 * options object, and AspChart deep-watches options and rebuilds the chart when
 * it changes — so every pointer move would destroy and re-create the chart.
 * `args.changed = true` asks Chart.js for a repaint, which is all a hover label
 * actually needs.
 */
const hoverState = new WeakMap()

/** Pointer must be within this many px of the rule for it to label itself. */
export const THRESHOLD_HOVER_SLOP = 6

export const thresholdPlugin = {
  id: 'aspThreshold',

  afterEvent(chart, args, opts) {
    if (!opts || typeof opts.value !== 'number') return
    const { event, inChartArea } = args
    if (!event || (event.type !== 'mousemove' && event.type !== 'mouseout')) return

    const y = chart.scales.y.getPixelForValue(opts.value)
    const near =
      inChartArea && event.type === 'mousemove' && Math.abs(event.y - y) <= THRESHOLD_HOVER_SLOP

    if (hoverState.get(chart) !== near) {
      hoverState.set(chart, near)
      args.changed = true
    }
  },

  afterDatasetsDraw(chart, _args, opts) {
    if (!opts || typeof opts.value !== 'number') return
    const { ctx, chartArea, scales } = chart
    const y = scales.y.getPixelForValue(opts.value)
    if (y < chartArea.top || y > chartArea.bottom) return

    ctx.save()
    ctx.beginPath()
    ctx.setLineDash([4, 3])
    ctx.lineWidth = 1
    ctx.strokeStyle = opts.color
    ctx.moveTo(chartArea.left, y)
    ctx.lineTo(chartArea.right, y)
    ctx.stroke()

    if (hoverState.get(chart) && opts.label) {
      ctx.setLineDash([])
      ctx.font = `12px ${opts.fontFamily || 'sans-serif'}`
      const text = opts.label
      const w = ctx.measureText(text).width
      const pad = 6
      const boxW = w + pad * 2
      const boxH = 20
      const boxX = Math.min(chartArea.right - boxW, chartArea.left + 4)
      const boxY = Math.max(chartArea.top, y - boxH - 2)

      ctx.fillStyle = opts.labelBg
      ctx.fillRect(boxX, boxY, boxW, boxH)
      ctx.strokeStyle = opts.color
      ctx.strokeRect(boxX, boxY, boxW, boxH)
      ctx.fillStyle = opts.labelInk
      ctx.textBaseline = 'middle'
      ctx.fillText(text, boxX + pad, boxY + boxH / 2)
    }
    ctx.restore()
  },
}

// --- min/max extreme markers (system_3 #4021, c20597; values #4080/§3.66c;
// value-primary + locator dot #4102/§3.66d) ---
// The VALUE is the primary mark: the slot's number drawn near the data point in
// a derived ink, with a small filled LOCATOR DOT pinning the slot. A number is
// self-identifying (the larger number IS the max) and its vertical position
// corroborates it — a strictly stronger non-colour channel than the retired
// ▲/▼ shape, so §3.21's "never colour alone" is satisfied by upgrade, not
// downgrade (§3.66d). Both ride the SAME `markExtremes` toggle (§3.66c decision
// 4 — no separate flag). Drawn on canvas because bars have no per-point glyph
// channel; the same draw serves line marks' point elements.
//
// `opts.marks` = [{ datasetIndex, index, kind: 'max'|'min', color, negative }]
// — computed by AspBarChart (which owns the §3.18 ink derivation); this plugin
// only draws what it is handed. `negative` places the value on the far side of
// a diverging bar (below a downward bar) so it never overlaps the baseline.
/**
 * Pure mark computation for `markExtremes` (#4021; §3.66d B3/B4): per dataset,
 * the semantic max and min slots. Nulls are skipped; a flat or <2-numeric-value
 * dataset yields no marks (silence, never a lying marker — B4). A dataset whose
 * numeric values are all ≤ 0 (the diverging contract's negated half) swaps the
 * semantic labels so "max" always means "most of the thing counted". On a
 * zero-based MAGNITUDE series (the default `encoding`), a MIN slot whose value
 * is 0 is dropped (B3 — the baseline already says it); a POSITION series keeps
 * every min (a real level). MAX always draws. Returns
 * [{ datasetIndex, index, kind: 'max'|'min', negative }]; the component applies
 * the derived inks (it owns §3.18).
 */
export const computeExtremeMarks = (datasets, { encoding = 'magnitude' } = {}) => {
  const marks = []
  ;(datasets || []).forEach((ds, datasetIndex) => {
    const values = (ds.data || []).map((v) => (typeof v === 'number' ? v : null))
    const numeric = values.filter((v) => v !== null)
    if (numeric.length < 2) return
    const lo = Math.min(...numeric)
    const hi = Math.max(...numeric)
    if (lo === hi) return // §3.66d B4: a flat series draws no marks at all.
    const allNonPositive = numeric.every((v) => v <= 0)
    const semanticMax = allNonPositive ? lo : hi
    const semanticMin = allNonPositive ? hi : lo
    const maxIndex = values.indexOf(semanticMax)
    const minIndex = values.indexOf(semanticMin)
    // MAX always draws.
    marks.push({ datasetIndex, index: maxIndex, kind: 'max', negative: values[maxIndex] < 0 })
    // §3.66d B3: on a zero-based MAGNITUDE series the MIN draws only when its
    // value is non-zero — a min of 0 spends a dot + numeral to restate what the
    // zero baseline already says (the "two ▼ and two 0 on one card" defect on
    // task_flow). A POSITION (stock) series' minimum is a real level, so it
    // always draws.
    const minValue = values[minIndex]
    if (encoding === 'position' || minValue !== 0) {
      marks.push({ datasetIndex, index: minIndex, kind: 'min', negative: minValue < 0 })
    }
  })
  return marks
}

// On-mark value text (system_3 §3.66c, ruling #4080): the operator-preferred
// hybrid — keep the colourblind-safe ▲/▼ markers AND draw the actual value ON
// the mark. `10` is the axis-text readable floor (§3.66c decision 3): on-chart
// numeric text clears the same ≥10px bar a tick label does.
const EXTREME_VALUE_FONT_PX = 10

// §3.66d B1: the locator-dot radius. The dot only PINS the slot the numeral
// names, so it is deliberately small — subordinate to the value, which is the
// primary channel now. 2px reads as a point against the plot without competing
// with the number the way the retired 7px-wide triangle did (it rendered larger
// than the data it annotated, the operator's complaint).
const EXTREME_DOT_RADIUS = 2

/**
 * The on-mark value text for an extreme (§3.66c). Draws the MAGNITUDE of the
 * slot value: a diverging series' negated half stores negative numbers whose
 * "thing counted" is positive (`computeExtremeMarks` swaps the semantic labels
 * for that half, so its "max" is the most-negative slot), and the operator
 * wants `7 done`, not `-7`. A non-finite slot (null/undefined) yields null —
 * the caller draws the triangle only, never a lying `0` (§3.35). Integers
 * render bare; a fractional value keeps a single decimal so a mean-style series
 * cannot print a 12-digit float onto a 48px card.
 */
export const formatExtremeValue = (value) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  const magnitude = Math.abs(value)
  return Number.isInteger(magnitude) ? String(magnitude) : String(Math.round(magnitude * 10) / 10)
}

/**
 * Where the on-mark value text lands (§3.66c value placement + the #4095
 * headroom refinement). Pure geometry, exported so the placement is asserted
 * directly rather than read back out of a painted canvas.
 *
 * Inputs: `x` the mark's centre, `tip` the triangle apex y (the far edge from
 * the bar end), `dir` the away-from-bar direction (`-1` a ▲/positive-bar mark
 * reading up toward `chartArea.top`, `+1` a diverging negative bar reading
 * down), `half` the triangle half-width, the plot `chartArea`, and the label's
 * measured `labelWidth`. Returns the fill anchor + `textAlign`/`textBaseline`.
 *
 * Default — headroom exists on the away-from-bar side: the value sits just
 * beyond the triangle tip, centred on the mark (the airy #4082 placement),
 * clamped inside [left, right] so it never runs past the card edge (the #4014
 * invariant).
 *
 * Peak (#4095) — no headroom: the mark is at the plot ceiling/floor, so its
 * triangle pokes past `chartArea` and a beyond-the-tip value would clamp back
 * onto its own same-ink glyph. The value moves BESIDE the triangle — offset one
 * triangle-half + 1px past the glyph, toward the plot centre (the side with
 * room), held at the plot edge — so same-ink text never stacks on the same-ink
 * triangle. Still clamped inside `chartArea`: the #4014 invariant holds either
 * branch, any width.
 */
export const computeExtremeValueLayout = ({
  x,
  tip,
  dir,
  half,
  chartArea,
  labelWidth,
  fontPx = EXTREME_VALUE_FONT_PX,
}) => {
  const baseline = dir < 0 ? 'bottom' : 'top'
  // Space between the triangle apex and the plot edge the value reads toward.
  // Below `fontPx + 1` the beyond-the-tip glyph cannot clear the triangle.
  const awayHeadroom = dir < 0 ? tip - chartArea.top : chartArea.bottom - tip
  if (awayHeadroom >= fontPx + 1) {
    const halfW = labelWidth / 2 + 1
    return {
      x: Math.min(chartArea.right - halfW, Math.max(chartArea.left + halfW, x)),
      y: dir < 0 ? tip - 1 : tip + 1,
      textAlign: 'center',
      textBaseline: baseline,
    }
  }
  // Beside: hold at the plot edge, step clear of the triangle's x-band toward
  // whichever side has more room, then clamp the whole glyph inside [left,right].
  const gap = half + 1
  const edgeY = dir < 0 ? chartArea.top + fontPx : chartArea.bottom - fontPx
  if (x < (chartArea.left + chartArea.right) / 2) {
    return {
      x: Math.min(x + gap, chartArea.right - labelWidth),
      y: edgeY,
      textAlign: 'left',
      textBaseline: baseline,
    }
  }
  return {
    x: Math.max(x - gap, chartArea.left + labelWidth),
    y: edgeY,
    textAlign: 'right',
    textBaseline: baseline,
  }
}

export const extremesPlugin = {
  id: 'aspExtremes',

  afterDatasetsDraw(chart, _args, opts) {
    if (!opts || !Array.isArray(opts.marks) || opts.marks.length === 0) return
    const { ctx, chartArea } = chart
    for (const mark of opts.marks) {
      const meta = chart.getDatasetMeta(mark.datasetIndex)
      const el = meta?.data?.[mark.index]
      if (!el || typeof el.x !== 'number' || typeof el.y !== 'number') continue
      // §3.66d B1: the VALUE is the primary mark; the ▲/▼ retires to a small
      // filled LOCATOR DOT whose only job is to pin the slot the numeral names.
      // A number is self-identifying — the larger number IS the max, no legend,
      // shape vocabulary, or colour perception needed — and its vertical
      // position corroborates it, so the number is a strictly STRONGER second
      // channel than the shape: retiring the triangle is a channel upgrade, not
      // the colour-alone regression §3.21 forbids and §3.66b refused.
      const half = EXTREME_DOT_RADIUS
      // The value reads away from the mark's data end: above a positive bar/
      // point, below a negative (diverging) one. `tip` is the dot's far edge
      // plus a hair, the anchor `computeExtremeValueLayout` reads the value off.
      const dir = mark.negative ? 1 : -1
      const tip = el.y + dir * (EXTREME_DOT_RADIUS + 1)
      ctx.save()
      ctx.fillStyle = mark.color
      ctx.beginPath()
      ctx.arc(el.x, el.y, EXTREME_DOT_RADIUS, 0, Math.PI * 2)
      ctx.fill()

      // §3.66c/d: draw the value in the SAME derived ink as the dot (`mark.color`
      // — §3.18, dot and number read as one mark, one hue), now the 4.5:1 text
      // floor since the number is the primary channel (§3.66d B2, derived in
      // AspBarChart's `extremeInks`). Canvas-clamped to `chartArea` the way
      // `thresholdPlugin`'s hover label is, so it never runs past the card edge
      // (§3.66c decision 1 / #4014). NOTE (#4082): §3.66c decision 5's suppress-
      // on-duplicate rule is a no-op today — the §3.66a end-of-series label it
      // must not double is not yet built in this DS.
      const label = formatExtremeValue(
        chart.data?.datasets?.[mark.datasetIndex]?.data?.[mark.index]
      )
      if (label !== null) {
        ctx.font = `${EXTREME_VALUE_FONT_PX}px ${opts.fontFamily || 'sans-serif'}`
        // Placement is pure geometry (`computeExtremeValueLayout`): the airy
        // beyond-the-tip default where headroom exists, and the #4095 beside-
        // the-triangle placement at the plot ceiling/floor so the same-ink
        // value never stacks onto its own same-ink glyph. Both branches stay
        // inside `chartArea`, so the value never runs past the card edge.
        const layout = computeExtremeValueLayout({
          x: el.x,
          tip,
          dir,
          half,
          chartArea,
          labelWidth: ctx.measureText(label).width,
        })
        ctx.textAlign = layout.textAlign
        ctx.textBaseline = layout.textBaseline
        ctx.fillText(label, layout.x, layout.y)
      }
      ctx.restore()
    }
  },
}

// --- §3.66a paired-flow end-of-series labels ---
// The required non-colour channel for the overlaid line pair (§3.66a decision
// "labelling is an inline end-of-series text label at the last data point,
// coloured to its own line"): each line's SERIES NAME drawn at its last point,
// in the line's own hue, so a reader confirms which line is which without any
// colour perception (§3.21). Drawn on canvas alongside the line marks.
//
// `opts.labels` = [{ datasetIndex, text, color }] — computed by AspBarChart.
export const flowEndLabelPlugin = {
  id: 'aspFlowEndLabel',

  afterDatasetsDraw(chart, _args, opts) {
    if (!opts || !Array.isArray(opts.labels) || opts.labels.length === 0) return
    const { ctx, chartArea } = chart
    ctx.save()
    ctx.font = `${EXTREME_VALUE_FONT_PX}px ${opts.fontFamily || 'sans-serif'}`
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'right'
    for (const lab of opts.labels) {
      const meta = chart.getDatasetMeta(lab.datasetIndex)
      const pts = meta?.data
      const el = pts && pts.length ? pts[pts.length - 1] : null
      if (!el || typeof el.x !== 'number' || typeof el.y !== 'number') continue
      const w = ctx.measureText(lab.text).width
      // The last point sits at the plot's right edge; place the name just LEFT
      // of it (right-aligned), clamped so the whole label stays inside the plot,
      // and hold the baseline off the top/bottom edge by half the font.
      const half = EXTREME_VALUE_FONT_PX / 2
      const x = Math.max(chartArea.left + w, Math.min(el.x - 2, chartArea.right - 2))
      const y = Math.max(chartArea.top + half, Math.min(chartArea.bottom - half, el.y))
      ctx.fillStyle = lab.color
      ctx.fillText(lab.text, x, y)
    }
    ctx.restore()
  },
}
