// A grouped AspSelect (system_3 #10701), plus a live readout of the bound
// value so the spec asserts selection without reaching into internals.
import { createApp, h, ref } from 'vue'

import '../../../build/tokens.css'
import { AspSelect } from '../../../src/index.js'

const OPTIONS = [
  { group: 'In', options: [
    { value: 'in:paid_work', label: 'Paid work' },
    { value: 'in:gift', label: 'Gift' },
    { value: 'in:other', label: 'Other' },
  ] },
  { group: 'Out', options: [
    { value: 'out:travel', label: 'travel', disabled: true },
    { value: 'out:other', label: 'other' },
  ] },
]

createApp({
  setup() {
    const value = ref(null)
    return () =>
      h('div', { style: 'padding:24px' }, [
        h(AspSelect, {
          ariaLabel: 'Category',
          options: OPTIONS,
          placeholder: 'All categories',
          modelValue: value.value,
          'onUpdate:modelValue': (v) => (value.value = v),
        }),
        h('output', { id: 'value' }, String(value.value)),
      ])
  },
}).mount('#app')
