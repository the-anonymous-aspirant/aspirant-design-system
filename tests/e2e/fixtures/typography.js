// One heading per level, plus decoupled level/size cases and a prose block.
// The acceptance criterion is "renders the correct semantic element for its
// level", which is a DOM fact — so it is asserted against the real DOM.
import { createApp, h } from 'vue'

import '../../../build/tokens.css'
import { AspHeading, AspProse } from '../../../src/index.js'

createApp({
  setup() {
    return () =>
      h('div', { style: 'padding:24px' }, [
        ...[1, 2, 3, 4, 5, 6].map((level) =>
          h(AspHeading, { level, key: level }, () => `level ${level}`)
        ),
        // Semantic level and visual size pull apart: an h4 that reads 3xl must
        // still be an h4 in the outline.
        h(AspHeading, { level: 4, size: '3xl', id: 'decoupled' }, () => 'loud h4'),
        h(AspProse, { id: 'prose' }, () => [
          h('p', null, ['body with ', h('code', null, 'code'), ' and ', h('a', { href: '#' }, 'a link')]),
          h('pre', null, h('code', null, 'block')),
        ]),
      ])
  },
}).mount('#app')
