// The three field-control captions side by side, each given a `label`, so the
// spec can read the resolved caption typography off all three and assert they
// are one design-of-record fact (§3.95). Nothing in the DS compared them before
// this fixture, which is how AspSelect drifted to --text-xs silently.
import { createApp, h } from 'vue'

import '../../../build/tokens.css'
import { AspInput, AspSelect, AspTextarea } from '../../../src/index.js'

createApp({
  setup() {
    return () =>
      h(
        'div',
        { style: 'padding:24px; display:flex; flex-direction:column; gap:16px; max-width:320px' },
        [
          h('div', { id: 'input-field' }, [
            h(AspInput, { label: 'Name', modelValue: '', 'onUpdate:modelValue': () => {} }),
          ]),
          h('div', { id: 'textarea-field' }, [
            h(AspTextarea, { label: 'Notes', modelValue: '', 'onUpdate:modelValue': () => {} }),
          ]),
          h('div', { id: 'select-field' }, [
            h(AspSelect, {
              label: 'Agent',
              options: [{ value: 'a', label: 'option a' }],
              modelValue: null,
              'onUpdate:modelValue': () => {},
            }),
          ]),
        ]
      )
  },
}).mount('#app')
