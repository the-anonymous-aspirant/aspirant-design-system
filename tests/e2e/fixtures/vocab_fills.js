/**
 * The nine distinct fills currently in system_3's `vocab_labels`, captured
 * 2026-07-19, plus the boundary case called out in the §3.18 ruling.
 *
 * The ruling asks the assertion to cover "every fill in `vocab_labels`, read
 * from the vocabulary — not a hardcoded list of five", because an enumerated
 * fixture goes stale the moment the operator adds a colour.
 *
 * This repo is a standalone design system with no access to system_3's
 * database, so it cannot literally read the vocabulary. Enumerating it here
 * would inherit exactly the staleness the ruling warns about, so the list below
 * is NOT the real guarantee — it is the set of named regression cases. The real
 * guarantee is the sweep in badge-color.spec.js, which asserts the rule over
 * the whole colour space the vocabulary is drawn from, so a fill added
 * tomorrow is already covered.
 */
export const LIVE_VOCAB_FILLS = [
  '#ffb300',
  '#d1a72e',
  '#4bb5b0',
  '#5fb85f',
  '#e0803c',
  '#4f9dde',
  '#c07ba0',
  '#8f7ee0',
  // The only live fill that fails against BOTH candidate inks, so the only one
  // that exercises step 3 of the rule.
  '#c063c0',
]
