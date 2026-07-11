<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'default',
    validator: (v) => ['default', 'elevated', 'ghost'].includes(v),
  },
  padding: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v),
  },
  interactive: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['click'])

// Interactive cards use <div role="button"> instead of <button> because the
// content model of <button> disallows flow content like <header>/<footer>.
const rootAttrs = computed(() => {
  if (!props.interactive) return {}
  return { role: 'button', tabindex: 0 }
})

const classes = computed(() => ({
  card: true,
  [`card--variant-${props.variant}`]: true,
  [`card--padding-${props.padding}`]: true,
  'card--interactive': props.interactive,
}))

const onClick = (event) => {
  if (props.interactive) emit('click', event)
}

const onKeydown = (event) => {
  if (!props.interactive) return
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    emit('click', event)
  }
}
</script>

<template>
  <div
    v-bind="rootAttrs"
    :class="classes"
    @click="onClick"
    @keydown="onKeydown"
  >
    <header v-if="$slots.header" class="card__header">
      <slot name="header" />
    </header>
    <div class="card__body">
      <slot />
    </div>
    <footer v-if="$slots.footer" class="card__footer">
      <slot name="footer" />
    </footer>
  </div>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-lg);
  border: 2px solid var(--border-card);
  background: var(--surface-card);
  color: var(--text-on-dark);
  transition: transform var(--transition-fast), box-shadow var(--transition-fast),
    border-color var(--transition-fast);
  text-align: left;
  font-family: var(--font-family-base);
}

.card--variant-default {
  box-shadow: var(--shadow-sm);
}

.card--variant-elevated {
  box-shadow: var(--shadow-lg);
}

.card--variant-ghost {
  background: transparent;
  color: var(--text-on-light);
  box-shadow: none;
  border-style: dashed;
}

.card--padding-sm {
  gap: var(--space-xs);
}

.card--padding-md {
  gap: var(--space-sm);
}

.card--padding-lg {
  gap: var(--space-md);
}

.card--padding-sm .card__body,
.card--padding-sm .card__header,
.card--padding-sm .card__footer {
  padding: var(--space-sm);
}

.card--padding-md .card__body,
.card--padding-md .card__header,
.card--padding-md .card__footer {
  padding: var(--space-md);
}

.card--padding-lg .card__body,
.card--padding-lg .card__header,
.card--padding-lg .card__footer {
  padding: var(--space-lg);
}

.card__header {
  color: var(--text-heading-card);
  font-size: var(--text-lg);
  font-weight: var(--font-weight-bold);
  border-bottom: 1px solid var(--surface-card-inner);
}

.card__body {
  flex: 1;
}

.card__footer {
  border-top: 1px solid var(--surface-card-inner);
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.card--interactive {
  cursor: pointer;
}

.card--interactive:hover {
  transform: translateY(-2px);
  border-color: var(--brand-accent);
  box-shadow: var(--shadow-lg);
}

.card--interactive:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
}

@media (hover: none) and (pointer: coarse) {
  .card--interactive:hover {
    transform: none;
  }
  .card--interactive:active {
    transform: scale(0.98);
  }
}
</style>
