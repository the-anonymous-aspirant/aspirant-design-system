// Mounts the #3129 sparkline variant on the surface the at-a-glance cards
// actually use — a dark AspCard (--surface-card) — and publishes what each
// instance DERIVED to `window.__sparkline`, so the spec can measure the real
// per-dataset fills rather than recomputing them from tokens and hoping.
//
// Why a separate fixture from bar-chart.js: that one asserts the single
// `paint.barFill` contract across (surface x state); the sparkline's fills are
// a per-dataset ARRAY chosen from the series palette, a different contract. A
// clean fixture keeps each assertion reading exactly what it means.
import { createApp, h, ref } from 'vue'

import '../../../build/tokens.css'
import AspBarChart from '../../../src/components/AspBarChart.vue'
import AspCard from '../../../src/components/AspCard.vue'

const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`)

// A single-series card and a diverging two-series card, both with zero hours so
// the empty-slot rendering is exercised.
const SINGLE = {
  labels: HOURS,
  datasets: [{ label: 'agent actions', data: [3, 5, 2, 0, 0, 1, 4, 6, 8, 7, 5, 9, 12, 10, 6, 4, 0, 2, 5, 7, 8, 6, 3, 4] }],
}
const DIVERGING = {
  labels: HOURS,
  datasets: [
    { label: 'created', data: [2, 3, 1, 0, 0, 1, 2, 4, 5, 3, 2, 6, 7, 5, 3, 2, 0, 1, 3, 4, 5, 3, 1, 2] },
    { label: 'done', data: [-1, -2, 0, 0, -1, 0, -1, -3, -4, -2, -1, -5, -6, -4, -2, -1, 0, -1, -2, -3, -4, -2, -1, -1] },
  ],
}

const CASES = [
  { key: 'single', data: SINGLE },
  { key: 'diverging', data: DIVERGING },
]

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
          axisLine: inst.paint.axisLine,
          hasZeroRule,
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
