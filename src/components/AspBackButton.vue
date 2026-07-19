<script setup>
import { computed, getCurrentInstance } from 'vue'

import AspIcon from './AspIcon.vue'

// AspBackButton — persistent back navigation on detail pages
// (docs/COMPONENTS.md §9). Ported from aspirant-client's BackButton.vue, which
// is the cited reference and the signature interaction this preserves.
//
// Router-agnostic, like AspSidebarLink: this package has no vue-router
// dependency, so the router is detected at runtime off globalProperties and the
// component degrades to the History API when it is absent.

const props = defineProps({
  /** Where to go when there is no in-app history to pop. */
  to: { type: String, default: '/' },
  label: { type: String, default: 'Back' },
  position: {
    type: String,
    default: 'inline',
    validator: (v) => ['fixed', 'inline'].includes(v),
  },
  /**
   * Visually hide the label, leaving the arrow. The accessible name is kept —
   * the label still renders, clipped, rather than being dropped.
   */
  iconOnly: { type: Boolean, default: false },
})

const emit = defineEmits(['back'])

const instance = getCurrentInstance()

const router = computed(
  () => instance?.appContext?.config?.globalProperties?.$router ?? null
)

/**
 * Whether there is an in-app entry to pop.
 *
 * `window.history.length > 1` — what the aspirant-client original tests — is
 * not that. It counts forward entries too, and it is >1 on a fresh tab that
 * merely navigated within the app, so it answers "has this tab navigated at
 * all", not "is the previous entry ours". Popping on that can walk the user
 * out to the referring site.
 *
 * `history.state.back` is the better signal: vue-router 4 writes `back` /
 * `current` / `forward` into the history state it manages, so a non-null
 * `back` means the previous entry is one the router itself pushed. Where that
 * is absent (no router, or a first entry) we fall back to the length heuristic
 * AND require a same-origin referrer, which is the part the original omitted.
 */
const canGoBack = () => {
  if (typeof window === 'undefined') return false

  const back = window.history.state?.back
  if (typeof back === 'string') return true
  // An explicit null `back` from vue-router means "first entry" — trust it and
  // do not fall through to the heuristic, which would contradict it.
  if (window.history.state && 'back' in window.history.state) return false

  if (window.history.length <= 1) return false
  if (!document.referrer) return false
  try {
    return new URL(document.referrer).origin === window.location.origin
  } catch {
    return false
  }
}

const goBack = () => {
  emit('back')
  if (canGoBack()) {
    if (router.value) router.value.go(-1)
    else window.history.back()
    return
  }
  // No in-app history: land on `to` rather than leaving the user stranded.
  if (router.value) router.value.push(props.to)
  else window.location.assign(props.to)
}

// Deliberately no `title` tooltip. The original varied it between "Go back" and
// "Go to home" by reading history at render time — but history state changes
// under the component without re-rendering it, so that tooltip goes stale and
// promises the wrong destination. A stale promise is worse than none; the
// visible label is the accessible name and it is always true.
</script>

<template>
  <button
    type="button"
    class="back-btn"
    :class="`back-btn--${position}`"
    @click="goBack"
  >
    <AspIcon name="back" size="sm" class="back-btn__icon" />
    <span class="back-btn__label" :class="{ 'back-btn__label--sr': iconOnly }">{{ label }}</span>
  </button>
</template>

<style scoped>
/*
 * Sets NO background, so it inherits the ambient ink and lands legibly on the
 * light page and on a dark card alike. That inheritance is the whole point —
 * see AspDataTable / AspBadge, and #2415 for what setting an absolute ink here
 * would do on the opposite polarity.
 */
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  /* 44px minimum hit target, WCAG 2.5.8. */
  min-height: 44px;
  padding: var(--space-2xs) var(--space-xs);
  background: none;
  color: var(--text-muted);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font: inherit;
  font-family: var(--font-family-base);
  font-size: var(--text-sm);
  cursor: pointer;
  transition:
    color var(--transition-fast),
    border-color var(--transition-fast);
}

/*
 * The spec asks for `--brand-primary` on hover. Raw brand amber cannot be the
 * ink: this button has no background, so it sits on whatever surface the page
 * gives it, and --brand-primary measures 1.41:1 on the light page against
 * 5.60:1 on a dark card. That exact rule is the #2419 defect the contrast
 * suite's known-bad control reinstates on purpose.
 *
 * Same resolution AspButton's ghost variant already landed on (#2419): mix a
 * darker brand step into currentColor, which keeps the amber identity while
 * inheriting the surface's polarity — darkens on light, stays bright on dark.
 * Reused rather than re-derived so the two hover treatments cannot drift.
 */
.back-btn:hover,
.back-btn:focus-visible {
  color: color-mix(in srgb, var(--brand-primary-800) 40%, currentColor);
}

.back-btn:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
  /* Paired border — --shadow-focus alone is under the 3:1 non-text minimum
     against both light surfaces (#2371). */
  border-color: currentColor;
}

.back-btn__icon {
  /* Nudges left on hover: the affordance reads as motion back, not just colour,
     which is the non-colour cue the AA "not by colour alone" rule wants. */
  transition: transform var(--transition-fast);
}

.back-btn:hover .back-btn__icon {
  transform: translateX(-2px);
}

@media (prefers-reduced-motion: reduce) {
  .back-btn__icon {
    transition: none;
  }
  .back-btn:hover .back-btn__icon {
    transform: none;
  }
}

/*
 * Fixed placement follows aspirant-client's original (top-right, --space-lg
 * inset), which docs/COMPONENTS.md §9 names as the reference. Corpus §3.12 —
 * cited by the spec as the detail-frame rule — introduces the three detail
 * frames but specifies no back affordance for them, and is itself unmerged
 * (system_3 PR #1147), so there is no design of record to defer to yet.
 */
.back-btn--fixed {
  position: fixed;
  top: var(--space-lg);
  right: var(--space-lg);
  z-index: var(--z-index-sticky);
}

.back-btn--inline {
  position: relative;
}

/* Clipped, not removed: the label stays in the accessibility tree, so the
   button keeps its "Back" name for screen readers and for `toHaveAccessibleName`. */
.back-btn__label--sr {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
