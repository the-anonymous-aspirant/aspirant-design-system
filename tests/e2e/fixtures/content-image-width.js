// A 1440x360 screenshot inside a 390px column, three ways (system_3 #9578):
// AspContent markdown, the same image wrapped in a link, and AspProse with a
// slotted <img>. The PNG is a real file (zlib-written, valid CRCs), so its
// natural width is 1440 and an unscaled image overflows the column.
import { createApp, h } from 'vue'

import '../../../build/tokens.css'
import { AspContent, AspProse } from '../../../src/index.js'

const src = new URL('./content-image-width.png', import.meta.url).href

createApp({
  setup() {
    return () =>
      h('div', [
        h('section', { id: 'md' }, [
          h(AspContent, { content: `A screenshot:\n\n![wide shot](${src})`, type: 'markdown' }),
        ]),
        h('section', { id: 'md-link' }, [
          h(AspContent, { content: `[![wide shot](${src})](${src})`, type: 'markdown' }),
        ]),
        h('section', { id: 'prose' }, [
          h(AspProse, null, () => [h('p', 'A screenshot:'), h('img', { src, alt: 'wide shot' })]),
        ]),
      ]),
  },
}).mount('#app')
