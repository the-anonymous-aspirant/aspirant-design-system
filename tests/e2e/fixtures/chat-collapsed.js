// The collapsed-variant fixture. A machinery turn carries `collapsed: true` and
// must render as a muted one-line <details>/<summary> summary -- its body hidden
// until the summary is clicked. A signal turn carries no `collapsed` and must
// render its full body from the start. Both flow through AspChatArea, so this
// fixture also proves the per-entry passthrough: the area reads `entry.collapsed`
// and hands it to the bubble.
import { createApp, h } from 'vue'

import '../../../build/tokens.css'
import { AspChatArea } from '../../../src/index.js'

const MESSAGES = [
  {
    id: 's1',
    created_at: '2026-07-19T10:00:00Z',
    kind: 'agent',
    sender: 'engineer',
    body: 'signal body visible from the start',
    timestamp: '10:00',
  },
  {
    id: 't1',
    created_at: '2026-07-19T10:01:00Z',
    kind: 'tool',
    // The consumer bakes the kind suffix into the sender; the summary is that
    // string.
    sender: 'bash · tool call',
    body: 'machinery body hidden until expanded',
    timestamp: '10:01',
    collapsed: true,
  },
]

createApp({
  setup() {
    return () =>
      h('div', { style: 'padding:24px' }, [
        h(AspChatArea, { messages: MESSAGES, comments: [] }),
      ])
  },
}).mount('#app')
