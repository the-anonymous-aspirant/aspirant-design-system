<script setup>
import { provide, toRefs } from 'vue'

// AspList — the vertical list primitive (docs/COMPONENTS.md §6), the shape that
// replaces `<v-list>` on MessageBoardView.
//
// `variant` and `spacing` are provided down rather than passed to each item.
// Every item in a list shares them by definition, so requiring the consumer to
// repeat them on every <AspListItem> would be a per-call-site opportunity to
// get them inconsistent -- which is the drift these primitives exist to stop.

const props = defineProps({
  variant: {
    type: String,
    default: 'default',
    validator: (v) => ['default', 'divided', 'interactive'].includes(v),
  },
  spacing: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v),
  },
  /** Accessible name for the list. */
  ariaLabel: { type: String, default: null },
})

const { variant, spacing } = toRefs(props)
provide('aspListContext', { variant, spacing })
</script>

<template>
  <ul
    class="list"
    :class="[`list--${variant}`, `list--spacing-${spacing}`]"
    :aria-label="ariaLabel || undefined"
  >
    <slot />
  </ul>
</template>

<style scoped>
/*
 * Sets no background and no ink: the list inherits, so it is legible on the
 * light page and on a dark card alike (#2415). Items inherit from here in turn.
 */
.list {
  margin: 0;
  padding: 0;
  list-style: none;
  font-family: var(--font-family-base);
}

/*
 * Dividers are drawn as a top border on every item after the first, rather than
 * a bottom border on all-but-last. Same picture, but it survives a list whose
 * last item is conditionally rendered -- `:last-child` silently stops matching
 * when the real last item is inside a `v-if` that also emits a comment node.
 */
.list--divided :deep(.list-item + .list-item) {
  border-top: 1px solid var(--border-subtle);
}
</style>
