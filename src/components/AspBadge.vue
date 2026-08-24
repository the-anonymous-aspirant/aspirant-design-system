<script setup>
import { computed } from 'vue'

import { resolveDataFill } from '../utils/data_fill.js'

// AspBadge — the inline status/label family: semantic status badge, label /
// capability chip, removable filter-chip, and agent-status dot. One component,
// four variants; the semantic color system is shared. Color is always
// supplementary to a visible text label (WCAG AA), and status/dot carry a
// legend `title` so the color→meaning mapping is decodable on hover.
//
// Ports the system_3 frontend shapes: _partials/badge.html (status <mark>),
// .label-badge, and .status-dot — see system_3_ux_conventions.md §4.

// Default legend text (color → meaning) mirroring system_3 badge.html §4, so a
// status badge/dot is decodable without a colour-vision assumption.
const STATUS_LEGEND = {
  positive: 'Positive (pass / active / done)',
  caution: 'Caution (warn / draft / in progress)',
  negative: 'Negative (fail / deprecated / cancelled)',
  neutral: 'Neutral (archived / blocked / unknown)',
}

const props = defineProps({
  variant: {
    type: String,
    default: 'status',
    validator: (v) => ['status', 'chip', 'filter', 'dot'].includes(v),
  },
  status: {
    type: String,
    default: 'neutral',
    validator: (v) => ['positive', 'caution', 'negative', 'neutral'].includes(v),
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md'].includes(v),
  },
  // Optional override for the status/dot legend tooltip; falls back to the
  // semantic-group legend above when omitted.
  tip: { type: String, default: null },
  // Accessible label for the dot variant when it carries no visible text.
  ariaLabel: { type: String, default: null },
  /**
   * Data-driven fill (hex) for `chip` and `dot` — a `vocab_labels.color` or a
   * per-agent assigned colour. When set it overrides the semantic `status`
   * token; when omitted the semantic path is untouched.
   *
   * The ink is derived from the fill at render time per corpus §3.18, and the
   * fill itself may be nudged in lightness when neither candidate ink clears
   * 4.5:1 against it. Nothing is written back — see src/utils/data_fill.js.
   */
  color: { type: String, default: null },
  /**
   * Opt-in `×` on the `chip` variant, for a removable LABEL chip (system_3
   * #3677) — the edit surfaces need this without misusing `filter` (whose `×`
   * is semantically "remove this filter", not "remove this label"). Additive
   * only: `chip` without it renders exactly as before this prop existed.
   * Ignored on every other variant — `filter` already always shows its `×`,
   * and `status`/`dot` carry no remove affordance at all.
   */
  removable: { type: Boolean, default: false },
  /**
   * Compositing surface the badge is mounted on, for the surface-resolved
   * status/dot mark fills (#4209 §3.82). `page` (default) follows the theme;
   * `card` is dark in BOTH themes, so its marks always take the on-dark set and
   * the status pill takes an opaque on-card fill. Declared at the mount site
   * rather than auto-detected: a badge is a many-per-page primitive, so a
   * per-mount surface probe is exactly the "on every mount" cost §3.50 warns
   * against — and a card being dark in both themes lets the resolution stay
   * pure CSS. Additive: `page` renders byte-for-byte as before this prop.
   */
  surface: {
    type: String,
    default: 'page',
    validator: (v) => ['page', 'card'].includes(v),
  },
})

const emit = defineEmits(['remove'])

const isDot = computed(() => props.variant === 'dot')

// A malformed hex resolves to null and falls back to the semantic path rather
// than rendering an arbitrary colour — bad data should degrade, not surprise.
const dataFill = computed(() =>
  props.color && (props.variant === 'chip' || props.variant === 'dot')
    ? resolveDataFill(props.color)
    : null
)

/**
 * The chip paints fill + derived ink; the dot paints the fill only (it carries
 * no text of its own, so there is no ink to derive for it — its label sits
 * outside the circle on the ambient surface).
 */
const dataStyle = computed(() => {
  if (!dataFill.value) return null
  return isDot.value
    ? { backgroundColor: dataFill.value.fill }
    : { backgroundColor: dataFill.value.fill, color: dataFill.value.ink }
})
const isFilter = computed(() => props.variant === 'filter')
// The × shows on `filter` unconditionally (its existing contract) and on
// `chip` only when the caller opts in via `removable`.
const showRemove = computed(
  () => isFilter.value || (props.variant === 'chip' && props.removable)
)
const usesStatusColor = computed(
  () => (props.variant === 'status' || isDot.value) && !dataFill.value
)

const legend = computed(() =>
  props.tip ?? (usesStatusColor.value ? STATUS_LEGEND[props.status] : null),
)

const classes = computed(() => ({
  badge: true,
  [`badge--${props.variant}`]: true,
  [`badge--size-${props.size}`]: true,
  [`badge--status-${props.status}`]: usesStatusColor.value,
  'badge--data-color': Boolean(dataFill.value),
  // Only ever added when it changes rendering (chip + removable) — a chip
  // that omits `removable` gets no new class, so its DOM stays byte-for-byte
  // what it was before this prop existed.
  'badge--removable': props.variant === 'chip' && props.removable,
  // Only ever added for the non-default surface — a `page` badge gets no new
  // class, so its DOM stays byte-for-byte what it was before this prop existed.
  'badge--surface-card': props.surface === 'card',
}))

const onRemove = (event) => {
  event.stopPropagation()
  emit('remove', event)
}
</script>

<template>
  <!-- Dot: a small semantic-colored circle, optional trailing label slot. -->
  <span
    v-if="isDot"
    :class="classes"
    :title="legend || undefined"
  >
    <span
      class="badge__dot"
      :style="dataStyle"
      :aria-label="ariaLabel || legend || undefined"
      role="img"
    />
    <span v-if="$slots.default" class="badge__dot-label"><slot /></span>
  </span>

  <!-- Status / chip / filter share the pill shell. -->
  <span
    v-else
    :class="classes"
    :style="dataStyle"
    :title="legend || undefined"
  >
    <span class="badge__label"><slot /></span>
    <button
      v-if="showRemove"
      type="button"
      class="badge__remove"
      :aria-label="ariaLabel || 'Remove'"
      @click="onRemove"
    >
      <svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true">
        <path
          d="M4 4l8 8M12 4l-8 8"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
    </button>
  </span>
</template>

<style scoped>
/*
 * A data-coloured chip paints its fill and ink INLINE, because the value comes
 * from data and cannot be a class. The only thing this rule does is stop the
 * token-driven border from fighting a fill it knows nothing about — the fill
 * and its derived ink already carry the shape.
 */
.badge--data-color {
  border-color: transparent;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2xs);
  font-family: var(--font-family-base);
  font-weight: var(--font-weight-medium);
  line-height: 1;
  white-space: nowrap;
  border-radius: var(--radius-pill);
  vertical-align: middle;
}

/* Size */
.badge--size-sm {
  padding: 0.1rem 0.4rem;
  font-size: var(--text-xs);
}
.badge--size-md {
  padding: 0.15rem 0.55rem;
  font-size: var(--text-sm);
}

/* --- Status badge: tinted background + accessible text color (#1970) --- */
.badge--status .badge__label { display: inline-block; }

/* The -bg tokens are deliberately alpha tints ("Alpha keeps it mode-agnostic",
   tokens/base.json, Task-#1970 audit), so they composite over whatever is
   beneath them. On a default AspCard that is a DARK surface, which turned the
   dark ink of the paired -text token into 1.1:1. Layering the tint over an
   explicit --surface-elevated keeps the intended tinted look and the
   mode-agnostic alpha, while making the badge self-contained on any surface:
   --surface-elevated and the -text tokens both flip with the theme, so the
   pairing holds in both. Task-#2417. */
.badge--status.badge--status-positive {
  background:
    linear-gradient(var(--feedback-success-bg), var(--feedback-success-bg)),
    var(--surface-elevated);
  color: var(--feedback-success-text);
}
.badge--status.badge--status-caution {
  background:
    linear-gradient(var(--feedback-warning-bg), var(--feedback-warning-bg)),
    var(--surface-elevated);
  color: var(--feedback-warning-text);
}
.badge--status.badge--status-negative {
  background:
    linear-gradient(var(--feedback-error-bg), var(--feedback-error-bg)),
    var(--surface-elevated);
  color: var(--feedback-error-text);
}
.badge--status.badge--status-neutral {
  background:
    linear-gradient(var(--feedback-neutral-bg), var(--feedback-neutral-bg)),
    var(--surface-elevated);
  color: var(--feedback-neutral-text);
}

/*
 * Status pill on a card (#4209 §3.82). The default tinted pill is self-contained
 * for its own text (#2417, ≥4.63:1 ink-vs-fill in both themes) but its EDGE
 * against a dark card drops to 1.30:1 in the dark theme — present but invisible.
 * Rather than flood the pill with a bright opaque fill (loud beside the calmer
 * page pills, §1.2 restraint budget), keep the subtle fill and carry the edge
 * with a ≥3:1 status-coloured ring: the on-dark mark colour measures ≥3.98:1 vs
 * the light-theme card (#424242) and ≥5.69:1 vs the dark-theme card (#2a2a2a).
 * box-shadow (not border) so there is no layout shift and it follows the pill
 * radius. The page/default pill is untouched.
 */
.badge--surface-card.badge--status {
  box-shadow: 0 0 0 1px var(--_ring);
}
.badge--surface-card.badge--status-positive { --_ring: var(--feedback-success-on-dark); }
.badge--surface-card.badge--status-caution { --_ring: var(--feedback-warning-on-dark); }
.badge--surface-card.badge--status-negative { --_ring: var(--feedback-error-on-dark); }
.badge--surface-card.badge--status-neutral { --_ring: var(--feedback-neutral-on-dark); }

/* --- Label / capability chip + removable filter-chip: neutral surface --- */
.badge--chip,
.badge--filter {
  background: var(--surface-elevated);
  color: var(--text-body);
  border: 1px solid var(--border-subtle);
}

.badge--filter,
.badge--chip.badge--removable {
  padding-right: 0.25rem;
}

.badge__remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 0;
  width: 1.1em;
  height: 1.1em;
  border: none;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  appearance: none;
  transition: background var(--transition-fast), color var(--transition-fast);
}
.badge__remove:hover {
  background: var(--feedback-error-bg);
  color: var(--feedback-error-text);
}
.badge__remove:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
}

/* --- Agent-status dot --- */
.badge--dot {
  gap: var(--space-xs);
  border-radius: 0;
  font-size: var(--text-sm);
  /* `inherit`, not an absolute ink: this element sets no background of its own,
     so it renders on whatever surface the consumer drops it into. AspCard's
     default surface is DARK even in the light theme, where --text-on-light and
     --surface-card are both #424242 — an absolute ink there renders text in
     exactly its own background colour (measured 1:1, invisible). Inheriting
     takes the ink the surface-setter already declared, which is correct on the
     page, on a card, and on any surface added later. */
  color: inherit;
}
.badge__dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  display: inline-block;
  flex-shrink: 0;
}
/*
 * Dot fill — surface-resolved status mark (#4209 §3.82). The flat --feedback-*
 * fills measured 1.5–2.8:1 on the light page and the light card (disjoint worst
 * cases: a dot on #e4e4e4 needs a dark fill, the same dot on #424242 needs a
 * light one — the #4187 finding). Each status declares a light-surface and a
 * dark-surface fill; the generic rules below select between them by surface +
 * theme. Neutral drops its old 0.55 opacity — a mark that fails 3:1 on every
 * surface is invisible, not de-emphasised (§3.65).
 */
.badge--status-positive .badge__dot {
  --_dot: var(--feedback-success-on-light);
  --_dot-dark: var(--feedback-success-on-dark);
}
.badge--status-caution .badge__dot {
  --_dot: var(--feedback-warning-on-light);
  --_dot-dark: var(--feedback-warning-on-dark);
}
.badge--status-negative .badge__dot {
  --_dot: var(--feedback-error-on-light);
  --_dot-dark: var(--feedback-error-on-dark);
}
.badge--status-neutral .badge__dot {
  --_dot: var(--feedback-neutral-on-light);
  --_dot-dark: var(--feedback-neutral-on-dark);
}

/* Page/default surface, light theme → the light set. */
.badge__dot { background: var(--_dot); }
/* Page/default surface, dark theme → the dark set. The DS is [data-theme]-
   driven (not prefers-color-scheme), matching the token build's own override. */
[data-theme='dark'] .badge__dot { background: var(--_dot-dark); }
/* surface="card" is dark in BOTH themes → always the dark set. Placed LAST so
   it wins the equal-specificity tie against the light-theme default (§3.82). */
.badge--surface-card .badge__dot { background: var(--_dot-dark); }

@media (prefers-reduced-motion: reduce) {
  .badge__remove { transition: none; }
}
</style>
