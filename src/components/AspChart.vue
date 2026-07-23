<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'

// chart.js is an OPTIONAL peer (package.json). Importing it at module scope
// would make it mandatory for every consumer of the barrel — a static
// `import Chart from 'chart.js/auto'` inside a package that declares the peer
// optional is exactly the edge that breaks a consumer who did not install it
// ("chart.js is not exported by __vite-optional-peer-dep:chart.js"; system_3
// #2636). So it is loaded at RUNTIME instead: a bundler resolves a dynamic
// `import()` of an absent optional peer to a stub that rejects at load time, so
// the consumer BUILDS without chart.js and only pays for it when a chart is
// actually rendered.
//
// The loader promise is cached at module scope so a page with many charts
// imports the library once.
let chartCtorPromise = null
const loadChartCtor = () => {
  if (!chartCtorPromise) {
    chartCtorPromise = import('chart.js/auto').then((m) => m.default)
  }
  return chartCtorPromise
}

const props = defineProps({
  /** Chart.js chart type. */
  type: {
    type: String,
    default: 'line',
    validator: (v) => ['line', 'bar', 'pie', 'doughnut', 'scatter'].includes(v),
  },
  /** Chart.js data object: `{ labels, datasets }`. */
  data: {
    type: Object,
    required: true,
  },
  /** Chart.js options, deep-merged OVER the design-system defaults. */
  options: {
    type: Object,
    default: () => ({}),
  },
  /**
   * Per-instance Chart.js plugins. Passed to the chart config rather than
   * registered globally, so one consumer's inline plugin cannot leak into every
   * other chart in the host app. Added for AspBarChart's threshold rule, which
   * needs ~15 lines of canvas drawing and should not cost consumers a second
   * charting dependency.
   */
  plugins: {
    type: Array,
    default: () => [],
  },
  /** Canvas wrapper height — number (px) or any CSS length. */
  height: {
    type: [String, Number],
    default: 320,
  },
  /**
   * Accessible name for the chart. Rendered as the canvas `aria-label`
   * (the canvas is `role="img"`). A chart with no text alternative is
   * invisible to assistive tech, so this is strongly recommended.
   */
  ariaLabel: {
    type: String,
    default: '',
  },
})

const canvas = ref(null)
let chart = null
let themeObserver = null
// Renders are async now (the chart engine loads on first draw). `renderSeq`
// lets a later render supersede an earlier one whose `await` is still pending,
// so a burst of prop changes cannot leave two chart instances on one canvas.
let renderSeq = 0
// Set when chart.js could not be loaded at runtime (an optional peer the
// consumer did not install). Swaps the canvas for a readable text fallback
// instead of throwing.
const loadFailed = ref(false)
// True once a chart has been drawn at least once. Exposed on the wrapper as
// `data-rendered` so a consumer (or the e2e suite) can wait for the async
// engine load + first paint before measuring the canvas, the way `data-ready`
// works on AspContent.
const drawn = ref(false)

const heightStyle = () =>
  typeof props.height === 'number' ? `${props.height}px` : props.height

// --- token access -----------------------------------------------------------
// Read design tokens off the live element so the values already reflect the
// nearest `[data-theme]` ancestor — no prop toggling needed for dark mode.
const cssVar = (name, fallback = '') => {
  if (!canvas.value) return fallback
  const v = getComputedStyle(canvas.value).getPropertyValue(name).trim()
  return v || fallback
}

const palette = () => {
  const out = []
  for (let i = 1; i <= 10; i += 1) {
    const c = cssVar(`--chart-series-${i}`)
    if (c) out.push(c)
  }
  // Guard against a missing token build so the chart still renders.
  return out.length ? out : ['#ffb300', '#0072b2', '#009e73', '#d55e00']
}

// Expand a hex color to an rgba() string at the given alpha (for area fills).
const withAlpha = (hex, alpha) => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim())
  if (!m) return hex
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h, 16))
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// --- option / data theming --------------------------------------------------
const isCircular = () => props.type === 'pie' || props.type === 'doughnut'

// Assign palette colors to any dataset that hasn't set its own, so consumers
// get on-brand, color-blind-safe series without wiring colors themselves.
const themedData = () => {
  const colors = palette()
  const cloned = {
    ...props.data,
    datasets: (props.data.datasets || []).map((ds, i) => {
      const next = { ...ds }
      if (isCircular()) {
        // Circular charts color by slice (data index), not by dataset.
        if (next.backgroundColor == null) {
          next.backgroundColor = (props.data.labels || next.data || []).map(
            (_, j) => colors[j % colors.length]
          )
        }
        if (next.borderColor == null) next.borderColor = cssVar('--surface-card')
        if (next.borderWidth == null) next.borderWidth = 2
      } else {
        const c = colors[i % colors.length]
        if (next.borderColor == null) next.borderColor = c
        if (next.backgroundColor == null) {
          next.backgroundColor = props.type === 'bar' ? c : withAlpha(c, 0.15)
        }
        if (props.type === 'line' || props.type === 'scatter') {
          if (next.pointBackgroundColor == null) next.pointBackgroundColor = c
          if (next.tension == null && props.type === 'line') next.tension = 0.3
        }
      }
      return next
    }),
  }
  return cloned
}

const themedDefaults = () => {
  const axis = cssVar('--text-muted', '#6c757d')
  const grid = cssVar('--border-subtle', '#cccccc')
  const font = cssVar('--font-family-base', 'system-ui, sans-serif')
  const cardBg = cssVar('--surface-card', '#424242')
  const cardText = cssVar('--text-on-dark', '#ffffff')
  const accent = cssVar('--border-card', '#ffb300')

  const base = {
    responsive: true,
    maintainAspectRatio: false,
    animation: prefersReducedMotion() ? false : undefined,
    font: { family: font },
    plugins: {
      legend: {
        labels: { color: axis, font: { family: font } },
      },
      tooltip: {
        backgroundColor: cardBg,
        titleColor: cardText,
        bodyColor: cardText,
        borderColor: accent,
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        titleFont: { family: font },
        bodyFont: { family: font },
      },
    },
  }

  // Cartesian charts get themed axes; circular charts have no scales.
  if (!isCircular()) {
    base.scales = {
      x: {
        ticks: { color: axis, font: { family: font } },
        grid: { color: grid },
        border: { color: grid },
      },
      y: {
        ticks: { color: axis, font: { family: font } },
        grid: { color: grid },
        border: { color: grid },
      },
    }
  }
  return base
}

// Recursive merge — user options win; arrays are replaced, not concatenated.
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v)
const mergeDeep = (target, source) => {
  const out = { ...target }
  for (const key of Object.keys(source || {})) {
    if (isObj(source[key]) && isObj(target[key])) {
      out[key] = mergeDeep(target[key], source[key])
    } else if (source[key] !== undefined) {
      out[key] = source[key]
    }
  }
  return out
}

// --- lifecycle --------------------------------------------------------------
const render = async () => {
  const seq = (renderSeq += 1)
  if (!canvas.value) return

  let ChartCtor
  try {
    ChartCtor = await loadChartCtor()
  } catch {
    // chart.js is an optional peer and is not installed. Degrade to the text
    // fallback rather than throw — the component is usable, it just cannot draw.
    loadFailed.value = true
    return
  }

  // The await above yields; bail if a newer render started or we unmounted.
  if (seq !== renderSeq || !canvas.value) return

  if (chart) {
    chart.destroy()
    chart = null
  }
  chart = new ChartCtor(canvas.value, {
    type: props.type,
    data: themedData(),
    options: mergeDeep(themedDefaults(), props.options),
    plugins: props.plugins,
  })
  drawn.value = true
}

onMounted(async () => {
  await nextTick()
  render()

  // Re-theme when the app flips `data-theme` on the root element. getComputedStyle
  // already reflects the new tokens, so a rebuild is all it takes.
  if (typeof MutationObserver !== 'undefined') {
    themeObserver = new MutationObserver(() => render())
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    })
  }
})

watch(
  () => [props.type, props.data, props.options, props.height, props.plugins],
  () => render(),
  { deep: true }
)

onBeforeUnmount(() => {
  if (themeObserver) themeObserver.disconnect()
  if (chart) chart.destroy()
})
</script>

<template>
  <div
    class="asp-chart"
    :style="{ height: heightStyle() }"
    :data-rendered="drawn || loadFailed ? 'true' : 'false'"
  >
    <!-- chart.js is an optional peer; when it is absent the canvas is replaced
         by a readable message that keeps the chart's accessible name. -->
    <p v-if="loadFailed" class="asp-chart__fallback" role="img" :aria-label="ariaLabel || undefined">
      {{ ariaLabel || 'Chart unavailable — the chart.js peer dependency is not installed.' }}
    </p>
    <canvas v-else ref="canvas" role="img" :aria-label="ariaLabel || undefined" />
  </div>
</template>

<style scoped>
.asp-chart {
  position: relative;
  width: 100%;
  font-family: var(--font-family-base);
}

/* Chart.js sizes the canvas to the parent; the wrapper owns the height. */
.asp-chart canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
}

/* Shown only when the optional chart.js peer is absent. Inherits ink from the
   surface (no colour of its own), so it reads on the light page and a dark card
   alike. */
.asp-chart__fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  margin: 0;
  padding: var(--space-md);
  font-size: var(--text-sm);
  text-align: center;
  opacity: 0.7;
}
</style>
