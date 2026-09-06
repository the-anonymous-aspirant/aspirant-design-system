// AspBadge `disabled` on the remove × (system_3 #5272):
//   #enabled-chip    removable chip, disabled omitted — the × works.
//   #disabled-chip   removable chip, disabled true — the × is inert.
//   #explicit-false  disabled bound false — must be byte-identical to omitted.
//   #disabled-filter the same on the `filter` variant, whose × is unconditional.
//
// The remove counters are per-badge rather than shared: a single counter would
// let a test pass because SOME badge emitted, which is the opposite of what is
// being asserted.
import { createApp, h, ref } from 'vue'

import '../../../build/tokens.css'
import { AspBadge } from '../../../src/index.js'

createApp({
  setup() {
    const enabledEvents = ref(0)
    const disabledEvents = ref(0)
    const filterEvents = ref(0)

    return () =>
      h('div', { style: 'padding:24px; display:flex; flex-direction:column; gap:12px' }, [
        h('div', { id: 'enabled-chip' }, [
          h(
            AspBadge,
            {
              variant: 'chip',
              removable: true,
              ariaLabel: 'Remove frontend-touching',
              onRemove: () => (enabledEvents.value += 1),
            },
            () => 'frontend-touching'
          ),
        ]),
        h('div', { id: 'disabled-chip' }, [
          h(
            AspBadge,
            {
              variant: 'chip',
              removable: true,
              disabled: true,
              ariaLabel: 'Remove agent-proposed',
              onRemove: () => (disabledEvents.value += 1),
            },
            () => 'agent-proposed'
          ),
        ]),
        h('div', { id: 'explicit-false' }, [
          h(
            AspBadge,
            {
              variant: 'chip',
              removable: true,
              disabled: false,
              ariaLabel: 'Remove frontend-touching',
            },
            () => 'frontend-touching'
          ),
        ]),
        h('div', { id: 'disabled-filter' }, [
          h(
            AspBadge,
            {
              variant: 'filter',
              disabled: true,
              ariaLabel: 'Remove filter status:open',
              onRemove: () => (filterEvents.value += 1),
            },
            () => 'status:open'
          ),
        ]),
        h('output', { id: 'enabled-events' }, String(enabledEvents.value)),
        h('output', { id: 'disabled-events' }, String(disabledEvents.value)),
        h('output', { id: 'filter-events' }, String(filterEvents.value)),
      ])
  },
}).mount('#app')
