<script setup>
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

// AspPathTitle — a browse surface's folder path rendered AS the page title
// (system_3 task #2581, corpus §3.22 / §3.8). Consumed by the explorer browse
// surface (#2580).
//
// Why this is not AspBreadcrumb. §3.8 removed breadcrumbs everywhere: "the page
// title is the only header." That removal targeted breadcrumbs as page CHROME —
// a redundant restatement of the app's fixed IA above every page. A folder path
// is not chrome: it is the browse surface's own mutable state, the one element
// that says where you are, and no static title can carry it because it changes
// on every click. So the path renders in the title slot §3.8 preserved — one
// header, still the only header — at the page-title type scale, not a small
// breadcrumb row. Do not reintroduce a breadcrumb bar.
//
// Contrast role (§3.18): INHERITOR. It paints no background and takes the
// ambient ink, so it must land legibly on the light page AND on --surface-card
// (dark in the light theme). The one part that PAINTS is the ancestor
// hover/focus wash, which therefore derives its own tint from currentColor.
//
// Router-agnostic like AspSidebarLink / AspBreadcrumb: this package has no
// vue-router dependency, so `router-link` is used only when a router is present
// and the component degrades to a plain `<a href>` when it is not.

const props = defineProps({
  /**
   * The path, root first, current last. `[{ label, href? }]`. The LAST segment
   * is always the current location and renders as heading ink, never a link —
   * regardless of whether an `href` was supplied. Currentness is positional, not
   * a caller flag: a caller that gets a flag wrong ships a title that navigates
   * to itself.
   */
  segments: { type: Array, default: () => [] },
  /** The glyph between segments. Decorative, and aria-hidden. */
  separator: { type: String, default: '/' },
  /** Accessible name for the landmark wrapping the heading. */
  ariaLabel: { type: String, default: 'Current location' },
})

const emit = defineEmits(['navigate'])

const instance = getCurrentInstance()

// Detect vue-router at runtime without importing it — `$router` is installed on
// globalProperties by app.use(router). Read through a computed rather than
// `$router` in the template, which warns when no router is installed.
const hasRouter = computed(() => Boolean(instance?.appContext?.config?.globalProperties?.$router))

/** `to` for router-link, `href` for the plain anchor — one shape either way. */
const linkProps = (href) => (hasRouter.value ? { to: href } : { href })

const lastIndex = computed(() => props.segments.length - 1)
const isCurrent = (index) => index === lastIndex.value

// --- collapse ----------------------------------------------------------------
//
// A title path can be deep, and it must never wrap to a second line or push the
// header sideways. On overflow the MIDDLE collapses to a single ellipsis,
// keeping the first (root) and the last (current) — the two orientation anchors
// — and progressively revealing tail segments while they still fit.
//
// The collapse is measured off rendered WIDTH, not segment count: a count
// threshold would collapse a short 5-part path that fits and leave a long
// 3-part path overflowing.

const root = ref(null)
const line = ref(null)

/** How many segments, counting from index 1, are collapsed away. */
const hidden = ref(0)

// Keep first + last: at most length - 2 can hide. The middle is the least
// load-bearing part of a path.
const maxHidden = computed(() => Math.max(props.segments.length - 2, 0))

const shown = computed(() => {
  const indexed = props.segments.map((seg, index) => ({ label: seg.label, href: seg.href, index }))
  if (hidden.value <= 0) return indexed
  return [indexed[0], ...indexed.slice(1 + hidden.value)]
})

/** The hidden segments' labels, announced to assistive tech (AC6 — the elided
 *  range must not be silently dropped). */
const hiddenLabels = computed(() =>
  hidden.value > 0 ? props.segments.slice(1, 1 + hidden.value).map((s) => s.label) : []
)

const hiddenAnnouncement = computed(() =>
  hiddenLabels.value.length
    ? `${hiddenLabels.value.length} hidden: ${hiddenLabels.value.join(', ')}`
    : ''
)

/** The rendered sequence as a flat list, so the template need not reason about
 *  where the ellipsis sits: it takes the place of the ancestors it stands for,
 *  straight after root. */
const nodes = computed(() => {
  const out = shown.value.map((s) => ({ kind: 'segment', key: `seg-${s.index}`, ...s }))
  if (hidden.value > 0) out.splice(1, 0, { kind: 'ellipsis', key: 'ellipsis' })
  return out
})

let measuring = false

const measure = async () => {
  if (measuring || !line.value) return
  measuring = true
  try {
    // Re-expand first. Measuring from the collapsed state can only ever collapse
    // further, so a widened viewport would never recover a hidden segment.
    hidden.value = 0
    await nextTick()
    const el = line.value
    while (hidden.value < maxHidden.value && el.scrollWidth > el.clientWidth + 1) {
      hidden.value += 1
      await nextTick()
    }
  } finally {
    measuring = false
  }
}

let observer = null
let observedWidth = -1

onMounted(() => {
  measure()
  if (typeof ResizeObserver === 'undefined') return
  // Observe the ROOT (its width is set by the page), never the line (its width
  // is set by content this component mutates — observing that is a feedback loop
  // that re-fires on its own collapse).
  observer = new ResizeObserver(([entry]) => {
    const width = entry.contentRect.width
    if (width === observedWidth) return
    observedWidth = width
    measure()
  })
  observer.observe(root.value)
})

onBeforeUnmount(() => observer?.disconnect())

watch(() => props.segments, measure, { deep: true })

const onNavigate = (node, event) =>
  emit('navigate', { label: node.label, index: node.index, event })
</script>

<template>
  <nav ref="root" class="path-title" :aria-label="ariaLabel">
    <!-- A real heading: on a browse surface this IS the page's h1, so a screen
         reader announces the location as the heading rather than as an
         anonymous list. Ancestor segments are links inside it. -->
    <h1 ref="line" class="path-title__line">
      <template v-for="(node, position) in nodes" :key="node.key">
        <!-- Separator is decorative punctuation: aria-hidden so a reader hears
             "synthetic, documents", not "synthetic slash documents". -->
        <span v-if="position > 0" class="path-title__sep" aria-hidden="true">{{ separator }}</span>

        <span v-if="node.kind === 'ellipsis'" class="path-title__ellipsis">
          <span aria-hidden="true">…</span>
          <!-- The elided range, announced but not shown (AC6). -->
          <span class="path-title__sr-only">{{ hiddenAnnouncement }}</span>
        </span>

        <span
          v-else-if="isCurrent(node.index)"
          class="path-title__segment path-title__segment--current"
          aria-current="page"
          >{{ node.label }}</span
        >

        <component
          :is="hasRouter ? 'router-link' : 'a'"
          v-else-if="node.href"
          v-bind="linkProps(node.href)"
          class="path-title__segment path-title__segment--link"
          @click="onNavigate(node, $event)"
        >
          {{ node.label }}
        </component>

        <!-- An ancestor with no href: still not the current item, but nothing to
             navigate to. Rendered as plain inherited ink, not a dead link. -->
        <span v-else class="path-title__segment">{{ node.label }}</span>
      </template>
    </h1>
  </nav>
</template>

<style scoped>
/*
 * Sets NO background: the path inherits the ambient ink, which is what lets the
 * same component land on the light page and inside a dark AspCard without
 * knowing which it is on (§3.18; the #2415 polarity trap).
 */
.path-title {
  font-family: var(--font-family-base);
}

.path-title__line {
  display: flex;
  align-items: baseline;
  gap: var(--space-2xs);
  /* Never a second line, never a horizontal scrollbar on the page. The clip is
     what `measure()` reads to decide the collapse. */
  flex-wrap: nowrap;
  overflow: hidden;
  /* The page-title scale — NOT shrunk because the title has more parts. Matches
     AspHeading level 1 (`--text-3xl`, bold). */
  font-size: var(--text-3xl);
  font-weight: var(--font-weight-bold);
  line-height: 1.2;
  /* A heading ships no margin of its own — the consumer owns the rhythm, as
     AspHeading does. */
  margin: 0;
}

.path-title__sep {
  flex-shrink: 0;
  /* Punctuation, not content: dimmer than the segments it stands between.
     --text-muted is an alpha over currentColor, so it dims relative to the
     ambient ink rather than naming a colour that only works on one polarity. */
  color: var(--text-muted);
}

.path-title__segment {
  /* Let the flex algorithm shrink a segment below its content width so a single
     very long name truncates instead of forcing the whole path to collapse. */
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border-radius: var(--radius-sm);
}

/*
 * Ancestor links are blue per §1.3 (blue = links and hints) — but NOT raw
 * --text-hint. That token is #82b1ff, tuned for dark surfaces; on the light page
 * (#e4e4e4) it measures ~1.7:1, the #2419 shape, and fails this component's own
 * AA acceptance criterion. Reuse AspProse's / AspBreadcrumb's link derivation
 * verbatim rather than re-deriving a third: mixing a dark accent step into
 * currentColor keeps the blue link identity while inheriting the surface's
 * polarity — it darkens on the light page and stays bright on a dark card. Two
 * link treatments derived independently drift.
 */
.path-title__segment--link {
  color: color-mix(in srgb, var(--brand-accent-800) 30%, currentColor);
  cursor: pointer;
  text-decoration: none;
  transition:
    background var(--transition-fast),
    color var(--transition-fast);
}

/*
 * The distinction from the current item is not colour alone (WCAG 1.4.1, the
 * #2416 precedent): the hover underline is the second channel. Resting ancestors
 * carry the blue; hover adds the underline and the wash so the affordance is
 * unmistakable on interaction.
 */
.path-title__segment--link:hover {
  text-decoration: underline;
  /* PAINTS: a wash of currentColor over the ambient surface — darkens on the
     light page, lightens on a dark card, always a tint of the surface it is on
     rather than a fixed colour that inverts. Measured in the contrast matrix. */
  background: color-mix(in srgb, currentColor 10%, transparent);
}

.path-title__segment--link:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
  /* Paired border — --shadow-focus alone is under the 3:1 non-text minimum
     against both light surfaces (#2371). */
  border: 1px solid currentColor;
}

/*
 * The current segment IS the title: inherited heading ink for whatever surface
 * it sits on (§3.18 inheritor), not a link. No underline, no accent, no hover.
 */
.path-title__segment--current {
  color: inherit;
}

.path-title__ellipsis {
  flex-shrink: 0;
  color: var(--text-muted);
}

/* Visually hidden, still in the accessibility tree — the standard sr-only. */
.path-title__sr-only {
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

@media (prefers-reduced-motion: reduce) {
  .path-title__segment--link {
    transition: none;
  }
}
</style>
