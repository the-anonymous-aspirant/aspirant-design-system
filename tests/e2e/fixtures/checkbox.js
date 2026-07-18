// Controlled checkboxes with a live readout, so the spec asserts the bound
// value rather than reaching into component internals.
import { createApp, h, ref } from 'vue'

import '../../../build/tokens.css'
import { AspCheckbox } from '../../../src/index.js'

createApp({
  setup() {
    const plain = ref(false)
    const mixed = ref(false)
    const locked = ref(true)
    return () =>
      h('div', { style: 'padding:24px;display:flex;flex-direction:column;gap:12px' }, [
        h(AspCheckbox, {
          label: 'prose',
          modelValue: plain.value,
          'onUpdate:modelValue': (v) => (plain.value = v),
        }),
        h('output', { id: 'plain' }, String(plain.value)),

        // Stays indeterminate across toggles: the browser clears the DOM
        // property on user input, so this is the regression guard for that.
        h(AspCheckbox, {
          label: 'tool calls',
          indeterminate: true,
          modelValue: mixed.value,
          'onUpdate:modelValue': (v) => (mixed.value = v),
        }),
        h('output', { id: 'mixed' }, String(mixed.value)),

        h(AspCheckbox, {
          label: 'disabled',
          disabled: true,
          modelValue: locked.value,
          'onUpdate:modelValue': (v) => (locked.value = v),
        }),
        h('output', { id: 'locked' }, String(locked.value)),
      ])
  },
}).mount('#app')
