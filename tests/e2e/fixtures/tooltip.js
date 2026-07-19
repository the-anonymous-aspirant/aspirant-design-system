// Triggers laid out to exercise every case the pseudo-element original could
// not survive:
//
//   #trig-default   a plain top-positioned chip, the happy path
//   #trig-slow      openDelay 600ms, so the hover-delay and the no-delay-on-
//                   focus rule can be told apart without racing a 120ms default
//   #trig-left      position="left" pinned to the left viewport edge — no room
//                   on the preferred side, so it must flip
//   #trig-top       position="top" at the very top of the page, same shape
//   #trig-clipped   inside an `overflow: hidden` box, the defect that forced
//                   the teleport
//   #trig-disabled  disabled, which must render no chip at all
//   #trig-slot      the rich `content` slot (the chart-hover x/y case)
//
// #before and #after are plain buttons around #trig-default so Tab arrives at
// the trigger from a real focus traversal rather than a synthetic .focus().
import { createApp, h } from 'vue'

import '../../../build/tokens.css'
import { AspButton, AspTooltip } from '../../../src/index.js'

// The chip is measured against the trigger's rect, so the fixture has to put
// triggers in genuinely awkward places. Inline styles keep that geometry in
// this file instead of a stylesheet the spec cannot see.
const tip = (id, props, label, slots = {}) =>
  h(AspTooltip, { id: `tip-${id}`, ...props }, {
    default: () => h(AspButton, { id: `trig-${id}` }, () => label),
    ...slots,
  })

createApp({
  setup() {
    return () =>
      h('div', null, [
        // Flush against the top edge: no margin, no padding above it.
        h('div', { style: 'position:absolute;top:0;left:40vw' }, [
          tip('top', { content: 'Prefers top, must flip down.', position: 'top' }, 'top edge'),
        ]),

        // Flush against the left edge.
        h('div', { style: 'position:absolute;top:40vh;left:0' }, [
          tip('left', { content: 'Prefers left, must flip right.', position: 'left' }, 'left edge'),
        ]),

        h('div', { style: 'padding:200px 24px 24px;display:flex;gap:16px;align-items:center' }, [
          h('button', { id: 'before', type: 'button' }, 'before'),
          tip('default', { content: 'Tasks merged in the last 7 days.' }, 'Throughput'),
          h('button', { id: 'after', type: 'button' }, 'after'),
        ]),

        h('div', { style: 'padding:0 24px 24px;display:flex;gap:16px;align-items:center' }, [
          tip('slow', { content: 'Slow to open on hover.', openDelay: 600 }, 'slow'),
          tip('disabled', { content: 'Never rendered.', disabled: true }, 'disabled'),
          tip('slot', { position: 'right' }, 'chart point', {
            content: () => [h('strong', null, '2026-07-18'), h('br'), '14 merged'],
          }),
        ]),

        // The teleport's reason for existing: a chip authored as ::after would
        // be cut off at this box's edge.
        h(
          'div',
          {
            id: 'clipper',
            style: 'margin:0 24px 24px;max-height:44px;overflow:hidden;padding:8px;border:1px dashed #888',
          },
          [tip('clipped', { content: 'Not clipped by the scroller.' }, 'clipped')]
        ),
      ])
  },
}).mount('#app')
