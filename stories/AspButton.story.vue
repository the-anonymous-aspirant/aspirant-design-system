<script setup>
import { ref } from 'vue'
import AspButton from '../src/components/AspButton.vue'
import AspCard from '../src/components/AspCard.vue'

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

    <Variant title="Variants">
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

    <Variant title="Icon-only (size=icon)">
      <p style="margin-bottom: 8px; color: var(--text-muted);">
        <code>size="icon"</code> is a fixed square ≥44px hit target for a lone glyph (rides the
        default slot; <code>iconLeft</code>/<code>iconRight</code> are inert). An accessible name is
        <strong>required</strong> — pass <code>aria-label</code> (omit it and the component dev-warns).
        Shown in each variant, light and dark.
      </p>
      <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
        <AspButton size="icon" variant="primary" aria-label="Zoom in"><span>+</span></AspButton>
        <AspButton size="icon" variant="secondary" aria-label="Row menu"><span>⋮</span></AspButton>
        <AspButton size="icon" variant="ghost" aria-label="Close"><span>✕</span></AspButton>
        <AspButton size="icon" variant="destructive" aria-label="Delete"><span>🗑</span></AspButton>
        <AspButton size="icon" variant="ghost" loading aria-label="Loading" />
      </div>
      <div
        data-theme="dark"
        style="margin-top: 16px; padding: 16px; background: var(--surface-page); display: flex; gap: 12px; align-items: center; flex-wrap: wrap;"
      >
        <AspButton size="icon" variant="primary" aria-label="Zoom in"><span>+</span></AspButton>
        <AspButton size="icon" variant="secondary" aria-label="Row menu"><span>⋮</span></AspButton>
        <AspButton size="icon" variant="ghost" aria-label="Close"><span>✕</span></AspButton>
        <AspButton size="icon" variant="destructive" aria-label="Delete"><span>🗑</span></AspButton>
      </div>
    </Variant>

    <Variant title="Link (unboxed inline)">
      <p style="margin-bottom: 8px; color: var(--text-muted);">
        <code>variant="link"</code> (§3.97) is an unboxed inline text-link that stays a real
        <code>&lt;button&gt;</code> — no box in any state, <code>font: inherit</code> so it sizes
        from the ambient run, and <code>color: inherit</code> so the ink <strong>follows the
          setter</strong> (§3.18), never a pinned brand. The underline is the affordance. Framed
        inline in a sentence on a light page and a dark card (both setters), beside a boxed variant.
      </p>
      <p style="max-width: 42ch; color: var(--text-muted);">
        Node actions: <AspButton variant="link">edit</AspButton> or
        <AspButton variant="link">delete</AspButton> — muted ink, inherited from this run.
      </p>
      <p style="max-width: 42ch; margin-top: 8px;">
        Estimate
        <AspButton variant="link" style="color: var(--brand-primary);">+ Lägg till fler</AspButton>
        — brand ink set at the call site, beside a boxed
        <AspButton variant="ghost">Ghost</AspButton>.
      </p>
      <div data-theme="dark" style="margin-top: 16px; padding: 16px; background: var(--surface-page);">
        <p style="max-width: 42ch; color: var(--text-muted);">
          Node actions: <AspButton variant="link">edit</AspButton> or
          <AspButton variant="link">delete</AspButton> — muted ink on the dark card.
        </p>
        <p style="max-width: 42ch; margin-top: 8px; color: var(--text-body);">
          Estimate
          <AspButton variant="link" style="color: var(--brand-primary);">+ Lägg till fler</AspButton>
          beside a boxed <AspButton variant="ghost">Ghost</AspButton>.
        </p>
      </div>
    </Variant>

    <Variant title="Destructive (label contrast)">
      <p style="margin-bottom: 8px; color: var(--text-muted);">
        The label is text on a filled surface, so the fill is <code>--feedback-error-solid</code>
        (white 5.62:1), never the <code>--feedback-error</code> mark fill (white 3.59:1, under the
        4.5:1 text floor; §3.108). Hover only darkens. Shown on a light page and inside an
        <code>AspCard</code>, in both themes, with a disabled specimen.
      </p>
      <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
        <AspButton variant="destructive">Kill</AspButton>
        <AspButton variant="destructive" disabled>Kill</AspButton>
        <AspCard style="display: flex; gap: 12px;">
          <AspButton variant="destructive">Kill</AspButton>
          <AspButton variant="secondary">Cancel</AspButton>
        </AspCard>
      </div>
      <div
        data-theme="dark"
        style="margin-top: 16px; padding: 16px; background: var(--surface-page); display: flex; gap: 12px; align-items: center; flex-wrap: wrap;"
      >
        <AspButton variant="destructive">Kill</AspButton>
        <AspButton variant="destructive" disabled>Kill</AspButton>
        <AspCard style="display: flex; gap: 12px;">
          <AspButton variant="destructive">Kill</AspButton>
          <AspButton variant="secondary">Cancel</AspButton>
        </AspCard>
      </div>
    </Variant>

    <Variant title="As a link (href / to)">
      <p style="margin-bottom: 8px; color: var(--text-muted);">
        A button that navigates is a link (§3.23, #9246). <code>href</code> renders an
        <code>&lt;a&gt;</code>, and <code>to</code> renders the app's <code>RouterLink</code>, or a
        plain <code>href</code> where there is no router, as here. Each pair below is the
        <code>&lt;button&gt;</code> rendering, then the link rendering, and they look the same.
        <code>target="_blank"</code> gets <code>rel="noopener noreferrer"</code>. A disabled link
        has no <code>href</code> and is <code>aria-disabled</code>.
      </p>
      <div style="display: grid; grid-template-columns: repeat(2, max-content); gap: 12px; align-items: center;">
        <AspButton variant="primary">Back to the home page</AspButton>
        <AspButton variant="primary" href="#as-a-link">Back to the home page</AspButton>
        <AspButton variant="secondary">Secondary</AspButton>
        <AspButton variant="secondary" href="#as-a-link">Secondary</AspButton>
        <AspButton variant="ghost">Ghost</AspButton>
        <AspButton variant="ghost" href="#as-a-link">Ghost</AspButton>
        <AspButton variant="primary" disabled>Disabled</AspButton>
        <AspButton variant="primary" href="#as-a-link" disabled>Disabled</AspButton>
      </div>
      <AspCard style="margin-top: 16px; display: flex; gap: 12px;">
        <AspButton variant="primary" href="https://example.com/" target="_blank">Buy me a coffee</AspButton>
        <AspButton variant="ghost" href="#as-a-link">On a card</AspButton>
      </AspCard>
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
