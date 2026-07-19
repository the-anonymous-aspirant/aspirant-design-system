// Renders AspBarChart and a plain AspChart side by side on the SAME data and
// the same width, then measures what each actually drew on the x axis.
//
// This fixture exists because the flag assertion it replaced could not see the
// defect it was supposed to guard: `autoSkip: false` passed the test and drew
// `0h1h2h3h4h…29h` as one unreadable smear. Density is a property of the
// rendered scale, so it is measured there.
//
// 30 hourly categories is not an arbitrary size — it is the Performance page's
// "last 30 hours" graph, the exact chart the operator was looking at in P8.
import { createApp, h, ref } from 'vue'
import Chart from 'chart.js/auto'

import '../../../build/tokens.css'
import AspBarChart from '../../../src/components/AspBarChart.vue'
import AspChart from '../../../src/components/AspChart.vue'

const labels = Array.from({ length: 30 }, (_, i) => `${i}h`)
const DATA = {
  labels,
  datasets: [{ label: 'p95 latency', data: labels.map((_, i) => 200 + ((i * 37) % 180)) }],
}

/**
 * Measure a rendered x scale: how many labels survived autoskip, and how many
 * adjacent pairs share pixels.
 *
 * Chart.js exposes the post-autoskip ticks on the scale, and the pixel position
 * per tick. Overlap is computed from measured text width in the scale's own
 * font — not guessed from a character count, which would mis-handle rotation
 * and proportional fonts.
 */
// Exposed so the spec can interrogate the live scale rather than infer from options.
window.__C = Chart

const measure = (canvas) => {
  const chart = Chart.getChart(canvas)
  if (!chart) return null
  const scale = chart.scales.x
  const ticks = scale.ticks || []

  const ctx = chart.ctx
  ctx.save()
  ctx.font = scale._labelSizes?.font || `${scale.options.ticks.font?.size || 12}px sans-serif`

  // Rotated labels are measured along their own axis; the horizontal footprint
  // shrinks by cos(rotation). Ignoring rotation would report false overlaps on
  // a chart that is perfectly legible.
  const rot = (scale.labelRotation || 0) * (Math.PI / 180)
  const cos = Math.cos(rot)

  let overlaps = 0
  const boxes = ticks.map((t, i) => {
    const px = scale.getPixelForTick(i)
    const w = ctx.measureText(String(t.label)).width * cos
    return [px - w / 2, px + w / 2]
  })
  ctx.restore()

  for (let i = 1; i < boxes.length; i += 1) {
    if (boxes[i][0] < boxes[i - 1][1]) overlaps += 1
  }

  return { count: ticks.length, overlaps, rotation: scale.labelRotation || 0 }
}

createApp({
  setup() {
    const presetEl = ref(null)
    const baselineEl = ref(null)

    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setTimeout(() => {
          const pick = (host) => host?.querySelector('canvas')
          window.__tickDensity = {
            preset: measure(pick(presetEl.value?.$el || presetEl.value)),
            baseline: measure(pick(baselineEl.value?.$el || baselineEl.value)),
          }
          window.__tickDensityReady = true
        }, 300)
      })
    )

    // Identical widths. A density comparison across different widths would
    // measure the layout, not the tick policy.
    //
    // 340px specifically: at a comfortable 760px BOTH charts fit all 30 labels
    // and the comparison is blind — the tick policy never binds, so any policy
    // passes. The defect this fixture exists for appeared in the storybook's
    // two-column P8 variant, where each chart gets ~340px and the labels have
    // to compete. A density test has to run at the width where density is
    // actually contested.
    const box = { width: '340px', padding: '16px', background: 'var(--surface-page)' }

    return () =>
      h('div', { class: 'probe-root' }, [
        h('div', { ref: presetEl, id: 'preset', style: box }, [
          h(AspBarChart, { data: DATA, unit: 'ms', range: 'last 30 hours', ariaLabel: 'preset' }),
        ]),
        h('div', { ref: baselineEl, id: 'baseline', style: box }, [
          h(AspChart, { type: 'bar', data: DATA, height: 320, ariaLabel: 'baseline' }),
        ]),
      ])
  },
}).mount('#app')

const st = document.createElement('style')
st.textContent = '.probe-root{display:flex;flex-direction:column;gap:24px;padding:16px}'
document.head.appendChild(st)
