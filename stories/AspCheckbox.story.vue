<script setup>
import { ref } from 'vue'
import AspCheckbox from '../src/components/AspCheckbox.vue'

const plain = ref(false)
const checked = ref(true)
const mixed = ref(false)
const filters = ref({ prose: true, toolCalls: true, toolResults: false, cron: false, system: false })
</script>

<template>
  <Story title="Components/AspCheckbox">
    <template #docs>
      <p>
        <strong>Purpose:</strong> the checkbox primitive. The §3.10 conversation-filter sets keep
        their checkbox affordance inside the filter row and compose from this.
      </p>
      <p>
        <strong>When to use:</strong> an independent on/off choice, or a set of them.
        <strong>When not to use:</strong> one choice from several mutually exclusive options — that
        is a radio group, which is not built.
      </p>
      <p>
        <strong>Built on a real <code>&lt;input type="checkbox"&gt;</code>.</strong> The native
        control brings keyboard handling, the indeterminate state, form participation and label
        association for free, and each of those is something a
        <code>div role="checkbox"</code> gets subtly wrong. <code>appearance: none</code> lets it be
        styled directly, so there is no hidden input paired with a decorative box that can drift out
        of sync with it.
      </p>
      <p>
        <strong>Surface note.</strong> The box sets its own background, so it sets its own ink. The
        checkmark uses <code>--text-on-fixed-light</code> because the checked fill is
        <code>--brand-primary</code> — amber, and light in <em>every</em> theme; an ink that flipped
        with the theme would go light-on-light in dark mode (#2417). The label sits on the ambient
        surface and inherits.
      </p>
      <p>
        <strong>Indeterminate</strong> is a DOM property, not an attribute, and the browser clears
        it on user input. The component re-asserts it after a toggle, so a parent that still reports
        a mixed state does not silently lose it.
      </p>
    </template>

    <Variant title="Unchecked">
      <AspCheckbox v-model="plain" label="prose" />
    </Variant>

    <Variant title="Checked">
      <AspCheckbox v-model="checked" label="tool calls" />
    </Variant>

    <Variant title="Indeterminate">
      <AspCheckbox v-model="mixed" label="partially selected" indeterminate />
    </Variant>

    <Variant title="Disabled">
      <AspCheckbox :model-value="true" label="locked" disabled />
      <AspCheckbox :model-value="false" label="locked, unchecked" disabled />
    </Variant>

    <Variant title="Filter set (§3.10 conversation filters)">
      <div class="filter-set">
        <AspCheckbox v-model="filters.prose" label="prose" />
        <AspCheckbox v-model="filters.toolCalls" label="tool calls" />
        <AspCheckbox v-model="filters.toolResults" label="tool results" />
        <AspCheckbox v-model="filters.cron" label="cron" />
        <AspCheckbox v-model="filters.system" label="system" />
      </div>
    </Variant>

    <Variant title="Dark theme">
      <div data-theme="dark" class="dark-pane">
        <AspCheckbox v-model="checked" label="tool calls" />
        <AspCheckbox :model-value="false" label="partially selected" indeterminate />
      </div>
    </Variant>

    <Variant title="Unstyled structure">
      <p class="note">
        Without <code>styles.css</code> this is a native checkbox inside its label — structurally
        correct and still operable.
      </p>
      <AspCheckbox v-model="plain" label="prose" />
    </Variant>
  </Story>
</template>

<style scoped>
.filter-set {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-md);
}

.dark-pane {
  display: flex;
  gap: var(--space-md);
  padding: var(--space-lg);
  background: var(--surface-page);
}

.note {
  margin-bottom: var(--space-sm);
  font-size: var(--text-sm);
  color: var(--text-muted);
}
</style>
