<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (v) => ['primary', 'secondary', 'ghost', 'destructive'].includes(v),
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v),
  },
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  type: {
    type: String,
    default: 'button',
    validator: (v) => ['button', 'submit', 'reset'].includes(v),
  },
})

const emit = defineEmits(['click'])

const isBlocked = computed(() => props.disabled || props.loading)

const classes = computed(() => ({
  btn: true,
  [`btn--${props.variant}`]: true,
  [`btn--size-${props.size}`]: true,
  'btn--loading': props.loading,
}))

const onClick = (event) => {
  if (isBlocked.value) {
    event.preventDefault()
    event.stopPropagation()
    return
  }
  emit('click', event)
}
</script>

<template>
  <button
    :type="type"
    :class="classes"
    :disabled="isBlocked"
    :aria-busy="loading || undefined"
    @click="onClick"
  >
    <span v-if="$slots.iconLeft && !loading" class="btn__icon btn__icon--left">
      <slot name="iconLeft" />
    </span>
    <span v-if="loading" class="btn__spinner" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="1em" height="1em">
        <circle
          cx="12"
          cy="12"
          r="9"
          fill="none"
          stroke="currentColor"
          stroke-width="3"
          stroke-linecap="round"
          stroke-dasharray="14 42"
        />
      </svg>
    </span>
    <span class="btn__label"><slot /></span>
    <span v-if="$slots.iconRight && !loading" class="btn__icon btn__icon--right">
      <slot name="iconRight" />
    </span>
  </button>
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-family: var(--font-family-base);
  font-weight: var(--font-weight-medium);
  line-height: 1;
  transition: background var(--transition-fast), border-color var(--transition-fast),
    color var(--transition-fast), box-shadow var(--transition-fast),
    transform var(--transition-fast);
  user-select: none;
  white-space: nowrap;
  appearance: none;
}

/* Size */
.btn--size-sm {
  padding: var(--space-2xs) var(--space-sm);
  font-size: var(--text-sm);
}
.btn--size-md {
  padding: var(--space-xs) var(--space-md);
  font-size: var(--text-base);
}
.btn--size-lg {
  padding: var(--space-sm) var(--space-lg);
  font-size: var(--text-lg);
}

/* Variants */
.btn--primary {
  background: var(--brand-primary);
  color: var(--text-on-light);
}
.btn--primary:hover:not(:disabled) {
  background: var(--brand-primary-hover);
  color: var(--text-on-dark);
}

.btn--secondary {
  background: var(--surface-elevated);
  color: var(--text-on-light);
  border-color: var(--border-subtle);
}
.btn--secondary:hover:not(:disabled) {
  border-color: var(--brand-primary);
  color: var(--brand-primary-hover);
}

.btn--ghost {
  background: transparent;
  color: var(--brand-primary);
  border-color: transparent;
}
.btn--ghost:hover:not(:disabled) {
  background: var(--brand-primary-alpha);
  color: var(--text-on-light);
}

.btn--destructive {
  background: var(--feedback-error);
  color: var(--text-on-dark);
}
.btn--destructive:hover:not(:disabled) {
  filter: brightness(0.92);
}

/* Focus */
.btn:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
}

/* Disabled + loading */
.btn:disabled,
.btn--loading {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn--loading {
  cursor: progress;
}

/* Active feedback */
.btn:not(:disabled):active {
  transform: translateY(1px);
}

/* Spinner */
.btn__spinner {
  display: inline-flex;
  animation: btn-spin var(--transition-layout) linear infinite;
}

@keyframes btn-spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .btn__spinner { animation: none; }
  .btn { transition: none; }
}

.btn__icon {
  display: inline-flex;
  align-items: center;
}
</style>
