<script setup>
import { computed, getCurrentInstance } from 'vue'
import AspIcon from './AspIcon.vue'

const props = defineProps({
  to: { type: String, required: true },
  label: { type: String, required: true },
  // `icon` is an icon key looked up in the shared registry (see
  // src/icons/registry.js) — e.g. "home", "applications". The Unicode
  // fallback glyph is defined once at the registry and inherited here.
  icon: { type: String, default: null },
  badge: { type: [String, Number], default: null },
  active: { type: Boolean, default: null },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['click'])

const instance = getCurrentInstance()

// Detect vue-router at runtime without importing it — keeps DS router-agnostic.
// $router is installed on globalProperties by createRouter(...)+app.use(router).
const hasRouter = computed(() =>
  Boolean(instance?.appContext?.config?.globalProperties?.$router)
)

const currentRoute = computed(() => {
  if (!hasRouter.value) return null
  const router = instance.appContext.config.globalProperties.$router
  return router.currentRoute?.value?.path ?? null
})

// active prop wins; else auto-detect via route match; else false.
const isActive = computed(() => {
  if (props.active !== null) return props.active
  return currentRoute.value === props.to
})

const onClick = (event) => {
  if (props.disabled) {
    event.preventDefault()
    return
  }
  emit('click', event)
}
</script>

<template>
  <router-link
    v-if="hasRouter"
    :to="to"
    :class="['sidebar-link', { 'sidebar-link--active': isActive, 'sidebar-link--disabled': disabled }]"
    :aria-disabled="disabled || undefined"
    :tabindex="disabled ? -1 : 0"
    @click="onClick"
  >
    <AspIcon v-if="icon" :name="icon" size="md" class="sidebar-link__icon" />
    <span class="sidebar-link__label">{{ label }}</span>
    <span v-if="badge !== null && badge !== ''" class="sidebar-link__badge">{{ badge }}</span>
  </router-link>
  <a
    v-else
    :href="disabled ? undefined : to"
    :class="['sidebar-link', { 'sidebar-link--active': isActive, 'sidebar-link--disabled': disabled }]"
    :aria-disabled="disabled || undefined"
    :tabindex="disabled ? -1 : 0"
    @click="onClick"
  >
    <AspIcon v-if="icon" :name="icon" size="md" class="sidebar-link__icon" />
    <span class="sidebar-link__label">{{ label }}</span>
    <span v-if="badge !== null && badge !== ''" class="sidebar-link__badge">{{ badge }}</span>
  </a>
</template>

<style scoped>
.sidebar-link {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) var(--space-md);
  color: var(--brand-primary);
  text-decoration: none;
  font-family: var(--font-family-base);
  font-size: var(--text-base);
  font-weight: var(--font-weight-medium);
  border-radius: var(--radius-md);
  transition: color var(--transition-fast), background var(--transition-fast);
  outline: none;
}

.sidebar-link:hover {
  color: var(--text-on-dark);
  background: var(--surface-card-inner);
}

.sidebar-link:focus-visible {
  box-shadow: var(--shadow-focus);
}

.sidebar-link--active {
  color: var(--text-on-dark);
  background: var(--surface-card-inner);
  font-weight: var(--font-weight-bold);
}

.sidebar-link--disabled {
  opacity: 0.5;
  pointer-events: none;
}

.sidebar-link__icon {
  flex-shrink: 0;
}

.sidebar-link__label {
  flex: 1;
}

.sidebar-link__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5em;
  padding: 0 var(--space-2xs);
  font-size: var(--text-xs);
  font-weight: var(--font-weight-bold);
  color: var(--text-on-light);
  background: var(--brand-primary);
  border-radius: var(--radius-pill);
}
</style>
