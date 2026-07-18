// A single controlled AspSelect, plus a live readout of the bound value so the
// spec can assert selection without reaching into component internals.
import { createApp, h, ref } from 'vue'

import '../../../build/tokens.css'
import { AspSelect } from '../../../src/index.js'

const OPTIONS = [
  { value: 'a', label: 'option a' },
  { value: 'b', label: 'option b' },
  { value: 'c', label: 'option c', disabled: true },
  { value: 'd', label: 'option d' },
]

createApp({
  setup() {
    const value = ref(null)
    return () =>
      h('div', { style: 'padding:24px' }, [
        h(AspSelect, {
          label: 'Agent',
          options: OPTIONS,
          placeholder: 'Select',
          modelValue: value.value,
          'onUpdate:modelValue': (v) => (value.value = v),
        }),
        h('output', { id: 'value' }, String(value.value)),
      ])
  },
}).mount('#app')
