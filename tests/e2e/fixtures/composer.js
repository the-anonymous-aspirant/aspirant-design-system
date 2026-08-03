// Two AspComposer mounts side by side, to prove the §3.62 leading-controls slot:
//
//   #plain   no slot content — must render byte-identical to the pre-slot
//            composer (a lone right-aligned Send, no leading container in the DOM).
//   #slotted a ghost "+ artifact" trigger fills the leading-controls slot — it
//            must sit LEFT of Send and not disturb Send's right edge.
//
// `#sent` counts `send` emissions so the spec can prove the slot did not break
// the primary submit path.
import { createApp, h, ref } from 'vue'

import '../../../build/tokens.css'
import { AspButton, AspComposer } from '../../../src/index.js'

createApp({
  setup() {
    const plainDraft = ref('')
    const slottedDraft = ref('')
    const sent = ref(0)

    return () =>
      h('div', { style: 'padding:24px; display:flex; flex-direction:column; gap:24px; max-width:480px' }, [
        // Plain mount — the empty-slot control. No leading-controls slot passed.
        h('div', { id: 'plain' }, [
          h(AspComposer, {
            modelValue: plainDraft.value,
            'onUpdate:modelValue': (v) => (plainDraft.value = v),
            onSend: () => (sent.value += 1),
            placeholder: 'Plain composer…',
          }),
        ]),

        // Slotted mount — a ghost trigger in the leading-controls slot.
        h('div', { id: 'slotted' }, [
          h(
            AspComposer,
            {
              modelValue: slottedDraft.value,
              'onUpdate:modelValue': (v) => (slottedDraft.value = v),
              onSend: () => (sent.value += 1),
              placeholder: 'Slotted composer…',
            },
            {
              'leading-controls': () =>
                h(AspButton, { id: 'add-artifact', variant: 'ghost', type: 'button' }, () => '+ artifact'),
            }
          ),
        ]),

        h('output', { id: 'sent' }, String(sent.value)),
      ])
  },
}).mount('#app')
