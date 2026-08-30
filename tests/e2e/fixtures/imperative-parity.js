// AspInput and AspTextarea mounted through template refs, the way a consumer
// with an inline rename / composer does. The buttons call the EXPOSED methods
// rather than reaching for the DOM node, because the exposure is the thing
// under test (§3.96): without it a `ref` yields the component instance,
// `.focus` is undefined, and the affordance degrades silently.
import { createApp, h, onMounted, ref } from 'vue'

import '../../../build/tokens.css'
import { AspInput, AspTextarea } from '../../../src/index.js'

createApp({
  setup() {
    const inputRef = ref(null)
    const textareaRef = ref(null)
    const report = ref('(unmounted)')

    // Read after mount rather than inside render: the template refs are null on
    // the first pass. `el` proves the exposure hands back the real inner node.
    onMounted(() => {
      const shape = (r) => ({
        focus: typeof r.value?.focus,
        select: typeof r.value?.select,
        elTag: r.value?.el?.tagName ?? '(missing)',
      })
      report.value = JSON.stringify({ input: shape(inputRef), textarea: shape(textareaRef) })
    })

    return () =>
      h('div', { style: 'padding:24px; display:flex; flex-direction:column; gap:12px; max-width:360px' }, [
        h(AspInput, { ref: inputRef, label: 'Name', modelValue: 'existing', 'onUpdate:modelValue': () => {} }),
        h(AspTextarea, { ref: textareaRef, label: 'Notes', modelValue: 'a draft', 'onUpdate:modelValue': () => {} }),

        h('output', { id: 'report', style: 'display:block' }, report.value),

        h('button', { id: 'focus-textarea', onClick: () => textareaRef.value.focus() }, 'focus textarea'),
        h(
          'button',
          {
            id: 'select-textarea',
            onClick: () => {
              textareaRef.value.focus()
              textareaRef.value.select()
            },
          },
          'focus + select textarea'
        ),
      ])
  },
}).mount('#app')
