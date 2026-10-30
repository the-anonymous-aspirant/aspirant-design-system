// Markdown headings under a page-title-sized route heading, and an AspCard
// header (§3.120 Q1, system_3 #9178). The body around the headings (p, li,
// inline code) is here so the spec can show it did not change size.
import { createApp, h } from 'vue'

import '../../../build/tokens.css'
import { AspCard, AspContent } from '../../../src/index.js'

const body = [
  '# Heading one',
  'A paragraph with `inline code` in it.',
  '## Heading two',
  '- first item',
  '- second item',
  '### Heading three',
  'Another paragraph.',
  '#### Heading four',
  '##### Heading five',
  '###### Heading six',
].join('\n\n')

createApp({
  setup() {
    return () =>
      h('div', [
        h('section', { id: 'page' }, [
          h('h1', { class: 'route-title' }, 'Route title'),
          h(AspContent, { content: body, class: 'md' }),
        ]),
        h('section', { id: 'card' }, [
          h(AspCard, null, {
            header: () => 'Card header',
            default: () => 'Card body text.',
          }),
        ]),
      ])
  },
}).mount('#app')
