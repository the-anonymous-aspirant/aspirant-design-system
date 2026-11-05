// §3.131 (system_3 #9939/#9941): on a chart that draws two or more series in
// distinct colours, the legend word that names a series wears that series' hue
// at the 4.5:1 text floor against the surface it sits on.
//
// Each slot mounts one AspChart. The spec reads the legend items Chart.js built
// (`window.__legend(id)`) and the slot's painted background (`window.__bg(id)`),
// and recomputes the expected ink with deriveInk itself.
//
//   #two-page      two series on the page surface (light set / dark page)
//   #two-card      two series on --surface-card (dark in both themes)
//   #bar-card      a grouped bar on the card (AspBarChart's path into AspChart)
//   #one-page      one series: nothing to match, neutral ink
//   #same-colour   two series in ONE colour: nothing to tell apart, neutral ink
//   #consumer      the consumer set legend.labels.color: theirs wins
//   #unparsed      two distinct colours plus one `var(--x)` string: the two
//                  are coloured, the unparseable one keeps the neutral ink
import { createApp, h } from 'vue'
import Chart from 'chart.js/auto'

import '../../../build/tokens.css'
import AspChart from '../../../src/components/AspChart.vue'

const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const two = {
  labels,
  datasets: [
    { label: 'Created', data: [4, 6, 5, 8, 7] },
    { label: 'Done', data: [2, 5, 4, 7, 6] },
  ],
}
const one = { labels, datasets: [{ label: 'Created', data: [4, 6, 5, 8, 7] }] }
const same = {
  labels,
  datasets: [
    { label: 'Model A', data: [4, 6, 5, 8, 7], borderColor: '#ffb300' },
    { label: 'Model A (points)', data: [3, 5, 6, 7, 5], borderColor: '#ffb300' },
  ],
}
const unparsed = {
  labels,
  datasets: [
    { label: 'Created', data: [4, 6, 5, 8, 7] },
    { label: 'Done', data: [2, 5, 4, 7, 6] },
    { label: 'Raw var', data: [1, 2, 1, 3, 2], borderColor: 'var(--not-resolved)' },
  ],
}

const slot = (id, style, chart) => h('div', { id, class: 'slot', style }, [h(AspChart, { height: 220, ...chart })])
const card = 'background: var(--surface-card)'
const page = 'background: var(--surface-page)'

createApp({
  render: () =>
    h('div', [
      slot('two-page', page, { type: 'line', data: two }),
      slot('two-card', card, { type: 'line', data: two }),
      slot('bar-card', card, { type: 'bar', data: two }),
      slot('one-page', page, { type: 'line', data: one }),
      slot('same-colour', page, { type: 'line', data: same }),
      slot('consumer', page, { type: 'line', data: two, options: { plugins: { legend: { labels: { color: 'rgb(1, 2, 3)' } } } } }),
      slot('unparsed', page, { type: 'line', data: unparsed }),
    ]),
}).mount('#app')

window.__legend = (id) => {
  const chart = Chart.getChart(document.querySelector(`#${id} canvas`))
  if (!chart) return null
  return {
    labelsColor: chart.options.plugins.legend.labels.color,
    items: chart.legend.legendItems.map((it) => ({
      text: it.text,
      fontColor: it.fontColor,
      strokeStyle: it.strokeStyle,
      fillStyle: it.fillStyle,
    })),
    borderColors: chart.data.datasets.map((d) => d.borderColor),
  }
}
window.__bg = (id) => getComputedStyle(document.getElementById(id)).backgroundColor
window.__token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()
