<script setup>
import { ref } from 'vue'
import AsSidebar from '../src/components/AsSidebar.vue'
import AsSidebarLink from '../src/components/AsSidebarLink.vue'

const collapsed = ref(false)
const mobileCollapsed = ref(true)
</script>

<template>
  <Story title="Components/AsSidebar">
    <template #docs>
      <p><strong>Purpose:</strong> primary navigation rail. Handles the collapse/expand pattern from aspirant-client's <code>Sidebar.vue</code> and the mobile hamburger overlay.</p>
      <p><strong>When to use:</strong> as the single primary navigation surface on any application shell.</p>
      <p><strong>When not to use:</strong> for in-page tab navigation — pick a horizontal tabs component (deferred to v1).</p>
    </template>

    <Variant title="Expanded (240px)">
      <div style="display: flex; min-height: 400px; background: var(--surface-page);">
        <AsSidebar v-model:collapsed="collapsed">
          <template #header><strong>Aspirant</strong></template>
          <AsSidebarLink to="/" label="Home" icon="⌂" :active="true" />
          <AsSidebarLink to="/applications" label="Applications" icon="◇" />
          <AsSidebarLink to="/trusted" label="Trusted" icon="✧" badge="3" />
          <AsSidebarLink to="/admin" label="Admin" icon="⚙" />
          <AsSidebarLink to="/support" label="Support" icon="?" />
          <template #footer>
            <small style="color: var(--text-muted);">v0 · aspirant-design-system</small>
          </template>
        </AsSidebar>
        <main style="flex: 1; padding: 24px;">
          Content area. Sidebar is currently
          <em>{{ collapsed ? 'collapsed' : 'expanded' }}</em>.
        </main>
      </div>
    </Variant>

    <Variant title="Collapsed (60px rail)">
      <div style="display: flex; min-height: 400px; background: var(--surface-page);">
        <AsSidebar :collapsed="true">
          <AsSidebarLink to="/" label="Home" icon="⌂" :active="true" />
          <AsSidebarLink to="/applications" label="Applications" icon="◇" />
          <AsSidebarLink to="/trusted" label="Trusted" icon="✧" badge="3" />
          <AsSidebarLink to="/admin" label="Admin" icon="⚙" />
        </AsSidebar>
        <main style="flex: 1; padding: 24px;">
          Labels + badges auto-hide under the collapsed rail (they use the
          `.sidebar-link__label` / `.sidebar-link__badge` classes from
          <code>AsSidebarLink</code>).
        </main>
      </div>
    </Variant>

    <Variant title="Mobile overlay (resize below 768px to see)">
      <div style="min-height: 400px; background: var(--surface-page); position: relative;">
        <AsSidebar v-model:collapsed="mobileCollapsed">
          <template #header><strong>Aspirant</strong></template>
          <AsSidebarLink to="/" label="Home" icon="⌂" :active="true" />
          <AsSidebarLink to="/applications" label="Applications" icon="◇" />
        </AsSidebar>
        <main style="padding: 24px;">
          <button type="button" @click="mobileCollapsed = !mobileCollapsed">
            Toggle sidebar ({{ mobileCollapsed ? 'closed' : 'open' }})
          </button>
          <p>Below the <code>--breakpoint-md</code> (768px), the sidebar becomes an off-canvas overlay with a click-to-close mask.</p>
        </main>
      </div>
    </Variant>

    <Variant title="Link states">
      <div style="display: flex; min-height: 200px; background: var(--surface-page);">
        <AsSidebar :show-toggle="false">
          <AsSidebarLink to="/active" label="Active" icon="●" :active="true" />
          <AsSidebarLink to="/hover" label="Default" icon="○" />
          <AsSidebarLink to="/badge" label="With badge" icon="◐" badge="12" />
          <AsSidebarLink to="/disabled" label="Disabled" icon="⌀" :disabled="true" />
        </AsSidebar>
      </div>
    </Variant>

    <Variant title="Dark theme">
      <div data-theme="dark" style="display: flex; min-height: 300px; background: var(--surface-page);">
        <AsSidebar>
          <AsSidebarLink to="/" label="Home" icon="⌂" :active="true" />
          <AsSidebarLink to="/applications" label="Applications" icon="◇" />
          <AsSidebarLink to="/support" label="Support" icon="?" />
        </AsSidebar>
        <main style="flex: 1; padding: 24px; color: var(--text-on-light);">
          Dark theme surface tokens applied.
        </main>
      </div>
    </Variant>
  </Story>
</template>
