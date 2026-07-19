<script setup>
// AspProse — long-form body copy (docs/COMPONENTS.md §10).
//
// Styles its DESCENDANTS rather than exposing a component per element. The
// content it wraps is usually not hand-authored markup — it is a rendered
// artifact body, a task description, an agent message — so there is no
// authoring moment at which someone could reach for an <AspParagraph>. A
// wrapper that styles what it is given is the shape that actually fits.
//
// That means `:deep()`, which is a deliberate cost: scoped styles reaching into
// slotted content. The alternative is unstyled markdown output.

defineProps({
  size: {
    type: String,
    default: 'base',
    validator: (v) => ['sm', 'base', 'lg'].includes(v),
  },
  /** Cap the line length. Long measures hurt readability (~60-80 chars). */
  measure: { type: Boolean, default: true },
})
</script>

<template>
  <div class="prose" :class="[`prose--${size}`, { 'prose--measured': measure }]">
    <slot />
  </div>
</template>

<style scoped>
/*
 * Sets NO background and NO colour: prose inherits the ambient ink, so it is
 * legible on the light page and on a dark card without knowing which it is on.
 * See #2415 — an absolute ink here is the defect that shipped once already.
 */
.prose {
  font-family: var(--font-family-base);
  line-height: var(--font-line-height-relaxed);
}

.prose--sm {
  font-size: var(--text-sm);
}
.prose--base {
  font-size: var(--text-base);
}
.prose--lg {
  font-size: var(--text-lg);
}

/* `ch` tracks the font's own advance width, so the measure stays ~70 characters
   at every step of the scale rather than drifting with the font size. */
.prose--measured {
  max-width: 70ch;
}

/*
 * Vertical rhythm: a single margin direction (bottom), with the last child's
 * margin removed. Mixing top and bottom margins is what produces the
 * double-gap-here / no-gap-there drift this component exists to prevent.
 */
.prose :deep(> * + *) {
  margin-top: var(--space-md);
}

.prose :deep(> *) {
  margin-bottom: 0;
}

.prose :deep(p),
.prose :deep(ul),
.prose :deep(ol),
.prose :deep(blockquote),
.prose :deep(pre) {
  margin-top: 0;
  margin-bottom: 0;
}

.prose :deep(ul),
.prose :deep(ol) {
  padding-left: var(--space-lg);
}

.prose :deep(li + li) {
  margin-top: var(--space-2xs);
}

/* Headings inside prose get more space above than below, so they group with the
   text they introduce rather than floating between two blocks. */
.prose :deep(h1),
.prose :deep(h2),
.prose :deep(h3),
.prose :deep(h4),
.prose :deep(h5),
.prose :deep(h6) {
  margin-bottom: 0;
  line-height: var(--font-line-height-tight);
}

.prose :deep(* + h1),
.prose :deep(* + h2),
.prose :deep(* + h3),
.prose :deep(* + h4),
.prose :deep(* + h5),
.prose :deep(* + h6) {
  margin-top: var(--space-lg);
}

.prose :deep(code) {
  padding: 0.1em 0.3em;
  /* Tinted from the INK, not from --surface-card-inner. That token is
     rgba(255,255,255,0.06) -- a white wash, so it lightens every surface,
     including the light page, where it pushed the chip toward the ink and
     measured 3.8:1. Mixing currentColor instead follows the surface's polarity:
     a dark tint under dark ink, a light tint under light ink. */
  background: color-mix(in srgb, currentColor 10%, transparent);
  border-radius: var(--radius-sm);
  font-family: var(--font-family-mono);
  /* Mono faces run large next to the base face at the same nominal size. */
  font-size: 0.9em;
}

.prose :deep(pre) {
  overflow-x: auto;
  padding: var(--space-sm) var(--space-md);
  /* Same ink-derived tint as inline code, for the same reason. */
  background: color-mix(in srgb, currentColor 8%, transparent);
  border-radius: var(--radius-md);
}

/* A code block must not inherit the inline-code chip treatment on top of the
   block's own background — that double-tints it. */
.prose :deep(pre code) {
  padding: 0;
  background: none;
  border-radius: 0;
}

.prose :deep(blockquote) {
  padding-left: var(--space-md);
  border-left: 3px solid var(--brand-primary);
  /* Colour is not the only cue — the rule carries the meaning too, so the
     quote still reads as a quote without it (WCAG 1.4.1). */
  font-style: italic;
}

/*
 * Links are blue per corpus §1.3 (blue = links and hints only) — but NOT raw
 * --text-hint. That token is #82b1ff, tuned for dark surfaces; on the light
 * page it measures 1.71:1. This component is the token's first consumer as
 * ink, so shipping it verbatim would have introduced the defect rather than
 * inherited it.
 *
 * Same resolution as AspButton's ghost label (#2419) and AspBackButton's hover,
 * with the accent ramp instead of the amber one: mixing a dark accent step into
 * currentColor keeps the blue link identity while inheriting the surface's
 * polarity — it darkens on the light page and stays bright on a dark card.
 *
 * The underline is not decoration-by-colour: it carries the link on its own,
 * so the meaning survives regardless of what the mix resolves to (WCAG 1.4.1).
 */
.prose :deep(a) {
  color: color-mix(in srgb, var(--brand-accent-800) 30%, currentColor);
  text-decoration: underline;
}

.prose :deep(hr) {
  height: 1px;
  background: color-mix(in srgb, currentColor 20%, transparent);
  border: 0;
}

.prose :deep(strong) {
  font-weight: var(--font-weight-bold);
}
</style>
