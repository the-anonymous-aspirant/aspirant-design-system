// The three depths acceptance criterion 1 names, plus the long-single-label
// case, each in its own tagged region so the spec can address one without
// selecting across the others.
//
// The page deliberately has NO horizontal padding tricks and no wrapper that
// could absorb an overflow: criterion 5 is about the page not scrolling
// sideways, and a fixture that padded the problem away would assert nothing.
//
// Targets are FRAGMENTS. A real path would navigate away, taking the readout
// with it and leaving the emit assertion measuring the teardown -- the failure
// the back-button fixture had to work around with sessionStorage.
import { createApp, h, ref } from 'vue'

import '../../../build/tokens.css'
import { AspBreadcrumb } from '../../../src/index.js'

const path = (n) => [
  { label: 'Home', to: '#/home' },
  ...Array.from({ length: Math.max(n - 2, 0) }, (_, i) => ({
    label: `Level ${i + 1}`,
    to: `#/level-${i + 1}`,
  })),
  { label: 'Current' },
]

const LONG = [
  { label: 'Home', to: '#/home' },
  { label: 'a directory name long enough that it cannot possibly fit', to: '#/long' },
  { label: 'Current' },
]

createApp({
  setup() {
    const navigated = ref('none')
    const region = (id, items) =>
      h('section', { id, style: 'padding:8px 0' }, [
        h(AspBreadcrumb, {
          items,
          onNavigate: (e) => {
            navigated.value = e.item.label
          },
        }),
      ])

    return () =>
      h('div', [
        region('shallow', path(2)),
        region('mid', path(5)),
        region('deep', path(12)),
        region('long-label', LONG),
        h('output', { id: 'navigated' }, navigated.value),
      ])
  },
}).mount('#app')
