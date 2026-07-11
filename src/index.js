// Barrel export for @aspirant/design-system v0.
// Consumers:
//   import { AspCard, AspButton, AspSidebar, AspSidebarLink, AspIcon } from '@aspirant/design-system'
//   import '@aspirant/design-system/tokens.css'
export { default as AspCard } from './components/AspCard.vue'
export { default as AspButton } from './components/AspButton.vue'
export { default as AspSidebar } from './components/AspSidebar.vue'
export { default as AspSidebarLink } from './components/AspSidebarLink.vue'
export { default as AspIcon } from './components/AspIcon.vue'

export { useMobile } from './composables/useMobile.js'
export { useIconBase } from './composables/useIconBase.js'
export { iconRegistry, registryFallback } from './icons/registry.js'
