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
} = {}) => {
  const v = VARIANTS.includes(variant) ? variant : 'regular'
  const ticks = TICKS[v]
  const font = { family: fontFamily }

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
