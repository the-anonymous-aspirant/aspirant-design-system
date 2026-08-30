<script setup>
import { computed, useAttrs, watchEffect } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'primary',
    // 'link' (§3.97) is an unboxed inline text-link that stays a real <button>:
    // no box in any state, font/color inherited from the ambient run, underline
    // as the affordance. It amends §3.89's "NO link/text variant" clause.
    validator: (v) => ['primary', 'secondary', 'ghost', 'destructive', 'link'].includes(v),
  },
  // 'icon' is a fixed SQUARE shape (§3.89 / §3.23 rule-4) for a glyph-only
  // button — a fixed ≥44px box, never label-width-driven. The default slot
  // carries the glyph; iconLeft/iconRight are inert in icon mode.
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg', 'icon'].includes(v),
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

const attrs = useAttrs()
const isIcon = computed(() => props.size === 'icon')

// Accessible-name hard gate: an icon-only button has no visible text, so it
// MUST carry an accessible name. Warn in dev when the shape is set and neither
// aria-label nor aria-labelledby is present (§3.89; the a11y counterpart of
// §3.85's "the control must not silently render a mismatched affordance").
if (import.meta.env?.DEV) {
  watchEffect(() => {
    if (isIcon.value && !attrs['aria-label'] && !attrs['aria-labelledby']) {
      // eslint-disable-next-line no-console
      console.warn(
        '[AspButton] size="icon" has no accessible name — pass aria-label or aria-labelledby.',
      )
    }
  })
}

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
    <span v-if="$slots.iconLeft && !loading && !isIcon" class="btn__icon btn__icon--left">
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
    <!-- Icon mode: the glyph rides the default slot with NO .btn__label wrapper,
         so it centres in the square instead of being padded to a text pill. -->
    <slot v-if="isIcon && !loading" />
    <span v-else-if="!isIcon" class="btn__label"><slot /></span>
    <span v-if="$slots.iconRight && !loading && !isIcon" class="btn__icon btn__icon--right">
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

/* Size — sm/md/lg are PADDING-DRIVEN by design and carry NO min-height. A
   labelled button is wide and only ever short in height; ~34px clears the 24px
   WCAG 2.5.8 (AA) target-size floor comfortably (§3.99 Tier 1). The 44px Tier-2
   touch target is deliberately NOT applied here — it is reserved for controls
   small in BOTH dimensions (size="icon" above) or standalone touch-first
   affordances, and inflating the ~108 labelled call sites to 44px would serve
   no one. The absence of a min-height is intentional. Ruling: §3.99 / #4461. */
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
/* Icon-only: a FIXED square (§3.89), never label-width-driven. The 44px is the
   §3.99 Tier-2 touch target — WCAG 2.5.5 (Enhanced) / Apple HIG + Material touch
   guidance, NOT the 2.5.8 AA floor (which is 24px): an icon-only control is
   small in BOTH dimensions, with no label to widen it, so it earns the enhanced
   target. Padding is zeroed and width/height pinned so a lone glyph centres (via
   the flex container) in a square hit target rather than a pill. */
.btn--size-icon {
  padding: 0;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  flex: none;
  font-size: var(--text-lg);
}

/* Variants */
.btn--primary {
  background: var(--brand-primary);
  /* Brand amber is light in EVERY theme, so its ink must not flip with the
     theme. --text-on-light did flip (#e0e0e0 in dark), which put light ink on
     an amber button: measured 1.36:1. Task-#2417. */
  color: var(--text-on-fixed-light);
}
.btn--primary:hover:not(:disabled) {
  background: var(--brand-primary-hover);
  color: var(--text-on-dark);
}

.btn--secondary {
  background: var(--surface-elevated);
  color: var(--text-body);
  border-color: var(--border-subtle);
}
.btn--secondary:hover:not(:disabled) {
  border-color: var(--brand-primary);
  color: var(--brand-primary-hover);
}

.btn--ghost {
  background: transparent;
  /* Brand amber cannot be the raw label ink here. A ghost button has no
     background, so it lands on whatever surface the consumer provides, and
     those have opposite polarity: --brand-primary measures 1.41:1 on the light
     page but 5.60:1 on a dark card. No single amber clears 4.5:1 on both --
     sweeping the amber hue family tops out at 2.81:1.

     Mixing a darker brand step into currentColor keeps the amber identity
     while inheriting the surface's polarity: on a light surface currentColor
     is dark ink and the result darkens; on a dark card it is white and the
     result stays bright. Worst case 4.80:1, on the light page. Task-#2419. */
  color: color-mix(in srgb, var(--brand-primary-800) 40%, currentColor);
  border-color: transparent;
}
.btn--ghost:hover:not(:disabled) {
  background: var(--brand-primary-alpha);
  color: var(--text-body);
}

.btn--destructive {
  background: var(--feedback-error);
  color: var(--text-on-dark);
}
.btn--destructive:hover:not(:disabled) {
  filter: brightness(0.92);
}

/* Link variant (§3.97): an unboxed inline text-link that is still a real
   <button>. NO box in any state — zero padding, no border, no fill, no radius,
   no min-height box — so it reads as a word inside a run of text, not a pill.
   Declared AFTER the size rules so `font: inherit` and `padding: 0` win the
   cascade over the size-prop metrics: `size` is inert for this variant's box.
   `font: inherit` sizes it from the ambient run; `color: inherit` means the ink
   FOLLOWS THE SETTER (§3.18) — the consumer's ambient/call-site colour decides
   it (muted for NodeDetailPanel, --brand-primary for ValuationStatement), never
   a hardcoded brand. The underline is the non-colour affordance (§3.29–§3.31 /
   §3.72), since inherited colour is not a reliable one. It keeps the shared
   :focus-visible ring and :disabled semantics below. */
.btn--link {
  padding: 0;
  border: none;
  background: transparent;
  border-radius: 0;
  min-block-size: 0;
  font: inherit;
  color: inherit;
  text-decoration: underline;
}
/* Hover strengthens the affordance WITHOUT re-boxing (a fill would re-pill it):
   a thicker underline, not a background. */
.btn--link:hover:not(:disabled) {
  text-decoration-thickness: 2px;
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
