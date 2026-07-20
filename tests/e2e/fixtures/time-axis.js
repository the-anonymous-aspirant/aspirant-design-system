// Renders time-mode AspBarCharts at controlled widths and spans, then reads
// back what each x axis ACTUALLY drew — the label text and the pixel position
// it landed on.
//
// Positions, not just labels, because conventions §3.19 is a rule about WHERE
// ticks go. "The right labels in the wrong places" is a real failure mode
// (equal pixel divisions that happen to read `06:00`), and a fixture that
// returned only strings could not tell it from the correct axis. The spec's
// own history is the argument: asserting the flag instead of the render is what
// let `0h1h2h3h…` ship.
//
// The widths are not arbitrary. 340px is the width acceptance criterion 1
// names and the same width tick-density.js measures at, so the two fixtures
// describe the same surface. The narrow case is sized to drive `budget` under
// 3 so the endpoint fallback is exercised as the DERIVED outcome of the budget
// rule rather than as a branch a test asked for directly.
import { createApp, h } from 'vue'
import Chart from 'chart.js/auto'

import '../../../build/tokens.css'
import AspBarChart from '../../../src/components/AspBarChart.vue'

const HOUR = 60 * 60 * 1000

/** Local midnight today, so the 24h case has a real calendar-day boundary in it. */
const midnight = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** `count` buckets of `step` ms starting at local midnight. */
const series = (count, step) => {
  const t0 = midnight()
  const timestamps = Array.from({ length: count }, (_, i) => t0 + i * step)
  return {
    timestamps,
    data: {
      // The category labels stay human — they are what the TOOLTIP reads out.
      // The axis reads `timestamps`. Keeping them distinct here is what proves
      // the axis is not just echoing data.labels.
      labels: timestamps.map((t) => new Date(t).toISOString()),
      datasets: [{ label: 'p95 latency', data: timestamps.map((_, i) => 200 + ((i * 37) % 180)) }],
    },
  }
}

// 25 hourly buckets = a 24h span whose first and last points are both midnight.
const DAY24 = series(25, HOUR)
// 13 half-hourly buckets = a 6h span: the clock band's upper edge.
const SIX_HOUR = series(13, HOUR / 2)
// 29 six-hourly buckets = a 7-day span: the date band.
const WEEK = series(29, 6 * HOUR)

// The category control's own labels. Short strings like the Performance page's
// real "last 30 hours" axis, NOT the ISO stamps the time cases carry — feeding
// it ISO strings would make the control look broken in a screenshot and prove
// nothing about the categorical treatment being preserved.
const CATEGORY_DATA = {
  labels: DAY24.timestamps.map((_, i) => `${i}h`),
  datasets: [{ label: 'p95 latency', data: DAY24.data.datasets[0].data }],
}

const CASES = [
  { key: 'day24_340', width: 340, series: DAY24, surface: 'page' },
  { key: 'day24_340_card', width: 340, series: DAY24, surface: 'card' },
  // Two slots exactly: the endpoint floor, where first and last are labelled
  // and nothing between them is.
  { key: 'day24_endpoints', width: 232, series: DAY24, surface: 'page' },
  // Under two slots: not even the endpoints fit, so the range label carries
  // the whole reading. This is the case that drew `Mon 0Tue 00:00`.
  { key: 'day24_narrow', width: 96, series: DAY24, surface: 'page' },
  { key: 'sixhour_340', width: 340, series: SIX_HOUR, surface: 'page' },
  { key: 'week_340', width: 340, series: WEEK, surface: 'page' },
  // The control: same data, same width, category mode. Criterion 3 — this must
  // stay exactly as it renders today, so the suite measures it rather than
  // trusting that the diff did not reach it.
  { key: 'day24_340_category', width: 340, series: DAY24, surface: 'page', xAxis: 'category' },
]

const app = createApp({
  render: () =>
    h(
      'div',
      CASES.map((c) =>
        h(
          'div',
          {
            // `card` reproduces the AspCard surface, which is DARK even in the
            // light theme — the surface that makes "which theme is it" the
            // wrong question (§3.18).
            class: `case case--${c.surface}`,
            'data-case': c.key,
            style: {
              width: `${c.width}px`,
              padding: '8px',
              marginBottom: '16px',
              background: c.surface === 'card' ? 'var(--surface-card)' : 'var(--surface-page)',
            },
          },
          [
            h(AspBarChart, {
              data: c.xAxis === 'category' ? CATEGORY_DATA : c.series.data,
              timestamps: c.xAxis === 'category' ? null : c.series.timestamps,
              xAxis: c.xAxis || 'time',
              unit: 'ms',
              range: 'last 24 hours',
              ariaLabel: `${c.key} chart`,
            }),
          ]
        )
      )
    ),
})

app.mount('#app')

/**
 * Read the rendered x scale back.
 *
 * Chart.js keeps the post-layout ticks and a pixel per tick index, so this
 * reports what was painted rather than what the options asked for. Blank
 * labels are dropped — they are the buckets §3.19 deliberately leaves bare —
 * but their INDEX is preserved on the ones that survive, which is the half that
 * makes position assertable.
 */
const readAxis = (root) => {
  const canvas = root.querySelector('canvas')
  const chart = canvas && Chart.getChart(canvas)
  if (!chart) return null
  const scale = chart.scales.x
  const ticks = scale.ticks || []

  // Measured in the scale's own font, so overlap is a fact about the painted
  // axis rather than a guess from character counts. Without this the endpoint
  // floor passed a 96px chart that drew `Mon 0Tue 00:00` — the label COUNT was
  // right and the axis was still an unreadable smear.
  const ctx = chart.ctx
  ctx.save()
  const f = scale.options?.ticks?.font || {}
  ctx.font = `${f.size || 12}px ${f.family || 'sans-serif'}`

  const labelled = []
  ticks.forEach((t, i) => {
    const text = t.label == null ? '' : String(t.label)
    if (text === '') return
    labelled.push({
      index: i,
      label: text,
      px: Math.round(scale.getPixelForTick(i)),
      w: Math.round(ctx.measureText(text).width),
    })
  })
  ctx.restore()

  return {
    labelled,
    // Criterion: time axes are never rotated. Read off the scale's RESOLVED
    // rotation, not the option — Chart.js decides the final angle itself, so
    // the option only records what it was allowed to do.
    rotation: scale.labelRotation || 0,
    plotWidth: Math.round(scale.width || 0),
    fontSize: scale.options?.ticks?.font?.size || 12,
    tickCount: ticks.length,
  }
}

// Chart.js lays out asynchronously; two frames is enough for the scale to have
// real pixel positions. Reading earlier reports a zero-width plot and every
// budget collapses to the endpoint floor — a false pass on criterion 2.
requestAnimationFrame(() =>
  requestAnimationFrame(() => {
    const out = {}
    for (const el of document.querySelectorAll('[data-case]')) {
      out[el.dataset.case] = readAxis(el)
    }
    window.__timeAxis = out
    window.__timeAxisReady = true
  })
)
