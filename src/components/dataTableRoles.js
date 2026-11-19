// Column roles for AspDataTable's phone card list (§3.119, task #9133).
//
// A column may declare `role: 'identity' | 'figure' | 'secondary'` (default
// 'secondary'). The card puts the identity cell top-left, the figure top-right
// and stacks the rest. A table has at most one of each named role; when none is
// declared, the FIRST column (that is not the figure) is the identity, so an undeclared table still
// renders a sensible card. `identityDeclared` lets the caller tell the two apart:
// the ≥640px identity floor (24ch) applies only to a declared identity, so an
// existing table does not get a wide first column (often a short `#`) overnight.
//
// A fourth role, `select` (§3.132 Decision 6, system_3 #11747), names a row's
// checkbox column. A table has at most one, and it must be the first column:
// in a card it sits on the first line, before the identity. A second one, or
// one that is not first, warns and is secondary. It is never the default
// identity.
//
// Pure and Vue-free so a Node test can import it directly.

export const COLUMN_ROLES = ['identity', 'figure', 'secondary', 'select']

export function resolveRoles(columns) {
  const cols = Array.isArray(columns) ? columns : []
  const warnings = []
  let identity = null
  let figure = null
  let select = null

  cols.forEach((col, i) => {
    const role = col?.role ?? 'secondary'
    if (!COLUMN_ROLES.includes(role)) {
      warnings.push(`column "${col?.key}": role "${role}" is not one of ${COLUMN_ROLES.join('|')}; treated as secondary.`)
      return
    }
    if (role === 'select') {
      if (select != null) warnings.push(`column "${col.key}": a second select column; "${select}" keeps the role.`)
      else if (i !== 0) warnings.push(`column "${col.key}": a select column must be the first column; treated as secondary.`)
      else select = col.key
    } else if (role === 'identity') {
      if (identity == null) identity = col.key
      else warnings.push(`column "${col.key}": a second identity column; "${identity}" keeps the role.`)
    } else if (role === 'figure') {
      if (figure == null) figure = col.key
      else warnings.push(`column "${col.key}": a second figure column; "${figure}" keeps the role.`)
    }
  })

  const identityDeclared = identity != null
  // The default is the first column, unless that column is the declared figure
  // or declares `select` (even a second, ignored one): then the first column
  // after it, so the card keeps every slot.
  if (!identityDeclared) identity = cols.find((c) => c.key !== figure && c?.role !== 'select')?.key ?? null

  return { identity, figure, select, identityDeclared, warnings }
}

// The card role a column plays, given the resolved roles.
export function cardRoleOf(col, roles) {
  if (roles.select != null && col.key === roles.select) return 'select'
  if (col.key === roles.identity) return 'identity'
  if (col.key === roles.figure) return 'figure'
  return 'secondary'
}
