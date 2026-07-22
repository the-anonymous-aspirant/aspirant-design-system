// AspSkeleton behaviour fixture (task #2575).
//
// Every claim the spec makes needs a place to stand:
//   - contrast:      the bars on the page surface AND inside a dark card, in
//                    whichever theme the fixture was loaded in (?theme=dark).
//                    Each painting surface carries a data-surface so the spec
//                    can pair a bar with the surface it was measured against
//                    rather than guessing which ancestor paints.
//   - no reflow:     a block skeleton and a real region of the SAME nominal
//                    height share one container, with a sentinel after it. The
//                    swap must not move the sentinel — the reflow this
//                    component most easily causes, asserted rather than eyeballed.
//   - text footprint the text variant's height must equal N line boxes of the
//                    inherited type scale, which is what makes a text swap free
//                    of reflow for any font size.
//   - §3.21:         a skeleton beside a provisional item, so the spec can prove
//                    the skeleton borrows neither of §3.21's channels (dashed
//                    border, opacity).
import { createApp, h, ref } from 'vue'

import '../../../build/tokens.css'
import { AspCard, AspSkeleton } from '../../../src/index.js'

// A painting page surface. AspCard paints its own; the page needs an explicit
// one so a bar dropped "on the page" is measured against a real colour rather
// than the transparent body. A real consuming page pairs --surface-page with
// --text-body ink; §3.18's
// "the surface establishes the ink" is exactly that pairing. The skeleton
// derives its fill from that ink (currentColor), so a page fixture that painted
// the surface but set no ink would leave currentColor at the UA default black —
// invisible on the dark page, and not the case any real page presents.
const pageSurface = (id, child) =>
  h(
    'div',
    {
      id,
      'data-surface': 'page',
      style: 'background:var(--surface-page);color:var(--text-body);padding:16px',
    },
    [child]
  )

const cardSurface = (id, child) => h(AspCard, { id, 'data-surface': 'card' }, () => [child])

createApp({
  setup() {
    // The reflow probe: one container that shows either the block skeleton or a
    // real region of the SAME nominal height, with a sentinel immediately after.
    const swapped = ref(false)
    const NOMINAL = '160px'

    const swapRegion = () =>
      h('section', { id: 'shift' }, [
        h('div', { id: 'shift-box' }, [
          swapped.value
            ? h(
                'div',
                {
                  id: 'real-region',
                  style: `height:${NOMINAL};background:var(--surface-elevated)`,
                },
                'real content'
              )
            : h(AspSkeleton, { variant: 'block', height: NOMINAL }),
        ]),
        // Right after the box: if the swap changes the box height, this moves.
        h('div', { id: 'sentinel', style: 'height:1px' }),
        h('button', { id: 'swap', type: 'button', onClick: () => (swapped.value = true) }, 'swap'),
      ])

    return () =>
      h('div', { class: 'page' }, [
        // Contrast: three variants, each on the page and inside a dark card.
        h('section', null, [
          pageSurface('text-page', h(AspSkeleton, { variant: 'text', lines: 3 })),
          cardSurface('text-card', h(AspSkeleton, { variant: 'text', lines: 3 })),
        ]),
        h('section', null, [
          pageSurface('block-page', h(AspSkeleton, { variant: 'block', height: '8rem' })),
          cardSurface('block-card', h(AspSkeleton, { variant: 'block', height: '8rem' })),
        ]),
        h('section', null, [
          pageSurface('row-page', h(AspSkeleton, { variant: 'row', rows: 3, columns: 3 })),
          cardSurface('row-card', h(AspSkeleton, { variant: 'row', rows: 3, columns: 3 })),
        ]),

        // Text footprint: a lone text skeleton with a known line count.
        h('section', { id: 'footprint', style: 'font-size:16px;line-height:1.5' }, [
          h(AspSkeleton, { variant: 'text', lines: 3 }),
        ]),

        // §3.21 collision: a skeleton next to a provisional item.
        h('section', { id: 'collision' }, [
          h('div', { id: 'skeleton-side' }, [h(AspSkeleton, { variant: 'text', lines: 2 })]),
          h('div', { id: 'provisional-side' }, [
            h(
              'div',
              {
                id: 'provisional',
                style: 'border:1px dashed var(--border-card);border-radius:var(--radius-sm)',
              },
              'A real message · sending'
            ),
          ]),
        ]),

        swapRegion(),
      ])
  },
}).mount('#app')
