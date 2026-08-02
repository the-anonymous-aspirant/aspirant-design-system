// `now` is injected so the relative-time readings are deterministic (a
// component that reads the wall clock internally cannot be asserted at a
// boundary). `refresh` emits are counted onto `window` so the spec can assert
// the caller contract without a component-internal hook.
import { createApp, h, reactive } from 'vue'

import '../../../build/tokens.css'
import { AspFreshness } from '../../../src/index.js'

const NOW = Date.parse('2026-07-19T12:00:00.000Z')
const at = (s) => new Date(NOW + s * 1000).toISOString()

const counts = reactive({ normal: 0, pending: 0, failed: 0, triggerOnly: 0 })
window.__refresh = counts

createApp({
  setup() {
    return () =>
      h(
        'div',
        {
          // Explicit opaque surface so the contrast probe has a real painted
          // background to measure the (non-text) failure glyph against; flips
          // with ?theme=dark like every other fixture. Ink is paired with the
          // background per the DS surface-setter rule (§3.18) — a real consumer
          // (AspCard/page) sets both together, and the color-mix glyph derives
          // from this currentColor, so a surface that sets bg without ink would
          // misrepresent it (black ink on a dark surface it never actually has).
          style:
            'padding:24px;display:flex;flex-direction:column;gap:16px;align-items:flex-start;background:var(--surface-page);color:var(--text-body)',
          'data-surface': 'page',
        },
        [
          h('div', { id: 'normal' }, h(AspFreshness, {
            lastSuccessfulAt: at(-480),
            now: NOW,
            onRefresh: () => (counts.normal += 1),
          })),
          h('div', { id: 'pending' }, h(AspFreshness, {
            lastSuccessfulAt: at(-480),
            now: NOW,
            pending: true,
            onRefresh: () => (counts.pending += 1),
          })),
          h('div', { id: 'failed' }, h(AspFreshness, {
            lastSuccessfulAt: at(-480),
            now: NOW,
            failed: true,
            onRefresh: () => (counts.failed += 1),
          })),
          h('div', { id: 'idle' }, h(AspFreshness, {
            lastSuccessfulAt: at(-3 * 3600),
            now: NOW,
          })),
          // Trigger-only (showTime=false): the timestamp is omitted entirely —
          // no <time>, no em-dash, even though lastSuccessfulAt is passed. The
          // label + trigger still render, and the caller contract still fires.
          h('div', { id: 'triggerOnly' }, h(AspFreshness, {
            lastSuccessfulAt: at(-480),
            now: NOW,
            showTime: false,
            onRefresh: () => (counts.triggerOnly += 1),
          })),
          // Trigger-only in pending + failed: states are unchanged in this mode.
          h('div', { id: 'triggerOnlyPending' }, h(AspFreshness, {
            showTime: false,
            pending: true,
          })),
          h('div', { id: 'triggerOnlyFailed' }, h(AspFreshness, {
            showTime: false,
            failed: true,
          })),
        ]
      )
  },
}).mount('#app')
