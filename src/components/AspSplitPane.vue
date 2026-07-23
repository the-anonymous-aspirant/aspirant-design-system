<script setup>
import { computed, nextTick, ref, watch } from 'vue'

import { useMobile } from '../composables/useMobile.js'

// AspSplitPane — the list-plus-detail container (docs/COMPONENTS.md §21, task
// #2582). A primary pane the user scans and a secondary pane holding the detail
// for the selected item: side by side above `md`, stacked below it.
//
// Decided a pane rather than a modal or a route (#2536, §3.22): a modal blocks
// the list being scanned, a route loses the list's scroll position — the pane
// keeps both on screen, which is what "reveal" asks for.
//
// §3.18 role: INHERITOR. The container paints no background. Each pane's content
// sets its own surface (typically AspCard for the secondary); separation comes
// from those surfaces and the --border-subtle divider, never from a background
// painted here. Painting one "so the panes read as separate" would add a
// compositing case for every consumer.
//
// This is NOT a modal. It does not trap focus — the whole point is that both
// panes stay usable at once. It does the two focus courtesies a disclosure
// owes: it moves focus into the secondary region on open (so assistive tech
// announces the region rather than a silent DOM insertion), and it returns
// focus to whatever opened it on close.

const props = defineProps({
  /** Whether the secondary (detail) pane is shown. Controlled by the parent. */
  open: { type: Boolean, default: false },
  /**
   * Primary:secondary width above `md`. A closed set, not a free width —
   * arbitrary widths are how surfaces drift apart (spec).
   */
  ratio: {
    type: String,
    default: '1:1',
    validator: (v) => ['1:1', '2:1'].includes(v),
  },
  /**
   * Accessible name for the secondary region (AC7 — announced on open, not a
   * silent insertion). Read by assistive tech when focus enters the region.
   */
  secondaryLabel: { type: String, default: 'Detail' },
  /** aria-label for the ✕ close control. */
  closeLabel: { type: String, default: 'Close detail' },
})

const emit = defineEmits(['close'])

const { isMobile } = useMobile()

const secondary = ref(null)
// The element focus returns to on close. Captured at OPEN, not at close: by the
// time the pane closes the trigger may have re-rendered, and reading
// activeElement then gives the pane or <body>. Same reasoning as useFocusTrap.
let opener = null

const ratioClass = computed(() => `split-pane--ratio-${props.ratio.replace(':', '-')}`)

const requestClose = () => {
  if (props.open) emit('close')
}

// Escape closes (AC6). Bound on the root, so it fires when focus is anywhere
// within the component — either pane — but not when focus has left it entirely,
// which keeps this from stealing Escape from unrelated surfaces on the page.
const onKeydown = (event) => {
  if (event.key === 'Escape' && props.open) {
    event.stopPropagation()
    requestClose()
  }
}

watch(
  () => props.open,
  (isOpen, wasOpen) => {
    if (isOpen && !wasOpen) {
      opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
      // Wait for the secondary region to render, then move focus into it so the
      // region and its label are announced (AC7). tabindex="-1" makes it
      // programmatically focusable without becoming a Tab stop.
      nextTick(() => {
        const el = secondary.value
        if (!el) return
        el.focus()
        // < md: the sheet sits below the primary and may be off-screen — bring
        // it into view (spec). Honour reduced-motion.
        if (isMobile.value) {
          const reduce =
            typeof window !== 'undefined' &&
            window.matchMedia &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
          el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
        }
      })
    } else if (!isOpen && wasOpen) {
      // Return focus to the opener if it is still in the document (AC6).
      if (opener && document.contains(opener)) opener.focus()
      opener = null
    }
  }
)
</script>

<template>
  <!--
    Inheritor: no background, no surface. The container is a flex box only.
    Base (mobile-first) layout is a column — primary, then the secondary sheet
    below it. The row layout arrives at `md` via min-width (§1.6).
  -->
  <div class="split-pane" :class="[ratioClass, { 'split-pane--open': open }]" @keydown="onKeydown">
    <!--
      Primary pane is ALWAYS rendered and is a stable element across open/close.
      That stability is what preserves its scroll position through an
      open → close → open cycle (AC3): the browser keeps scrollTop on an element
      that is not re-created, and nothing here re-creates it — it only changes
      width as the sibling appears and disappears.
    -->
    <div class="split-pane__primary">
      <slot name="primary" />
    </div>

    <!--
      Secondary pane is rendered only when open. Closed, the primary is the sole
      child and takes the full width with no reserved gap (AC5) — `gap` paints
      nothing between a lone item and empty space.

      role="region" + aria-label make it a labelled landmark; tabindex="-1"
      lets the open watcher move focus here to announce it (AC7).
    -->
    <div
      v-if="open"
      ref="secondary"
      class="split-pane__secondary"
      role="region"
      :aria-label="secondaryLabel"
      tabindex="-1"
    >
      <div class="split-pane__secondary-head">
        <button
          type="button"
          class="split-pane__close"
          :aria-label="closeLabel"
          @click="requestClose"
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>
      <div class="split-pane__secondary-body">
        <slot name="secondary" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * INHERITOR (§3.18): no background is declared anywhere in this file. The panes
 * inherit the ambient ink; their content (an AspCard for the secondary) sets
 * its own surface. The only paint here is the divider and the close control's
 * hover wash, both of which the contrast probe measures on the real surface.
 */

.split-pane {
  /* Mobile-first base: a stacked column. */
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  /* Fill the parent so the panes can scroll independently at md+ when the
     parent gives a height. min-height:0 lets the flex children shrink below
     their content and become scroll containers rather than overflowing. */
  min-height: 0;
  font-family: var(--font-family-base);
}

.split-pane__primary,
.split-pane__secondary {
  min-width: 0;
  /* min-height:0 is the flex-child escape hatch that makes overflow scroll work
     in the row layout below. Harmless in the column base. */
  min-height: 0;
}

.split-pane__secondary {
  display: flex;
  flex-direction: column;
}

.split-pane__secondary:focus-visible {
  /* The region takes focus on open only to announce itself; it is not an
     interactive control, so it shows no focus ring of its own. */
  outline: none;
}

.split-pane__secondary-head {
  display: flex;
  justify-content: flex-end;
  /* No background — the head sits on the ambient surface, above the card the
     consumer drops into the body. */
}

.split-pane__close {
  /* 44px hit area per WCAG 2.5.8 without a 44px glyph. */
  min-width: 44px;
  min-height: 44px;
  margin: calc(var(--space-xs) * -1) calc(var(--space-xs) * -1) 0 0;
  padding: var(--space-xs);
  background: none;
  /* Inherits the ambient ink — a colour here would make the container a setter. */
  color: inherit;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font: inherit;
  line-height: 1;
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.split-pane__close:hover {
  /* A neutral wash off the ambient ink, not a token background — it composites
     onto whatever surface the container inherits, so it works on the light page
     and a dark card alike. */
  background: color-mix(in srgb, currentColor 10%, transparent);
}

.split-pane__close:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
  /* Paired border — --shadow-focus alone is under the 3:1 non-text minimum
     (#2371). currentColor pairs with whatever ink the surface carries. */
  border-color: currentColor;
}

.split-pane__secondary-body {
  flex: 1;
  min-height: 0;
}

/* Row layout from the md breakpoint up (min-width only, §1.6). */
@media (min-width: 768px) {
  .split-pane {
    flex-direction: row;
    align-items: stretch;
    /* Fill the parent's height so each pane can own its scroll. */
    height: 100%;
  }

  .split-pane__primary,
  .split-pane__secondary {
    /* Each pane scrolls independently (spec). The scroll container is the pane
       element itself; the primary's is never re-created, so its scrollTop
       survives the sibling appearing and disappearing (AC3). */
    overflow-y: auto;
    height: 100%;
  }

  /*
   * Ratio via flex-basis. Closed, the primary is the only child and flex:1
   * gives it the full width with no reserved gap (AC5). Open, the two children
   * split by the ratio with a --space-lg gutter (the container's `gap`).
   */
  .split-pane__primary {
    flex: 1 1 0;
  }

  .split-pane--open .split-pane__secondary {
    flex: 1 1 0;
    /* The divider is the only separation the container paints. It sits on the
       secondary's leading edge, one --space-lg `gap` clear of the primary; the
       secondary's own content (an AspCard) holds its text off the line. No
       extra padding here — that would double the gutter the `gap` already sets. */
    border-left: 1px solid var(--border-subtle);
  }

  /* 2:1 — primary-weighted. */
  .split-pane--ratio-2-1.split-pane--open .split-pane__primary {
    flex: 2 1 0;
  }
}
</style>
