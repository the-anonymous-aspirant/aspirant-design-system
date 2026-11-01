// The five console nav names registered for system_3 #8018, rendered through
// AspSidebarLink inside an AspAppShell sidebar, plus the registry reads the
// spec pins.
//   ?collapsed=1   start in the 60px rail
//   ?theme=dark    dark tokens
//
// window.fetch is wrapped (not mocked) so the spec can prove no name reaches
// the network while VITE_ICON_BASE is unset, as in icon.js.
import { createApp, h, ref } from 'vue'

import '../../../build/tokens.css'
import assetMap from '../../../src/icons/asset_map.json'
import { AspAppShell, AspIcon, AspSidebarLink, registryAsset, registryFallback } from '../../../src/index.js'

const NAV = ['agents', 'tasks', 'processes', 'corpus', 'artifacts']
// The agent page's subpage names (#9412), rendered the same way, and once
// more at sm and md for the size check.
const SUBPAGES = ['responsibilities', 'improvement', 'owns', 'activity']

const q = new URLSearchParams(location.search)
if (q.get('theme') === 'dark') document.documentElement.dataset.theme = 'dark'
const collapsed = ref(q.get('collapsed') === '1')

window.__fetchCalls = []
const realFetch = window.fetch.bind(window)
window.fetch = (...args) => {
  window.__fetchCalls.push(String(args[0]))
  return realFetch(...args)
}

window.__registry = Object.fromEntries(
  [...NAV, ...SUBPAGES].map((n) => [
    n,
    { glyph: registryFallback(n), asset: registryAsset(n), mapped: registryAsset(n) in assetMap },
  ])
)

createApp({
  setup() {
    return () =>
      h(
        AspAppShell,
        {
          sidebarCollapsed: collapsed.value,
          'onUpdate:sidebarCollapsed': (v) => {
            collapsed.value = v
          },
        },
        {
          sidebar: () =>
            [...NAV, ...SUBPAGES].map((n) =>
              h(AspSidebarLink, {
                to: `#${n}`,
                label: n[0].toUpperCase() + n.slice(1),
                icon: n,
                'data-test': `nav-${n}`,
              })
            ),
          header: () => h('h1', { style: 'margin:0' }, 'Nav glyphs'),
          default: () => [
            h('div', 'Main content'),
            h(
              'div',
              { 'data-test': 'subpage-sizes', style: 'display:flex;gap:24px;align-items:baseline;margin-top:24px' },
              SUBPAGES.flatMap((n) =>
                ['sm', 'md'].map((size) =>
                  h('span', { 'data-test': `glyph-${n}-${size}`, style: 'display:inline-flex;align-items:center;gap:6px' }, [
                    h(AspIcon, { name: n, size }),
                    h('small', `${n} ${size}`),
                  ])
                )
              )
            ),
          ],
        }
      )
  },
}).mount('#app')
