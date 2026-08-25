// Drives AspInput through a template ref, the way a consumer with an inline
// rename or an inline create does: open the affordance, put the caret in the
// field, and (for rename) select the text so the first keystroke replaces it.
//
// The buttons call the EXPOSED methods rather than reaching for the DOM node,
// because the exposure is the thing under test. Without it, `ref` yields the
// component instance, `.focus` is undefined, and the affordance degrades
// silently — no error, no failing assertion, just a caret that never arrives.
import { createApp, h, onMounted, ref } from 'vue'

import '../../../build/tokens.css'
import { AspInput } from '../../../src/index.js'

createApp({
  setup() {
    const value = ref('existing name')
    const field = ref(null)
    const elTag = ref('(unmounted)')

    // Read after mount rather than inside render: the template ref is null on
    // the first pass, and reading it there would make the readout depend on a
    // re-render that may never come.
    onMounted(() => {
      elTag.value = field.value?.el?.tagName ?? '(missing)'
    })

    return () =>
      h('div', { style: 'padding:24px;display:flex;flex-direction:column;gap:12px' }, [
        h(AspInput, {
          ref: field,
          label: 'Name',
          modelValue: value.value,
          'onUpdate:modelValue': (v) => (value.value = v),
        }),
        h('output', { id: 'value' }, value.value),

        h('button', { id: 'do-focus', onClick: () => field.value.focus() }, 'focus'),
        h(
          'button',
          {
            id: 'do-select',
            onClick: () => {
              field.value.focus()
              field.value.select()
            },
          },
          'focus + select'
        ),
        // Proves `el` hands back the real node, not a wrapper: a caller that
        // needs something the two convenience methods do not cover should not
        // have to query the DOM by class name to get it.
        h('output', { id: 'el-tag', style: 'display:block' }, elTag.value),
      ])
  },
}).mount('#app')
