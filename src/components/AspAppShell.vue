<script setup>
import { computed, useSlots } from 'vue'
import { useMobile } from '../composables/useMobile.js'
import AspSidebar from './AspSidebar.vue'

const props = defineProps({
  /** Sidebar collapse state — `v-model:sidebar-collapsed`. */
  sidebarCollapsed: {
    type: Boolean,
    default: false,
  },
  /** Render the left sidebar. Set false for a full-width, chrome-light page. */
  hasSidebar: {
    type: Boolean,
    default: true,
  },
  /** Main-content padding preset. */
  contentPadding: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v),
  },
})

const emit = defineEmits(['update:sidebarCollapsed'])

const slots = useSlots()
const { isMobile } = useMobile()

// The header bar renders when the consumer provides header content, OR when a
// sidebar exists on mobile (so the hamburger always has a home to open the
// off-canvas nav from).
const showHeader = computed(
  () => !!slots.header || (props.hasSidebar && isMobile.value)
)

const contentClasses = computed(() => [
  'app-shell__content',
  `app-shell__content--pad-${props.contentPadding}`,
])

const setCollapsed = (value) => emit('update:sidebarCollapsed', value)
</script>

<template>
  <div class="app-shell" :class="{ 'app-shell--no-sidebar': !hasSidebar }">
    <AspSidebar
      v-if="hasSidebar"
      :collapsed="sidebarCollapsed"
      :show-toggle="!isMobile"
      @update:collapsed="setCollapsed"
    >
      <slot name="sidebar" />
    </AspSidebar>

    <div class="app-shell__body">
      <header v-if="showHeader" class="app-shell__header">
        <button
          v-if="hasSidebar"
          type="button"
          class="app-shell__menu"
          :aria-expanded="!sidebarCollapsed"
          aria-label="Toggle navigation"
          @click="setCollapsed(!sidebarCollapsed)"
        >
          <span aria-hidden="true">☰</span>
        </button>
        <div class="app-shell__header-content">
          <slot name="header" />
        </div>
      </header>

      <main :class="contentClasses">
        <slot />
      </main>

      <footer v-if="$slots.footer" class="app-shell__footer">
        <slot name="footer" />
      </footer>
    </div>
  </div>
</template>

<style scoped>
/* Mobile-first: the sidebar positions itself (fixed overlay on mobile, in-flow
   rail on desktop) via AspSidebar's own useMobile logic, so this flex row is
   correct at every width without a media query of its own. */
.app-shell {
  display: flex;
  min-height: 100vh;
  background: var(--surface-page);
  color: var(--text-on-light);
  font-family: var(--font-family-base);
}

.app-shell__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0; /* let content shrink instead of forcing horizontal overflow */
}

.app-shell__header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--border-subtle);
}

.app-shell__header-content {
  flex: 1;
  min-width: 0;
}

.app-shell__menu {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--space-lg);
  height: var(--space-lg);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--surface-card);
  color: var(--text-on-dark);
  font-size: var(--text-lg);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.app-shell__menu:hover {
  background: var(--brand-primary-alpha);
  color: var(--text-on-light);
}

.app-shell__menu:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
}

.app-shell__content {
  flex: 1;
  min-width: 0;
}

.app-shell__content--pad-sm {
  padding: var(--space-sm);
}

.app-shell__content--pad-md {
  padding: var(--space-md);
}

.app-shell__content--pad-lg {
  padding: var(--space-lg);
}

.app-shell__footer {
  padding: var(--space-md);
  border-top: 1px solid var(--border-subtle);
  color: var(--text-muted);
  font-size: var(--text-sm);
}

/* Desktop: the sidebar carries its own toggle, so the header hamburger is
   mobile-only. */
@media (min-width: 768px) {
  .app-shell__menu {
    display: none;
  }
}
</style>
