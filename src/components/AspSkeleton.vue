<script setup>
import { computed } from 'vue'

// AspSkeleton — loading placeholder primitive (system_3 task #2575).
// Replaces system_3's `frontend/templates/_partials/skeleton.html`.
//
// A placeholder for content whose shape is KNOWN and whose value is NOT YET
// LOADED. That is not the same thing as §3.21's provisional state, and the
// distinction decides the whole design:
//
//   §3.21  — an item that EXISTS and has not yet landed (queued message,
//            optimistic write). Marked by a DASHED BORDER plus a text suffix,
//            with fill and ink byte-identical to the settled state. Opacity is
//            PROHIBITED for that meaning.
//   here   — content that does not exist on the client at all. It is not an
//            item, so it carries no border, no text, and no tag slot.
//
// The two must stay distinguishable on one page, which is why this component
// deliberately does NOT use a dashed border: that channel is spoken for. It is
// free to modulate its own fill precisely BECAUSE §3.21 forbade itself that
// mechanism — the two treatments cannot collide by construction rather than by
// eyeballing them side by side. The story's collision frame renders both.
//
// Therefore: a skeleton must never read as "a real item, dimmed."

const props = defineProps({
  /** `text` (lines of prose), `block` (a rectangle), `row` (table rows). */
  variant: {
    type: String,
    default: 'text',
    validator: (v) => ['text', 'block', 'row'].includes(v),
  },
  /** `text` only — how many lines to stand in for. */
  lines: { type: Number, default: 3 },
  /** `block` only — any CSS length; the footprint of the thing being replaced. */
  height: { type: String, default: '8rem' },
  /** `row` only — how many rows of the loading table body. */
  rows: { type: Number, default: 3 },
  /** `row` only — cells per row. Match the consuming AspDataTable's columns. */
  columns: { type: Number, default: 3 },
})

const count = (n) => Array.from({ length: Math.max(n, 0) }, (_, i) => i)

const lineKeys = computed(() => count(props.lines))
const rowKeys = computed(() => count(props.rows))
const columnKeys = computed(() => count(props.columns))

/**
 * The last line of a text block is short. Uniform-length lines read as a table
 * rather than as prose, which is the wrong shape for the content being stood
 * in for — and a one-line block has no "last" line to shorten.
 */
const isLastLine = (i) => props.lines > 1 && i === props.lines - 1
</script>

<template>
  <!--
    aria-busy on the CONTAINER; every bar below is aria-hidden. A screen reader
    must not announce placeholder shapes.

    There is deliberately no role="status" live region here. That belongs to the
    CONSUMER: a page showing six skeletons would otherwise announce "loading"
    six times, which is worse than announcing it once.
  -->
  <div class="skeleton" :class="`skeleton--${variant}`" aria-busy="true">
    <template v-if="variant === 'text'">
      <!--
        The line WRAPPER is a full line box (1lh) and the bar sits inside it,
        shorter and vertically centred. That is what makes the swap to real
        content free of reflow: N lines of skeleton occupy exactly N line boxes
        of the inherited type scale, so the footprint is identical before and
        after regardless of font size.
      -->
      <div v-for="i in lineKeys" :key="i" class="skeleton__line" aria-hidden="true">
        <span class="skeleton__bar" :class="{ 'skeleton__bar--short': isLastLine(i) }" />
      </div>
    </template>

    <div
      v-else-if="variant === 'block'"
      class="skeleton__bar skeleton__bar--block"
      :style="{ height }"
      aria-hidden="true"
    />

    <template v-else>
      <div v-for="r in rowKeys" :key="r" class="skeleton__row" aria-hidden="true">
        <span v-for="c in columnKeys" :key="c" class="skeleton__bar skeleton__bar--cell" />
      </div>
    </template>
  </div>
</template>

<style scoped>
/*
 * SURFACE-SETTER (§3.18). This component paints its own bars, so it owns its
 * shade — and it must DERIVE that shade from whatever it was dropped on rather
 * than hardcode a grey.
 *
 * The signature move in this system is a DARK card (--surface-card, #424242) on
 * a LIGHT page (#e4e4e4). A skeleton hardcoded for the light page is invisible
 * on the card and vice versa: that is exactly the AspInput failure from #2415,
 * reproduced in a new component.
 *
 * The derivation is a mix of currentColor into the ambient surface, the same
 * mechanism --text-muted already uses and the same one AspBreadcrumb's hover
 * wash uses. currentColor IS the ink the surface established, so the mix
 * darkens on a light page and lightens on a dark card without the component
 * ever knowing which it is on. Nothing here names a colour.
 *
 * Why 65% and not something subtler: the bars are not text and carry no ink, so
 * the 4.5:1 text threshold does not apply — but WCAG 1.4.11 non-text still
 * does, at 3:1 against the immediate surface. The binding case is the LIGHT
 * PAGE, because --text-body there is #424242, a mid-grey rather than black, so
 * a mix of it can only get so dark. 65% measures ~3.3:1 there and higher on
 * every other surface, which leaves headroom above the 3:1 floor instead of
 * sitting on it. skeleton.spec.js measures all four combinations rather than
 * trusting this arithmetic.
 *
 * Both are overridable, so a consumer on an unusual surface can retune without
 * forking the component.
 */
.skeleton {
  --asp-skeleton-fill: color-mix(in srgb, currentColor 65%, transparent);
  --asp-skeleton-fill-peak: color-mix(in srgb, currentColor 85%, transparent);

  display: flex;
  flex-direction: column;
  gap: var(--space-2xs);
  /* No width of its own: it fills whatever it was dropped into, which is what
     makes the footprint match the content it replaces. */
  width: 100%;
}

.skeleton--text {
  /* Lines are line boxes already; a gap on top of them would add leading the
     real text does not have, and reintroduce the reflow this variant exists to
     avoid. */
  gap: 0;
}

.skeleton__line {
  display: flex;
  align-items: center;
  /* One full line box of the INHERITED type scale. `1lh` resolves against this
     element's own line-height, so the skeleton tracks the surrounding text
     automatically instead of hardcoding a pixel height that drifts the moment
     the scale changes. */
  height: 1lh;
}

.skeleton__row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  height: 1lh;
}

.skeleton__bar {
  display: block;
  width: 100%;
  /* Shorter than its line box, so the bar reads as a mark ON a line rather than
     as a filled row. Em-relative, so it scales with the type. */
  height: 0.7em;
  background-color: var(--asp-skeleton-fill);
  /* Radius follows the element being stood in for: small for text. */
  border-radius: var(--radius-sm);
  /*
   * The pulse animates BACKGROUND-COLOUR between two derived fills, not
   * `opacity`.
   *
   * Two reasons, and the first is the binding one. Animating opacity composites
   * the bar toward its surface at the trough, so the contrast this component is
   * required to hold would DROP BELOW 3:1 for part of every cycle — a
   * conformance claim that is only true in the frames a test happens to sample.
   * Both endpoints here are ≥3:1 by construction, so the assertion holds at
   * every instant of the animation rather than on average.
   *
   * Second, opacity reads as disabled / de-emphasised (§3.21 reason 2), which
   * is the "real item, dimmed" misreading this component must not invite.
   *
   * It is the only animation on the element, and it moves no box.
   */
  animation: asp-skeleton-pulse 1.6s ease-in-out infinite;
}

.skeleton__bar--short {
  /* ~60%: the ragged last line is what makes a text block read as prose. */
  width: 60%;
}

.skeleton__bar--block {
  /* Radius matches AspCard's, because this variant stands in for a card, chart
     or image region. */
  height: 100%;
  border-radius: var(--radius-lg);
}

.skeleton__bar--cell {
  height: 0.7em;
  /* Equal share of the row, so a `row` skeleton lines up with the table body it
     replaces without the consumer passing column widths. */
  flex: 1;
}

@keyframes asp-skeleton-pulse {
  0%,
  100% {
    background-color: var(--asp-skeleton-fill);
  }
  50% {
    background-color: var(--asp-skeleton-fill-peak);
  }
}

/*
 * Non-negotiable, and an acceptance criterion rather than a nicety: reduced
 * motion removes the animation ENTIRELY and leaves a static, still-visible
 * placeholder. `animation: none` rather than a longer duration — a slowed pulse
 * is still motion.
 */
@media (prefers-reduced-motion: reduce) {
  .skeleton__bar {
    animation: none;
  }
}
</style>
