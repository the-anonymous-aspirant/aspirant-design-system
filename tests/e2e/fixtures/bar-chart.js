// Mounts AspBarChart on the surfaces a consumer actually drops it onto, and
// publishes what it DERIVED to `window.__aspBarChart` so the spec can measure
// the real painted values.
//
// Why this fixture exists at all: the shipped contrast probe walks DOM text
// nodes, and a Chart.js chart is one <canvas> with none. Adding AspBarChart to
// specimens.js would add a specimen the matrix silently skips — a state the
// suite cannot reach is green by construction, which is worse than an
// uncovered component because the matrix would then appear to cover charts.
//
// So the tick/legend ink is asserted at its source instead: the component
// resolves and derives it, exposes it, and the spec measures it against the
// container background this fixture actually paints. Same rule, reachable
// evidence. The axis unit/range labels are real DOM and stay measurable by the
// ordinary probe.
import { createApp, h, ref } from 'vue'

import '../../../build/tokens.css'
import AspBarChart from '../../../src/components/AspBarChart.vue'
import AspCard from '../../../src/components/AspCard.vue'

const DATA = {
  labels: ['1h', '2h', '3h', '4h', '5h', '6h'],
  datasets: [{ label: 'p95', data: [220, 480, 130, 310, 90, 260] }],
}

// The surfaces that matter. `card-default` is first among equals: AspCard is
// --surface-card, DARK even in the light theme, which is the polarity
// inversion behind the whole #2415 defect family.
const SURFACES = [
  { key: 'page', wrap: (child) => h('div', { class: 'probe-surface' }, [child]) },
  { key: 'card-default', wrap: (child) => h(AspCard, null, () => [child]) },
  { key: 'card-elevated', wrap: (child) => h(AspCard, { variant: 'elevated' }, () => [child]) },
]

// One per (surface x state), plus a stateless instance per surface. States are
// what change the bar fill, and the fill is measured against the plot
// background, so every state needs its own mounted instance.
const CASES = []
for (const surface of SURFACES) {
  for (const state of [null, 'great', 'normal', 'unhealthy']) {
    CASES.push({ surface: surface.key, state, wrap: surface.wrap })
  }
}

const published = {}

createApp({
  setup() {
    const refs = CASES.map(() => ref(null))

    // Publish after paint, so getComputedStyle sees settled backgrounds.
    // chart.js loads at RUNTIME now (#2636), so wait for every AspChart to
    // signal `data-rendered` before reading `inst.paint`; then keep the
    // original two-frame settle for the backgrounds.
    const whenChartsDrawn = (fn) => {
      const charts = [...document.querySelectorAll('.asp-chart')]
      if (charts.length && charts.every((el) => el.dataset.rendered === 'true')) {
        requestAnimationFrame(() => requestAnimationFrame(fn))
      } else {
        requestAnimationFrame(() => whenChartsDrawn(fn))
      }
    }

    whenChartsDrawn(() => {
      CASES.forEach((c, i) => {
        const inst = refs[i].value
        if (!inst) return
        const p = inst.paint
        published[`${c.surface}|${c.state ?? 'none'}`] = {
          surface: c.surface,
          state: c.state,
          background: p.bg,
          axisInk: p.axisInk,
          axisLine: p.axisLine,
          barFill: p.barFill,
          tooltipBg: p.tooltipBg,
          tooltipInk: p.tooltipInk,
          fontFamily: p.fontFamily,
        }
      })
      window.__aspBarChart = published
      window.__aspBarChartReady = true
    })

    return () =>
      h(
        'div',
        { class: 'probe-root' },
        CASES.map((c, i) =>
          c.wrap(
            h(AspBarChart, {
              ref: refs[i],
              data: DATA,
              state: c.state,
              unit: 'ms',
              range: 'last 6 hours',
              threshold: 300,
              ariaLabel: `latency on ${c.surface} ${c.state ?? 'stateless'}`,
            })
          )
        )
      )
  },
}).mount('#app')

const st = document.createElement('style')
st.textContent = `.probe-root{display:flex;flex-direction:column;gap:24px;padding:16px}
.probe-surface{padding:16px;background:var(--surface-page)}`
document.head.appendChild(st)
