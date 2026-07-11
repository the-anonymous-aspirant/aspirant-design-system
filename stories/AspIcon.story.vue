<script setup>
import AspIcon from '../src/components/AspIcon.vue'
import { iconRegistry } from '../src/icons/registry.js'

const registryKeys = Object.keys(iconRegistry)
</script>

<template>
  <Story title="Components/AspIcon">
    <template #docs>
      <p><strong>Purpose:</strong> render a hand-drawn SVG icon with an inline glyph fallback. Consumers pass an icon <code>name</code>; the component attempts to fetch <code>{VITE_ICON_BASE}/{name}.svg</code> and swaps in the SVG when available. Until then, the Unicode glyph from <code>src/icons/registry.js</code> shows through — so no consumer ever renders empty.</p>
      <p><strong>When to use:</strong> anywhere a small piece of iconography reads the story better than a text label alone (sidebar links, buttons with icon slots, status badges).</p>
      <p><strong>When not to use:</strong> for freehand illustration — use an <code>&lt;img&gt;</code> tag directly. AspIcon is sized on the small-symbol scale (16–24px).</p>
    </template>

    <Variant title="Registry-driven fallbacks">
      <p>Every key in <code>iconRegistry</code> renders with its default glyph. Once the aspirant-icon-pipeline serves SVGs, each of these upgrades silently.</p>
      <div style="display: flex; gap: 20px; flex-wrap: wrap; padding: 12px; background: var(--surface-page); color: var(--text-on-light);">
        <div
          v-for="key in registryKeys"
          :key="key"
          style="display: flex; flex-direction: column; align-items: center; gap: 6px; min-width: 60px;"
        >
          <AspIcon :name="key" size="md" />
          <small style="color: var(--text-muted);">{{ key }}</small>
        </div>
      </div>
    </Variant>

    <Variant title="Explicit fallback override">
      <p>Consumers can pass their own glyph when the icon key is not in the registry (or for one-off overrides).</p>
      <div style="display: flex; gap: 20px; align-items: center; padding: 12px; background: var(--surface-page); color: var(--text-on-light);">
        <AspIcon name="custom-arrow" fallback="→" size="md" label="Next" />
        <AspIcon name="custom-check" fallback="✓" size="md" label="Confirmed" />
        <AspIcon name="custom-mail" fallback="✉" size="md" label="Inbox" />
      </div>
    </Variant>

    <Variant title="Size scale">
      <div style="display: flex; gap: 20px; align-items: baseline; padding: 12px; background: var(--surface-page); color: var(--text-on-light);">
        <span><AspIcon name="home" size="sm" /> sm (16px)</span>
        <span><AspIcon name="home" size="md" /> md (20px)</span>
        <span><AspIcon name="home" size="lg" /> lg (24px)</span>
      </div>
    </Variant>

    <Variant title="Functional variant on dark card">
      <p><em>functional</em> icons inherit their parent colour via <code>currentColor</code>, so the amber sidebar heading tint carries through automatically.</p>
      <div style="padding: 16px; background: var(--surface-card); color: var(--brand-primary); border-radius: 8px;">
        <AspIcon name="home" size="md" />
        <AspIcon name="applications" size="md" />
        <AspIcon name="trusted" size="md" />
        <AspIcon name="admin" size="md" />
        <AspIcon name="support" size="md" />
      </div>
    </Variant>

    <Variant title="Dark theme">
      <div data-theme="dark" style="padding: 16px; background: var(--surface-page); color: var(--text-on-light); display: flex; gap: 20px;">
        <AspIcon name="home" size="md" />
        <AspIcon name="applications" size="md" />
        <AspIcon name="trusted" size="md" />
        <AspIcon name="admin" size="md" />
      </div>
    </Variant>

    <Variant title="Accessibility label">
      <p>Omitting <code>label</code> emits <code>aria-hidden="true"</code> so screen readers skip the icon. Providing <code>label</code> promotes it to a real <code>role="img"</code>.</p>
      <div style="display: flex; gap: 20px; padding: 12px; background: var(--surface-page); color: var(--text-on-light);">
        <span>Decorative (aria-hidden): <AspIcon name="active" /></span>
        <span>Semantic: <AspIcon name="active" label="Session active" /></span>
      </div>
    </Variant>
  </Story>
</template>
