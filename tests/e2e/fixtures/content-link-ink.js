// A markdown link (AspContent) and a plain <a> side by side, on the page and
// inside an AspCard (§3.119 decision 4, system_3 #9137). The consumer's link
// rule is loaded first in the HTML with ?consumer=1, but the DS stylesheet is
// injected after it by Vite, the reverse of the console's order, so the DS
// rule cannot win on source order here; it must lose on specificity.
import { createApp, h } from 'vue'

import '../../../build/tokens.css'
import { AspCard, AspContent } from '../../../src/index.js'

const body = 'See [the task](#task) for details.'

const pair = () => [
  h(AspContent, { content: body, class: 'md' }),
  h('p', null, ['Plain: ', h('a', { href: '#plain', class: 'plain' }, 'the task')]),
]

createApp({
  setup() {
    return () =>
      h('div', [
        h('section', { id: 'page' }, pair()),
        h('section', { id: 'card' }, [h(AspCard, null, () => pair())]),
      ])
  },
}).mount('#app')
