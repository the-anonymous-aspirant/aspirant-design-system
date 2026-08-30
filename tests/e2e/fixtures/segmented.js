// AspSegmented fixture (§3.89, #4329): a radiogroup filter strip on the light
// page, a tabs strip, and the same filter strip on a dark card — so the spec can
// exercise v-model, roles/keyboard for both modes, and AA on both surfaces. The
// live selection is exposed on window for assertions.
import { createApp, h, ref } from 'vue'

import '../../../build/tokens.css'
import { AspSegmented } from '../../../src/index.js'

const filterOptions = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'done', label: 'Done' },
  { value: 'archived', label: 'Archived', disabled: true },
]
const tabOptions = [
  { value: 'list', label: 'List', controls: 'panel-list' },
  { value: 'grid', label: 'Grid', controls: 'panel-grid' },
]

// §3.94 (#4562): per-option `attrs` pass-through. `saved` also carries a
// COLLIDING set — the DS-owned attrs must win and the consumer's be ignored.
const attrsOptions = [
  { value: 'all', label: 'All', attrs: { 'data-test': 'jobs-tab-all', id: 'jobs-tab-all' } },
  {
    value: 'saved',
    label: 'Saved',
    attrs: {
      'data-test': 'jobs-tab-saved',
      role: 'button',
      tabindex: 5,
      disabled: true,
      'aria-checked': 'true',
      type: 'submit',
      class: 'consumer-hook',
    },
  },
]
// §3.94 (#4562): typed icon descriptor. One glyph string, one image that
// loads (an inline SVG data URI, visible), one image that errors (404) and
// must keep its glyph.
const ICON_PNG =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="%23d97706"/><path d="M4 8h8M8 4v8" stroke="white" stroke-width="2"/></svg>'
;('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=')
const iconOptions = [
  { value: 'text', label: 'Glyph', icon: '📅' },
  { value: 'img', label: 'Sequencing', icon: { src: ICON_PNG, fallback: '📅' } },
  { value: 'broken', label: 'Precision', icon: { src: '/__missing_icon__.png', fallback: '🎯' } },
  { value: 'off', label: 'Disabled', icon: { src: ICON_PNG, fallback: '🎯' }, disabled: true },
]

createApp({
  setup() {
    const filter = ref('active')
    const tab = ref('list')
    const attrsSel = ref('all')
    const iconSel = ref('img')
    window.__seg = { filter, tab, attrsSel, iconSel }

    const filterStrip = () =>
      h(AspSegmented, {
        options: filterOptions,
        modelValue: filter.value,
        ariaLabel: 'Filter',
        'onUpdate:modelValue': (v) => (filter.value = v),
      })

    return () =>
      h('div', { style: 'padding:24px; display:flex; flex-direction:column; gap:24px' }, [
        h('section', { id: 'filter' }, [filterStrip()]),
        h('section', { id: 'tabs' }, [
          h(AspSegmented, {
            options: tabOptions,
            as: 'tabs',
            modelValue: tab.value,
            ariaLabel: 'View',
            'onUpdate:modelValue': (v) => (tab.value = v),
          }),
        ]),
        h(
          'section',
          {
            id: 'filter-dark',
            style: 'background: var(--surface-card); color: var(--text-on-dark); padding: 12px',
          },
          [filterStrip()]
        ),
        // size="sm" strip — the dense in-toolbar case, mounted so the target-size
        // floor (§3.99 Tier 1, 24px) is asserted on the smallest members too.
        h('section', { id: 'filter-sm' }, [
          h(AspSegmented, {
            options: filterOptions,
            size: 'sm',
            modelValue: filter.value,
            ariaLabel: 'Filter (sm)',
            'onUpdate:modelValue': (v) => (filter.value = v),
          }),
        ]),
        h('section', { id: 'attrs' }, [
          h(AspSegmented, {
            options: attrsOptions,
            modelValue: attrsSel.value,
            ariaLabel: 'Jobs',
            'onUpdate:modelValue': (v) => (attrsSel.value = v),
          }),
        ]),
        h('section', { id: 'icons' }, [
          h(AspSegmented, {
            options: iconOptions,
            modelValue: iconSel.value,
            ariaLabel: 'History',
            'onUpdate:modelValue': (v) => (iconSel.value = v),
          }),
        ]),
        h(
          'section',
          {
            id: 'icons-dark',
            style: 'background: var(--surface-card); color: var(--text-on-dark); padding: 12px',
          },
          [
            h(AspSegmented, {
              options: iconOptions,
              modelValue: iconSel.value,
              ariaLabel: 'History (dark)',
              'onUpdate:modelValue': (v) => (iconSel.value = v),
            }),
          ]
        ),
      ])
  },
}).mount('#app')
