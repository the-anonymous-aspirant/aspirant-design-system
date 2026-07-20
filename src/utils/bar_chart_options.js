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
 */
export const HEIGHTS = { regular: 180, compact: 48 }

export const VARIANTS = Object.keys(HEIGHTS)

/** The `state` prop's closed set, in worsening order. */
export const STATES = ['great', 'normal', 'unhealthy']

/**
 * State to the token each state's bars are filled from. `normal` is the brand
 * amber the default (stateless) chart already uses, so a chart that switches
 * from stateless to state-coloured does not change appearance until the data
 * actually leaves the normal band.
 */
export const STATE_TOKENS = {
  great: '--feedback-success',
  normal: '--brand-primary-alpha',
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
 */
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
} = {}) => {
  const v = VARIANTS.includes(variant) ? variant : 'regular'
  const font = { family: fontFamily }

  // `time` mode replaces ONLY the regular variant's x ticks. compact keeps
  // `display: false`: §3.19 derives that from its own budget floor (a 48px
  // cell has room for no interior landmark), so the reading is carried by the
  // range label under the baseline, exactly as it is today. Reaching in to add
  // ticks there would break the rule this mode implements.
  const timeMode = xAxis === 'time' && v === 'regular' && Array.isArray(timestamps)
  const ticks = timeMode ? { ...TICKS[v], x: timeTicks(timestamps) } : TICKS[v]

  return {
    maintainAspectRatio: false,
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
        // x-axis and y-axis" was describing.
        border: { display: true, color: axisLine, width: 1 },
        grid: { display: false },
        ticks: { color: axisInk, font, ...ticks.x },
      },
      y: {
        beginAtZero: true,
        border: { display: true, color: axisLine, width: 1 },
        grid: { display: false },
        ticks: { color: axisInk, font, ...ticks.y },
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
