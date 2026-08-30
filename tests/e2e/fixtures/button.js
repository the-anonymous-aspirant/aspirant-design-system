// Fixture for AspButton's non-default shapes: the icon-only affordance (§3.89,
// #4328) and the unboxed inline `variant="link"` (§3.97, #4565). Covers the four
// variants in icon shape (each with an accessible name), a lone-glyph geometry
// probe, a deliberately un-named icon button (to exercise the a11y dev-warn), a
// plain text button (backward-compat baseline), and the link variant in a muted
// run, a brand-inked call site, and disabled — plus reference spans that resolve
// the muted/brand tokens for the ink-inherit assertions.
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

        // --- variant="link" (§3.97) -------------------------------------------
        // Inline in a MUTED run: the ink must INHERIT the ambient --text-muted
        // (color: inherit, §3.18), never a pinned brand. Framed inside real text.
        h('section', { id: 'link-muted', style: 'margin:8px; color: var(--text-muted)' }, [
          'Node ',
          h(AspButton, { variant: 'link' }, () => 'edit'),
          ' or ',
          h(AspButton, { variant: 'link' }, () => 'delete'),
          ' this node.',
        ]),
        // Inline with a BRAND call-site colour (ValuationStatement's "+ add"):
        // the ink follows the call-site color, distinct from the muted context.
        h('section', { id: 'link-brand', style: 'margin:8px' }, [
          'Estimate ',
          h(AspButton, { variant: 'link', style: 'color: var(--brand-primary)' }, () => '+ Lägg till fler'),
        ]),
        // Disabled link — keeps the shared :disabled semantics.
        h('section', { id: 'link-disabled', style: 'margin:8px; color: var(--text-muted)' }, [
          h(AspButton, { variant: 'link', disabled: true }, () => 'edit'),
        ]),
        // Token reference spans for the ink-inherit assertions.
        h('span', { id: 'ref-muted', style: 'color: var(--text-muted)' }, 'ref'),
        h('span', { id: 'ref-brand', style: 'color: var(--brand-primary)' }, 'ref'),
      ])
  },
}).mount('#app')
