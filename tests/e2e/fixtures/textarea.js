// Two AspTextarea mounts, to prove the §3.677 acceptance criteria:
//
//   #plain  default rows(3)/maxRows(10) — proves Enter inserts a newline
//           (never intercepted) and that the initial floor renders before any
//           JS runs (no layout jump on the first keystroke).
//   #grow   a tight rows(2)/maxRows(4) box — proves auto-grow reaches its
//           ceiling within a small number of typed lines and then scrolls
//           internally instead of growing further.
import { createApp, h, ref } from 'vue'

import '../../../build/tokens.css'
import { AspTextarea } from '../../../src/index.js'

createApp({
  setup() {
    const plain = ref('')
    const grow = ref('')

    return () =>
      h(
        'div',
        { style: 'padding:24px; display:flex; flex-direction:column; gap:24px; max-width:480px' },
        [
          h('div', { id: 'plain' }, [
            h(AspTextarea, {
              modelValue: plain.value,
              'onUpdate:modelValue': (v) => (plain.value = v),
              placeholder: 'Plain textarea…',
            }),
          ]),

          h('div', { id: 'grow', style: 'width:300px' }, [
            h(AspTextarea, {
              modelValue: grow.value,
              'onUpdate:modelValue': (v) => (grow.value = v),
              placeholder: 'Auto-grow…',
              rows: 2,
              maxRows: 4,
            }),
          ]),
        ]
      )
  },
}).mount('#app')
