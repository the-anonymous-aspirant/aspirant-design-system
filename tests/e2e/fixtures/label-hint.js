// `labelHint` (#9927): an opt-in hover/focus explanation next to a field's
// label, distinct from the always-visible `hint` line. One instance of each
// field-control carries a hint, one carries none, so the spec can assert both
// that the trigger appears and that it stays absent when the prop is unset.
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
          h('div', { id: 'input-with-hint' }, [
            h(AspInput, {
              label: 'Issue date',
              labelHint: 'When you create the invoice.',
              modelValue: '',
              'onUpdate:modelValue': () => {},
            }),
          ]),
          h('div', { id: 'input-without-hint' }, [
            h(AspInput, { label: 'Name', modelValue: '', 'onUpdate:modelValue': () => {} }),
          ]),
          h('div', { id: 'textarea-with-hint' }, [
            h(AspTextarea, {
              label: 'Reason',
              labelHint: 'Shown on the cancelled invoice record.',
              modelValue: '',
              'onUpdate:modelValue': () => {},
            }),
          ]),
          // #10033: two hinted fields with no gap between them, the worst case
          // for the hint's upward reach over the field above.
          h('div', { id: 'stacked', style: 'display:flex; flex-direction:column; gap:0' }, [
            h('div', { id: 'stacked-upper' }, [
              h(AspInput, {
                label: 'Upper',
                labelHint: 'The upper field.',
                modelValue: '',
                'onUpdate:modelValue': () => {},
              }),
            ]),
            h('div', { id: 'stacked-lower' }, [
              h(AspInput, {
                label: 'Lower',
                labelHint: 'The lower field.',
                modelValue: '',
                'onUpdate:modelValue': () => {},
              }),
            ]),
          ]),
          h('div', { id: 'select-with-hint' }, [
            h(AspSelect, {
              label: 'Method',
              labelHint: 'How the payment arrived.',
              options: [{ value: 'a', label: 'option a' }],
              modelValue: null,
              'onUpdate:modelValue': () => {},
            }),
          ]),
        ]
      )
  },
}).mount('#app')
