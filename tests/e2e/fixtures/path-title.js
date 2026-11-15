// AspPathTitle behaviour + contrast fixture (task #2581).
//
// Regions each give the spec a place to stand:
//   - deep / single: the path shapes AC1 and AC5 assert.
//   - narrow:        a deep path in a width-constrained box so the middle
//                    collapses (AC6) before anything wraps, and the page is
//                    proven not to scroll sideways.
//   - short:         a 3-part path of long names, the explorer's shape, whose
//                    collapse never fired while segments could shrink (#10972).
//   - long-current:  a current name longer than a phone line.
//   - page / card:   the same path on the page surface AND inside a dark
//                    AspCard, in whichever theme the fixture was loaded in
//                    (?theme=dark), so the contrast probe measures the ancestor
//                    ink and its hover on both surfaces in both themes (AC2).
//                    §3.18: an inheritor is only exercised on a surface whose
//                    ink it did not set.
import { createApp, h, ref } from 'vue'

import '../../../build/tokens.css'
import { AspCard, AspPathTitle } from '../../../src/index.js'

const path = (n) => [
  { label: 'synthetic', href: '#/synthetic' },
  ...Array.from({ length: Math.max(n - 2, 0) }, (_, i) => ({
    label: `level-${i + 1}`,
    href: `#/level-${i + 1}`,
  })),
  { label: 'documents' },
]

// The explorer's browse path at its documents folder.
const SHORT = [
  { label: 'lake', href: '#/' },
  { label: 'synthetic', href: '#/synthetic' },
  { label: 'documents' },
]

const LONG_NAME = 'fake-quarterly-report-with-a-very-long-folder-name-2999'

const region = (id, child, attrs = {}) => h('section', { id, ...attrs }, [child])

createApp({
  setup() {
    const navigated = ref('none')
    const title = (segments) =>
      h(AspPathTitle, {
        segments,
        onNavigate: (e) => {
          navigated.value = e.label
        },
      })

    return () =>
      h('div', { class: 'page' }, [
        // Structure — AC1 / AC5.
        region('deep', title(path(5))),
        region('single', title([{ label: 'synthetic' }])),

        // Collapse — AC6. Narrow enough that a 12-part path cannot fit.
        region('narrow', title(path(12)), { style: 'max-width:320px' }),

        // A SHORT path of long names — the explorer's own shape (#10972). Three
        // segments never overflowed while segments could shrink, so the collapse
        // never fired and every name was cut to a stub, the current one included.
        region('short', title(SHORT)),

        // A current name longer than any phone line: it wraps inside itself,
        // whole, rather than clipping (§3.122 P3).
        region('long-current', title([...SHORT.slice(0, 2), { label: LONG_NAME }])),

        // Contrast — AC2. Same 5-part path on the page surface and inside a
        // dark card. The page surface pairs --surface-page with --text-body ink,
        // as a real page does, so the ancestor derivation resolves against a
        // real ambient ink rather than the UA default.
        region('title-page', title(path(5)), {
          'data-surface': 'page',
          style: 'background:var(--surface-page);color:var(--text-body);padding:16px',
        }),
        h('section', { id: 'title-card' }, [
          h(AspCard, { 'data-surface': 'card' }, () => [title(path(5))]),
        ]),

        h('output', { id: 'navigated' }, navigated.value),
      ])
  },
}).mount('#app')
