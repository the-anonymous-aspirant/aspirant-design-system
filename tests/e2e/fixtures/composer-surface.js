// AspComposer's field resolves its fill and ink against its setter (§3.119,
// system_3 #9134). One mount per setter case, each with typed text, so the
// spec can measure the text, the placeholder and the field edge on each:
//
//   #page         on the page (the console's Overview, AgentPane, TaskDetail)
//   #card         inside a default AspCard (the card treatment)
//   #ghost        inside a ghost AspCard, which is transparent: a page setter
//   #forced-card  surface="card" on a hand-rolled dark surface the selector
//                 cannot see
//   #forced-page  surface="page" inside an AspCard
import { createApp, h, ref } from 'vue'

import '../../../build/tokens.css'
import { AspCard, AspComposer } from '../../../src/index.js'

createApp({
  setup() {
    const drafts = {
      page: ref('typed text'),
      card: ref('typed text'),
      ghost: ref('typed text'),
      forcedCard: ref('typed text'),
      forcedPage: ref('typed text'),
    }
    const composer = (key, extra = {}) =>
      h(AspComposer, {
        modelValue: drafts[key].value,
        'onUpdate:modelValue': (v) => (drafts[key].value = v),
        placeholder: 'Message…',
        ...extra,
      })
    return () =>
      h('div', [
        h('section', { id: 'page' }, [composer('page')]),
        h('section', { id: 'card' }, [h(AspCard, null, () => [composer('card')])]),
        h('section', { id: 'ghost' }, [h(AspCard, { variant: 'ghost' }, () => [composer('ghost')])]),
        h(
          'section',
          {
            id: 'forced-card',
            style: 'background: var(--surface-card); color: var(--text-on-dark); padding: 16px; border-radius: 8px',
          },
          [composer('forcedCard', { surface: 'card' })],
        ),
        h('section', { id: 'forced-page' }, [
          h(AspCard, null, () => [composer('forcedPage', { surface: 'page' })]),
        ]),
      ])
  },
}).mount('#app')
