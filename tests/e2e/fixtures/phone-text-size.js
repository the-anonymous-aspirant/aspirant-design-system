// §3.122 P9 / §1.9 — the typed/selected text in the three field controls is
// --text-base below 768px and --text-sm from 768px up, while the label, hint
// and error captions stay fixed at every width. Each control gets a hint OR
// an error variant so both message classes are covered, and AspSelect's
// panel is opened so its option-list text is measurable too (AspSelect has
// no hint/error prop).
import { createApp, h } from 'vue'

import '../../../build/tokens.css'
import { AspInput, AspSelect, AspTextarea } from '../../../src/index.js'

createApp({
  setup() {
    return () =>
      h(
        'div',
        { style: 'padding:24px; display:flex; flex-direction:column; gap:16px; max-width:320px' },
        [
          h('div', { id: 'input-hint' }, [
            h(AspInput, {
              label: 'Name',
              hint: 'As it appears on your profile',
              modelValue: 'typed value',
              'onUpdate:modelValue': () => {},
            }),
          ]),
          h('div', { id: 'input-error' }, [
            h(AspInput, {
              label: 'Email',
              error: 'Enter a valid email',
              modelValue: 'bad',
              'onUpdate:modelValue': () => {},
            }),
          ]),
          h('div', { id: 'textarea-hint' }, [
            h(AspTextarea, {
              label: 'Notes',
              hint: 'Visible to the team',
              modelValue: 'typed value',
              'onUpdate:modelValue': () => {},
            }),
          ]),
          h('div', { id: 'textarea-error' }, [
            h(AspTextarea, {
              label: 'Bio',
              error: 'Required',
              modelValue: '',
              'onUpdate:modelValue': () => {},
            }),
          ]),
          h('div', { id: 'select-field' }, [
            h(AspSelect, {
              label: 'Agent',
              options: [
                { value: 'a', label: 'option a' },
                { value: 'b', label: 'option b' },
              ],
              modelValue: 'a',
              'onUpdate:modelValue': () => {},
            }),
          ]),
        ]
      )
  },
}).mount('#app')
