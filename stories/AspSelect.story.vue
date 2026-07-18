<script setup>
import { ref } from 'vue'
import AspSelect from '../src/components/AspSelect.vue'
import AspInput from '../src/components/AspInput.vue'

const OPTIONS = [
  { value: 'all', label: 'All agents' },
  { value: 'engineer', label: 'system_3_engineer' },
  { value: 'manager', label: 'system_3_manager' },
  { value: 'designer', label: 'design_agent' },
  { value: 'retired', label: 'retired_agent', disabled: true },
]

const basic = ref(null)
const selected = ref('engineer')
const disabled = ref('all')
const empty = ref(null)
const filterAgent = ref('all')
const filterSearch = ref('')
const long = ref(null)
const manyOptions = Array.from({ length: 24 }, (_, i) => ({
  value: `row-${i}`,
  label: `artifact-${String(i).padStart(3, '0')}.py`,
}))
</script>

<template>
  <Story title="Components/AspSelect">
    <template #docs>
      <p>
        <strong>Purpose:</strong> the dropdown-of-record
        (<code>system_3_design_conventions.md</code> §3.10) — every dropdown, in and out of filter
        rows. The trigger carries the same filter-control treatment as
        <code>AspInput</code> (34px, <code>--surface-elevated</code>, radius 8,
        <code>--border-subtle</code>) and reads <code>Label ▾</code>.
      </p>
      <p>
        <strong>When to use:</strong> a choice from a fixed, known set.
        <strong>When not to use:</strong> free text (<code>AspInput</code>), or a set large
        enough to need typeahead — that wants a combobox, which is not built.
      </p>
      <p>
        <strong>Surface note.</strong> The open panel sits on
        <code>--surface-card</code>, which is <em>dark even in the light theme</em>, so the panel
        sets its own ink (<code>--text-on-dark</code>) rather than inheriting the ambient one.
        Options inherit from the panel. This is the distinction behind #2415: a component that sets
        a background must set the ink with it; one that does not, inherits. The active-option
        highlight darkens (<code>--surface-card-inner</code>) instead of tinting amber, because
        amber at 51% over the dark panel drops the option text to 3.87:1.
      </p>
      <p>
        <strong>Keyboard:</strong> ↑/↓ move (skipping disabled), Enter/Space select, Esc closes
        without selecting, Tab closes and moves on. Click-outside closes.
      </p>
    </template>

    <Variant title="Default">
      <AspSelect v-model="basic" label="Agent" :options="OPTIONS" placeholder="All agents" />
    </Variant>

    <Variant title="Selected">
      <AspSelect v-model="selected" label="Agent" :options="OPTIONS" />
    </Variant>

    <Variant title="Disabled">
      <AspSelect v-model="disabled" label="Agent" :options="OPTIONS" disabled />
    </Variant>

    <Variant title="Empty">
      <AspSelect v-model="empty" label="Labels" :options="[]" placeholder="No labels" />
    </Variant>

    <Variant title="Scrolling panel (24 options)">
      <AspSelect v-model="long" label="Artifact" :options="manyOptions" placeholder="Pick one" />
    </Variant>

    <Variant title="Filter row (§3.10 parity with AspInput)">
      <div class="filter-row">
        <AspSelect v-model="filterAgent" :options="OPTIONS" placeholder="All agents" />
        <AspInput v-model="filterSearch" type="search" placeholder="search" />
      </div>
      <p class="note">
        Both controls are 34px on <code>--surface-elevated</code> — the filter canon is that they
        line up without per-page adjustment.
      </p>
    </Variant>

    <Variant title="Dark theme">
      <div data-theme="dark" class="dark-pane">
        <AspSelect v-model="selected" label="Agent" :options="OPTIONS" />
      </div>
    </Variant>

    <Variant title="Unstyled structure">
      <p class="note">
        Renders without <code>styles.css</code> as a labelled button plus a listbox — structurally
        correct, unstyled.
      </p>
      <AspSelect v-model="basic" label="Agent" :options="OPTIONS" />
    </Variant>
  </Story>
</template>

<style scoped>
.filter-row {
  display: flex;
  align-items: flex-end;
  gap: var(--space-sm);
}

.dark-pane {
  padding: var(--space-lg);
  background: var(--surface-page);
}

.note {
  margin-top: var(--space-sm);
  font-size: var(--text-sm);
  color: var(--text-muted);
}
</style>
