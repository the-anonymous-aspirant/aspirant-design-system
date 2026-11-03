// An inline code span longer than a phone's column, three ways (system_3
// #9770, UX walk 2026-11-02 C1): AspContent markdown, AspProse with a slotted
// <code>, and a fenced block (which keeps its own horizontal scroll — the
// `:not(pre code)` carve-out, implemented here as an explicit reset on
// `pre code` rather than a compound selector; see AspContent.vue).
import { createApp, h } from 'vue'

import '../../../build/tokens.css'
import { AspContent, AspProse } from '../../../src/index.js'

const LONG_IDENTIFIER =
  'backend.human_review_queue.subject_review_state(conn, \'task\', task_id)'

createApp({
  setup() {
    return () =>
      h('div', [
        h('section', { id: 'md' }, [
          h(AspContent, {
            content: `Read \`${LONG_IDENTIFIER}\` for the live card.`,
            type: 'markdown',
          }),
        ]),
        h('section', { id: 'fenced' }, [
          h(AspContent, {
            content: `\`\`\`\n${LONG_IDENTIFIER}\n\`\`\``,
            type: 'markdown',
          }),
        ]),
        h('section', { id: 'prose' }, [
          h(AspProse, null, () => [h('p', ['Read ', h('code', LONG_IDENTIFIER), ' for the live card.'])]),
        ]),
      ])
  },
}).mount('#app')
