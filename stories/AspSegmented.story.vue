<script setup>
import { ref } from 'vue'
import AspSegmented from '../src/components/AspSegmented.vue'

const filter = ref('active')
const view = ref('list')
const period = ref('week')

const filterOptions = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'done', label: 'Done' },
]
const viewOptions = [
  { value: 'list', label: 'List', controls: 'panel-list' },
  { value: 'grid', label: 'Grid', controls: 'panel-grid' },
]
const periodOptions = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month', disabled: true },
]
</script>

<template>
  <Story title="Components/AspSegmented">
    <template #docs>
      <p><strong>Purpose:</strong> single-select strip (tab / mode / filter toggle). Selection is a <em>declared</em> state, not a variant-flip of <code>AspButton</code> — unselected members stay calm, the selected one carries a subtle token-backed emphasis.</p>
      <p><strong>When to use:</strong> a small, fixed set of mutually-exclusive choices — a filter, a mode, a view switch.</p>
      <p><strong>as:</strong> <code>radiogroup</code> (default) for a filter/mode that switches no named panel; <code>tabs</code> when a real <code>tabpanel</code> is toggled (adds <code>aria-controls</code>).</p>
    </template>

    <Variant title="Filter (radiogroup)">
      <AspSegmented v-model="filter" :options="filterOptions" aria-label="Filter" />
      <p style="margin-top: 8px; color: var(--text-muted);">Selected: {{ filter }} — arrow keys move + select; one tab-stop for the group.</p>
    </Variant>

    <Variant title="Tabs (switches a panel)">
      <AspSegmented v-model="view" as="tabs" :options="viewOptions" aria-label="View" />
      <div :id="`panel-${view}`" role="tabpanel" style="margin-top: 8px; padding: 12px; border: 1px solid var(--border-subtle); border-radius: var(--radius-md);">
        The <strong>{{ view }}</strong> panel.
      </div>
    </Variant>

    <Variant title="Disabled member + small size">
      <AspSegmented v-model="period" :options="periodOptions" size="sm" aria-label="Period" />
      <p style="margin-top: 8px; color: var(--text-muted);">"Month" is disabled — keyboard nav skips it.</p>
    </Variant>

    <Variant title="On a dark card">
      <div style="background: var(--surface-card); color: var(--text-on-dark); padding: 16px; border-radius: var(--radius-lg);">
        <AspSegmented v-model="filter" :options="filterOptions" aria-label="Filter" />
      </div>
    </Variant>

    <Variant title="Dark theme">
      <div data-theme="dark" style="background: var(--surface-page); padding: 24px;">
        <AspSegmented v-model="filter" :options="filterOptions" aria-label="Filter" />
        <div style="background: var(--surface-card); color: var(--text-on-dark); padding: 16px; margin-top: 12px; border-radius: var(--radius-lg);">
          <AspSegmented v-model="view" as="tabs" :options="viewOptions" aria-label="View" />
        </div>
      </div>
    </Variant>
  </Story>
</template>
