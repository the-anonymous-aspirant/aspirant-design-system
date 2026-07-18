<script setup>
import { computed, watch } from 'vue'
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
      <slot name="header" />
    </div>
    <nav class="sidebar__links">
      <slot />
    </nav>
    <div v-if="$slots.footer" class="sidebar__footer">
      <slot name="footer" />
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
  position: absolute;
  top: var(--space-sm);
  right: calc(-1 * var(--space-md));
  width: var(--space-lg);
  height: var(--space-lg);
  border-radius: var(--radius-full);
  border: 1px solid var(--surface-card-inner);
  background: var(--surface-card);
  color: var(--text-on-dark);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--transition-fast);
}
.sidebar__toggle:hover {
  /* No colour override: the base rule's --text-on-dark is correct here. The
     hover surface is amber-over---surface-card, i.e. still dark chrome. */
  background: var(--brand-primary-alpha);
}
.sidebar__toggle:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
}

/* Collapsed desktop: hide label text of child links via CSS attribute selector
   so consumers using AspSidebarLink automatically compact. Consumers using other
   link renderers can opt-in with the .sidebar-link__label class. */
.sidebar--collapsed :deep(.sidebar-link__label),
.sidebar--collapsed :deep(.sidebar-link__badge),
.sidebar--collapsed .sidebar__header,
.sidebar--collapsed .sidebar__footer {
  display: none;
}

/* Mobile overlay pattern — full-height off-canvas that slides in from left. */
.sidebar--mobile {
  position: fixed;
  top: 0;
  left: 0;
  transform: translateX(0);
  transition: transform var(--transition-moderate);
  box-shadow: var(--shadow-lg);
  z-index: var(--z-index-modal, 1000);
}

.sidebar--mobile.sidebar--mobile-hidden {
  transform: translateX(-100%);
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
