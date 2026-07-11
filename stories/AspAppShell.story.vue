<script setup>
import { ref } from 'vue'
import AspAppShell from '../src/components/AspAppShell.vue'
import AspSidebarLink from '../src/components/AspSidebarLink.vue'
import AspCard from '../src/components/AspCard.vue'

const collapsedA = ref(false)
const collapsedB = ref(false)
const collapsedDark = ref(false)
</script>

<template>
  <Story title="Components/AspAppShell" :layout="{ type: 'single', iframe: true }">
    <template #docs>
      <p><strong>Purpose:</strong> the standard page scaffold — a left <code>AspSidebar</code> plus optional header, main content, and footer — so every app surface shares one shell instead of re-inventing it.</p>
      <p><strong>Props:</strong> <code>v-model:sidebar-collapsed</code>, <code>hasSidebar</code> (default true), <code>contentPadding</code> (sm | md | lg).</p>
      <p><strong>Slots:</strong> <code>sidebar</code> (nav contents), <code>header</code>, default (main), <code>footer</code>.</p>
      <p><strong>Mobile-first:</strong> below <code>--breakpoint-md</code> the sidebar auto-collapses to an off-canvas overlay, a hamburger appears in the header, and content flows full width. Use the Histoire viewport toolbar to shrink below 768px to see it.</p>
      <p><strong>When not to use:</strong> a bare content page with no nav — just render your content; the shell is for the app frame.</p>
    </template>

    <Variant title="Standard (sidebar + header + main + footer)">
      <AspAppShell v-model:sidebar-collapsed="collapsedA">
        <template #sidebar>
          <AspSidebarLink to="#" label="Dashboard" :active="true" />
          <AspSidebarLink to="#" label="Applications" />
          <AspSidebarLink to="#" label="Reports" />
          <AspSidebarLink to="#" label="Settings" />
        </template>
        <template #header>
          <strong style="color: var(--text-on-light);">Aspirant</strong>
        </template>
        <AspCard>
          <template #header>Main content</template>
          The default slot is the page body. Resize the frame below 768px to watch the
          sidebar collapse to an overlay and the hamburger appear.
        </AspCard>
        <template #footer>© aspirant — design system shell</template>
      </AspAppShell>
    </Variant>

    <Variant title="Minimal (no sidebar)">
      <AspAppShell :has-sidebar="false" content-padding="lg">
        <template #header>
          <strong style="color: var(--text-on-light);">Full-width surface</strong>
        </template>
        <AspCard>
          <template #header>No sidebar</template>
          With <code>:has-sidebar="false"</code> the content spans the full width — useful
          for focused/reading surfaces.
        </AspCard>
      </AspAppShell>
    </Variant>

    <Variant title="Content padding: lg + collapsed sidebar">
      <AspAppShell v-model:sidebar-collapsed="collapsedB" content-padding="lg">
        <template #sidebar>
          <AspSidebarLink to="#" label="Home" :active="true" />
          <AspSidebarLink to="#" label="Queue" />
        </template>
        <AspCard>
          <template #header>Roomy padding</template>
          Toggle the sidebar with its edge control; the main area keeps <code>lg</code> padding.
        </AspCard>
      </AspAppShell>
    </Variant>

    <Variant title="Dark theme">
      <div data-theme="dark">
        <AspAppShell v-model:sidebar-collapsed="collapsedDark">
          <template #sidebar>
            <AspSidebarLink to="#" label="Dashboard" :active="true" />
            <AspSidebarLink to="#" label="Health" />
            <AspSidebarLink to="#" label="Comms" />
          </template>
          <template #header>
            <strong style="color: var(--text-on-light);">Dark shell</strong>
          </template>
          <AspCard>
            <template #header>Dark theme</template>
            The whole shell re-maps its surfaces under <code>[data-theme="dark"]</code>.
          </AspCard>
          <template #footer>Footer on the dark ground</template>
        </AspAppShell>
      </div>
    </Variant>
  </Story>
</template>
