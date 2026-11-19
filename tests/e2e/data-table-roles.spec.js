import { expect, test } from '@playwright/test'

import { cardRoleOf, resolveRoles } from '../../src/components/dataTableRoles.js'

// Unit test for AspDataTable's column-role defaulting (§3.119, #9133). The repo
// has no unit runner, so this imports the pure module into the Playwright Node
// process; no page is opened.

test('no declared identity: the first column is the identity, undeclared', () => {
  const r = resolveRoles([{ key: 'a' }, { key: 'b' }, { key: 'c', role: 'figure' }])
  expect(r.identity).toBe('a')
  expect(r.identityDeclared).toBe(false)
  expect(r.figure).toBe('c')
  expect(r.warnings).toEqual([])
})

test('a declared identity wins over the first column', () => {
  const r = resolveRoles([{ key: 'a' }, { key: 'b', role: 'identity' }])
  expect(r.identity).toBe('b')
  expect(r.identityDeclared).toBe(true)
})

test('two identities warn, and the first keeps the role', () => {
  const r = resolveRoles([
    { key: 'a', role: 'identity' },
    { key: 'b', role: 'identity' },
  ])
  expect(r.identity).toBe('a')
  expect(r.warnings).toHaveLength(1)
  expect(r.warnings[0]).toMatch(/"b".*second identity/)
})

test('two figures warn, and the first keeps the role', () => {
  const r = resolveRoles([{ key: 'a' }, { key: 'b', role: 'figure' }, { key: 'c', role: 'figure' }])
  expect(r.figure).toBe('b')
  expect(r.warnings).toHaveLength(1)
})

test('a first-column figure leaves the identity to the next column', () => {
  const r = resolveRoles([{ key: 'n', role: 'figure' }, { key: 'name' }])
  expect(r.figure).toBe('n')
  expect(r.identity).toBe('name')
})

test('an unknown role warns and is secondary', () => {
  const r = resolveRoles([{ key: 'a' }, { key: 'b', role: 'headline' }])
  expect(r.identity).toBe('a')
  expect(r.figure).toBeNull()
  expect(r.warnings[0]).toMatch(/"headline"/)
})

test('no columns: no roles, no throw', () => {
  expect(resolveRoles([])).toEqual({ identity: null, figure: null, select: null, identityDeclared: false, warnings: [] })
})

// The select role (system_3 #11747, §3.132 Decision 6).
test('a first-column select resolves, and is no identity', () => {
  const r = resolveRoles([{ key: 's', role: 'select' }, { key: 'who', role: 'identity' }, { key: 'amt', role: 'figure' }])
  expect(r.select).toBe('s')
  expect(r.identity).toBe('who')
  expect(r.figure).toBe('amt')
  expect(r.warnings).toEqual([])
})

test('with a select and no identity, the identity is the next column', () => {
  const r = resolveRoles([{ key: 's', role: 'select' }, { key: 'date' }, { key: 'who' }])
  expect(r.select).toBe('s')
  expect(r.identity).toBe('date')
  expect(r.identityDeclared).toBe(false)
})

test('a select, then a first-after-select figure: the identity is the column after both', () => {
  const r = resolveRoles([{ key: 's', role: 'select' }, { key: 'amt', role: 'figure' }, { key: 'who' }])
  expect(r.identity).toBe('who')
})

test('a second select warns, and the first keeps the role', () => {
  const r = resolveRoles([{ key: 's', role: 'select' }, { key: 't', role: 'select' }, { key: 'who' }])
  expect(r.select).toBe('s')
  expect(r.identity).toBe('who')
  expect(r.warnings).toHaveLength(1)
  expect(r.warnings[0]).toMatch(/"t".*second select/)
})

test('a select that is not first warns and is secondary', () => {
  const r = resolveRoles([{ key: 'who' }, { key: 's', role: 'select' }])
  expect(r.select).toBeNull()
  expect(r.identity).toBe('who')
  expect(r.warnings).toHaveLength(1)
  expect(r.warnings[0]).toMatch(/"s".*must be the first column/)
  expect(cardRoleOf({ key: 's' }, r)).toBe('secondary')
})

test('cardRoleOf names the select column', () => {
  const r = resolveRoles([{ key: 's', role: 'select' }, { key: 'who', role: 'identity' }])
  expect(cardRoleOf({ key: 's' }, r)).toBe('select')
  expect(cardRoleOf({ key: 'who' }, r)).toBe('identity')
})
