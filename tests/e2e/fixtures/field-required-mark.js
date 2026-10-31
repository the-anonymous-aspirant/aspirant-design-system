// The required `*` resolves against its setter (§3.121, §3.119; system_3
// #9189). One AspInput and one AspTextarea per setter case, both required:
//
//   #page         on the page
//   #card         inside a default AspCard
//   #ghost        inside a ghost AspCard, which is transparent: a page setter
//   #forced-card  surface="card" on a hand-rolled dark surface the selector
//                 cannot see (aspirant-client's sidebar sign-in form)
//   #forced-page  surface="page" inside an AspCard
//   #states       inside an AspCard: error and disabled inputs (focus is
//                 driven by the spec on #card)
//   #modal        inside an open AspModal, whose panel paints --surface-card
//                 without being a .card (#9203). Only with ?modal=1: the open
//                 dialog traps focus, which the #card focus case needs.
import { createApp, h } from 'vue'

import '../../../build/tokens.css'
import { AspCard, AspInput, AspModal, AspTextarea } from '../../../src/index.js'

// Both components set inheritAttrs: false (a passed class lands on the inner
// control), so each probe is wrapped rather than classed.
const probe = (cls, node) => h('div', { class: cls }, [node])

const withModal = new URLSearchParams(location.search).get('modal') === '1'

const pair = (extra = {}) => [
  probe('probe-input', h(AspInput, { label: 'Email', required: true, ...extra })),
  probe('probe-textarea', h(AspTextarea, { label: 'Message', required: true, ...extra })),
]

createApp({
  setup() {
    return () =>
      h('div', [
        h('section', { id: 'page' }, pair()),
        h('section', { id: 'card' }, [h(AspCard, null, () => pair())]),
        h('section', { id: 'ghost' }, [h(AspCard, { variant: 'ghost' }, () => pair())]),
        h(
          'section',
          {
            id: 'forced-card',
            style: 'background: var(--surface-card); color: var(--text-on-dark); padding: 16px; border-radius: 8px',
          },
          pair({ surface: 'card' }),
        ),
        h('section', { id: 'forced-page' }, [h(AspCard, null, () => pair({ surface: 'page' }))]),
        h('section', { id: 'states' }, [
          h(AspCard, null, () => [
            probe('probe-error', h(AspInput, { label: 'Errored', required: true, error: 'Required' })),
            probe('probe-disabled', h(AspInput, { label: 'Disabled', required: true, disabled: true })),
          ]),
        ]),
        withModal
          ? h(AspModal, { open: true, title: 'Submit feedback' }, () => [h('div', { id: 'modal' }, pair())])
          : null,
      ])
  },
}).mount('#app')
