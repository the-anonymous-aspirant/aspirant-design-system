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
 */
export const HEIGHTS = { regular: 200, compact: 48 }

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
 * `regular.x.autoSkip: false` is the direct answer to P8's "denser x/y axis
 * label values": Chart.js's default drops x labels whenever they crowd, which
 * is what produced the sparse treatment the operator objected to. Turning it
 * off labels every category.
 *
 * `compact` goes the other way on purpose. A 48px-tall cell has no vertical
 * room for a tick ramp and no horizontal room for category labels; y falls back
 * to the min/max pair that #2227 names as the floor, and the x reading is
 * carried by the range label under the baseline instead. Denser is the rule for
 * the surface P8 was looking at, not a rule for every surface.
 */
export const TICKS = {
  regular: { y: { maxTicksLimit: 6 }, x: { autoSkip: false, maxRotation: 0 } },
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
 * The line is drawn beneath the bars so a bar crossing it stays readable, and
 * it is labelled on hover — the label is drawn only when the pointer is inside
 * the plot area, which is what "threshold-line hover" asks for.
 */
export const thresholdPlugin = {
  id: 'aspThreshold',
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

    if (opts.hovered && opts.label) {
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
