<script setup>
import AspBackButton from '../src/components/AspBackButton.vue'
import AspCard from '../src/components/AspCard.vue'
</script>

<template>
  <Story title="Components/AspBackButton">
    <template #docs>
      <p>
        <strong>Purpose:</strong> persistent back navigation on the Task / Artifact / Corpus-doc
        detail pages. Ported from <code>aspirant-client/src/components/BackButton.vue</code>, the
        reference <code>docs/COMPONENTS.md</code> §9 names.
      </p>
      <p>
        <strong>When to use:</strong> a detail page reached by drilling from a list.
        <strong>When not to use:</strong> a top-level page — there is nothing to go back to, and
        the corpus removed breadcrumbs everywhere (§3.8), so a back control on a root page reads
        as broken chrome.
      </p>
      <p>
        <strong>Router-agnostic.</strong> This package has no <code>vue-router</code> dependency.
        The router is detected at runtime off <code>globalProperties.$router</code> (same trick as
        <code>AspSidebarLink</code>); without one it uses the History API directly.
      </p>
      <p>
        <strong>"No history" is not <code>history.length &gt; 1</code>.</strong> The original
        tested that, but it counts forward entries and is <code>&gt; 1</code> on a fresh tab that
        merely navigated inside the app — so popping on it can walk the user out to the referring
        site. This reads <code>history.state.back</code>, which vue-router 4 maintains, and only
        falls back to the length heuristic when paired with a same-origin
        <code>document.referrer</code>. Failing that, it navigates to <code>to</code>.
      </p>
      <p>
        <strong>Hover colour deviates from the spec, deliberately.</strong> The spec asked for
        <code>--text-muted</code> → <code>--brand-primary</code>. Raw brand amber cannot be the
        ink here: the button sets no background, so it lands on whatever surface the page gives
        it, and <code>--brand-primary</code> measures 1.41:1 on the light page against 5.60:1 on a
        dark card. That is the #2419 defect the contrast suite's known-bad control reinstates on
        purpose. It uses the same <code>color-mix</code> resolution
        <code>AspButton</code>'s ghost variant already landed on, which keeps the amber identity
        while inheriting the surface's polarity.
      </p>
      <p>
        <strong>Placement is provisional.</strong> Fixed position follows the aspirant-client
        original (top-right, <code>--space-lg</code> inset). The spec cites corpus §3.12 as the
        detail-frame rule, but §3.12 introduces the three detail frames without specifying any
        back affordance, and is itself unmerged (system_3 PR #1147). Ratify before this is
        treated as settled.
      </p>
    </template>

    <Variant title="Default (inline)">
      <AspBackButton />
    </Variant>

    <Variant title="Inline on a dark card">
      <AspCard>
        <p>The button sets no background, so it inherits this card's ink rather than fighting it.</p>
        <AspBackButton />
      </AspCard>
    </Variant>

    <Variant title="Custom label + fallback route">
      <AspBackButton label="Back to tasks" to="/tasks" />
    </Variant>

    <Variant title="Icon only (label kept for screen readers)">
      <AspBackButton icon-only />
      <p class="note">
        The label is clipped, not removed — the button keeps its accessible name.
      </p>
    </Variant>

    <Variant title="Fixed position">
      <div class="page">
        <AspBackButton position="fixed" />
        <h3>Task #2375</h3>
        <p>
          The button pins to the viewport's top-right. In the Histoire sandbox that is the frame's
          corner, which is what a detail page would show.
        </p>
      </div>
    </Variant>

    <Variant title="Dark theme">
      <div data-theme="dark" class="dark-pane">
        <AspBackButton />
      </div>
    </Variant>
  </Story>
</template>

<style scoped>
.page {
  min-height: 12rem;
  padding: var(--space-lg);
  background: var(--surface-page);
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
