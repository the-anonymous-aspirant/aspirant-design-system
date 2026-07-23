// AspSplitPane behaviour + contrast fixture (task #2582).
//
// Regions each give the spec a place to stand:
//   - interactive: a real list-detail wiring. The primary rows are the openers,
//     so clicking one captures a concrete focus-return target (AC6); the row
//     count overflows the bounded height so the primary scrolls, which is how
//     AC3 (scroll survives open → close → open) is exercised. Also the surface
//     AC4 (360px stacking) and AC7 (labelled region) are asserted on.
//   - contrast-page / contrast-card: the same OPEN split pane on the page
//     surface AND inside a dark AspCard, in whichever theme the fixture loaded
//     in (?theme=dark). AC2 / §3.18: the open state is measured on both
//     surfaces in both themes — a closed specimen never reaches the secondary
//     pane, so a suite that only tested the default would be green by
//     construction. The page region pairs --surface-page with --text-body ink,
//     as a real page does, so the inherited ink resolves against a real ambient
//     colour rather than the UA default.
import { createApp, h, ref } from 'vue'

import '../../../build/tokens.css'
import { AspSplitPane, AspList, AspListItem, AspCard, AspHeading } from '../../../src/index.js'

const ITEMS = Array.from({ length: 30 }, (_, i) => ({
  id: i + 1,
  label: `row-${String(i + 1).padStart(2, '0')}.dataset`,
  meta: `${(i + 1) * 7} KB`,
}))

const detailCard = (item) =>
  h(AspCard, { 'data-surface': 'split-secondary' }, () => [
    h(AspHeading, { level: 2, color: 'heading' }, () => (item ? item.label : 'Detail')),
    h('p', null, item ? `Size ${item.meta}.` : 'Nothing selected.'),
  ])

const interactive = () => {
  const open = ref(false)
  const selected = ref(null)

  return () =>
    h('section', { id: 'interactive-wrap' }, [
      // An opener OUTSIDE the scrolling primary, so the scroll-preservation
      // test (AC3) can toggle open/close without Playwright scrolling the
      // primary to reach a row. Row-click focus-return (AC6) uses the rows.
      h(
        'button',
        {
          id: 'toggle',
          type: 'button',
          onClick: () => {
            open.value = !open.value
          },
        },
        'toggle detail'
      ),
      h('output', { id: 'open-state' }, open.value ? 'open' : 'closed'),
      h('section', { id: 'interactive', style: 'height:20rem;background:var(--surface-page)' }, [
      h(
        AspSplitPane,
        {
          open: open.value,
          ratio: '1:1',
          secondaryLabel: 'Dataset detail',
          onClose: () => {
            open.value = false
          },
        },
        {
          primary: () =>
            h(AspList, { variant: 'interactive', ariaLabel: 'Datasets' }, () =>
              ITEMS.map((i) =>
                h(AspListItem, {
                  key: i.id,
                  label: i.label,
                  meta: i.meta,
                  active: selected.value === i.id,
                  onClick: () => {
                    selected.value = i.id
                    open.value = true
                  },
                })
              )
            ),
          secondary: () => detailCard(ITEMS.find((i) => i.id === selected.value)),
        }
      ),
      ]),
    ])
}

// A statically-open split pane for the contrast sweep — no interaction, so the
// probe measures the open secondary surface directly on load.
const staticOpen = (surface) =>
  h(
    AspSplitPane,
    { open: true, ratio: '2:1', secondaryLabel: 'Detail' },
    {
      primary: () =>
        h(AspList, { variant: 'interactive', ariaLabel: 'Datasets' }, () =>
          ITEMS.slice(0, 4).map((i) =>
            h(AspListItem, { key: i.id, label: i.label, meta: i.meta })
          )
        ),
      secondary: () => detailCard(ITEMS[0]),
    }
  )

createApp({
  setup() {
    const interactiveRender = interactive()
    return () =>
      h('div', { class: 'page' }, [
        interactiveRender(),

        // Contrast — AC2. Open on the page surface (real ambient ink) and
        // inside a dark card, both bounded so the panes lay out as a row at md+.
        h(
          'section',
          {
            id: 'contrast-page',
            'data-surface': 'page',
            style:
              'height:16rem;background:var(--surface-page);color:var(--text-body);padding:16px',
          },
          [staticOpen('page')]
        ),
        h('section', { id: 'contrast-card', style: 'height:16rem' }, [
          h(AspCard, { 'data-surface': 'card' }, () => [staticOpen('card')]),
        ]),
      ])
  },
}).mount('#app')
