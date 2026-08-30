// An AspList in menu mode (§3.98): as="menu" + variant="interactive". The items
// carry consumer fall-through attrs — a data-* probe, an aria-haspopup on a
// submenu item, and a COLLIDING role="tab" that the coordinated menuitem must
// win over — so the spec can prove they land on the inner control and that the
// DS-owned role is reserved.
import { createApp, h } from 'vue'

import '../../../build/tokens.css'
import { AspList, AspListItem } from '../../../src/index.js'

createApp({
  setup() {
    return () =>
      h('div', { style: 'padding:24px' }, [
        h(AspList, { as: 'menu', variant: 'interactive', ariaLabel: 'actions menu' }, () => [
          h(AspListItem, { key: 'rename', label: 'Rename', 'data-test': 'rename' }),
          h(AspListItem, {
            key: 'move',
            label: 'Move to…',
            'aria-haspopup': 'menu',
            role: 'tab', // colliding — must NOT override the coordinated menuitem
          }),
          h(AspListItem, { key: 'delete', label: 'Delete' }),
        ]),
      ])
  },
}).mount('#app')
