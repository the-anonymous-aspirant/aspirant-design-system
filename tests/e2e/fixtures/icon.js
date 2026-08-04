// Two AspIcons: one that resolves to the SVG arm (an unmapped registry name)
// and one that resolves to the image arm (a name aliasing an asset_map.json
// entry). Neither VITE_ICON_BASE nor any other env var is set for this dev
// server, so both mount under AspIcon's real "unconfigured" contract.
//
// window.fetch is wrapped (not mocked) so the spec can prove the SVG arm made
// zero network calls, rather than inferring it from the rendered glyph alone.
import { createApp, h } from 'vue'

import '../../../build/tokens.css'
import { AspIcon } from '../../../src/index.js'

window.__fetchCalls = []
const realFetch = window.fetch.bind(window)
window.fetch = (...args) => {
  window.__fetchCalls.push(String(args[0]))
  return realFetch(...args)
}

createApp({
  setup() {
    return () =>
      h('div', { style: 'padding:24px' }, [
        // registry.js: search -> { glyph: '⌕', asset: null } -- SVG arm.
        h('div', { id: 'svgArm' }, h(AspIcon, { name: 'search', label: 'Search' })),
        // registry.js: home -> { glyph: '⌂', asset: 'home_icon' } -- image arm.
        h('div', { id: 'imgArm' }, h(AspIcon, { name: 'home', label: 'Home' })),
      ])
  },
}).mount('#app')
