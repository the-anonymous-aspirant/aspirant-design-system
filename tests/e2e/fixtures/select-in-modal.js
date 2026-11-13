// An AspSelect inside an open AspModal (system_3 #10761): Escape with the list
// open must close only the list. ?search=1 makes the select searchable.
import { createApp, h, ref } from 'vue'

import '../../../build/tokens.css'
import { AspModal, AspSelect } from '../../../src/index.js'

const OPTIONS = ['Galerie Nord', 'Mara Esempio', 'Studio Süd'].map((n, i) => ({ value: i + 1, label: n }))
const search = !!new URLSearchParams(location.search).get('search')

createApp({
  setup() {
    const open = ref(true)
    const value = ref(null)
    return () =>
      h('div', [
        h('output', { id: 'modal' }, open.value ? 'open' : 'closed'),
        h('output', { id: 'value' }, String(value.value)),
        h(
          AspModal,
          { open: open.value, title: 'Edit payment', 'onUpdate:open': (v) => (open.value = v) },
          () => [
            h(AspSelect, {
              label: 'Client',
              options: OPTIONS,
              searchable: search,
              modelValue: value.value,
              'onUpdate:modelValue': (v) => (value.value = v),
            }),
          ]
        ),
      ])
  },
}).mount('#app')
