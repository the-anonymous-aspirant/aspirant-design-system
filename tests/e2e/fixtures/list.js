// An interactive list and a default one, plus a readout of the last click so
// the spec can assert selection without reaching into component internals.
import { createApp, h, ref } from 'vue'

import '../../../build/tokens.css'
import { AspList, AspListItem } from '../../../src/index.js'

const ROWS = [
  { id: 'a', label: 'row a', meta: '2m' },
  { id: 'b', label: 'row b', meta: '5m' },
  { id: 'c', label: 'row c disabled', meta: 'never', disabled: true },
]

createApp({
  setup() {
    const picked = ref('none')
    const selected = ref('b')
    return () =>
      h('div', { style: 'padding:24px' }, [
        h(AspList, { variant: 'interactive', ariaLabel: 'interactive list' }, () =>
          ROWS.map((r) =>
            h(AspListItem, {
              key: r.id,
              label: r.label,
              meta: r.meta,
              disabled: r.disabled,
              active: selected.value === r.id,
              onClick: () => (picked.value = r.id),
            })
          )
        ),
        h(AspList, { variant: 'divided', ariaLabel: 'plain list' }, () => [
          h(AspListItem, { label: 'plain row' }),
        ]),
        h('output', { id: 'picked' }, picked.value),
      ])
  },
}).mount('#app')
