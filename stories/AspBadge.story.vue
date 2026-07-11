<script setup>
import { ref } from 'vue'
import AspBadge from '../src/components/AspBadge.vue'

const filters = ref(['status:open', 'assignee:me', 'label:bug'])

const removeFilter = (name) => {
  filters.value = filters.value.filter((f) => f !== name)
}
</script>

<template>
  <Story title="Components/AspBadge">
    <template #docs>
      <p><strong>Purpose:</strong> the inline status/label family — semantic status badge, label / capability chip, removable filter-chip, and agent-status dot. Ports the system_3 <code>badge.html</code>, <code>.label-badge</code>, and <code>.status-dot</code> shapes.</p>
      <p><strong>When to use:</strong> compact inline status, tags/labels on a row or card, active filter pills, or a live agent-state indicator.</p>
      <p><strong>Accessibility:</strong> color is supplementary to the text label; <code>status</code>/<code>dot</code> emit a legend <code>title</code> so the color→meaning mapping is decodable on hover.</p>
    </template>

    <Variant title="Status">
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <AspBadge status="positive">Active</AspBadge>
        <AspBadge status="caution">In progress</AspBadge>
        <AspBadge status="negative">Failed</AspBadge>
        <AspBadge status="neutral">Archived</AspBadge>
      </div>
    </Variant>

    <Variant title="Label / capability chips">
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <AspBadge variant="chip">frontend</AspBadge>
        <AspBadge variant="chip">agent-proposed</AspBadge>
        <AspBadge variant="chip">verified-locally</AspBadge>
      </div>
    </Variant>

    <Variant title="Removable filter-chips">
      <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
        <AspBadge
          v-for="f in filters"
          :key="f"
          variant="filter"
          :aria-label="`Remove filter ${f}`"
          @remove="removeFilter(f)"
        >
          {{ f }}
        </AspBadge>
        <span v-if="!filters.length" style="color: var(--text-muted);">All filters cleared.</span>
      </div>
    </Variant>

    <Variant title="Agent-status dots">
      <div style="display: flex; gap: 16px; flex-wrap: wrap;">
        <AspBadge variant="dot" status="positive">Working</AspBadge>
        <AspBadge variant="dot" status="caution">Blocked</AspBadge>
        <AspBadge variant="dot" status="negative">Error</AspBadge>
        <AspBadge variant="dot" status="neutral">Idle</AspBadge>
        <AspBadge variant="dot" status="positive" aria-label="Agent online" />
      </div>
    </Variant>

    <Variant title="Sizes">
      <div style="display: flex; gap: 8px; align-items: center;">
        <AspBadge size="sm" status="positive">Small</AspBadge>
        <AspBadge size="md" status="positive">Medium (default)</AspBadge>
        <AspBadge variant="chip" size="sm">chip sm</AspBadge>
        <AspBadge variant="chip" size="md">chip md</AspBadge>
      </div>
    </Variant>

    <Variant title="Dark theme">
      <div data-theme="dark" style="padding: 24px; background: var(--surface-page); display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
        <AspBadge status="positive">Active</AspBadge>
        <AspBadge status="caution">In progress</AspBadge>
        <AspBadge status="negative">Failed</AspBadge>
        <AspBadge status="neutral">Archived</AspBadge>
        <AspBadge variant="chip">frontend</AspBadge>
        <AspBadge variant="filter" @remove="() => {}">label:bug</AspBadge>
        <AspBadge variant="dot" status="positive">Working</AspBadge>
      </div>
    </Variant>
  </Story>
</template>
