<script setup>
import AspBarChart from '../src/components/AspBarChart.vue'
import AspCard from '../src/components/AspCard.vue'
import AspChart from '../src/components/AspChart.vue'
import { BASELINE_HEIGHT, HEIGHTS } from '../src/utils/bar_chart_options.js'

// Hourly latency, the shape the Performance page actually plots.
const hours = Array.from({ length: 30 }, (_, i) => `${(i - 29) * -1}h`).reverse()
const latency = [
  210, 190, 240, 260, 230, 205, 195, 220, 310, 280, 250, 235, 260, 300, 340,
  290, 270, 255, 245, 265, 285, 320, 360, 330, 300, 275, 260, 250, 240, 230,
]

const perfData = { labels: hours, datasets: [{ label: 'p95 latency', data: latency }] }

const cellData = {
  labels: hours.slice(-12),
  datasets: [{ label: 'errors', data: [0, 1, 0, 0, 2, 1, 0, 3, 1, 0, 0, 1] }],
}

const stateData = (data) => ({ labels: cellData.labels, datasets: [{ label: 'rate', data }] })
</script>

<template>
  <Story title="Components/AspBarChart" :layout="{ type: 'single', iframe: true }">
    <template #docs>
      <p><strong>Purpose:</strong> an opinionated <em>preset</em> over <code>AspChart(type: bar)</code> — not a second chart engine. Every bar graph on Performance and Health renders through this one component, so axes, tick density, bar geometry and hover behaviour cannot drift per page.</p>
      <p><strong>Axes are drawn, not implied.</strong> A 1px axis line runs along the baseline and the left edge; the plot grid is off. The y <em>unit</em> label sits at the axis and the x <em>range</em> label is centered under the baseline — both as real DOM text, replacing the muted <code>y: … / x: …</code> caption prose.</p>
      <p><strong>Operator feedback (P8)</strong> drove three of the defaults: charts are <em>shorter</em> ({{ HEIGHTS.regular }}px regular against AspChart's {{ BASELINE_HEIGHT }}px), the hover tooltip names <em>both</em> the x and the y value, and the x axis fits about 50% more labels than the default treatment — rotating them rather than dropping them, while Chart.js's collision avoidance still guarantees none overlap.</p>
      <p><strong>Contrast:</strong> tick text and axis lines are painted on a canvas, so they cannot inherit per surface. The component resolves the container's real background and <em>derives</em> an ink that clears AA against it — which is why it is legible on a dark <code>AspCard</code> in the light theme, the surface that breaks naive charts.</p>
      <p><strong>chart.js</strong> is an optional peer dependency — install it in the consuming app.</p>
    </template>

    <Variant title="Regular (Performance row)">
      <div style="padding: 16px; background: var(--surface-page);">
        <AspBarChart
          :data="perfData"
          unit="ms"
          range="last 30 hours"
          aria-label="p95 latency over the last 30 hours"
        />
      </div>
    </Variant>

    <Variant title="Compact (Health cell)">
      <div style="padding: 16px; background: var(--surface-page); max-width: 220px;">
        <AspBarChart
          variant="compact"
          :data="cellData"
          unit="err"
          range="last 12h"
          aria-label="Errors over the last 12 hours"
        />
      </div>
    </Variant>

    <Variant title="State variants (great / normal / unhealthy)">
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; padding: 16px; background: var(--surface-page);">
        <AspBarChart
          variant="compact"
          state="great"
          :data="stateData([1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0])"
          unit="%"
          range="great"
          aria-label="Great: error rate over the last 12 hours"
        />
        <AspBarChart
          variant="compact"
          state="normal"
          :data="stateData([2, 3, 2, 4, 3, 2, 3, 4, 2, 3, 3, 2])"
          unit="%"
          range="normal"
          aria-label="Normal: error rate over the last 12 hours"
        />
        <AspBarChart
          variant="compact"
          state="unhealthy"
          :data="stateData([7, 9, 8, 11, 9, 12, 10, 9, 13, 11, 10, 12])"
          unit="%"
          range="unhealthy"
          aria-label="Unhealthy: error rate over the last 12 hours"
        />
      </div>
    </Variant>

    <Variant title="Threshold rule (hover the dashed line)">
      <div style="padding: 16px; background: var(--surface-page);">
        <AspBarChart
          :data="perfData"
          unit="ms"
          range="last 30 hours"
          :threshold="300"
          threshold-label="SLO: 300 ms"
          aria-label="p95 latency against a 300ms threshold"
        />
      </div>
    </Variant>

    <!--
      The surface that breaks naive charts. AspCard is --surface-card, which is
      DARK even in the light theme, so a chart that hardcoded light-surface axis
      ink renders invisible chrome here while its own story page looks fine.
    -->
    <Variant title="On a dark AspCard (the polarity-inversion surface)">
      <div style="padding: 16px; background: var(--surface-page);">
        <AspCard>
          <AspBarChart
            :data="perfData"
            unit="ms"
            range="last 30 hours"
            aria-label="p95 latency on a card surface"
          />
        </AspCard>
      </div>
    </Variant>

    <Variant title="Light vs. dark">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <div data-theme="light" style="padding: 16px; background: var(--surface-page);">
          <p style="color: var(--text-muted); margin: 0 0 8px;">light</p>
          <AspBarChart :data="perfData" unit="ms" range="last 30 hours" aria-label="Latency, light theme" />
        </div>
        <div data-theme="dark" style="padding: 16px; background: var(--surface-page);">
          <p style="color: var(--text-muted); margin: 0 0 8px;">dark</p>
          <AspBarChart :data="perfData" unit="ms" range="last 30 hours" aria-label="Latency, dark theme" />
        </div>
      </div>
    </Variant>

    <!--
      The P8 comparison, side by side. This is the "demonstrably met against the
      live charts" acceptance criterion rendered rather than argued: same data,
      plain AspChart on the left at its 320px default, the preset on the right.
    -->
    <Variant title="P8: before (plain AspChart) vs. after (AspBarChart)">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 16px; background: var(--surface-page);">
        <div>
          <p style="color: var(--text-muted); margin: 0 0 8px;">
            before — AspChart(type: bar), {{ BASELINE_HEIGHT }}px, sparser x labels, value-only hover
          </p>
          <AspChart type="bar" :data="perfData" :height="BASELINE_HEIGHT" aria-label="Latency, plain chart" />
          <p style="color: var(--text-muted); margin: 8px 0 0; font-size: var(--text-xs);">y: ms — x: last 30 hours</p>
        </div>
        <div>
          <p style="color: var(--text-muted); margin: 0 0 8px;">
            after — AspBarChart, {{ HEIGHTS.regular }}px, ~50% more x labels, x+y hover, drawn axes
          </p>
          <AspBarChart :data="perfData" unit="ms" range="last 30 hours" aria-label="Latency, bar preset" />
        </div>
      </div>
    </Variant>
  </Story>
</template>
