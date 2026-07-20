<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import AspChart from './AspChart.vue'
import { AA, AA_NON_TEXT, deriveInk, parseColor, toRgbString } from '../utils/color_contrast.js'
import {
  BAR_THICKNESS,
  HEIGHTS,
  STATES,
  STATE_TOKENS,
  VARIANTS,
  buildBarOptions,
  thresholdPlugin,
} from '../utils/bar_chart_options.js'

// AspBarChart — an opinionated PRESET over AspChart(type: bar), not a second
// chart engine (system_3 #2380, spec #2227, conventions §3.10).
//
// Two things about this component are non-obvious and load-bearing:
//
// 1. THE AXIS LABELS ARE DOM, NOT CANVAS. The y unit label and the x range
//    label are rendered as real elements around the canvas rather than as
//    Chart.js scale titles. Three reasons, in increasing order of importance:
//    Chart.js cannot render a y-axis title unrotated (the spec asks for it
//    "stacked at the axis"); CSS positions them exactly where §3.10 wants them;
//    and — the real one — DOM text is reachable by the shipped contrast probe,
//    which walks text nodes and cannot see a pixel painted on a canvas. Every
//    label moved out of the canvas is a label the matrix can actually measure.
//
// 2. THE INK IS DERIVED, NOT PICKED. Tick text and axis lines are painted onto
//    the canvas, so they cannot inherit per surface the way a CSS custom
//    property would. The component resolves the container's real background and
//    derives an ink that clears AA against it (§3.18 derive-and-adjust; a
//    two-ink light/dark pick is explicitly ruled insufficient). This is why the
//    component reads computed style at mount rather than trusting a token.

const props = defineProps({
  /** Chart.js data object: `{ labels, datasets }`. */
  data: { type: Object, required: true },
  /** `regular` for Performance rows, `compact` for Health cells. */
  variant: {
    type: String,
    default: 'regular',
    validator: (v) => VARIANTS.includes(v),
  },
  /**
   * Health state. When set, bars take the state colour instead of brand amber;
   * `normal` is brand amber, so a stateless chart and a normal one match.
   */
  state: {
    type: String,
    default: null,
    validator: (v) => v == null || STATES.includes(v),
  },
  /**
   * X-axis domain (conventions §3.19).
   *
   * `category` (default) keeps today's treatment exactly — dense, rotation-fed
   * labels for strings with no natural abbreviation. `time` switches to the
   * §3.19 grammar: unrotated labels on wall-clock boundaries, at whatever
   * ladder interval the measured width affords.
   *
   * Opt-in rather than sniffed from the data. A chart whose labels merely LOOK
   * like times ("14h", "6d") is a categorical chart, and guessing wrong would
   * silently restyle a caller who never asked for it.
   */
  xAxis: {
    type: String,
    default: 'category',
    validator: (v) => ['category', 'time'].includes(v),
  },
  /**
   * One timestamp per bar (epoch ms, ISO string, or Date) — the domain `time`
   * mode reads. Required by `time` mode and ignored by `category`.
   *
   * Separate from `data.labels` on purpose: the labels are what the TOOLTIP
   * says ("14:00", "bucket 3"), and the axis needs the instant behind them.
   * Overloading one field would force the caller to choose between a readable
   * hover and a correct axis.
   */
  timestamps: { type: Array, default: null },
  /** Unit label stacked at the y axis, e.g. `ms`. */
  unit: { type: String, default: '' },
  /** Range label centered under the baseline, e.g. `last 30 hours`. */
  range: { type: String, default: '' },
  /** Horizontal threshold rule; labelled on hover. */
  threshold: { type: Number, default: null },
  /** Text for the threshold rule's hover label. Defaults to the value + unit. */
  thresholdLabel: { type: String, default: '' },
  /** Override the variant's height. Number (px) or any CSS length. */
  height: { type: [String, Number], default: null },
  /** Chart.js options, deep-merged OVER this preset. */
  options: { type: Object, default: () => ({}) },
  /** Accessible name for the chart. Strongly recommended. */
  ariaLabel: { type: String, default: '' },
})

const root = ref(null)
// Bumped whenever the resolved theme changes, to force a re-derive. The derived
// inks depend on the container's painted background, which AspChart's own
// token re-read does not cover.
const themeTick = ref(0)
let themeObserver = null

const chartHeight = computed(() => props.height ?? HEIGHTS[props.variant] ?? HEIGHTS.regular)

// --- surface resolution -----------------------------------------------------
// Walk to the first opaque ancestor background, exactly as the contrast probe
// does. AspCard is --surface-card, which is DARK even in the light theme, so
// "what theme is it" is the wrong question — "what did this actually land on"
// is the right one.
const resolvedBackground = () => {
  if (!root.value || typeof getComputedStyle === 'undefined') return [255, 255, 255, 1]
  const layers = []
  for (let n = root.value; n; n = n.parentElement) {
    const c = parseColor(getComputedStyle(n).backgroundColor)
    if (!c || c[3] === 0) continue
    layers.push(c)
    if (c[3] === 1) break
  }
  let base = layers.pop() || [255, 255, 255, 1]
  while (layers.length) {
    const top = layers.pop()
    const a = top[3]
    base = [
      top[0] * a + base[0] * (1 - a),
      top[1] * a + base[1] * (1 - a),
      top[2] * a + base[2] * (1 - a),
      1,
    ]
  }
  return base
}

const token = (name, fallback = '') => {
  if (!root.value || typeof getComputedStyle === 'undefined') return fallback
  return getComputedStyle(root.value).getPropertyValue(name).trim() || fallback
}

// --- derived paint ----------------------------------------------------------
const paint = computed(() => {
  // Touch the tick so a theme flip recomputes; the value itself is unused.
  void themeTick.value

  const bg = resolvedBackground()
  const fontFamily = token('--font-family-base', 'system-ui, sans-serif')

  // §3.10 names --border-subtle on light surfaces and --text-muted on dark
  // cards. Those are the INTENT; deriveInk is what makes the intent land. The
  // spec's own choice is the starting hue, not the final answer.
  const preferredLine = parseColor(token('--border-subtle', '#cccccc')) || [204, 204, 204, 1]
  const preferredInk = parseColor(token('--text-muted', '#6c757d')) || [108, 117, 125, 1]

  // Tick text is text: AA. An axis line is a graphical object: AA_NON_TEXT.
  // Holding a 1px rule to the text threshold would darken it into a border the
  // design does not want.
  const axisInk = toRgbString(deriveInk(preferredInk, bg, AA))
  const axisLine = toRgbString(deriveInk(preferredLine, bg, AA_NON_TEXT))

  // Bars are graphical objects, so they derive against the plot background at
  // the NON-TEXT threshold — the same derive-and-adjust rule as the chrome,
  // applied to the painted half of the MIXED role.
  //
  // This is load-bearing, not belt-and-braces. --brand-primary-alpha is amber
  // at ~51% alpha; composited onto the light page surface it measures 1.22:1,
  // which is a bar chart with no visible bars. §3.10 names it "amber-alpha on
  // dark cards" — the alpha treatment was specified FOR the card surface, and
  // taking it as an unconditional fill is what produces the invisible case.
  // The state fills fail too (success green is 2.10:1 on the light page), so
  // all four go through the same derivation rather than special-casing one.
  const barToken = props.state ? STATE_TOKENS[props.state] : '--brand-primary-alpha'
  const preferredFill = parseColor(token(barToken, '#ffb30082')) || [255, 179, 0, 0.51]
  const barFill = toRgbString(deriveInk(preferredFill, bg, AA_NON_TEXT))

  const tooltipBg = token('--surface-card', '#424242')
  const tooltipInkPreferred = parseColor(token('--text-on-dark', '#ffffff')) || [255, 255, 255, 1]
  const tooltipBgParsed = parseColor(tooltipBg) || [66, 66, 66, 1]
  // The tooltip is its own surface, so its ink derives against the tooltip
  // background — not against the page the chart sits on.
  const tooltipInk = toRgbString(deriveInk(tooltipInkPreferred, tooltipBgParsed, AA))

  return { bg, fontFamily, axisInk, axisLine, barFill, tooltipBg, tooltipInk }
})

const themedData = computed(() => ({
  ...props.data,
  datasets: (props.data.datasets || []).map((ds) => ({
    backgroundColor: paint.value.barFill,
    borderWidth: 0,
    ...ds,
  })),
}))

// Recursive merge — later wins; arrays replace rather than concatenate.
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v)
const mergeDeep = (target, source) => {
  const out = { ...target }
  for (const key of Object.keys(source || {})) {
    if (isObj(source[key]) && isObj(target[key])) out[key] = mergeDeep(target[key], source[key])
    else if (source[key] !== undefined) out[key] = source[key]
  }
  return out
}

const chartOptions = computed(() => {
  const p = paint.value
  const preset = buildBarOptions({
    variant: props.variant,
    axisInk: p.axisInk,
    axisLine: p.axisLine,
    tooltipBg: p.tooltipBg,
    tooltipInk: p.tooltipInk,
    fontFamily: p.fontFamily,
    unit: props.unit,
    xAxis: props.xAxis,
    timestamps: props.timestamps,
  })

  if (typeof props.threshold === 'number') {
    preset.plugins.aspThreshold = {
      value: props.threshold,
      color: p.axisLine,
      label: props.thresholdLabel || `threshold: ${props.threshold}${props.unit ? ` ${props.unit}` : ''}`,
      labelBg: p.tooltipBg,
      labelInk: p.tooltipInk,
      fontFamily: p.fontFamily,
    }
  }

  // Three ordered layers: AspChart's theme defaults (applied inside AspChart),
  // then this preset, then the consumer's `options`. Merging the consumer's
  // options in HERE — rather than passing them through separately — is what
  // keeps the consumer able to override any preset value. Getting this
  // backwards would make the preset a fork in all but name.
  return mergeDeep(preset, props.options)
})

// The plugin is passed per-instance rather than registered globally, so a host
// app that also uses plain AspChart is unaffected by this component's existence.
const chartPlugins = computed(() => (typeof props.threshold === 'number' ? [thresholdPlugin] : []))

onMounted(() => {
  themeTick.value += 1
  if (typeof MutationObserver === 'undefined') return
  themeObserver = new MutationObserver(() => {
    themeTick.value += 1
  })
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'class'],
  })
})

onBeforeUnmount(() => {
  if (themeObserver) themeObserver.disconnect()
})

// Exposed for the contrast spec: the derived values are the thing under test,
// and reading them here asserts what the component actually paints rather than
// what a test recomputes from tokens and hopes matches.
defineExpose({ paint, chartOptions, barThickness: BAR_THICKNESS })
</script>

<template>
  <div
    ref="root"
    class="asp-bar-chart"
    :class="[`asp-bar-chart--${variant}`, state && `asp-bar-chart--${state}`]"
  >
    <!--
      The unit label is stacked ABOVE the y axis rather than centered against
      it: at compact's 48px there is no vertical room to center a rotated or
      stacked label, and a label that only fits one variant is not a shared
      grammar.

      It sits in normal flow, not absolutely positioned over the plot. The
      absolute version overlapped the topmost y tick on every single chart —
      invisible to all 33 assertions, obvious in the first screenshot. Chart.js
      places that tick at the very top of the canvas, so there is no clear
      corner to overlay.
    -->
    <div
      v-if="unit"
      class="asp-bar-chart__unit"
      :style="{ color: paint.axisInk }"
      aria-hidden="true"
    >
      {{ unit }}
    </div>
    <div class="asp-bar-chart__plot">
      <AspChart
        type="bar"
        :data="themedData"
        :options="chartOptions"
        :plugins="chartPlugins"
        :height="chartHeight"
        :aria-label="ariaLabel"
      />
    </div>
    <!--
      Both axis labels take the DERIVED ink rather than `var(--text-muted)`.

      Two reasons, and the second is why this is a style binding rather than a
      stylesheet rule. First, they are axis chrome: they should be the same ink
      as the tick values they label, and the tick values are canvas paint that
      cannot read a CSS variable. Second, --text-muted is
      `color-mix(in srgb, currentColor 80%, transparent)` — it inherits INK, not
      surface, so on any container that does not itself establish a text colour
      it collapses toward the UA default and renders at 1.17:1. That is not
      hypothetical: it is what the screenshot of this component showed on the
      dark page surface, and it stayed green through 34 assertions that only
      ever measured derived colours.
    -->
    <div v-if="range" class="asp-bar-chart__range" :style="{ color: paint.axisInk }">
      {{ range }}
    </div>
  </div>
</template>

<style scoped>
.asp-bar-chart {
  width: 100%;
  font-family: var(--font-family-base);
}

.asp-bar-chart__plot {
  position: relative;
}

/*
 * In flow above the plot. It costs ~1 line of height, which the variant heights
 * already account for — the rendered-height assertion in bar-chart.spec.js
 * measures the WHOLE component against the 320px baseline, so this cannot
 * quietly reintroduce the height P8 objected to.
 */
.asp-bar-chart__unit {
  margin-bottom: var(--space-xs);
  font-size: var(--text-xs);
  line-height: var(--font-line-height-tight);
  /* Overridden inline with the derived ink; this is the no-JS fallback. */
  color: var(--text-muted);
}

/*
 * --text-xs is the smallest type token the system ships. The compact variant
 * does NOT step down further: inventing a --text-2xs to fit a 48px cell would
 * be a new type step introduced by one component, and the tokens-only rule
 * exists precisely to stop that.
 */
.asp-bar-chart__range {
  margin-top: var(--space-xs);
  text-align: center;
  font-size: var(--text-xs);
  /* Overridden inline with the derived ink; this is the no-JS fallback. */
  color: var(--text-muted);
}
</style>
