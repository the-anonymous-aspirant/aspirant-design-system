// The component specimens the contrast probe measures, and the surfaces it
// measures them on. Shared by the real matrix and the known-bad fixture so the
// two cannot drift apart — a known-bad fixture that tests different markup
// than the real one proves nothing about the real one.
import { h, nextTick, ref } from 'vue'
import * as DS from '../../../src/index.js'

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'n', label: 'Count', align: 'right' },
]
const ROWS = [
  { name: 'alpha', n: 1 },
  { name: 'beta', n: 22 },
]

const SELECT_OPTIONS = [
  { value: 'a', label: 'option a' },
  { value: 'b', label: 'option b' },
  { value: 'c', label: 'option c', disabled: true },
]

/** One block of every text-rendering component in the library. */
export const specimens = () => [
  h(DS.AspDataTable, { columns: COLUMNS, rows: ROWS, caption: 'table caption' }),
  h(DS.AspBadge, { status: 'positive' }, () => 'status'),
  h(DS.AspBadge, { variant: 'chip' }, () => 'chip'),
  h(DS.AspBadge, { variant: 'filter' }, () => 'filter'),
  h(DS.AspBadge, { variant: 'dot', status: 'caution' }, () => 'dot label'),
  h(DS.AspButton, { variant: 'primary' }, () => 'primary'),
  h(DS.AspButton, { variant: 'secondary' }, () => 'secondary'),
  h(DS.AspButton, { variant: 'ghost' }, () => 'ghost'),
  h(DS.AspInput, { label: 'field label', modelValue: 'typed value' }),
  h(DS.AspSelect, { label: 'select label', modelValue: 'a', options: SELECT_OPTIONS }),
  h(DS.AspCheckbox, { label: 'checkbox unchecked', modelValue: false }),
  h(DS.AspCheckbox, { label: 'checkbox checked', modelValue: true }),
  h(DS.AspCheckbox, { label: 'checkbox mixed', modelValue: false, indeterminate: true }),
  h(DS.AspEmptyState, { heading: 'empty heading', message: 'empty message' }),
  h(DS.AspBackButton),
]

/**
 * Every surface a consumer can drop those into. `card-default` is the one that
 * matters most: AspCard's surface is DARK even in the light theme, which is the
 * polarity inversion behind the whole #2415 defect family.
 */
export const surfaces = () => [
  h('div', { class: 'probe-surface', 'data-surface': 'page' }, specimens()),
  h(DS.AspCard, { 'data-surface': 'card-default' }, () => specimens()),
  h(DS.AspCard, { variant: 'elevated', 'data-surface': 'card-elevated' }, () => specimens()),
  h(DS.AspCard, { variant: 'ghost', 'data-surface': 'card-ghost' }, () => specimens()),
  h('div', { class: 'probe-surface probe-surface--elevated', 'data-surface': 'surface-elevated' }, specimens()),
]

/**
 * A pre-opened AspSelect. The panel is a distinct surface (--surface-card,
 * dark even in the light theme) that no closed specimen reaches, so without
 * this the component could ship with invisible option text and the matrix
 * would still be green. Rendered on the page surface and inside a default
 * card, since the panel must be legible regardless of what it opens over.
 */
export const openPanels = () => [
  h('div', { class: 'probe-surface', 'data-surface': 'page-select-open' }, [
    h(DS.AspSelect, { label: 'open on page', modelValue: 'a', options: SELECT_OPTIONS, ref: 'openA' }),
  ]),
  h(DS.AspCard, { 'data-surface': 'card-select-open' }, () => [
    h(DS.AspSelect, { label: 'open on card', modelValue: 'b', options: SELECT_OPTIONS }),
  ]),
]

/**
 * A closed AspModal plus its trigger. Like the select panel, the modal's panel
 * is a surface no other specimen reaches (--surface-card, dark in both themes),
 * and it teleports to <body> so it is measured wherever it is authored.
 *
 * It stays CLOSED until the spec clicks the trigger, and the spec does that
 * last: an open modal's scrim is fixed inset-0 at z-index 1000, so it would
 * intercept the clicks and hovers the earlier passes depend on. A component
 * that silently disables another pass of the same suite is worse than one that
 * is not measured at all.
 */
const modalSpecimen = () => ({
  setup() {
    const open = ref(false)

    // Tagged imperatively rather than by passing `data-surface` as a prop: the
    // component's root is a Teleport, and relying on attribute fallthrough
    // through one is a guess about Vue internals that the probe's attribution
    // would silently depend on. The scrim is the panel's parent in <body>, so
    // tagging it is what `surfaceOf` walks up to find.
    const tag = () =>
      nextTick(() => document.querySelector('.modal__scrim')?.setAttribute('data-surface', 'modal'))

    return () => [
      h(
        'button',
        {
          id: 'probe-open-modal',
          type: 'button',
          onClick: () => {
            open.value = true
            tag()
          },
        },
        'open modal'
      ),
      h(
        DS.AspModal,
        { open: open.value, 'onUpdate:open': (v) => (open.value = v), title: 'modal title' },
        {
          default: () => [
            h('p', null, 'modal body text'),
            h(DS.AspInput, { label: 'modal field label', modelValue: 'typed value' }),
          ],
          footer: () => [
            h(DS.AspButton, { variant: 'ghost' }, () => 'cancel'),
            h(DS.AspButton, { variant: 'primary' }, () => 'confirm'),
          ],
        }
      ),
    ]
  },
})

export const shell = (extra = []) =>
  h(DS.AspAppShell, {}, {
    sidebar: () => [h(DS.AspSidebarLink, { to: '#', label: 'Sidebar link', icon: '◱', badge: '3' })],
    default: () =>
      h('div', { class: 'probe-root' }, [
        ...surfaces(),
        ...openPanels(),
        h(modalSpecimen()),
        ...extra,
      ]),
  })

export const injectProbeCss = () => {
  const st = document.createElement('style')
  st.textContent = `.probe-root{display:flex;flex-direction:column;gap:24px;padding:16px}
.probe-surface{padding:16px;background:var(--surface-page)}
.probe-surface--elevated{background:var(--surface-elevated)}`
  document.head.appendChild(st)
}
