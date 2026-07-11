<script setup>
import { ref } from 'vue'
import AsButton from '../src/components/AsButton.vue'

const clickCount = ref(0)
const asyncLoading = ref(false)

const runAsync = async () => {
  asyncLoading.value = true
  await new Promise((r) => setTimeout(r, 1200))
  asyncLoading.value = false
}
</script>

<template>
  <Story title="Components/AsButton">
    <template #docs>
      <p><strong>Purpose:</strong> canonical button — replaces plain <code>&lt;button&gt;</code> across aspirant-client and the <code>&lt;v-btn&gt;</code> instances on MessageBoardView.</p>
      <p><strong>When to use:</strong> any action trigger.</p>
      <p><strong>When not to use:</strong> for navigation to a route — use <code>AsSidebarLink</code> or a plain <code>router-link</code>.</p>
    </template>

    <Variant title="Variants">
      <div style="display: flex; gap: 12px; flex-wrap: wrap;">
        <AsButton variant="primary">Primary</AsButton>
        <AsButton variant="secondary">Secondary</AsButton>
        <AsButton variant="ghost">Ghost</AsButton>
        <AsButton variant="destructive">Destructive</AsButton>
      </div>
    </Variant>

    <Variant title="Sizes">
      <div style="display: flex; gap: 12px; align-items: center;">
        <AsButton size="sm">Small</AsButton>
        <AsButton size="md">Medium (default)</AsButton>
        <AsButton size="lg">Large</AsButton>
      </div>
    </Variant>

    <Variant title="Loading (static)">
      <div style="display: flex; gap: 12px;">
        <AsButton loading>Saving…</AsButton>
        <AsButton variant="destructive" loading>Deleting…</AsButton>
      </div>
    </Variant>

    <Variant title="Loading (async click)">
      <AsButton :loading="asyncLoading" @click="runAsync">
        {{ asyncLoading ? 'Working…' : 'Run 1.2s task' }}
      </AsButton>
    </Variant>

    <Variant title="Disabled">
      <div style="display: flex; gap: 12px;">
        <AsButton disabled @click="clickCount++">Primary disabled</AsButton>
        <AsButton variant="secondary" disabled @click="clickCount++">Secondary disabled</AsButton>
      </div>
      <p style="margin-top: 8px; color: var(--text-muted);">
        Click count after disabled clicks: {{ clickCount }} (should stay 0).
      </p>
    </Variant>

    <Variant title="Icon slots">
      <div style="display: flex; gap: 12px; flex-wrap: wrap;">
        <AsButton>
          <template #iconLeft><span>←</span></template>
          Back
        </AsButton>
        <AsButton>
          Next
          <template #iconRight><span>→</span></template>
        </AsButton>
        <AsButton variant="ghost">
          <template #iconLeft><span>+</span></template>
          Add item
        </AsButton>
      </div>
    </Variant>

    <Variant title="Dark theme">
      <div data-theme="dark" style="padding: 24px; background: var(--surface-page); display: flex; gap: 12px; flex-wrap: wrap;">
        <AsButton variant="primary">Primary</AsButton>
        <AsButton variant="secondary">Secondary</AsButton>
        <AsButton variant="ghost">Ghost</AsButton>
        <AsButton variant="destructive">Destructive</AsButton>
      </div>
    </Variant>
  </Story>
</template>
