<script setup>
import { ref } from 'vue'
import AspButton from '../src/components/AspButton.vue'

const clickCount = ref(0)
const asyncLoading = ref(false)

const runAsync = async () => {
  asyncLoading.value = true
  await new Promise((r) => setTimeout(r, 1200))
  asyncLoading.value = false
}
</script>

<template>
  <Story title="Components/AspButton">
    <template #docs>
      <p><strong>Purpose:</strong> canonical button — replaces plain <code>&lt;button&gt;</code> across aspirant-client and the <code>&lt;v-btn&gt;</code> instances on MessageBoardView.</p>
      <p><strong>When to use:</strong> any action trigger.</p>
      <p><strong>When not to use:</strong> for navigation to a route — use <code>AspSidebarLink</code> or a plain <code>router-link</code>.</p>
    </template>

    <Variant title="Style variants">
      <div style="display: flex; gap: 12px; flex-wrap: wrap;">
        <AspButton variant="primary">Primary</AspButton>
        <AspButton variant="secondary">Secondary</AspButton>
        <AspButton variant="ghost">Ghost</AspButton>
        <AspButton variant="destructive">Destructive</AspButton>
      </div>
    </Variant>

    <Variant title="Sizes">
      <div style="display: flex; gap: 12px; align-items: center;">
        <AspButton size="sm">Small</AspButton>
        <AspButton size="md">Medium (default)</AspButton>
        <AspButton size="lg">Large</AspButton>
      </div>
    </Variant>

    <Variant title="Loading (static)">
      <div style="display: flex; gap: 12px;">
        <AspButton loading>Saving…</AspButton>
        <AspButton variant="destructive" loading>Deleting…</AspButton>
      </div>
    </Variant>

    <Variant title="Loading (async click)">
      <AspButton :loading="asyncLoading" @click="runAsync">
        {{ asyncLoading ? 'Working…' : 'Run 1.2s task' }}
      </AspButton>
    </Variant>

    <Variant title="Disabled">
      <div style="display: flex; gap: 12px;">
        <AspButton disabled @click="clickCount++">Primary disabled</AspButton>
        <AspButton variant="secondary" disabled @click="clickCount++">Secondary disabled</AspButton>
      </div>
      <p style="margin-top: 8px; color: var(--text-muted);">
        Click count after disabled clicks: {{ clickCount }} (should stay 0).
      </p>
    </Variant>

    <Variant title="Icon slots">
      <div style="display: flex; gap: 12px; flex-wrap: wrap;">
        <AspButton>
          <template #iconLeft><span>←</span></template>
          Back
        </AspButton>
        <AspButton>
          Next
          <template #iconRight><span>→</span></template>
        </AspButton>
        <AspButton variant="ghost">
          <template #iconLeft><span>+</span></template>
          Add item
        </AspButton>
      </div>
    </Variant>

    <Variant title="Dark theme">
      <div data-theme="dark" style="padding: 24px; background: var(--surface-page); display: flex; gap: 12px; flex-wrap: wrap;">
        <AspButton variant="primary">Primary</AspButton>
        <AspButton variant="secondary">Secondary</AspButton>
        <AspButton variant="ghost">Ghost</AspButton>
        <AspButton variant="destructive">Destructive</AspButton>
      </div>
    </Variant>
  </Story>
</template>
