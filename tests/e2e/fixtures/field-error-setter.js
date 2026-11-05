// A field's error state resolves against its setter (§3.121; system_3
// #10026, design_agent c61986). One errored AspInput and one errored
// AspTextarea, each holding typed text, per setter case:
//
//   #page         on the page
//   #card         inside a default AspCard
//   #ghost        inside a ghost AspCard (transparent: a page setter)
//   #forced-card  surface="card" on a hand-rolled dark surface
//   #modal        inside an open AspModal (its panel paints --surface-card
//                 without being a .card); only with ?modal=1
import { createApp, h } from 'vue'

import '../../../build/tokens.css'
import { AspCard, AspInput, AspModal, AspSelect, AspTextarea } from '../../../src/index.js'

const probe = (cls, node) => h('div', { class: cls }, [node])
const withModal = new URLSearchParams(location.search).get('modal') === '1'
const MESSAGE = 'Use digits, spaces and + - ( ) / . only, at most 40 characters.'

const pair = (extra = {}) => [
  probe(
    'probe-input',
    h(AspInput, { label: 'Phone', modelValue: 'call me', error: MESSAGE, ...extra })
  ),
  probe(
    'probe-textarea',
    h(AspTextarea, { label: 'Notes', modelValue: 'call me', error: MESSAGE, ...extra })
  ),
]

createApp({
  setup() {
    return () =>
      h('div', [
        h('section', { id: 'page' }, pair()),
        h('section', { id: 'select-tripwire' }, [
          h(AspCard, null, () => [
            probe(
              'probe-select',
              h(AspSelect, {
                label: 'Method',
                modelValue: 'a',
                options: [{ value: 'a', label: 'A' }],
                error: MESSAGE,
              })
            ),
          ]),
        ]),
        h('section', { id: 'card' }, [h(AspCard, null, () => pair())]),
        h('section', { id: 'ghost' }, [h(AspCard, { variant: 'ghost' }, () => pair())]),
        h(
          'section',
          {
            id: 'forced-card',
            style:
              'background: var(--surface-card); color: var(--text-on-dark); padding: 16px; border-radius: 8px',
          },
          pair({ surface: 'card' })
        ),
        withModal
          ? h(AspModal, { open: true, title: 'Issuer profile' }, () => [
              h('div', { id: 'modal' }, pair()),
            ])
          : null,
      ])
  },
}).mount('#app')
