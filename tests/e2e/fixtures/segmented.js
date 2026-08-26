// AspSegmented fixture (§3.89, #4329): a radiogroup filter strip on the light
// page, a tabs strip, and the same filter strip on a dark card — so the spec can
// exercise v-model, roles/keyboard for both modes, and AA on both surfaces. The
// live selection is exposed on window for assertions.
import { createApp, h, ref } from 'vue'

import '../../../build/tokens.css'
import { AspSegmented } from '../../../src/index.js'

const filterOptions = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'done', label: 'Done' },
  { value: 'archived', label: 'Archived', disabled: true },
]
const tabOptions = [
  { value: 'list', label: 'List', controls: 'panel-list' },
  { value: 'grid', label: 'Grid', controls: 'panel-grid' },
]

createApp({
  setup() {
    const filter = ref('active')
    const tab = ref('list')
    window.__seg = { filter, tab }

    const filterStrip = () =>
      h(AspSegmented, {
        options: filterOptions,
        modelValue: filter.value,
        ariaLabel: 'Filter',
        'onUpdate:modelValue': (v) => (filter.value = v),
      })

    return () =>
      h('div', { style: 'padding:24px; display:flex; flex-direction:column; gap:24px' }, [
        h('section', { id: 'filter' }, [filterStrip()]),
        h('section', { id: 'tabs' }, [
          h(AspSegmented, {
            options: tabOptions,
            as: 'tabs',
            modelValue: tab.value,
            ariaLabel: 'View',
            'onUpdate:modelValue': (v) => (tab.value = v),
          }),
        ]),
        h(
          'section',
          {
            id: 'filter-dark',
            style: 'background: var(--surface-card); color: var(--text-on-dark); padding: 12px',
          },
          [filterStrip()],
        ),
      ])
  },
}).mount('#app')
