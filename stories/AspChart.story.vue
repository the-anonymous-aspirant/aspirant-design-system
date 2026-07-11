<script setup>
import AspChart from '../src/components/AspChart.vue'

const months = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const lineData = {
  labels: months,
  datasets: [
    { label: 'Tasks done', data: [12, 19, 14, 22, 27, 9, 6] },
    { label: 'Messages', data: [30, 42, 38, 51, 60, 25, 18] },
  ],
}

const barData = {
  labels: ['health', 'agents', 'comms', 'tasks', 'corpus'],
  datasets: [
    { label: 'p95 latency (ms)', data: [220, 480, 130, 310, 90] },
  ],
}

const multiBarData = {
  labels: months,
  datasets: [
    { label: 'engineer', data: [4, 6, 5, 8, 7, 2, 1] },
    { label: 'aspirant', data: [2, 3, 4, 3, 5, 1, 0] },
    { label: 'manager', data: [1, 1, 2, 2, 1, 0, 0] },
  ],
}

const pieData = {
  labels: ['done', 'in_progress', 'open', 'blocked', 'cancelled'],
  datasets: [{ data: [42, 12, 25, 6, 4] }],
}

const scatterData = {
  datasets: [
    {
      label: 'complexity vs. hours',
      data: [
        { x: 1, y: 0.5 },
        { x: 2, y: 1.2 },
        { x: 3, y: 2.1 },
        { x: 5, y: 4.4 },
        { x: 8, y: 9.0 },
      ],
    },
  ],
}
</script>

<template>
  <Story title="Components/AspChart" :layout="{ type: 'single', iframe: true }">
    <template #docs>
      <p><strong>Purpose:</strong> a design-system-themed wrapper around Chart.js v4. Series colors come from the color-blind-safe <code>--chart-series-1..10</code> tokens, axes from <code>--text-muted</code>, grid from <code>--border-subtle</code>, and the tooltip wears the dark card look.</p>
      <p><strong>When to use:</strong> dashboards, trend/latency panels, distribution breakdowns — anywhere a live chart beats a table.</p>
      <p><strong>When not to use:</strong> a tiny inline trend inside a table row (that wants a lightweight SVG sparkline, not a full Chart.js canvas).</p>
      <p><strong>Dark mode:</strong> the chart reads tokens off the live element, so wrapping it in <code>[data-theme="dark"]</code> (or flipping it on the root) re-themes without any prop.</p>
      <p><strong>chart.js</strong> is an optional peer dependency — install it in the consuming app.</p>
    </template>

    <Variant title="Line (2 series)">
      <div style="padding: 16px; background: var(--surface-page);">
        <AspChart type="line" :data="lineData" :height="320" aria-label="Weekly tasks done and messages" />
      </div>
    </Variant>

    <Variant title="Bar (single series)">
      <div style="padding: 16px; background: var(--surface-page);">
        <AspChart type="bar" :data="barData" :height="320" aria-label="p95 latency by section" />
      </div>
    </Variant>

    <Variant title="Bar (grouped, 3 series)">
      <div style="padding: 16px; background: var(--surface-page);">
        <AspChart type="bar" :data="multiBarData" :height="320" aria-label="Daily activity by agent" />
      </div>
    </Variant>

    <Variant title="Pie">
      <div style="padding: 16px; background: var(--surface-page);">
        <AspChart type="pie" :data="pieData" :height="320" aria-label="Task status breakdown" />
      </div>
    </Variant>

    <Variant title="Doughnut">
      <div style="padding: 16px; background: var(--surface-page);">
        <AspChart type="doughnut" :data="pieData" :height="320" aria-label="Task status breakdown" />
      </div>
    </Variant>

    <Variant title="Scatter">
      <div style="padding: 16px; background: var(--surface-page);">
        <AspChart type="scatter" :data="scatterData" :height="320" aria-label="Complexity versus hours" />
      </div>
    </Variant>

    <Variant title="Custom options (deep-merged)">
      <div style="padding: 16px; background: var(--surface-page);">
        <AspChart
          type="line"
          :data="lineData"
          :height="320"
          :options="{ plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } }"
          aria-label="Line chart with legend moved to the bottom"
        />
      </div>
    </Variant>

    <Variant title="Light vs. dark comparison">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <div data-theme="light" style="padding: 16px; background: var(--surface-page);">
          <p style="color: var(--text-muted); margin: 0 0 8px;">light</p>
          <AspChart type="line" :data="lineData" :height="260" aria-label="Weekly trend, light theme" />
        </div>
        <div data-theme="dark" style="padding: 16px; background: var(--surface-page);">
          <p style="color: var(--text-muted); margin: 0 0 8px;">dark</p>
          <AspChart type="line" :data="lineData" :height="260" aria-label="Weekly trend, dark theme" />
        </div>
      </div>
    </Variant>
  </Story>
</template>
