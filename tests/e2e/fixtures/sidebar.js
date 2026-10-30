// Fixture for AspAppShell's forwarded sidebar-header / sidebar-footer slots and
// AspSidebar's bottom-edge collapse toggle (system_3 #8009, §3.8/§3.12).
//   ?collapsed=1   start in the 60px rail
//   ?long=1        a 3000px page, so the sidebar's own end is below the fold
//   ?standalone=1  a bare AspSidebar (no shell), for the mobile ✕ check
import { createApp, h, ref } from 'vue'

import '../../../build/tokens.css'
import { AspAppShell, AspSidebar, AspSidebarLink } from '../../../src/index.js'

const q = new URLSearchParams(location.search)
const collapsed = ref(q.get('collapsed') === '1')
const long = q.get('long') === '1'

const links = () =>
  ['Overview', 'Tasks', 'Agents', 'Processes'].map((label, i) =>
    h(AspSidebarLink, { to: `#${label}`, label, icon: ['⌂', '☰', '◉', '⚙'][i] }),
  )

const brand = ({ collapsed: c }) =>
  h('span', { 'data-test': 'brand', 'data-collapsed': String(c) }, c ? 'S3' : 'System 3')

const footer = ({ collapsed: c }) =>
  h('span', { 'data-test': 'sidebar-footer', 'data-collapsed': String(c) }, 'v1.0')

createApp({
  setup() {
    return () =>
      q.get('standalone') === '1'
        ? h(AspSidebar, { collapsed: false }, { header: brand, default: links })
        : h(
            AspAppShell,
            {
              sidebarCollapsed: collapsed.value,
              'onUpdate:sidebarCollapsed': (v) => {
                // Every emitted value, in order, for the width-crossing spec (#9181).
                window.__collapsedEmits = [...(window.__collapsedEmits || []), v]
                collapsed.value = v
              },
            },
            {
              'sidebar-header': brand,
              sidebar: links,
              'sidebar-footer': footer,
              header: () => h('h1', { 'data-test': 'page-title', style: 'margin:0' }, 'system_3'),
              default: () => h('div', { style: long ? 'height:3000px' : '' }, 'Main content'),
            },
          )
  },
}).mount('#app')
