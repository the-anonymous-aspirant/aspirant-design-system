<script setup>
import { ref } from 'vue'
import AspEmptyState from '../src/components/AspEmptyState.vue'
import AspButton from '../src/components/AspButton.vue'

const lastAction = ref('(none)')
</script>

<template>
  <Story title="Components/AspEmptyState">
    <template #docs>
      <p><strong>Purpose:</strong> centered placeholder for a view with no data to show. Ports the system_3 <code>empty_state.html</code> macro.</p>
      <p><strong>When to use:</strong> a list/table/grid that resolved to zero rows — either genuinely empty (<code>variant="empty"</code>) or emptied by active filters (<code>variant="filtered"</code>).</p>
      <p><strong>CTA:</strong> pass <code>actionLabel</code> for the convenience button (emits <code>action</code>), or use the <code>action</code> slot for full control.</p>
    </template>

    <Variant title="Empty (first-run)">
      <AspEmptyState
        heading="No documents yet"
        message="Create your first document to get started."
        action-label="Create Document"
        @action="lastAction = 'create'"
      />
      <p style="text-align: center; color: var(--text-muted);">Last action: {{ lastAction }}</p>
    </Variant>

    <Variant title="Filtered (no match)">
      <AspEmptyState
        variant="filtered"
        heading="No documents match these filters"
        message="Try clearing one or more filters to widen the search."
        action-label="Clear filters"
        @action="lastAction = 'clear-filters'"
      />
    </Variant>

    <Variant title="No CTA">
      <AspEmptyState
        heading="Nothing here"
        message="This view has no actions — it will populate automatically."
      />
    </Variant>

    <Variant title="Custom action slot + icon">
      <AspEmptyState heading="Inbox zero" message="You're all caught up.">
        <template #icon>
          <span style="font-size: 40px;">🎉</span>
        </template>
        <template #action>
          <AspButton variant="secondary" @click="lastAction = 'refresh'">Refresh</AspButton>
        </template>
      </AspEmptyState>
    </Variant>

    <Variant title="Dark theme">
      <div data-theme="dark" style="background: var(--surface-page); padding: 16px;">
        <AspEmptyState
          heading="No audits yet"
          message="Run an audit to populate this view."
          action-label="Run audit"
          @action="lastAction = 'run-audit'"
        />
      </div>
    </Variant>
  </Story>
</template>
