// The component specimens the contrast probe measures, and the surfaces it
// measures them on. Shared by the real matrix and the known-bad fixture so the
// two cannot drift apart — a known-bad fixture that tests different markup
// than the real one proves nothing about the real one.
import { h } from 'vue'
import * as DS from '../../../src/index.js'

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'n', label: 'Count', align: 'right' },
]
const ROWS = [
  { name: 'alpha', n: 1 },
  { name: 'beta', n: 22 },
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
  h(DS.AspEmptyState, { heading: 'empty heading', message: 'empty message' }),
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

export const shell = (extra = []) =>
  h(DS.AspAppShell, {}, {
    sidebar: () => [h(DS.AspSidebarLink, { to: '#', label: 'Sidebar link', icon: '◱', badge: '3' })],
    default: () => h('div', { class: 'probe-root' }, [...surfaces(), ...extra]),
  })

export const injectProbeCss = () => {
  const st = document.createElement('style')
  st.textContent = `.probe-root{display:flex;flex-direction:column;gap:24px;padding:16px}
.probe-surface{padding:16px;background:var(--surface-page)}
.probe-surface--elevated{background:var(--surface-elevated)}`
  document.head.appendChild(st)
}
