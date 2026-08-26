// Barrel export for @aspirant/design-system v0.
// Consumers:
//   import { AspCard, AspButton, AspSidebar, AspSidebarLink, AspIcon } from '@aspirant/design-system'
//   import '@aspirant/design-system/tokens.css'
//
// base.css ships the universal box-sizing:border-box reset every component's
// scoped styles assume (#4330) — imported here (not per-component) so it
// lands once in the bundled dist/style.css output.
import './base.css'
//
// Every component is exported statically here — the barrel stays a plain,
// single import path. Three peers (chart.js, marked, highlight.js) are declared
// OPTIONAL in package.json; the components that use them (AspChart, AspBarChart,
// AspContent) keep them out of the module graph by importing them at RUNTIME
// (`await import()`), not at module scope. A static re-export here is therefore
// safe: it pulls in the component code, not its heavy dependency. See those
// components for why a static `import` would break a consumer that installed
// none of the three (system_3 #2636).
export { default as AspCard } from './components/AspCard.vue'
export { default as AspButton } from './components/AspButton.vue'
export { default as AspSegmented } from './components/AspSegmented.vue'
export { default as AspSelect } from './components/AspSelect.vue'
export { default as AspSidebar } from './components/AspSidebar.vue'
export { default as AspSidebarLink } from './components/AspSidebarLink.vue'
export { default as AspCheckbox } from './components/AspCheckbox.vue'
export { default as AspChart } from './components/AspChart.vue'
export { default as AspBarChart } from './components/AspBarChart.vue'
export { default as AspAppShell } from './components/AspAppShell.vue'
export { default as AspIcon } from './components/AspIcon.vue'
export { default as AspEmptyState } from './components/AspEmptyState.vue'
export { default as AspBadge } from './components/AspBadge.vue'
export { default as AspDataTable } from './components/AspDataTable.vue'
export { default as AspInput } from './components/AspInput.vue'
export { default as AspTextarea } from './components/AspTextarea.vue'
export { default as AspModal } from './components/AspModal.vue'
export { default as AspBackButton } from './components/AspBackButton.vue'
export { default as AspHeading } from './components/AspHeading.vue'
export { default as AspProse } from './components/AspProse.vue'
export { default as AspContent } from './components/AspContent.vue'
export { default as AspList } from './components/AspList.vue'
export { default as AspListItem } from './components/AspListItem.vue'
export { default as AspTimeSince } from './components/AspTimeSince.vue'
export { default as AspFreshness } from './components/AspFreshness.vue'
export { default as AspChatArea } from './components/AspChatArea.vue'
export { default as AspChatBubble } from './components/AspChatBubble.vue'
export { default as AspComposer } from './components/AspComposer.vue'
export { default as AspTooltip } from './components/AspTooltip.vue'
export { default as AspSplitPane } from './components/AspSplitPane.vue'
export { default as AspSkeleton } from './components/AspSkeleton.vue'
export { default as AspPathTitle } from './components/AspPathTitle.vue'

export { useMobile } from './composables/useMobile.js'
export { useFocusTrap } from './composables/useFocusTrap.js'
export { useIconBase, isIconBaseConfigured } from './composables/useIconBase.js'
export { iconRegistry, registryFallback, registryAsset } from './icons/registry.js'

// §3.60 value-axis range-normalization. Bars inherit it inside buildBarOptions
// (AspBarChart), but the one raw line mount (system_3 HealthDetails drilldown)
// has no preset and consumes this helper directly — one source, two call sites.
export { normalizeValueDomain } from './utils/normalize_value_domain.js'
