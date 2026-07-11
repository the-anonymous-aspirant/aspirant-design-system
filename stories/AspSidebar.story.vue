<script setup>
import { ref } from 'vue'
import AspSidebar from '../src/components/AspSidebar.vue'
import AspSidebarLink from '../src/components/AspSidebarLink.vue'

const collapsed = ref(false)
const mobileCollapsed = ref(true)
</script>

<template>
  <Story title="Components/AspSidebar">
    <template #docs>
      <p><strong>Purpose:</strong> primary navigation rail. Handles the collapse/expand pattern from aspirant-client's <code>Sidebar.vue</code> and the mobile hamburger overlay.</p>
      <p><strong>When to use:</strong> as the single primary navigation surface on any application shell.</p>
      <p><strong>When not to use:</strong> for in-page tab navigation — pick a horizontal tabs component (deferred to v1).</p>
    </template>

    <Variant title="Expanded (240px)">
      <div style="display: flex; min-height: 400px; background: var(--surface-page);">
        <AspSidebar v-model:collapsed="collapsed">
          <template #header><strong>Aspirant</strong></template>
          <AspSidebarLink to="/" label="Home" icon="⌂" :active="true" />
          <AspSidebarLink to="/applications" label="Applications" icon="◇" />
          <AspSidebarLink to="/trusted" label="Trusted" icon="✧" badge="3" />
          <AspSidebarLink to="/admin" label="Admin" icon="⚙" />
          <AspSidebarLink to="/support" label="Support" icon="?" />
          <template #footer>
            <small style="color: var(--text-muted);">v0 · aspirant-design-system</small>
          </template>
        </AspSidebar>
        <main style="flex: 1; padding: 24px;">
          Content area. Sidebar is currently
          <em>{{ collapsed ? 'collapsed' : 'expanded' }}</em>.
        </main>
      </div>
    </Variant>

    <Variant title="Collapsed (60px rail)">
      <div style="display: flex; min-height: 400px; background: var(--surface-page);">
        <AspSidebar :collapsed="true">
          <AspSidebarLink to="/" label="Home" icon="⌂" :active="true" />
          <AspSidebarLink to="/applications" label="Applications" icon="◇" />
          <AspSidebarLink to="/trusted" label="Trusted" icon="✧" badge="3" />
          <AspSidebarLink to="/admin" label="Admin" icon="⚙" />
        </AspSidebar>
        <main style="flex: 1; padding: 24px;">
          Labels + badges auto-hide under the collapsed rail (they use the
          `.sidebar-link__label` / `.sidebar-link__badge` classes from
          <code>AspSidebarLink</code>).
        </main>
      </div>
    </Variant>

    <Variant title="Mobile overlay (resize below 768px to see)">
      <div style="min-height: 400px; background: var(--surface-page); position: relative;">
        <AspSidebar v-model:collapsed="mobileCollapsed">
          <template #header><strong>Aspirant</strong></template>
          <AspSidebarLink to="/" label="Home" icon="⌂" :active="true" />
          <AspSidebarLink to="/applications" label="Applications" icon="◇" />
        </AspSidebar>
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
        <AspSidebar :show-toggle="false">
          <AspSidebarLink to="/active" label="Active" icon="●" :active="true" />
          <AspSidebarLink to="/hover" label="Default" icon="○" />
          <AspSidebarLink to="/badge" label="With badge" icon="◐" badge="12" />
          <AspSidebarLink to="/disabled" label="Disabled" icon="⌀" :disabled="true" />
        </AspSidebar>
      </div>
    </Variant>

    <Variant title="Dark theme">
      <div data-theme="dark" style="display: flex; min-height: 300px; background: var(--surface-page);">
        <AspSidebar>
          <AspSidebarLink to="/" label="Home" icon="⌂" :active="true" />
          <AspSidebarLink to="/applications" label="Applications" icon="◇" />
          <AspSidebarLink to="/support" label="Support" icon="?" />
        </AspSidebar>
        <main style="flex: 1; padding: 24px; color: var(--text-on-light);">
          Dark theme surface tokens applied.
        </main>
      </div>
    </Variant>
  </Story>
</template>
