// Category-axis labels never rotate (§3.120 Q10, system_3 #9180): they wrap
// to two lines, and a chart whose labels cannot fit two lines turns its bars
// horizontal. Three regular AspBarCharts in AspCards at the width `?w=` names:
//
//   #complexity  the console's "Tokens by complexity" shape; `unattributed`
//                has no word break, so a narrow card goes horizontal
//   #paths       two-word labels that wrap at a narrow width
//   #accuracy    the console's "Estimate accuracy by complexity" card, whose
//                `options.scales.y` {min 0, max 100} is written for the value
//                axis; when the chart turns horizontal it must follow it to x
//
// Each chart's rendered category scale is published to `window.__catLabels`.
import Chart from 'chart.js/auto'
import { createApp, h } from 'vue'

import '../../../build/tokens.css'
import AspBarChart from '../../../src/components/AspBarChart.vue'
import AspCard from '../../../src/components/AspCard.vue'

const q = new URLSearchParams(location.search)
const WIDTH = Number(q.get('w') || 340)

const CHARTS = [
  {
    id: 'complexity',
    title: 'Tokens by complexity',
    labels: ['trivial', 'small', 'medium', 'large', 'epic', 'unattributed'],
    data: [42000, 310000, 880000, 1240000, 2100000, 96000],
  },
  {
    id: 'paths',
    title: 'Runs by path',
    labels: ['fast path', 'slow path', 'cold start', 'warm start', 'retry path'],
    data: [120, 45, 18, 64, 9],
  },
  {
    id: 'accuracy',
    title: 'Estimate accuracy by complexity',
    labels: ['trivial', 'small', 'medium', 'large', 'epic', 'unattributed'],
    data: [92, 81, 64, 55, 40, 70],
    options: { scales: { y: { min: 0, max: 100 } } },
  },
]

const measure = (id) => {
  const canvas = document.querySelector(`#${id} canvas`)
  const chart = canvas && Chart.getChart(canvas)
  if (!chart) return null
  const horizontal = chart.options.indexAxis === 'y'
  const scale = horizontal ? chart.scales.y : chart.scales.x
  const labels = chart.data.labels
  const ctx = chart.ctx
  ctx.save()
  const f = scale.options.ticks.font || {}
  ctx.font = `${f.size || 12}px ${f.family || 'sans-serif'}`
  const slot = horizontal ? scale.width : scale.width / labels.length
  const ticks = scale.ticks.map((t) => {
    const lines = Array.isArray(t.label) ? t.label : [String(t.label)]
    return { lines, widest: Math.max(...lines.map((l) => ctx.measureText(l).width)) }
  })
  ctx.restore()
  const value = horizontal ? chart.scales.x : chart.scales.y
  return {
    horizontal,
    valueRange: [value.min, value.max],
    rotation: scale.labelRotation || 0,
    // Every scale's rotation, the value axis included: no chart label rotates.
    maxRotation: Math.max(...Object.values(chart.scales).map((sc) => sc.labelRotation || 0)),
    total: labels.length,
    drawn: ticks.length,
    slot,
    ticks,
    // Every label drawn, whole (its lines rejoin to the source label), on at
    // most two lines, each line within its slot.
    allWhole:
      ticks.length === labels.length &&
      ticks.every((t, i) => t.lines.join(' ') === labels[i] && t.lines.length <= 2 && t.widest <= slot + 0.5),
  }
}

createApp({
  setup() {
    return () =>
      h(
        'div',
        { style: { width: `${WIDTH}px` } },
        CHARTS.map((c) =>
          h('section', { id: c.id }, [
            h(AspCard, null, () => [
              h('h2', null, c.title),
              h(AspBarChart, {
                data: { labels: c.labels, datasets: [{ label: c.title, data: c.data }] },
                ariaLabel: c.title,
                animate: false,
                options: c.options ?? {},
              }),
            ]),
          ]),
        ),
      )
  },
}).mount('#app')

// Publish once both charts have drawn and the layout has settled.
const poll = () => {
  const all = Object.fromEntries(CHARTS.map((c) => [c.id, measure(c.id)]))
  if (Object.values(all).every(Boolean)) {
    setTimeout(() => {
      window.__catLabels = Object.fromEntries(CHARTS.map((c) => [c.id, measure(c.id)]))
      window.__catLabelsReady = true
    }, 600)
  } else requestAnimationFrame(poll)
}
requestAnimationFrame(poll)
