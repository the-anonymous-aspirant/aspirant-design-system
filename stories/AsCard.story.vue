<script setup>
import AsCard from '../src/components/AsCard.vue'
</script>

<template>
  <Story
    title="Components/AsCard"
    :layout="{ type: 'grid', width: 320 }"
  >
    <template #docs>
      <p><strong>Purpose:</strong> Aspirant's signature dark-on-light content surface. Amber border + heading, subtle inner surface for nested content.</p>
      <p><strong>When to use:</strong> primary content grouping (an app tile on Home, an API status panel, a valuation section).</p>
      <p><strong>When not to use:</strong> for full-page layout containers or navigation surfaces — use <code>AsSidebar</code> or plain layout for those.</p>
    </template>

    <Variant title="Default">
      <AsCard>
        <template #header>Card heading</template>
        Body content sits between header and footer with the medium padding preset.
      </AsCard>
    </Variant>

    <Variant title="Elevated">
      <AsCard variant="elevated">
        <template #header>Elevated</template>
        Larger shadow — use for surfaces that should feel above the page (popover, drawer).
      </AsCard>
    </Variant>

    <Variant title="Ghost">
      <AsCard variant="ghost">
        <template #header>Ghost</template>
        Transparent surface with a dashed border. Use to show placeholder or optional grouping without competing with real content.
      </AsCard>
    </Variant>

    <Variant title="Interactive (button)">
      <AsCard interactive @click="() => alert('Card clicked')">
        <template #header>Interactive</template>
        Click me — the whole card is a button. Focus ring appears on keyboard tab.
      </AsCard>
    </Variant>

    <Variant title="Padding sm | md | lg">
      <div style="display: grid; gap: 12px;">
        <AsCard padding="sm"><template #header>sm</template>Compact padding.</AsCard>
        <AsCard padding="md"><template #header>md (default)</template>Standard padding.</AsCard>
        <AsCard padding="lg"><template #header>lg</template>Roomy padding for hero content.</AsCard>
      </div>
    </Variant>

    <Variant title="Header + body + footer">
      <AsCard>
        <template #header>Header slot</template>
        Body slot content.
        <template #footer>Footer slot — usually meta or actions</template>
      </AsCard>
    </Variant>

    <Variant title="Body only (no header/footer)">
      <AsCard>
        No header or footer — dividers collapse when the slots are unused.
      </AsCard>
    </Variant>

    <Variant title="Dark theme (data-theme='dark')">
      <div data-theme="dark" style="padding: 24px; background: var(--surface-page);">
        <AsCard>
          <template #header>Dark theme</template>
          The `[data-theme='dark']` block re-maps `--surface-*` and `--text-*` tokens, so the same component paints correctly on the dark ground.
        </AsCard>
      </div>
    </Variant>
  </Story>
</template>
