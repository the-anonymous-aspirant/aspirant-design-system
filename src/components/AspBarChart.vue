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

  const barToken = props.state ? STATE_TOKENS[props.state] : '--brand-primary-alpha'
  const barFill = token(barToken, '#ffb30082')

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
    <div class="asp-bar-chart__plot">
      <!--
        The unit label is stacked at the TOP of the y axis rather than centered
        against it: at compact's 48px there is no vertical room to center a
        rotated or stacked label, and a label that only fits one variant is not
        a shared grammar.
      -->
      <span v-if="unit" class="asp-bar-chart__unit" aria-hidden="true">{{ unit }}</span>
      <AspChart
        type="bar"
        :data="themedData"
        :options="chartOptions"
        :plugins="chartPlugins"
        :height="chartHeight"
        :aria-label="ariaLabel"
      />
    </div>
    <div v-if="range" class="asp-bar-chart__range">{{ range }}</div>
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
 * Sits above the y axis in the gutter Chart.js leaves for tick labels. Absolute
 * rather than in flow so it costs no vertical space — P8 asked for shorter
 * charts, and a label that pushes the plot down spends the height the variant
 * just saved.
 */
.asp-bar-chart__unit {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  font-size: var(--text-xs);
  line-height: var(--font-line-height-tight);
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
  color: var(--text-muted);
}
</style>
