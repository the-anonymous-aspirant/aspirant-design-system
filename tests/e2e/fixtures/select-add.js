// A searchable AspSelect that takes a new name (system_3 #11577,
// design_conventions §3.161 Decision 1). The page here does NOT add the name
// to its list or change the value: it only records each `add` event, so the
// spec can assert that the select itself changes nothing.
// ?off=1 leaves `addable` off (searchable only); ?nosearch=1 sets `addable`
// without `searchable`; ?empty=1 starts with no options.
import { createApp, h, ref } from 'vue'

import '../../../build/tokens.css'
import { AspSelect } from '../../../src/index.js'

const CATEGORIES = [
  'materials and supplies',
  'equipment',
  'software and subscriptions',
  'office and postage',
  'travel',
  'phone and internet',
  'rent and utilities',
  'insurance',
  'fees and charges',
  'training and books',
  'Private',
]
const params = new URLSearchParams(location.search)
const OPTIONS = params.get('empty') ? [] : CATEGORIES.map((c) => ({ value: c, label: c }))

createApp({
  setup() {
    const value = ref('travel')
    const added = ref([])
    return () =>
      h('div', { style: 'padding:24px;max-width:22rem' }, [
        h(AspSelect, {
          label: 'Category',
          options: OPTIONS,
          searchable: !params.get('nosearch'),
          addable: !params.get('off'),
          searchPlaceholder: 'Type to filter or add',
          modelValue: value.value,
          'onUpdate:modelValue': (v) => (value.value = v),
          onAdd: (text) => (added.value = [...added.value, text]),
        }),
        h('output', { id: 'value' }, String(value.value)),
        h('output', { id: 'added' }, JSON.stringify(added.value)),
      ])
  },
}).mount('#app')
