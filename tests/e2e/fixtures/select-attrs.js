// AspSelect attr-forwarding (§3.95, criteria 3 + 4): a consumer's fall-through
// attrs must reach the labelable trigger <button>, not the non-labelable
// wrapper <div>. Two mounts prove the label-conditional id rule.
import { createApp, h } from 'vue'

import '../../../build/tokens.css'
import { AspSelect } from '../../../src/index.js'

const OPTIONS = [{ value: 'a', label: 'option a' }]

createApp({
  setup() {
    return () =>
      h('div', { style: 'padding:24px; display:flex; flex-direction:column; gap:24px' }, [
        // No `label` prop + a consumer id + an external <label for>: the id must
        // forward to the trigger so the external label names it (criterion 4).
        // A data-* attr rides the same path and must also land on the trigger.
        h('div', { id: 'no-label' }, [
          h('label', { for: 'ext-agent' }, 'External Agent'),
          h(AspSelect, {
            id: 'ext-agent',
            'data-probe': 'x',
            options: OPTIONS,
            placeholder: 'Select',
            modelValue: null,
            'onUpdate:modelValue': () => {},
          }),
        ]),

        // `label` prop present + a consumer id: the component's own <label for>
        // owns the trigger id, and a consumer id must NOT override it (criterion
        // 3), so the internal association is never broken.
        h('div', { id: 'with-label' }, [
          h(AspSelect, {
            label: 'Agent',
            id: 'should-not-win',
            options: OPTIONS,
            modelValue: null,
            'onUpdate:modelValue': () => {},
          }),
        ]),
      ])
  },
}).mount('#app')
