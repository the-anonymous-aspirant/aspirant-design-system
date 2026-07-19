<script setup>
import { computed } from 'vue'

// AspHeading — the heading primitive (docs/COMPONENTS.md §10).
//
// It exists to stop per-view type drift, so the visual size is bound to the
// token scale and cannot be passed a raw value. What it does NOT do is force
// visual size to follow heading level: `level` picks the semantic element and
// `size` picks the scale step, independently.
//
// That separation is the point rather than a convenience. Document outline and
// visual hierarchy genuinely disagree — a card's title is an <h2> in the page's
// outline while reading smaller than the page <h1> above it. Components that
// couple the two push authors into choosing a level for its font size, which is
// how heading outlines get broken (WCAG 1.3.1 / 2.4.6). Given the choice, an
// author picks the right level and adjusts `size`.

const LEVEL_SIZE = { 1: '3xl', 2: '2xl', 3: 'xl', 4: 'lg', 5: 'md', 6: 'base' }

const props = defineProps({
  level: {
    type: [Number, String],
    default: 2,
    validator: (v) => [1, 2, 3, 4, 5, 6, '1', '2', '3', '4', '5', '6'].includes(v),
  },
  /** Scale step. Defaults to the step conventionally paired with `level`. */
  size: {
    type: String,
    default: null,
    validator: (v) => ['xs', 'sm', 'base', 'md', 'lg', 'xl', '2xl', '3xl'].includes(v),
  },
  /**
   * `inherit` takes the ambient ink, which is correct on any surface.
   * `heading` is the signature amber — see the note in the style block, it is
   * for card surfaces only.
   */
  color: {
    type: String,
    default: 'inherit',
    validator: (v) => ['inherit', 'muted', 'heading'].includes(v),
  },
  align: {
    type: String,
    default: 'start',
    validator: (v) => ['start', 'center', 'end'].includes(v),
  },
  weight: {
    type: String,
    default: null,
    validator: (v) => ['regular', 'medium', 'bold'].includes(v),
  },
})

const tag = computed(() => `h${props.level}`)
const sizeStep = computed(() => props.size ?? LEVEL_SIZE[Number(props.level)])
// Levels 1-3 are display-weight by convention; 4-6 read as labels.
const weightName = computed(() => props.weight ?? (Number(props.level) <= 3 ? 'bold' : 'medium'))
</script>

<template>
  <component
    :is="tag"
    class="heading"
    :class="[
      `heading--size-${sizeStep}`,
      `heading--color-${color}`,
      `heading--align-${align}`,
      `heading--weight-${weightName}`,
    ]"
  >
    <slot />
  </component>
</template>

<style scoped>
.heading {
  margin: 0;
  font-family: var(--font-family-base);
  line-height: var(--font-line-height-tight);
  /* Margin is the consumer's business — a heading that ships its own bottom
     margin fights every layout it lands in. AspProse spaces its own children. */
}

.heading--size-xs {
  font-size: var(--text-xs);
}
.heading--size-sm {
  font-size: var(--text-sm);
}
.heading--size-base {
  font-size: var(--text-base);
}
.heading--size-md {
  font-size: var(--text-md);
}
.heading--size-lg {
  font-size: var(--text-lg);
}
.heading--size-xl {
  font-size: var(--text-xl);
}
.heading--size-2xl {
  font-size: var(--text-2xl);
}
.heading--size-3xl {
  font-size: var(--text-3xl);
}

.heading--weight-regular {
  font-weight: var(--font-weight-regular);
}
.heading--weight-medium {
  font-weight: var(--font-weight-medium);
}
.heading--weight-bold {
  font-weight: var(--font-weight-bold);
}

.heading--align-start {
  text-align: start;
}
.heading--align-center {
  text-align: center;
}
.heading--align-end {
  text-align: end;
}

/*
 * `inherit` is the default because a heading sets no background of its own, so
 * taking the ambient ink is the only choice correct on both polarities (#2415).
 *
 * There is deliberately NO `body` option binding --text-body. It was in the
 * first draft and the contrast matrix measured it at 1:1 on a dark card in the
 * light theme -- --text-body is an absolute dark ink, so naming it here just
 * re-creates the invisible-text defect one prop value at a time. `inherit`
 * already yields the body ink on any correctly-set surface, so the option was
 * redundant as well as unsafe. Removed rather than documented.
 */
.heading--color-inherit {
  color: inherit;
}
.heading--color-muted {
  color: var(--text-muted);
}

/*
 * SIGNATURE AMBER — CARD SURFACES ONLY.
 *
 * This is the one colour here that does not derive from its surface, and that
 * is deliberate: it is the aspirant card-heading signature (AspCard, AspModal),
 * and it measures 5.60:1 on --surface-card. It is NOT safe on the light page,
 * where it measures 1.41:1 — the #2419 defect.
 *
 * It is opt-in rather than the default, and it is not made surface-derived the
 * way AspButton's ghost label was: mixing it toward the ambient ink would mute
 * the signature on exactly the surface the signature is for. The right shape is
 * a narrow, named, documented option, so the contrast matrix measures it where
 * the design actually uses it.
 */
.heading--color-heading {
  color: var(--text-heading-card);
}
</style>
