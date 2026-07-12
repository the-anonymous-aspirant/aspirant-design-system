<script setup>
import { computed } from 'vue'
import AspButton from './AspButton.vue'

// AspEmptyState — centered placeholder for a view with no data to show.
// Ports the system_3 _partials/empty_state.html macro (see
// system_3_ux_conventions.md §1 primary-action placement, §4 neutral color for
// inert states). Two variants distinguish the two reasons a list is empty:
//   - `empty`    — first-run / genuinely no data yet (default)
//   - `filtered` — data exists but the active filters match nothing
// The variant selects a subtle default icon; the consumer overrides via the
// `icon` slot. A CTA is optional: pass `actionLabel` for the convenience
// button (emits `action`), or use the `action` slot for full control.

const props = defineProps({
  heading: { type: String, default: '' },
  message: { type: String, default: '' },
  variant: {
    type: String,
    default: 'empty',
    validator: (v) => ['empty', 'filtered'].includes(v),
  },
  // Convenience CTA — renders an AspButton emitting `action`. Ignored when the
  // `action` slot is provided.
  actionLabel: { type: String, default: '' },
})

const emit = defineEmits(['action'])

const classes = computed(() => ({
  'empty-state': true,
  [`empty-state--${props.variant}`]: true,
}))
</script>

<template>
  <div :class="classes" role="status">
    <div class="empty-state__icon" aria-hidden="true">
      <slot name="icon">
        <!-- filtered → funnel; empty → inbox tray -->
        <svg v-if="variant === 'filtered'" viewBox="0 0 24 24" width="40" height="40" fill="none">
          <path
            d="M3 5h18l-7 8v6l-4 2v-8L3 5z"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linejoin="round"
          />
        </svg>
        <svg v-else viewBox="0 0 24 24" width="40" height="40" fill="none">
          <path
            d="M3 13l2.5-8h13L21 13v6H3v-6z"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linejoin="round"
          />
          <path d="M3 13h5l1.5 2.5h5L21 13" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
        </svg>
      </slot>
    </div>

    <h3 v-if="heading || $slots.heading" class="empty-state__heading">
      <slot name="heading">{{ heading }}</slot>
    </h3>

    <p v-if="message || $slots.default" class="empty-state__message">
      <slot>{{ message }}</slot>
    </p>

    <div v-if="$slots.action || actionLabel" class="empty-state__action">
      <slot name="action">
        <AspButton variant="primary" @click="emit('action', $event)">{{ actionLabel }}</AspButton>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: var(--space-sm);
  padding: var(--space-2xl) var(--space-lg);
  color: var(--text-on-light);
}

.empty-state__icon {
  color: var(--text-muted);
  line-height: 0;
  margin-bottom: var(--space-2xs);
}

.empty-state__heading {
  margin: 0;
  font-family: var(--font-family-base);
  font-size: var(--text-lg);
  font-weight: var(--font-weight-medium);
  color: var(--text-on-light);
}

.empty-state__message {
  margin: 0;
  max-width: 42ch;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.empty-state__action {
  margin-top: var(--space-sm);
}

/* The filtered variant is a transient state (data exists, just hidden) — keep
   its icon lighter so it reads as less alarming than a genuine empty view. */
.empty-state--filtered .empty-state__icon {
  opacity: 0.7;
}
</style>
