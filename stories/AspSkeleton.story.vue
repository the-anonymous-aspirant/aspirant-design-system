<script setup>
import AspCard from '../src/components/AspCard.vue'
import AspSkeleton from '../src/components/AspSkeleton.vue'

// The collision frame (§3.21). A skeleton stands for content that does not
// exist on the client; a provisional item is content that EXISTS and has not
// landed. §3.21 marks the latter with a dashed border plus a text suffix and
// leaves fill and ink byte-identical to the settled state — opacity is
// prohibited for it. The skeleton must not read as "a real item, dimmed", so
// it deliberately borrows neither channel: no dashed border, no text, full
// opacity. Rendered side by side so the distinction is visible, not asserted.
</script>

<template>
  <Story title="Components/AspSkeleton">
    <template #docs>
      <p>
        <strong>Purpose:</strong> a placeholder for content whose shape is known and whose value is
        not yet loaded — the loading state of a card, a paragraph, a table body. It stands for
        content that does <em>not exist on the client at all</em>, which is what separates it from
        §3.21's provisional state (an item that exists and has not landed).
      </p>
      <p>
        <strong>Contrast role: PAINTS.</strong> It draws its own bars, so it owns their shade and
        <em>derives</em> it from the surface it lands on rather than hardcoding a grey — a mix of
        <code>currentColor</code> into the ambient surface, so it darkens on a light page and
        lightens on a dark card without ever naming a colour. Bars are not text, so the 4.5:1
        threshold does not apply, but WCAG 1.4.11 (3:1 non-text) does and is measured on the page
        <em>and</em> on a dark card in both themes.
      </p>
      <p>
        <strong>Motion.</strong> A subtle background pulse, and the only animation on the element.
        It animates <code>background-color</code> between two derived fills rather than
        <code>opacity</code>: an opacity trough would drop the bar below 3:1 for part of every
        cycle, and opacity reads as disabled — the "real item, dimmed" misreading this component
        must avoid. <code>prefers-reduced-motion: reduce</code> removes it entirely, leaving a
        static, still-visible placeholder.
      </p>
      <p>
        <strong>No layout shift.</strong> The skeleton occupies the same footprint as the content it
        replaces — text lines are full line boxes of the inherited type scale — so swapping to real
        content of the same nominal size does not reflow the page.
      </p>
    </template>

    <Variant title="Text (default, 3 lines)">
      <AspSkeleton variant="text" />
      <p class="note">The last line is short (~60%) so the block reads as prose, not a table.</p>
    </Variant>

    <Variant title="Text — line count">
      <div class="stack">
        <AspSkeleton variant="text" :lines="1" />
        <AspSkeleton variant="text" :lines="5" />
      </div>
    </Variant>

    <Variant title="Block (card / chart / image region)">
      <AspSkeleton variant="block" height="10rem" />
      <p class="note">
        Radius matches <code>AspCard</code>; height is the footprint of the thing it stands in for.
      </p>
    </Variant>

    <Variant title="Row (loading table body)">
      <AspSkeleton variant="row" :rows="4" :columns="3" />
    </Variant>

    <Variant title="On a dark card (derives its own shade)">
      <AspCard>
        <AspSkeleton variant="text" :lines="3" />
        <AspSkeleton variant="block" height="6rem" />
      </AspCard>
      <p class="note">
        Same component, no prop change: the bars lighten because the card lightened the ambient ink.
        A skeleton hardcoded for the light page would be invisible here (#2415).
      </p>
    </Variant>

    <Variant title="Reduced motion">
      <AspSkeleton variant="text" :lines="3" />
      <p class="note">
        With <code>prefers-reduced-motion: reduce</code> set (an OS accessibility setting), the
        pulse is removed entirely and this same placeholder stays visible and static — no slowed
        pulse, which is still motion. Turn the setting on to see it here; the e2e suite asserts it
        under emulation. It is an acceptance criterion, not a nicety.
      </p>
    </Variant>

    <Variant title="Collision with §3.21 provisional state">
      <div class="collide">
        <div class="collide__col">
          <p class="note">Skeleton — no content yet</p>
          <AspSkeleton variant="text" :lines="2" />
        </div>
        <div class="collide__col">
          <p class="note">Provisional (§3.21) — exists, not landed</p>
          <div class="provisional">A real message · sending</div>
        </div>
      </div>
      <p class="note">
        The two must never be confusable on one page. The skeleton uses a modulated fill and no
        border; §3.21 uses a dashed border and a text suffix with fill and ink left untouched, and
        forbids itself opacity. The channels do not overlap by construction.
      </p>
    </Variant>

    <Variant title="Dark theme">
      <div data-theme="dark" class="dark-pane">
        <AspSkeleton variant="text" :lines="3" />
        <AspSkeleton variant="block" height="6rem" />
        <AspCard>
          <AspSkeleton variant="row" :rows="3" :columns="3" />
        </AspCard>
      </div>
    </Variant>
  </Story>
</template>

<style scoped>
.stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.collide {
  display: flex;
  gap: var(--space-xl);
  align-items: flex-start;
}

.collide__col {
  flex: 1;
}

/* A minimal stand-in for the §3.21 treatment, for the collision frame only.
   Dashed border + text suffix, fill and ink untouched — deliberately NOT the
   skeleton's mechanism. */
.provisional {
  padding: var(--space-xs) var(--space-sm);
  border: 1px dashed var(--border-card);
  border-radius: var(--radius-sm);
  color: inherit;
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
