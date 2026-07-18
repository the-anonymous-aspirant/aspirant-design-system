<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import { useFocusTrap } from '../composables/useFocusTrap.js'

// AspModal — the overlay dialog (docs/COMPONENTS.md §8) for create-task, edit
// and confirm flows.
//
// Teleported to <body> deliberately. A dialog authored inside a card or any
// ancestor with `overflow: hidden`, `transform` or `filter` would otherwise be
// clipped or positioned against that ancestor instead of the viewport — and the
// call sites this is for (a create-task form inside a panel) are exactly that
// shape. Teleport also keeps the scrim above sticky page chrome without a
// z-index arms race.
//
// Mobile is a full-screen sheet and that is the BASE style, not an override:
// the sized dialog appears at the `md` breakpoint via min-width, per the
// mobile-first rule. Nothing here needs `useMobile` — this is layout, so it
// belongs in CSS where it costs no JS and no hydration mismatch.

const props = defineProps({
  /** `v-model:open` */
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg', 'fullscreen'].includes(v),
  },
  /** Allow scrim click and Esc to close. Set false for must-answer dialogs. */
  dismissible: { type: Boolean, default: true },
  /** Accessible name when no visible `title` is given. */
  ariaLabel: { type: String, default: null },
  /** Hide the ✕. The dialog then needs a close affordance in the footer. */
  showClose: { type: Boolean, default: true },
  closeLabel: { type: String, default: 'Close dialog' },
})

const emit = defineEmits(['update:open', 'close', 'open'])

const uid = `asp-modal-${Math.random().toString(36).slice(2, 9)}`
const panel = ref(null)
const trap = useFocusTrap(panel)

const labelledBy = computed(() => (props.title ? `${uid}-title` : undefined))

// --- body scroll lock -------------------------------------------------------

// Ref-counted at module scope: a confirm dialog opened from an edit dialog must
// not have the inner one's close restore scrolling while the outer is still up.
// The scrollbar-width compensation stops the page behind from reflowing
// sideways as the bar disappears, which reads as the whole layout twitching.
let lockCount = 0
let savedOverflow = ''
let savedPaddingRight = ''

const lockScroll = () => {
  if (typeof document === 'undefined') return
  lockCount += 1
  if (lockCount > 1) return
  const { body } = document
  const barWidth = window.innerWidth - document.documentElement.clientWidth
  savedOverflow = body.style.overflow
  savedPaddingRight = body.style.paddingRight
  body.style.overflow = 'hidden'
  if (barWidth > 0) {
    const current = parseFloat(window.getComputedStyle(body).paddingRight) || 0
    body.style.paddingRight = `${current + barWidth}px`
  }
}

const unlockScroll = () => {
  if (typeof document === 'undefined' || lockCount === 0) return
  lockCount -= 1
  if (lockCount > 0) return
  document.body.style.overflow = savedOverflow
  document.body.style.paddingRight = savedPaddingRight
}

// --- open/close -------------------------------------------------------------

const close = () => {
  if (!props.open) return
  emit('update:open', false)
  emit('close')
}

const requestDismiss = () => {
  if (props.dismissible) close()
}

const onScrimPointerDown = (event) => {
  // Only a press that both starts and ends on the scrim dismisses. Without the
  // target check, a text selection begun inside the dialog and released over
  // the scrim closes it and throws the draft away.
  if (event.target === event.currentTarget) requestDismiss()
}

const onKeydown = (event) => {
  if (event.key === 'Escape' && props.open) {
    event.stopPropagation()
    requestDismiss()
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      lockScroll()
      emit('open')
      trap.activate()
    } else {
      unlockScroll()
      trap.deactivate()
    }
  },
  { immediate: true }
)

// A modal unmounted while open (route change, v-if on an ancestor) must not
// leave the body scroll-locked or the trap's keydown listener attached.
onBeforeUnmount(() => {
  if (props.open) {
    unlockScroll()
    trap.deactivate({ restoreFocus: false })
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="open"
        class="modal__scrim"
        :class="{ 'modal__scrim--fullscreen': size === 'fullscreen' }"
        @pointerdown="onScrimPointerDown"
        @keydown="onKeydown"
      >
        <!--
          tabindex="-1" so the dialog can hold focus when its body contains
          nothing focusable — see useFocusTrap. Not keyboard-reachable by Tab.
        -->
        <div
          :id="`${uid}-panel`"
          ref="panel"
          class="modal__panel"
          :class="`modal__panel--${size}`"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="labelledBy"
          :aria-label="!title ? ariaLabel || undefined : undefined"
          tabindex="-1"
        >
          <header v-if="title || showClose" class="modal__header">
            <h2 v-if="title" :id="`${uid}-title`" class="modal__title">{{ title }}</h2>
            <span v-else class="modal__title-spacer" />
            <button
              v-if="showClose"
              type="button"
              class="modal__close"
              :aria-label="closeLabel"
              @click="close"
            >
              <span aria-hidden="true">✕</span>
            </button>
          </header>

          <div class="modal__body">
            <slot />
          </div>

          <footer v-if="$slots.footer" class="modal__footer">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/*
 * Teleported to <body>, so these rules cannot rely on any ancestor of the call
 * site — every value is a token read off :root.
 */
.modal__scrim {
  position: fixed;
  inset: 0;
  z-index: var(--z-index-modal);
  display: flex;
  /* Mobile base: the sheet fills the viewport, so no centring to do. */
  align-items: stretch;
  justify-content: center;
  background: var(--surface-scrim);
  font-family: var(--font-family-base);
}

/*
 * The panel is a SURFACE-SETTER: it declares --surface-card, which is DARK even
 * in the light theme, so it must declare the ink that pairs with it rather than
 * inheriting the ambient one. Getting this backwards is #2415 — dark ink on a
 * dark panel, 1:1, invisible. Children inherit from here.
 */
.modal__panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: 100dvh;
  background: var(--surface-card);
  color: var(--text-on-dark);
  box-shadow: var(--shadow-lg);
  /* Full-bleed sheet on mobile — corners would show slivers of scrim. */
  border-radius: 0;
}

.modal__panel:focus-visible {
  outline: none;
}

.modal__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-md);
  padding: var(--space-lg) var(--space-lg) var(--space-sm);
}

.modal__title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: var(--font-weight-bold);
  /* Same amber-on-charcoal heading as AspCard — the panel is the same surface. */
  color: var(--text-heading-card);
}

.modal__title-spacer {
  flex: 1;
}

.modal__close {
  flex: none;
  /* 44px hit area per WCAG 2.5.8, without a 44px-wide glyph. */
  min-width: 44px;
  min-height: 44px;
  margin: calc(var(--space-xs) * -1);
  padding: var(--space-xs);
  background: none;
  /* Inherits the panel ink; a background here would make it a setter too. */
  color: inherit;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font: inherit;
  line-height: 1;
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.modal__close:hover {
  background: var(--surface-card-inner);
}

.modal__close:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
  /* Paired border: --shadow-focus alone is under the 3:1 non-text minimum
     (#2371). On this dark panel the pairing is the panel's own ink. */
  border-color: var(--text-on-dark);
}

.modal__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 var(--space-lg) var(--space-lg);
}

.modal__footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-lg) var(--space-lg);
  border-top: 1px solid var(--surface-card-inner);
}

/* Sizes apply from the md breakpoint up — below it every size is the sheet. */
@media (min-width: 768px) {
  .modal__scrim {
    align-items: center;
    padding: var(--space-xl);
  }

  .modal__panel {
    max-height: calc(100dvh - var(--space-xl) * 2);
    border-radius: var(--radius-lg);
  }

  .modal__panel--sm {
    max-width: 24rem;
  }

  .modal__panel--md {
    max-width: 34rem;
  }

  .modal__panel--lg {
    max-width: 48rem;
  }

  /* fullscreen keeps the sheet geometry at every width. */
  .modal__scrim--fullscreen {
    align-items: stretch;
    padding: 0;
  }

  .modal__panel--fullscreen {
    max-width: none;
    max-height: 100dvh;
    border-radius: 0;
  }
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity var(--transition-fast) ease-out;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .modal-fade-enter-active,
  .modal-fade-leave-active {
    transition: none;
  }
}
</style>
