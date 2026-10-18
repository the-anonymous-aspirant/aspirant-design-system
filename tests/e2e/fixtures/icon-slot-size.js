// A named icon and a raw glyph side by side in the same text slot (§3.113,
// system_3 #8019): AspSidebarLink in an AspAppShell sidebar, and AspListItem.
// `home` aliases an asset_map.json entry (asset path), `search` is glyph-only
// (fallback path), `◉` is a raw glyph rendered verbatim. The #standalone row
// holds the sm icons outside a text slot, which must keep AspIcon's 1rem.
//   ?collapsed=1   start in the 60px rail
//   ?theme=dark    dark tokens
import { createApp, h, ref } from 'vue'

import '../../../build/tokens.css'
import {
  AspAppShell,
  AspBackButton,
  AspComposer,
  AspInput,
  AspList,
  AspListItem,
  AspSidebarLink,
} from '../../../src/index.js'

const ICONS = [
  ['named-asset', 'home'],
  ['named-glyph', 'search'],
  ['raw', '◉'],
]

const q = new URLSearchParams(location.search)
if (q.get('theme') === 'dark') document.documentElement.dataset.theme = 'dark'
const collapsed = ref(q.get('collapsed') === '1')

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
            ICONS.map(([id, icon]) =>
              h(AspSidebarLink, { to: `#${id}`, label: id, icon, 'data-test': `link-${id}` }),
            ),
          header: () => h('h1', { style: 'margin:0' }, 'Icon slot size'),
          default: () => [
            h('div', { id: 'list' }, [
              h(AspList, { ariaLabel: 'icons' }, () =>
                ICONS.map(([id, icon]) => h(AspListItem, { key: id, label: id, icon })),
              ),
            ]),
            h('div', { id: 'standalone' }, [
              h(AspBackButton, { to: '#back' }),
              h(AspInput, { type: 'search', label: 'Search', modelValue: '' }),
              h(AspComposer, { attachments: [] }),
            ]),
          ],
        },
      )
  },
}).mount('#app')
