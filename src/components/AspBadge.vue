<script setup>
import { computed } from 'vue'

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
})

const emit = defineEmits(['remove'])

const isDot = computed(() => props.variant === 'dot')
const isFilter = computed(() => props.variant === 'filter')
const usesStatusColor = computed(() => props.variant === 'status' || isDot.value)

const legend = computed(() =>
  props.tip ?? (usesStatusColor.value ? STATUS_LEGEND[props.status] : null),
)

const classes = computed(() => ({
  badge: true,
  [`badge--${props.variant}`]: true,
  [`badge--size-${props.size}`]: true,
  [`badge--status-${props.status}`]: usesStatusColor.value,
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
    <span class="badge__dot" :aria-label="ariaLabel || legend || undefined" role="img" />
    <span v-if="$slots.default" class="badge__dot-label"><slot /></span>
  </span>

  <!-- Status / chip / filter share the pill shell. -->
  <span
    v-else
    :class="classes"
    :title="legend || undefined"
  >
    <span class="badge__label"><slot /></span>
    <button
      v-if="isFilter"
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

.badge--status.badge--status-positive {
  background: var(--feedback-success-bg);
  color: var(--feedback-success-text);
}
.badge--status.badge--status-caution {
  background: var(--feedback-warning-bg);
  color: var(--feedback-warning-text);
}
.badge--status.badge--status-negative {
  background: var(--feedback-error-bg);
  color: var(--feedback-error-text);
}
.badge--status.badge--status-neutral {
  background: var(--feedback-neutral-bg);
  color: var(--feedback-neutral-text);
}

/* --- Label / capability chip + removable filter-chip: neutral surface --- */
.badge--chip,
.badge--filter {
  background: var(--surface-elevated);
  color: var(--text-on-light);
  border: 1px solid var(--border-subtle);
}

.badge--filter {
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
  color: var(--text-on-light);
}
.badge__dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  display: inline-block;
  flex-shrink: 0;
}
.badge--status-positive .badge__dot { background: var(--feedback-success); }
.badge--status-caution .badge__dot { background: var(--feedback-warning); }
.badge--status-negative .badge__dot { background: var(--feedback-error); }
.badge--status-neutral .badge__dot {
  background: var(--feedback-neutral);
  opacity: 0.55;
}

@media (prefers-reduced-motion: reduce) {
  .badge__remove { transition: none; }
}
</style>
