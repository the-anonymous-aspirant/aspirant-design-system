// AspSelects where an absolutely positioned panel used to be clipped
// (system_3 #8402): inside a short `overflow-x: auto` box, the shape of
// AspDataTable's scroll container, and inside a transformed ancestor, which
// is the containing block of a fixed descendant. The page is tall so a spec
// can scroll any row to any height in the window.
import { createApp, h, ref } from 'vue'

import '../../../build/tokens.css'
import { AspSelect } from '../../../src/index.js'

const OPTIONS = ['a', 'b', 'c', 'd', 'e', 'f'].map((v) => ({ value: v, label: `option ${v}` }))

const row = (id, value) =>
  h('tr', { style: 'height:44px' }, [
    h('td', { style: 'padding:4px 8px' }, `row ${id}`),
    h('td', { style: 'padding:4px 8px' }, [
      h(AspSelect, {
        ariaLabel: `select ${id}`,
        options: OPTIONS,
        modelValue: value.value,
        'onUpdate:modelValue': (v) => (value.value = v),
        'data-test': `select-${id}`,
      }),
    ]),
    h(
      'td',
      { style: 'padding:4px 8px;white-space:nowrap' },
      'a wide cell so the box scrolls sideways at narrow widths'
    ),
  ])

createApp({
  setup() {
    const values = { 1: ref(null), 2: ref(null), 3: ref(null), t: ref(null) }
    return () =>
      h('div', { style: 'padding:24px' }, [
        h('div', { style: 'height:900px' }, 'spacer above'),
        h('div', { id: 'box', style: 'overflow-x:auto;border:1px solid #888' }, [
          h('table', { style: 'border-collapse:collapse' }, [
            h('tbody', [row(1, values[1]), row(2, values[2]), row(3, values[3])]),
          ]),
        ]),
        h('output', { id: 'value' }, `${values[1].value}|${values[2].value}|${values[3].value}`),
        h('div', { style: 'height:400px' }, 'spacer between'),
        h(
          'div',
          {
            id: 'transformed',
            style: 'transform:translateZ(0);margin-left:40px;border:1px solid #888;padding:8px',
          },
          [
            h(AspSelect, {
              ariaLabel: 'select t',
              options: OPTIONS,
              modelValue: values.t.value,
              'onUpdate:modelValue': (v) => (values.t.value = v),
              'data-test': 'select-t',
            }),
          ]
        ),
        h('output', { id: 'value-t' }, String(values.t.value)),
        h('div', { style: 'height:1200px' }, 'spacer below'),
      ])
  },
}).mount('#app')
