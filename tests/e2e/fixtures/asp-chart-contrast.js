// Mounts AspChart on a bare `--surface-page` surface (the real health-metric
// drill-down call site, HealthMetricDetail.vue:260) in the theme named by
// ?theme, so the spec can sample the RENDERED canvas — the evidence §3.78
// requires, because the shipped contrast probe walks DOM text nodes and a
// Chart.js chart is one <canvas> with none.
//
// Two instances are mounted:
//   #chart-fixed  — the shipped AspChart (its themedDefaults resolves the axis/
//                   legend ink off the element's real inherited color, §3.78).
//   #chart-broken — the pre-fix behaviour reproduced: axis/legend `color` is
//                   forced to the RAW `--text-muted` value (`color-mix(in srgb,
//                   currentColor 88%, transparent)`). Handed to a canvas that
//                   cannot resolve currentColor, it renders as opaque black —
//                   the "black on black" defect. This is the test's teeth: on a
//                   dark surface the probe MUST fail this instance, or it is
//                   measuring nothing.
import { createApp, h, ref } from 'vue'

import '../../../build/tokens.css'
import AspChart from '../../../src/components/AspChart.vue'

const DATA = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
  datasets: [
    { label: 'Tasks done', data: [12, 19, 14, 22, 27, 9, 6] },
    { label: 'Messages', data: [30, 42, 38, 51, 60, 25, 18] },
  ],
}

// The raw currentColor-relative token value — what the pre-fix code read off
// the custom property and handed to Chart.js.
const RAW_MUTED = 'color-mix(in srgb, currentColor 88%, transparent)'

// Grid and axis borders are suppressed on both instances so the ONLY achromatic
// marks on the canvas are the axis-tick and legend TEXT (this spec's subject,
// §3.78 item 1). The grid/border non-text floor (`--border-subtle`, item 3)
// binds to a surface-scope ruling still open with design_agent and gets its own
// assertion with that token change.
const noGridBorder = {
  x: { grid: { display: false }, border: { display: false } },
  y: { grid: { display: false }, border: { display: false } },
}

// Legend OFF so the only ink on the canvas is axis-tick TEXT + series marks —
// no legend swatches whose anti-aliased edges would masquerade as text/series
// ink under the samplers. The axis/legend text probe samples the bottom
// axis-tick band; the series probe samples the plot bars.
const fixedOptions = { plugins: { legend: { display: false } }, scales: noGridBorder }

const brokenOptions = {
  plugins: { legend: { display: false } },
  scales: {
    x: { ...noGridBorder.x, ticks: { color: RAW_MUTED } },
    y: { ...noGridBorder.y, ticks: { color: RAW_MUTED } },
  },
}

// §3.78 item 2 (#4187): 5 datasets so series 1–5 render as distinct fills the
// spec can sample per-series. Bars (thick solid fills) sample far more robustly
// than thin lines. Grid off so the only saturated marks are the series bars.
const SERIES_DATA = {
  labels: ['A', 'B', 'C', 'D'],
  datasets: [
    { label: 's1', data: [10, 14, 9, 12] },
    { label: 's2', data: [8, 11, 13, 7] },
    { label: 's3', data: [12, 9, 15, 10] },
    { label: 's4', data: [6, 13, 8, 14] },
    { label: 's5', data: [11, 7, 12, 9] },
  ],
}

// Teeth for the series floor: a dataset with an explicit near-surface fill the
// probe MUST flag as sub-3:1. Saturated (so the series sampler keeps it) but a
// pale yellow that is low-contrast on the light page #e4e4e4 (~1.1:1).
const teethData = {
  labels: ['A', 'B'],
  datasets: [
    { label: 'ok', data: [10, 12] },
    { label: 'bad', data: [8, 11], backgroundColor: '#e0e090', borderColor: '#e0e090' },
  ],
}

createApp({
  setup() {
    const fixed = ref(null)
    const grid = ref(null)
    const broken = ref(null)
    const pageSeries = ref(null)
    const cardSeries = ref(null)
    const seriesTeeth = ref(null)
    return () =>
      h('div', { style: 'background: var(--surface-page); color: var(--text-body); padding: 24px' }, [
        // Grid/border off — isolates the axis/legend TEXT ink (§3.78 item 1).
        h('div', { id: 'chart-fixed', class: 'probe-slot' }, [
          h(AspChart, { ref: fixed, type: 'line', data: DATA, height: 300, options: fixedOptions }),
        ]),
        // Default chart — grid ON. Its grid ink is now resolved from currentColor
        // (§3.78 item 3), so the plot area carries the grid lines to sample.
        h('div', { id: 'chart-grid', class: 'probe-slot' }, [
          h(AspChart, { ref: grid, type: 'line', data: DATA, height: 300 }),
        ]),
        h('div', { id: 'chart-broken', class: 'probe-slot' }, [
          h(AspChart, {
            ref: broken,
            type: 'line',
            data: DATA,
            height: 300,
            options: brokenOptions,
          }),
        ]),
        // Series on the page (light surface) → the light-surface set.
        h('div', { id: 'chart-page-series', class: 'probe-slot' }, [
          h(AspChart, {
            ref: pageSeries,
            type: 'bar',
            data: SERIES_DATA,
            height: 300,
            options: fixedOptions,
          }),
        ]),
        // Series on a --surface-card (dark in BOTH themes, §1.2) → the dark set,
        // selected by resolved-background luminance, not the page theme.
        h(
          'div',
          { id: 'chart-card-series', class: 'probe-slot', style: 'background: var(--surface-card)' },
          [
            h(AspChart, {
              ref: cardSeries,
              type: 'bar',
              data: SERIES_DATA,
              height: 300,
              options: fixedOptions,
            }),
          ]
        ),
        // Teeth: an explicit near-surface series fill the probe must catch.
        h('div', { id: 'chart-series-teeth', class: 'probe-slot' }, [
          h(AspChart, {
            ref: seriesTeeth,
            type: 'bar',
            data: teethData,
            height: 300,
            options: fixedOptions,
          }),
        ]),
      ])
  },
}).mount('#app')
