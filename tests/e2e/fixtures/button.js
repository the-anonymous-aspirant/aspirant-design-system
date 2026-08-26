// Fixture for the icon-only AspButton affordance (§3.89, #4328): the four
// variants in icon shape (each with an accessible name), a lone-glyph geometry
// probe, a deliberately un-named icon button (to exercise the a11y dev-warn),
// and a plain text button (backward-compat baseline).
import { createApp, h } from 'vue'

import '../../../build/tokens.css'
import { AspButton } from '../../../src/index.js'

const iconBtn = (id, variant, label) =>
  h('section', { id, style: 'margin:8px' }, [
    h(AspButton, { size: 'icon', variant, 'aria-label': label }, () => '★'),
  ])

createApp({
  setup() {
    return () =>
      h('div', { style: 'padding:24px; display:flex; flex-wrap:wrap; gap:8px' }, [
        iconBtn('icon-primary', 'primary', 'Favourite'),
        iconBtn('icon-secondary', 'secondary', 'Favourite'),
        iconBtn('icon-ghost', 'ghost', 'Favourite'),
        iconBtn('icon-destructive', 'destructive', 'Delete'),
        // No aria-label / aria-labelledby → must trigger the dev-warn.
        h('section', { id: 'icon-noname', style: 'margin:8px' }, [
          h(AspButton, { size: 'icon', variant: 'ghost' }, () => '★'),
        ]),
        // A wide glyph must NOT stretch the square — the box stays fixed.
        h('section', { id: 'icon-wide', style: 'margin:8px' }, [
          h(AspButton, { size: 'icon', variant: 'ghost', 'aria-label': 'Wide' }, () =>
            'WWWWWWWW',
          ),
        ]),
        // Backward-compat baseline: an ordinary text button, unchanged.
        h('section', { id: 'text', style: 'margin:8px' }, [
          h(AspButton, { variant: 'primary' }, () => 'Save changes'),
        ]),
      ])
  },
}).mount('#app')
