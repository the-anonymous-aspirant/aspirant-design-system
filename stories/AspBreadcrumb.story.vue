<script setup>
import AspBreadcrumb from '../src/components/AspBreadcrumb.vue'
import AspCard from '../src/components/AspCard.vue'

const path = (n) => [
  { label: 'Home', to: '#/home' },
  ...Array.from({ length: Math.max(n - 2, 0) }, (_, i) => ({
    label: `Level ${i + 1}`,
    to: `#/level-${i + 1}`,
  })),
  { label: 'Current' },
]

const shallow = path(2)
const mid = path(5)
const deep = path(12)

const lakePath = [
  { label: 'lake', to: '#/lake' },
  { label: 'bronze', to: '#/lake/bronze' },
  { label: 'ingest', to: '#/lake/bronze/ingest' },
  { label: '2026', to: '#/lake/bronze/ingest/2026' },
  { label: '07', to: '#/lake/bronze/ingest/2026/07' },
  { label: '22', to: '#/lake/bronze/ingest/2026/07/22' },
  { label: 'part-00000-c9f3ab21-snapshot.parquet' },
]

const longLabel = [
  { label: 'Home', to: '#/home' },
  { label: 'a directory name long enough that it cannot possibly fit on one line', to: '#/long' },
  { label: 'Current' },
]
</script>

<template>
  <Story title="Components/AspBreadcrumb">
    <template #docs>
      <p>
        <strong>Purpose:</strong> path navigation. Replaces system_3's
        <code>frontend/templates/_partials/breadcrumb.html</code>, which
        <code>docs/design/2026-07-20-partials-to-ds-mapping.md</code> identified as a Jinja partial
        with no DS component. Corpus §3.3 makes auto breadcrumbs a chrome invariant rather than a
        per-page choice, so a DS without one cannot satisfy its own chrome rule.
      </p>
      <p>
        <strong>Two consumers, one spec.</strong> #2367-A3 needs the shallow, route-derived
        system_3 case; #2536 needs a deep, user-driven browse over the data lake where the
        breadcrumb is the <em>primary</em> navigation affordance rather than secondary orientation.
        Depth is designed in from the start — retrofitting it is where these components break.
      </p>
      <p>
        <strong>Collapse is measured, not counted.</strong> A count threshold would collapse a
        five-item path of short labels that fits comfortably and leave a three-item path of long
        ones overflowing. The row is clipped rather than scrolled, so
        <code>scrollWidth &gt; clientWidth</code> reports "does not fit", and ancestors are hidden
        one at a time from index 1 outward until it does. The first item and the last two always
        survive: root and current are the orientation anchors, the parent is what makes "up one"
        reachable. That is a floor, not a fixed shape — a wide viewport keeps more.
      </p>
      <p>
        <strong>The overflow control is a real control.</strong> Keyboard-reachable,
        <code>aria-expanded</code>, panel dismissible on <kbd>Escape</kbd> with focus returned to
        the trigger. A static ellipsis renders identically and looks correct in every screenshot,
        and it would make a deep lake path unnavigable — failing #2536 outright.
      </p>
      <p>
        <strong>Ink deviates from the spec, deliberately.</strong> The spec asked for
        <code>--brand-accent</code> on ancestor links. That token is <code>#82b1ff</code> in both
        themes; on the light page (<code>#e4e4e4</code>) it measures ~1.7:1, under the 4.5:1 the
        same spec's acceptance criteria require. This reuses the
        <code>color-mix</code> derivation <code>AspProse</code>'s links already landed on — a dark
        accent step mixed into <code>currentColor</code>, which keeps the blue link identity while
        inheriting the surface's polarity. Reused rather than re-derived so the two link
        treatments cannot drift.
      </p>
      <p>
        <strong>The link/current distinction is not colour.</strong> Ancestors carry a persistent
        underline; the current item has none, is heavier, is not interactive, and carries
        <code>aria-current="page"</code>. The underline is on in the <em>resting</em> state on
        purpose — a distinction that only appears on hover is invisible to a reader who never
        hovers (WCAG 1.4.1, and the #2416 precedent).
      </p>
      <p>
        <strong>Contrast role (§3.18):</strong> INHERITS. The row paints no background and takes
        the ambient ink, so it lands legibly on the page and inside a dark
        <code>AspCard</code> alike. Two parts are exceptions and PAINT: the hover/focus wash and
        the overflow panel. Each declares its own ink, and both are in the contrast matrix — the
        panel <em>open</em>, since a closed specimen would be green by construction.
      </p>
    </template>

    <Variant title="Shallow (2 items)">
      <AspBreadcrumb :items="shallow" />
    </Variant>

    <Variant title="Typical (5 items)">
      <AspBreadcrumb :items="mid" />
    </Variant>

    <Variant title="Deep (12 items) — collapsed">
      <div class="narrow">
        <AspBreadcrumb :items="deep" />
      </div>
      <p class="note">
        Constrained to 360px so the collapse is visible. Open the <code>…</code> to reach the
        hidden ancestors — they are links, not a decoration. Widen the frame and the row
        progressively re-expands.
      </p>
    </Variant>

    <Variant title="Lake browse (#2536)">
      <div class="narrow">
        <AspBreadcrumb :items="lakePath" />
      </div>
      <p class="note">
        The browse case: the current item is a file rather than a page, and the path is the
        primary way back up. The final segment truncates rather than pushing the row sideways.
      </p>
    </Variant>

    <Variant title="One long label truncates">
      <AspBreadcrumb :items="longLabel" />
      <p class="note">
        A single long name must not cost the user the rest of their path, so it truncates and
        exposes its full text through <code>AspTooltip</code> instead of forcing everything else
        to collapse. Hover it.
      </p>
    </Variant>

    <Variant title="On a dark card">
      <AspCard>
        <p>The row sets no background, so it inherits this card's ink rather than fighting it.</p>
        <AspBreadcrumb :items="mid" />
      </AspCard>
    </Variant>

    <Variant title="Dark theme">
      <div data-theme="dark" class="dark-pane">
        <AspBreadcrumb :items="mid" />
        <div class="narrow">
          <AspBreadcrumb :items="deep" />
        </div>
        <AspCard>
          <AspBreadcrumb :items="mid" />
        </AspCard>
      </div>
    </Variant>
  </Story>
</template>

<style scoped>
.narrow {
  max-width: 360px;
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
