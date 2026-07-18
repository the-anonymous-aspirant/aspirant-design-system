<script setup>
import { ref } from 'vue'
import AspInput from '../src/components/AspInput.vue'

const text = ref('')
const filled = ref('scheduled-maintenance')
const search = ref('')
const rows = ['Deploy pipeline', 'Message board', 'Scheduled maintenance', 'Token pipeline']
const filtered = () => rows.filter((r) => r.toLowerCase().includes(search.value.toLowerCase()))
</script>

<template>
  <Story title="Components/AspInput">
    <template #docs>
      <p>
        <strong>Purpose:</strong> the text/search input primitive — every §3.10 filter row and the
        create-task / edit forms.
      </p>
      <p><strong>When to use:</strong> any single-line text, search, or number entry.</p>
      <p>
        <strong>When not to use:</strong> multi-line entry (a textarea primitive is not built yet),
        or a choice from a fixed set — use a select/radio instead.
      </p>
      <p>
        <strong>Focus indicator:</strong> <code>--shadow-focus</code> is #5a94ff, which measures
        2.80:1 against <code>--surface-elevated</code> — under the 3:1 WCAG 1.4.11 minimum. The
        control therefore pairs the ring with a <code>--text-on-light</code> border so the composite
        indicator has an AA-passing edge in both themes. Tab through the variants below to check it.
      </p>
    </template>

    <Variant title="Default">
      <AspInput v-model="text" label="Task title" placeholder="Describe the task" />
      <p style="margin-top: 8px; color: var(--text-muted)">Value: {{ text || '(empty)' }}</p>
    </Variant>

    <Variant title="Filled + hint">
      <AspInput v-model="filled" label="Branch name" hint="Lowercase, hyphen-separated." />
    </Variant>

    <Variant title="Required">
      <AspInput v-model="text" label="Assignee" required placeholder="actor id" />
    </Variant>

    <Variant title="Error">
      <AspInput
        model-value="not an id"
        label="Assignee"
        required
        error="Assignee must be a numeric actor id."
      />
    </Variant>

    <Variant title="Disabled">
      <div style="display: flex; flex-direction: column; gap: 12px">
        <AspInput model-value="" label="Empty + disabled" placeholder="Unavailable" disabled />
        <AspInput
          model-value="locked-value"
          label="Filled + disabled"
          hint="Set by the pipeline."
          disabled
        />
      </div>
    </Variant>

    <Variant title="Search (live filter)">
      <AspInput
        v-model="search"
        type="search"
        placeholder="Filter tasks"
        hint="Type to filter the list below."
      />
      <ul style="margin-top: 12px; color: var(--text-on-light)">
        <li v-for="row in filtered()" :key="row">{{ row }}</li>
        <li v-if="!filtered().length" style="color: var(--text-muted)">No matches.</li>
      </ul>
    </Variant>

    <Variant title="Number">
      <AspInput
        model-value="34"
        type="number"
        label="Control height (px)"
        hint="§3.10 filter canon."
      />
    </Variant>

    <Variant title="Filter row (34px canon)">
      <div style="display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap">
        <AspInput type="search" placeholder="Search" />
        <AspInput placeholder="Label" />
        <AspInput type="number" placeholder="Limit" />
      </div>
      <p style="margin-top: 8px; color: var(--text-muted)">
        All three controls sit at 34px so a filter row aligns without per-call overrides.
      </p>
    </Variant>

    <Variant title="Dark theme">
      <div
        data-theme="dark"
        style="
          padding: 24px;
          background: var(--surface-page);
          display: flex;
          flex-direction: column;
          gap: 16px;
        "
      >
        <AspInput model-value="" label="Task title" placeholder="Describe the task" />
        <AspInput
          model-value="scheduled-maintenance"
          label="Branch name"
          hint="Lowercase, hyphen-separated."
        />
        <AspInput
          model-value="not an id"
          label="Assignee"
          error="Assignee must be a numeric actor id."
        />
        <AspInput model-value="locked-value" label="Filled + disabled" disabled />
        <AspInput type="search" placeholder="Filter tasks" />
      </div>
    </Variant>

    <Variant title="Unstyled structure">
      <p style="color: var(--text-muted); margin-bottom: 12px">
        Label / control / message order is semantic, so the field stays usable if component styles
        fail to load.
      </p>
      <AspInput model-value="value" label="Label renders above" error="Message renders below." />
    </Variant>
  </Story>
</template>
