<script setup>
// Live vocab_labels fills (captured 2026-07-19) — the data-driven render path.
const VOCAB = [
  { name: 'design-spec', color: '#ffb300' },
  { name: 'epic', color: '#e0803c' },
  { name: 'human-review-pending', color: '#5fb85f' },
  { name: 'memory', color: '#4bb5b0' },
  { name: 'severity=high', color: '#4f9dde' },
  { name: 'structural-anchor', color: '#c07ba0' },
  { name: 'security-finding', color: '#8f7ee0' },
  { name: 'verify:assumption', color: '#d1a72e' },
  { name: 'feature-request', color: '#c063c0' },
]
const AGENTS = [
  { name: 'aspirant_engineer', color: '#4bb5b0' },
  { name: 'system_3_manager', color: '#e0803c' },
  { name: 'design_agent', color: '#c063c0' },
]

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
    <Variant title="Data-driven: label chips (vocab_labels.color)">
      <div class="wrap">
        <AspBadge v-for="l in VOCAB" :key="l.name" variant="chip" :color="l.color">
          {{ l.name }}
        </AspBadge>
      </div>
      <p class="note">
        Fill comes from data; the ink is derived from the fill at render time (§3.18). Eight of
        these nine render their stored colour untouched. <code>feature-request</code>
        (<code>#c063c0</code>) is the one fill that clears neither candidate ink — 3.63:1 against
        white, 4.44:1 against near-black — so its lightness is nudged +0.6% to
        <code>#c165c1</code> (4.52:1). Hue and saturation are held, and the stored value is never
        written back.
      </p>
    </Variant>

    <Variant title="Data-driven: per-agent status dots">
      <div class="wrap">
        <AspBadge v-for="a in AGENTS" :key="a.name" variant="dot" :color="a.color">
          {{ a.name }}
        </AspBadge>
      </div>
      <p class="note">
        The dot takes the fill only — it carries no text of its own, so there is no ink to derive.
        Its label sits outside the circle on the ambient surface and inherits that.
      </p>
    </Variant>

    <Variant title="Data-driven: malformed colour falls back">
      <div class="wrap">
        <AspBadge variant="chip" color="not-a-colour">falls back to the semantic chip</AspBadge>
      </div>
      <p class="note">
        Bad data degrades rather than surprising — an unparseable hex resolves to
        <code>null</code> and the semantic token path renders instead.
      </p>
    </Variant>
  </Story>
</template>
