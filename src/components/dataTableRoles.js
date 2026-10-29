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
// Pure and Vue-free so a Node test can import it directly.

export const COLUMN_ROLES = ['identity', 'figure', 'secondary']

export function resolveRoles(columns) {
  const cols = Array.isArray(columns) ? columns : []
  const warnings = []
  let identity = null
  let figure = null

  for (const col of cols) {
    const role = col?.role ?? 'secondary'
    if (!COLUMN_ROLES.includes(role)) {
      warnings.push(`column "${col?.key}": role "${role}" is not one of ${COLUMN_ROLES.join('|')}; treated as secondary.`)
      continue
    }
    if (role === 'identity') {
      if (identity == null) identity = col.key
      else warnings.push(`column "${col.key}": a second identity column; "${identity}" keeps the role.`)
    } else if (role === 'figure') {
      if (figure == null) figure = col.key
      else warnings.push(`column "${col.key}": a second figure column; "${figure}" keeps the role.`)
    }
  }

  const identityDeclared = identity != null
  // The default is the first column, unless that column is the declared figure:
  // then the first column after it, so the card keeps both slots.
  if (!identityDeclared) identity = cols.find((c) => c.key !== figure)?.key ?? null

  return { identity, figure, identityDeclared, warnings }
}

// The card role a column plays, given the resolved roles.
export function cardRoleOf(col, roles) {
  if (col.key === roles.identity) return 'identity'
  if (col.key === roles.figure) return 'figure'
  return 'secondary'
}
