<script setup>
import AspCard from '../src/components/AspCard.vue'
import AspPathTitle from '../src/components/AspPathTitle.vue'

const shallow = [{ label: 'synthetic', href: '#/synthetic' }, { label: 'documents' }]

const deep = [
  { label: 'synthetic', href: '#/synthetic' },
  { label: 'runs', href: '#/synthetic/runs' },
  { label: '2026-07', href: '#/synthetic/runs/2026-07' },
  { label: 'batch-14', href: '#/synthetic/runs/2026-07/batch-14' },
  { label: 'documents' },
]

const single = [{ label: 'synthetic' }]
</script>

<template>
  <Story title="Components/AspPathTitle">
    <template #docs>
      <p>
        <strong>Purpose:</strong> a browse surface's folder path, rendered <em>as</em> the page
        title. §3.8 removed breadcrumbs as page chrome — "the page title is the only header" — but a
        folder path is not chrome: it is the surface's own mutable state, the one element that says
        where you are, and no static title can carry it because it changes on every click. So the
        path occupies the title slot. One header, still the only header. <strong>Not</strong> a
        breadcrumb bar (§3.22).
      </p>
      <p>
        <strong>The last segment is always current</strong> — heading ink, never a link, regardless
        of whether an <code>href</code> was supplied. Currentness is positional, not a caller flag:
        a caller that gets a flag wrong ships a title that navigates to itself.
      </p>
      <p>
        <strong>Contrast role: INHERITOR (§3.18).</strong> It paints no background and takes the
        ambient ink, so it must be legible on the light page <em>and</em> on <code>AspCard</code>
        (dark in the light theme). Ancestors are blue links (§1.3), but derived from
        <code>--brand-accent-800</code> mixed into <code>currentColor</code> rather than raw
        <code>--text-hint</code> — the raw token measures ~1.7:1 on the light page (#2419). The
        link/current distinction is not colour alone: hover adds an underline (WCAG 1.4.1, #2416).
      </p>
      <p>
        <strong>Overflow.</strong> On a path too long for its container the middle collapses to a
        single ellipsis, keeping the first (root) and last (current) anchors and revealing tail
        segments while they fit. It never wraps to a second line or scrolls the header sideways, and
        the elided range is announced to assistive tech rather than silently dropped.
      </p>
    </template>

    <Variant title="Shallow path">
      <AspPathTitle :segments="shallow" />
    </Variant>

    <Variant title="Deep path">
      <AspPathTitle :segments="deep" />
      <p class="note">
        Ancestors are links; hover one to see the underline. The last is the current location.
      </p>
    </Variant>

    <Variant title="Single segment (no separator)">
      <AspPathTitle :segments="single" />
      <p class="note">A one-segment path is the current location with nothing before it.</p>
    </Variant>

    <Variant title="Overflow — middle collapses">
      <div class="narrow">
        <AspPathTitle :segments="deep" />
      </div>
      <p class="note">
        Constrained to 320px so the middle collapses to <code>…</code>. Root and current survive;
        the hidden segments are announced to a screen reader. Widen the frame and it re-expands.
      </p>
    </Variant>

    <Variant title="On a dark card">
      <AspCard>
        <AspPathTitle :segments="deep" />
      </AspCard>
      <p class="note">
        The path sets no background, so it inherits the card's ink rather than fighting it — the
        same component, legible on the opposite polarity without a prop change (#2415).
      </p>
    </Variant>

    <Variant title="Dark theme">
      <div data-theme="dark" class="dark-pane">
        <AspPathTitle :segments="deep" />
        <div class="narrow">
          <AspPathTitle :segments="deep" />
        </div>
        <AspCard>
          <AspPathTitle :segments="deep" />
        </AspCard>
      </div>
    </Variant>
  </Story>
</template>

<style scoped>
.narrow {
  max-width: 320px;
}

.dark-pane {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  padding: var(--space-lg);
  background: var(--surface-page);
}

.note {
  margin-top: var(--space-sm);
  font-size: var(--text-sm);
  color: var(--text-muted);
}
</style>
