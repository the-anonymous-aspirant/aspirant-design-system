<script setup>
import AspButton from './AspButton.vue'
import AspTimeSince from './AspTimeSince.vue'

// AspFreshness — one owned control for every "last updated + refresh" read on
// the frontend (system_3 #3015). It composes AspTimeSince (relative-time,
// unchanged) with a ghost icon-only AspButton trigger so every surface renders
// the pairing identically — the inconsistency the operator asked to remove was
// each caller assembling the two pieces (spacing, order, button variant) itself.
//
// It is PRESENTATIONAL: it emits `refresh` and expects the CALLER to run the
// fetch and toggle `pending`/`failed` + update `lastSuccessfulAt` on the
// outcome. It does not own the fetch (every surface's data source differs) — it
// owns the display contract, matching the DS "primitives don't know about app
// data" boundary.

defineProps({
  /**
   * Instant of the last SUCCESSFUL fetch — handed straight to AspTimeSince.
   * Named `last-successful-at` (not `datetime`) to make the contract unmissable
   * at every call site: a caller MUST NOT advance it optimistically before a
   * refresh resolves. A failed refresh keeps the prior value, so the displayed
   * time never claims data the fetch did not actually return.
   */
  lastSuccessfulAt: { type: [String, Number, Date], default: null },
  /** A refresh is in flight → the trigger shows AspButton's spinner + disables. */
  pending: { type: Boolean, default: false },
  /**
   * The last refresh failed → an inline warning glyph appears next to the
   * trigger and the displayed timestamp is left untouched. The caller clears
   * this on the next success; the component never sets it itself.
   */
  failed: { type: Boolean, default: false },
  /** Prefix text, e.g. renders "Updated 8m ago". Pass '' to drop it. */
  label: { type: String, default: 'Updated' },
  /** Trigger sizing; forwarded to AspButton. AspTimeSince has no size axis. */
  size: {
    type: String,
    default: 'sm',
    validator: (v) => ['sm', 'md'].includes(v),
  },
  /**
   * Inject the current instant — forwarded to AspTimeSince. For tests and SSR
   * only (same rationale as AspTimeSince's own `now`): a component that reads
   * the wall clock internally cannot be asserted at a boundary. When set, it
   * freezes the reading (AspTimeSince suppresses its live re-tick).
   */
  now: { type: [Number, Date], default: null },
})

defineEmits(['refresh'])
</script>

<template>
  <span class="freshness" :class="`freshness--${size}`">
    <span v-if="label" class="freshness__label">{{ label }}</span>
    <AspTimeSince
      class="freshness__time"
      variant="elapsed"
      live
      :datetime="lastSuccessfulAt"
      :now="now"
    />
    <!-- Failure is an in-place affordance, never a toast or blocking banner
         (the app-wide "keep the prior data" honesty pattern). Suppressed while a
         retry is pending so the operator is never told "failed" and "loading" at
         once; the caller clears `failed` on the next success. -->
    <span
      v-if="failed && !pending"
      class="freshness__failed"
      role="img"
      aria-label="refresh failed, showing last known data"
      title="refresh failed, showing last known data"
      data-testid="freshness-failed"
    >
      <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true">
        <path
          d="M12 3.5 1.8 20.5h20.4z"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linejoin="round"
        />
        <path
          d="M12 9.5v4.6"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
        <circle cx="12" cy="17.4" r="1.1" fill="currentColor" />
      </svg>
    </span>
    <AspButton
      class="freshness__trigger"
      variant="ghost"
      :size="size"
      :loading="pending"
      :aria-label="pending ? 'refreshing' : 'refresh'"
      data-testid="freshness-refresh"
      @click="$emit('refresh')"
    >
      <template #iconLeft>
        <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true">
          <path
            d="M21 12a9 9 0 1 1-2.64-6.36"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
          <path
            d="M21 3.5v6h-6"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </template>
    </AspButton>
  </span>
</template>

<style scoped>
.freshness {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  font-family: var(--font-family-base);
}
.freshness__label {
  font-size: var(--text-xs);
  color: var(--text-muted);
  white-space: nowrap;
}
/* The trigger is icon-only: AspButton always renders an (empty) label span, so
   drop it and tighten the padding to keep the control square next to the time. */
.freshness__trigger {
  padding-inline: var(--space-2xs);
}
.freshness__trigger :deep(.btn__label:empty) {
  display: none;
}
.freshness__failed {
  display: inline-flex;
  align-items: center;
  /* A muted-but-legible warning that adapts to the surface's polarity, like the
     ghost button (#2419): a single fixed feedback ink cannot clear AA on both
     the light page and a dark AspCard. Mixing the error hue into currentColor
     keeps the warning identity while inheriting the surface ink, so it stays a
     non-text-AA (>=3:1) mark on both. */
  color: color-mix(in srgb, var(--feedback-error) 62%, currentColor);
  font-size: var(--text-sm);
}
</style>
