<script setup>
import { computed, provide, watch } from 'vue'
import { useMobile } from '../composables/useMobile.js'

const props = defineProps({
  collapsed: { type: Boolean, default: false },
  width: { type: String, default: '240px' },
  collapsedWidth: { type: String, default: '60px' },
  hideOnMobile: { type: Boolean, default: false },
  showToggle: { type: Boolean, default: true },
})

const emit = defineEmits(['update:collapsed'])

const { isMobile } = useMobile()

// On mobile the collapsed prop toggles overlay visibility (collapsed = hidden).
const mobileHidden = computed(() => isMobile.value && props.collapsed)

const rootStyle = computed(() => {
  if (isMobile.value) return { width: props.width }
  return { width: props.collapsed ? props.collapsedWidth : props.width }
})

const rootClasses = computed(() => ({
  sidebar: true,
  'sidebar--collapsed': props.collapsed && !isMobile.value,
  'sidebar--mobile': isMobile.value,
  'sidebar--mobile-hidden': mobileHidden.value,
  'sidebar--hidden': isMobile.value && props.hideOnMobile,
}))

// The desktop rail state the header/footer slots receive. On mobile `collapsed`
// means "overlay hidden", not "rail", so the slots always get false there.
const railCollapsed = computed(() => props.collapsed && !isMobile.value)
// AspSidebarLink reads the rail state to show its label tooltip and keep its
// accessible name while the label is hidden (§3.119 R6, system_3 #9138).
provide('aspSidebar', { railCollapsed })

const overlayVisible = computed(
  () => isMobile.value && !mobileHidden.value && !props.hideOnMobile
)

const toggle = () => {
  emit('update:collapsed', !props.collapsed)
}

// Auto-collapse on mobile viewport change to keep overlay closed by default.
watch(isMobile, (nowMobile, wasMobile) => {
  if (nowMobile && !wasMobile && !props.collapsed) {
    emit('update:collapsed', true)
  }
})
</script>

<template>
  <div v-if="overlayVisible" class="sidebar-overlay" @click="toggle" />
  <aside :class="rootClasses" :style="rootStyle" aria-label="Primary navigation">
    <div v-if="$slots.header" class="sidebar__header">
      <slot name="header" :collapsed="railCollapsed" />
    </div>
    <nav class="sidebar__links">
      <slot />
    </nav>
    <div v-if="$slots.footer" class="sidebar__footer">
      <slot name="footer" :collapsed="railCollapsed" />
    </div>
    <button
      v-if="showToggle"
      class="sidebar__toggle"
      type="button"
      :aria-expanded="!collapsed"
      :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
      @click="toggle"
    >
      <span aria-hidden="true">{{ isMobile ? '✕' : (collapsed ? '›' : '‹') }}</span>
    </button>
  </aside>
</template>

<style scoped>
.sidebar {
  position: relative;
  display: flex;
  flex-direction: column;
  background: var(--surface-card);
  color: var(--text-on-dark);
  min-height: 100vh;
  transition: width var(--transition-moderate);
  font-family: var(--font-family-base);
  z-index: var(--z-index-sticky, 500);
  border-right: 1px solid var(--surface-card-inner);
}

.sidebar__header {
  padding: var(--space-md);
  border-bottom: 1px solid var(--surface-card-inner);
  /* Brand block (§3.8: "bigger + centered at the top of the sidebar"). The
     content is the consumer's; the slot receives { collapsed } so it can
     swap to its short form ("S3") in the rail, where the header stays. */
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: var(--text-xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-heading-card);
}

.sidebar--collapsed .sidebar__header {
  padding: var(--space-sm) var(--space-2xs);
}

.sidebar__links {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xs);
  padding: var(--space-sm);
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--brand-accent) var(--surface-card);
}

.sidebar__links::-webkit-scrollbar {
  width: 6px;
}
.sidebar__links::-webkit-scrollbar-thumb {
  background: var(--brand-accent);
  border-radius: 3px;
}

.sidebar__footer {
  padding: var(--space-md);
  border-top: 1px solid var(--surface-card-inner);
}

.sidebar__toggle {
  width: var(--space-lg);
  height: var(--space-lg);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--transition-fast), color var(--transition-fast);
}
.sidebar__toggle:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
}

/* Desktop (§3.12): a muted chevron pinned at the sidebar's BOTTOM edge, inside
   the rail, so it can never sit over the consumer's header title (it used to be
   absolute at the top, outset 16px past the edge, and did -- system_3 #7972).
   The sidebar is min-height 100vh in a stretched row, so on a long page its
   end is below the fold; sticky keeps the chevron at the visible bottom. The
   card background lets it read cleanly over anything that scrolls beneath. */
.sidebar:not(.sidebar--mobile) .sidebar__toggle {
  position: sticky;
  bottom: 0;
  align-self: center;
  margin: var(--space-xs) 0 var(--space-sm);
  border: none;
  border-radius: var(--radius-md);
  background: var(--surface-card);
  color: var(--text-muted);
  font-size: var(--text-lg);
}
.sidebar:not(.sidebar--mobile) .sidebar__toggle:hover {
  color: var(--text-on-dark);
}

/* Mobile: the ✕ keeps its original placement and look, unchanged. */
.sidebar--mobile .sidebar__toggle {
  position: absolute;
  top: var(--space-sm);
  right: calc(-1 * var(--space-md));
  border-radius: var(--radius-full);
  border: 1px solid var(--surface-card-inner);
  background: var(--surface-card);
  color: var(--text-on-dark);
}
.sidebar--mobile .sidebar__toggle:hover {
  /* No colour override: the base rule's --text-on-dark is correct here. The
     hover surface is amber-over---surface-card, i.e. still dark chrome. */
  background: var(--brand-primary-alpha);
}

/* Collapsed desktop: hide label text of child links via CSS attribute selector
   so consumers using AspSidebarLink automatically compact. Consumers using other
   link renderers can opt-in with the .sidebar-link__label class. */
.sidebar--collapsed :deep(.sidebar-link__label),
.sidebar--collapsed :deep(.sidebar-link__badge),
.sidebar--collapsed .sidebar__footer {
  display: none;
}

/* Mobile overlay pattern — full-height off-canvas that slides in from left. */
.sidebar--mobile {
  position: fixed;
  top: 0;
  left: 0;
  transform: translateX(0);
  transition:
    transform var(--transition-moderate),
    box-shadow var(--transition-moderate);
  box-shadow: var(--shadow-lg);
  z-index: var(--z-index-modal, 1000);
}

/* Hidden off-canvas, the sidebar sheds its shadow (§3.119 decision 2, system_3
   #9135): translated by -100% it still cast --shadow-lg ~20px into the page,
   a grey ramp at x = 0-22 on every phone route (#9104 B1-12). */
.sidebar--mobile.sidebar--mobile-hidden {
  transform: translateX(-100%);
  box-shadow: none;
}

.sidebar--hidden {
  display: none;
}

.sidebar-overlay {
  position: fixed;
  inset: 0;
  /* Same wash as AspModal — tokenised when the modal needed it, identical value. */
  background: var(--surface-scrim);
  z-index: calc(var(--z-index-modal, 1000) - 1);
  animation: sidebar-overlay-fade-in var(--transition-fast) ease-out;
}

@keyframes sidebar-overlay-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .sidebar,
  .sidebar--mobile { transition: none; }
  .sidebar-overlay { animation: none; }
}
</style>
