// AspBadge `chip` + `removable` (system_3 #3677 AC5):
//   #plain-chip     the default chip — no `removable` prop bound at all —
//                    must carry no `.badge__remove` button.
//   #default-chip   `removable` explicitly bound false — same as omitted.
//   #removable-chip `removable` true — carries the button and emits `remove`.
import { createApp, h, ref } from 'vue'

import '../../../build/tokens.css'
import { AspBadge } from '../../../src/index.js'

createApp({
  setup() {
    const removeEvents = ref(0)

    return () =>
      h('div', { style: 'padding:24px; display:flex; flex-direction:column; gap:12px' }, [
        h('div', { id: 'plain-chip' }, [h(AspBadge, { variant: 'chip' }, () => 'frontend')]),
        h('div', { id: 'default-chip' }, [
          h(AspBadge, { variant: 'chip', removable: false }, () => 'frontend'),
        ]),
        h('div', { id: 'removable-chip' }, [
          h(
            AspBadge,
            {
              variant: 'chip',
              removable: true,
              ariaLabel: 'Remove frontend-touching',
              onRemove: () => (removeEvents.value += 1),
            },
            () => 'frontend-touching'
          ),
        ]),
        h('output', { id: 'remove-events' }, String(removeEvents.value)),
      ])
  },
}).mount('#app')
