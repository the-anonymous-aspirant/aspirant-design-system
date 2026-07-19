// Two buttons: a default one and an icon-only one, plus a `?step=` marker in
// the URL so the spec can prove a history pop actually happened rather than
// inferring it from the component's internals.
//
// The spec drives real navigation against this fixture — pushState to create an
// in-app entry, then click and read the URL back. A back button asserted by
// spying on a mock router is not asserted.
import { createApp, h } from 'vue'

import '../../../build/tokens.css'
import { AspBackButton } from '../../../src/index.js'

createApp({
  setup() {
    return () =>
      h('div', { style: 'padding:24px' }, [
        h(AspBackButton, {
          id: 'plain',
          to: '/tests/e2e/fixtures/back-button.html?landed=1',
          // Recorded in sessionStorage rather than a JS variable: the click
          // navigates, which tears down the page and everything on `window`.
          onBack: () => sessionStorage.setItem('backEmitted', '1'),
        }),
        h(AspBackButton, { id: 'iconic', iconOnly: true }),
      ])
  },
}).mount('#app')
