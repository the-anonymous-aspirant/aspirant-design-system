<script setup>
import { computed, inject } from 'vue'

import AspIcon from './AspIcon.vue'
import { registryFallback } from '../icons/registry.js'

// AspListItem — one row of AspList (docs/COMPONENTS.md §6).
//
// The interactive row is a real <button> inside the <li>, not an <li> carrying
// tabindex and a keydown handler. AspDataTable does the latter, and it has to:
// a <tr> cannot contain a button spanning the row without breaking table
// semantics. A list has no such constraint, so it gets the element that already
// has the behaviour -- Enter AND Space, the correct implicit role, disabled
// semantics, and a form-control focus ring -- rather than a re-implementation.
//
// The <li> stays the list item either way, so the list's semantics survive
// whichever variant is in use.

const props = defineProps({
  /** Registry name (rendered via AspIcon) or a raw glyph string. */
  icon: { type: String, default: null },
  label: { type: String, default: null },
  /** Trailing secondary text — timestamps, counts, status words. */
  meta: { type: String, default: null },
  active: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['click'])

// Defaults matter: an item used outside a list still has to render.
const listContext = inject('aspListContext', null)
const variant = computed(() => listContext?.variant?.value ?? 'default')
const spacing = computed(() => listContext?.spacing?.value ?? 'md')

const isInteractive = computed(() => variant.value === 'interactive')
const isNamedIcon = computed(() => props.icon !== null && registryFallback(props.icon) !== null)

const onClick = (event) => {
  if (props.disabled) return
  emit('click', event)
}

// `active` is a selection state, so it carries aria-current on the interactive
// control (see the template) — that is what assistive tech announces. Colour
// alone would leave selection invisible to a screen reader.
</script>

<template>
  <li
    class="list-item"
    :class="[
      `list-item--spacing-${spacing}`,
      {
        'list-item--interactive': isInteractive,
        'list-item--active': active,
        'list-item--disabled': disabled,
      },
    ]"
  >
    <component
      :is="isInteractive ? 'button' : 'div'"
      class="list-item__inner"
      :type="isInteractive ? 'button' : undefined"
      :disabled="isInteractive && disabled ? true : undefined"
      :aria-current="isInteractive && active ? 'true' : undefined"
      @click="onClick"
    >
      <span v-if="icon" class="list-item__icon" aria-hidden="true">
        <AspIcon v-if="isNamedIcon" :name="icon" size="sm" />
        <template v-else>{{ icon }}</template>
      </span>

      <span class="list-item__body">
        <slot>{{ label }}</slot>
      </span>

      <span v-if="meta" class="list-item__meta">{{ meta }}</span>
    </component>
  </li>
</template>

<style scoped>
/*
 * Neither element sets a background at rest, so both inherit the ambient ink
 * and read correctly on the light page and on a dark card (#2415).
 */
.list-item {
  display: block;
}

.list-item__inner {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
  background: none;
  color: inherit;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font: inherit;
  font-family: var(--font-family-base);
  font-size: var(--text-sm);
  text-align: start;
}

.list-item--spacing-sm .list-item__inner {
  padding: var(--space-2xs) var(--space-xs);
}
.list-item--spacing-md .list-item__inner {
  padding: var(--space-xs) var(--space-sm);
}
.list-item--spacing-lg .list-item__inner {
  padding: var(--space-sm) var(--space-md);
}

/* Interactive rows need a 44px target regardless of spacing (WCAG 2.5.8). */
.list-item--interactive .list-item__inner {
  min-height: 44px;
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

/*
 * Hover and active tints derive from the INK rather than binding
 * --surface-card-inner. That token is rgba(255,255,255,0.06) — a white wash, so
 * it lightens every surface including the light page, where a row tint that
 * moves toward the ink reduces the row's own contrast. Mixing currentColor
 * darkens under dark ink and lightens under light ink, which is what "a subtly
 * raised row" means on either polarity. Same correction as AspProse's code
 * chips (#2376).
 */
.list-item--interactive .list-item__inner:hover:not(:disabled) {
  background: color-mix(in srgb, currentColor 8%, transparent);
}

.list-item--interactive .list-item__inner:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
  /* Paired border — --shadow-focus alone is under the 3:1 non-text minimum
     against both light surfaces (#2371). */
  border-color: currentColor;
}

/*
 * Selection is carried by an amber inset bar and weight, NOT by a background
 * tint. Two reasons, one of them measured:
 *
 * Amber behind text is the #2419 trap -- AspSelect hit exactly this, where
 * brand-primary-alpha over its dark panel dropped option text to 3.87:1. A bar
 * puts the accent beside the text rather than behind it.
 *
 * And a neutral tint is no safer here: the first version added
 * `currentColor 6%` and the matrix measured the row's muted meta text at
 * 4.49:1 -- under AA by a hundredth. --text-muted is already 80% of the ink, so
 * any tint that moves the background toward the ink spends the margin it has
 * left. The bar and the weight carry selection without touching contrast, and
 * aria-current carries it for assistive tech, so the tint bought nothing.
 */
.list-item--active .list-item__inner {
  box-shadow: inset 2px 0 0 var(--brand-primary);
  /* Square the leading edge so the inset bar reads as a bar. Against the row's
     --radius-md the shadow follows the curve and renders as a crescent, which
     looks like a rendering artefact rather than a selection marker. */
  border-start-start-radius: 0;
  border-end-start-radius: 0;
  font-weight: var(--font-weight-medium);
}

.list-item--disabled .list-item__inner,
.list-item__inner:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.list-item__icon {
  display: inline-flex;
  flex: none;
  align-items: center;
}

.list-item__body {
  flex: 1;
  min-width: 0;
}

.list-item__meta {
  flex: none;
  /* Derives from currentColor (#2418), so it stays legible on both polarities. */
  color: var(--text-muted);
  font-size: var(--text-xs);
}
</style>
