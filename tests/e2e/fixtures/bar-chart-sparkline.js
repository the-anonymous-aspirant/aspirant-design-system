// Mounts the #3129 sparkline variant on the surface the at-a-glance cards
// actually use — a dark AspCard (--surface-card) — and publishes what each
// instance DERIVED to `window.__sparkline`, so the spec can measure the real
// per-dataset fills rather than recomputing them from tokens and hoping.
//
// Why a separate fixture from bar-chart.js: that one asserts the single
// `paint.barFill` contract across (surface x state); the sparkline's fills are
// a per-dataset ARRAY chosen from the series palette, a different contract. A
// clean fixture keeps each assertion reading exactly what it means.
import Chart from 'chart.js/auto'
import { createApp, h, ref } from 'vue'

import '../../../build/tokens.css'
import AspBarChart from '../../../src/components/AspBarChart.vue'
import AspCard from '../../../src/components/AspCard.vue'
import { normalizeValueDomain } from '../../../src/utils/normalize_value_domain.js'

const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`)

// A single-series card and a diverging two-series card, both with zero hours so
// the empty-slot rendering is exercised.
const SINGLE = {
  labels: HOURS,
  datasets: [{ label: 'agent actions', data: [3, 5, 2, 0, 0, 1, 4, 6, 8, 7, 5, 9, 12, 10, 6, 4, 0, 2, 5, 7, 8, 6, 3, 4] }],
}
const CREATED = [2, 3, 1, 0, 0, 1, 2, 4, 5, 3, 2, 6, 7, 5, 3, 2, 0, 1, 3, 4, 5, 3, 1, 2]
const DONE = [-1, -2, 0, 0, -1, 0, -1, -3, -4, -2, -1, -5, -6, -4, -2, -1, 0, -1, -2, -3, -4, -2, -1, -1]
const ZEROS = HOURS.map(() => 0)

const DIVERGING = {
  labels: HOURS,
  datasets: [
    { label: 'created', data: CREATED },
    { label: 'done', data: DONE },
  ],
}
// One-sided windows: the case design_agent's #3129 refinement is about. An
// all-created hour never crosses zero (rule must still draw at the baseline);
// an all-done hour is entirely negative (zero is at the TOP — the rule is the
// only thing that stops the card reading as an upward trend).
const DIVERGING_ALL_CREATED = {
  labels: HOURS,
  datasets: [
    { label: 'created', data: CREATED },
    { label: 'done', data: ZEROS },
  ],
}
const DIVERGING_ALL_DONE = {
  labels: HOURS,
  datasets: [
    { label: 'created', data: ZEROS },
    { label: 'done', data: DONE },
  ],
}

// §3.66a paired-flow cases — BOTH series positive (no diverging negation). The
// lines case clears the 5× window-ratio cap and overlays as lines; the fallback
// case blows past it (max 40 vs 4 = 10×) and reverts to the diverging bars.
const PAIRED_CREATED = [2, 3, 1, 0, 0, 1, 2, 4, 5, 3, 2, 6, 7, 5, 3, 2, 0, 1, 3, 4, 5, 3, 1, 2]
const PAIRED_DONE = [1, 2, 0, 0, 1, 0, 1, 3, 4, 2, 1, 5, 6, 4, 2, 1, 0, 1, 2, 3, 4, 2, 1, 1]
const PAIRED_LINES = {
  labels: HOURS,
  datasets: [
    { label: 'created', data: PAIRED_CREATED },
    { label: 'done', data: PAIRED_DONE },
  ],
}
const PAIRED_FALLBACK = {
  labels: HOURS,
  datasets: [
    { label: 'created', data: PAIRED_CREATED.map((v) => v * 6) }, // max 42
    { label: 'done', data: PAIRED_DONE },
  ],
}

const CASES = [
  { key: 'single', data: SINGLE },
  { key: 'diverging', data: DIVERGING },
  { key: 'divergingAllCreated', data: DIVERGING_ALL_CREATED },
  { key: 'divergingAllDone', data: DIVERGING_ALL_DONE },
  { key: 'pairedLines', data: PAIRED_LINES, pairedFlow: true },
  { key: 'pairedFallback', data: PAIRED_FALLBACK, pairedFlow: true },
  // A STOCK/position line (§3.66): a level hovering above zero, focused range.
  // Exercises the §3.66e plot-budget fix on the buildLineOptions path too.
  {
    key: 'stock',
    encoding: 'position',
    data: {
      labels: HOURS.slice(0, 8),
      datasets: [{ label: 'backlog', data: [40, 41, 43, 44, 42, 45, 44, 43] }],
    },
  },
]

// Fraction of x columns that carry ink on the canvas row nearest y=0. A
// full-width 1px rule lights every column (~1.0); sparse bars light only a
// fraction. This is what proves the zero rule actually PAINTED, in a one-sided
// window, rather than merely being configured — the rendered teeth behind
// design_agent's "always drawn" invariant.
const zeroLineInkFraction = (canvas) => {
  const chart = Chart.getChart(canvas)
  if (!chart) return null
  const yZeroPx = chart.scales.y.getPixelForValue(0)
  const ctx = canvas.getContext('2d')
  const dpr = canvas.width / canvas.getBoundingClientRect().width
  const W = canvas.width
  // The rule can land on the exact top/bottom edge of a one-sided window; scan a
  // couple of rows either side and take the best-lit row so an edge line counts.
  let best = 0
  for (let dy = -2; dy <= 2; dy += 1) {
    const py = Math.round(yZeroPx * dpr) + dy
    if (py < 0 || py >= canvas.height) continue
    const row = ctx.getImageData(0, py, W, 1).data
    let ink = 0
    for (let x = 0; x < W; x += 1) if (row[x * 4 + 3] > 10) ink += 1
    best = Math.max(best, ink / W)
  }
  return +best.toFixed(2)
}

// #4102/§3.66e: the rendered plot band and the y-domain the render actually
// used, read straight off the Chart instance. `chartAreaHeight` proves the plot
// fills the 48px cell (A1); `yMax`/`yMin` are what a downstream nice-tick pass
// would have widened, so a spec compares them to `normalizeValueDomain`'s own
// output (A2); the per-dataset window max and its rendered pixel height let a
// spec check the max draws at `value/domain × plotHeight`.
const sparklineGeom = (canvas, data) => {
  const chart = Chart.getChart(canvas)
  if (!chart) return null
  const ca = chart.chartArea
  const sy = chart.scales.y
  const pxZero = sy.getPixelForValue(0)
  const datasets = (data.datasets || []).map((ds) => {
    const nums = (ds.data || []).filter((v) => typeof v === 'number')
    const maxAbs = nums.length ? Math.max(...nums.map((v) => Math.abs(v))) : 0
    const signedExtreme = nums.length
      ? nums.reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a), 0)
      : 0
    return {
      maxAbs,
      renderedMaxHeightPx: +Math.abs(pxZero - sy.getPixelForValue(signedExtreme)).toFixed(2),
    }
  })
  // §3.66e A2: the domain the DOMAIN HELPER returned — what the render's y-scale
  // must equal, un-widened. A two-series card is `magnitude-diverging`, a single
  // is `magnitude` (mirroring AspBarChart's zeroBaseline rule). `beginAtZero`
  // supplies the 0 baseline a magnitude fragment omits.
  const diverging = (data.datasets || []).length > 1
  const dom = normalizeValueDomain(data, {
    encoding: diverging ? 'magnitude-diverging' : 'magnitude',
  })
  return {
    chartAreaHeight: +ca.height.toFixed(2),
    canvasHeight: +canvas.getBoundingClientRect().height.toFixed(2),
    yMin: sy.min,
    yMax: sy.max,
    // The helper's own bounds, for the un-widened assertion. Magnitude → 0 min.
    expectedMin: 'suggestedMin' in dom ? dom.suggestedMin : 0,
    expectedMax: 'suggestedMax' in dom ? dom.suggestedMax : dom.max,
    datasets,
  }
}

const published = {}

createApp({
  setup() {
    const refs = CASES.map(() => ref(null))

    const whenChartsDrawn = (fn) => {
      const charts = [...document.querySelectorAll('.asp-chart')]
      if (charts.length && charts.every((el) => el.dataset.rendered === 'true')) {
        requestAnimationFrame(() => requestAnimationFrame(fn))
      } else {
        requestAnimationFrame(() => whenChartsDrawn(fn))
      }
    }

    whenChartsDrawn(() => {
      const canvases = [...document.querySelectorAll('.asp-chart canvas')]
      CASES.forEach((c, i) => {
        const inst = refs[i].value
        if (!inst) return
        // The y=0 rule is scriptable (color/lineWidth are functions), which do
        // not survive the page.evaluate JSON boundary — collapse it to a boolean
        // here, where the functions are still callable.
        const grid = inst.chartOptions?.scales?.y?.grid ?? null
        const hasZeroRule =
          !!grid && grid.display === true && typeof grid.color === 'function'
        published[c.key] = {
          key: c.key,
          background: inst.paint.bg,
          barFills: inst.barFills,
          // #4050/§3.66b: the DERIVED extreme-marker inks, so a spec can check
          // them against the derived series fills painted on the same chart.
          extremeInks: inst.extremeInks,
          axisLine: inst.paint.axisLine,
          hasZeroRule,
          // Rendered proof the rule painted (diverging cases only; a single
          // series has no rule to find).
          zeroLineInkFrac: canvases[i] ? zeroLineInkFraction(canvases[i]) : null,
          // #4102/§3.66e: the RENDERED plot geometry, so a spec asserts the plot
          // fills its cell (A1) and the domain the render used is the one
          // `normalizeValueDomain` returned, un-widened (A2) — both measured off
          // the real chart, never an options-shape read.
          geom: canvases[i] ? sparklineGeom(canvases[i], c.data) : null,
          // #4102/§3.66a: the render DECISION and the end-of-series labels, so a
          // spec checks a paired flow overlays as lines (or falls back at >5×).
          pairedAsLines: inst.pairedAsLines,
          pairedAsBars: inst.pairedAsBars,
          flowRatio: inst.flowRatio,
          flowEndLabels: inst.flowEndLabels,
          chartType: inst.asLineMark ? 'line' : 'bar',
        }
      })
      window.__sparkline = published
      window.__sparklineReady = true
    })

    return () =>
      h(
        'div',
        { class: 'probe-root' },
        CASES.map((c, i) =>
          h(AspCard, null, () => [
            h(AspBarChart, {
              ref: refs[i],
              variant: 'sparkline',
              data: c.data,
              markExtremes: true,
              pairedFlow: !!c.pairedFlow,
              encoding: c.encoding || 'magnitude',
              ariaLabel: `${c.key} sparkline`,
            }),
          ])
        )
      )
  },
}).mount('#app')

const st = document.createElement('style')
st.textContent = `.probe-root{display:flex;flex-direction:column;gap:24px;padding:16px;background:var(--surface-page)}`
document.head.appendChild(st)
