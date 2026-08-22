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

const fixedOptions = { scales: noGridBorder }

const brokenOptions = {
  plugins: { legend: { labels: { color: RAW_MUTED } } },
  scales: {
    x: { ...noGridBorder.x, ticks: { color: RAW_MUTED } },
    y: { ...noGridBorder.y, ticks: { color: RAW_MUTED } },
  },
}

createApp({
  setup() {
    const fixed = ref(null)
    const grid = ref(null)
    const broken = ref(null)
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
      ])
  },
}).mount('#app')
