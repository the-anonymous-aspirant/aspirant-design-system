/**
 * Default value-axis range-normalization, as pure functions — the ONE source
 * of the §3.60 rule, consumed at two call sites (the bar choke point
 * `buildBarOptions`, and the raw line mount in system_3's `HealthDetails.vue`),
 * never copied (§3.47).
 *
 * The rule is TYPE-AWARE because the mark's encoding decides whether a non-zero
 * baseline is honest (§3.23):
 *
 *   - `magnitude` (bar/column) encodes value as LENGTH from a baseline, so the
 *     baseline must stay at the natural zero. Only TOP headroom is added
 *     (`suggestedMax`); the min is never lifted. Lifting it would be the
 *     truncated-axis lie.
 *   - `magnitude-diverging` (the two-series sparkline whose 2nd series is
 *     negated) keeps zero as its INTERIOR reference and gains headroom on BOTH
 *     ends outward from zero, so neither the up nor the down bars hit the cell
 *     edge and the y=0 gridline stays the honest datum.
 *   - `position` (line/point/area) encodes POSITION, so a focused, padded range
 *     is honest and is exactly the operator's ask (#3344): expand the observed
 *     range outward ~10% on BOTH ends.
 *
 * The outward expansion is SIGN-CORRECT so it never clips a negative bound
 * (the naive `0.9*min` moves a negative bound TOWARD zero and clips the data):
 *
 *     lower = observed_min < 0 ? roundDown(1.1*min) : roundDown(0.9*min)
 *     upper = observed_max < 0 ? roundUp(0.9*max)   : roundUp(1.1*max)
 *
 * which is equivalently "push each bound 10% of its own magnitude further from
 * the data range, then round OUTWARD" — implemented here as the branch-free
 * `min - 0.1*|min|` (floored) and `max + 0.1*|max|` (ceiled).
 */

/** The rounding granularity for a percentage/ratio axis. */
export const PERCENT_STEP = 0.1

/** A percentage/ratio axis is clamped to this natural domain. */
export const PERCENT_DOMAIN = [0, 100]

const isPercentUnit = (unit) => typeof unit === 'string' && unit.includes('%')

/**
 * Round `v` to a multiple of `step`, outward in `dir` (`'up'` = ceil,
 * `'down'` = floor). Done with an epsilon and a re-quantise so binary-float
 * drift (`0.1 * 3 === 0.30000000000000004`) neither adds a spurious step nor
 * leaves a ragged tail on the result.
 */
export function roundToUnit(v, step, dir) {
  if (!(step > 0)) return v
  const q = v / step
  const n = dir === 'up' ? Math.ceil(q - 1e-9) : Math.floor(q + 1e-9)
  return Math.round(n * step * 1e6) / 1e6
}

/**
 * The rounding step for a non-percent axis, derived from the data so the frame
 * is proportional to the metric's own scale. The largest power of ten near ~10%
 * of the span; for INTEGER-valued data (a count) it is floored at `1` so the
 * axis stays integer, for fractional data (a ratio like 0.92..0.98) it is left
 * fine (→ 0.001). A percent axis rounds to one decimal regardless.
 */
export function niceStep(min, max, { unit = '', allInteger = false } = {}) {
  if (isPercentUnit(unit)) return PERCENT_STEP
  const span = Math.abs(max - min)
  let base
  if (span > 0) {
    base = Math.pow(10, Math.floor(Math.log10(span * 0.1)))
  } else {
    // Flat/degenerate: a power of ten one below the value's own magnitude, so a
    // flat 5000 pads by 100s and a flat 0.5 by 0.01s. Zero → unit 1.
    const mag = Math.abs(max)
    base = mag > 0 ? Math.pow(10, Math.floor(Math.log10(mag)) - 1) : 1
  }
  if (allInteger) return Math.max(1, Math.round(base))
  return base || PERCENT_STEP
}

/** Every finite numeric value across a Chart.js data object or a bare array. */
export function collectValues(data) {
  if (Array.isArray(data)) return data.filter((v) => Number.isFinite(v))
  const out = []
  for (const ds of data?.datasets ?? []) {
    for (const v of ds?.data ?? []) {
      // A Chart.js `null` is a gap/missing point, not a zero — skip it rather
      // than let `Number(null) === 0` pull the domain down to a false baseline.
      if (v == null) continue
      const n = typeof v === 'number' ? v : Number(v)
      if (Number.isFinite(n)) out.push(n)
    }
  }
  return out
}

/**
 * The shared outward-expansion + clamp for an observed `[min, max]`, returning
 * `{ lower, upper }`. Percent clamps to `[0,100]`; a non-percent axis floors its
 * lower bound at 0 only when the data is non-negative (a count never dips below
 * zero, but a genuinely-negative bound — the diverging down-bars — is kept).
 */
export function expandRange(min, max, { unit = '', allInteger = false } = {}) {
  const step = niceStep(min, max, { unit, allInteger })
  let lower = roundToUnit(min - 0.1 * Math.abs(min), step, 'down')
  let upper = roundToUnit(max + 0.1 * Math.abs(max), step, 'up')
  if (isPercentUnit(unit)) {
    lower = Math.max(PERCENT_DOMAIN[0], lower)
    upper = Math.min(PERCENT_DOMAIN[1], upper)
  } else if (min >= 0) {
    lower = Math.max(0, lower)
  }
  return { lower, upper }
}

/**
 * Compute the normalized value-axis domain for a chart.
 *
 * @param {object|number[]} data  Chart.js `{datasets:[{data}]}` or a bare array.
 * @param {object} [o]
 * @param {'position'|'magnitude'|'magnitude-diverging'} [o.encoding='position']
 * @param {string} [o.unit='']  the metric unit; a `%` triggers percent rounding
 *   (0.1) and the `[0,100]` clamp.
 * @returns {object} A Chart.js `scales.y` fragment:
 *   - `position` → `{ min, max }` (hard bounds — the focused range).
 *   - `magnitude` → `{ suggestedMax }` (soft top headroom; the min stays 0 via
 *     the caller's `beginAtZero`).
 *   - `magnitude-diverging` → `{ suggestedMin, suggestedMax }` (soft both-ends
 *     headroom outward from the interior zero).
 *   An empty/no-finite series returns `{}` so the caller forces no domain.
 */
export function normalizeValueDomain(data, { encoding = 'position', unit = '' } = {}) {
  const values = collectValues(data)
  if (values.length === 0) return {}

  const min = Math.min(...values)
  const max = Math.max(...values)
  const allInteger = values.every((v) => Number.isInteger(v))
  const opts = { unit, allInteger }
  const unitStep = niceStep(min, max, opts)

  // Degenerate: never a [0,0] / zero-height domain (§3.35 lineage).
  const allZero = min === 0 && max === 0
  const flat = min === max

  if (encoding === 'magnitude') {
    // Bar: baseline stays at 0, top headroom only.
    if (max <= 0) return { suggestedMax: unitStep } // all-zero / degenerate → [0, 1 unit]
    let suggestedMax = roundToUnit(max + 0.1 * Math.abs(max), niceStep(0, max, opts), 'up')
    if (isPercentUnit(unit)) suggestedMax = Math.min(PERCENT_DOMAIN[1], suggestedMax)
    return { suggestedMax }
  }

  if (encoding === 'magnitude-diverging') {
    // Interior zero, both-ends outward. beginAtZero keeps 0 in range.
    if (allZero) return { suggestedMin: -unitStep, suggestedMax: unitStep }
    const { lower, upper } = expandRange(min, max, opts)
    return { suggestedMin: Math.min(0, lower), suggestedMax: Math.max(0, upper) }
  }

  // position (line/point/area): focused, padded range on both ends.
  if (allZero) return { min: 0, max: unitStep } // [0, 1 unit]
  if (flat) {
    // [V - p, V + p], p = max(1 unit, round(0.1*|V|)).
    const p = Math.max(unitStep, roundToUnit(0.1 * Math.abs(min), unitStep, 'up'))
    let low = min - p
    let high = max + p
    if (isPercentUnit(unit)) {
      low = Math.max(PERCENT_DOMAIN[0], low)
      high = Math.min(PERCENT_DOMAIN[1], high)
    } else if (min >= 0) {
      low = Math.max(0, low)
    }
    return { min: low, max: high }
  }
  const { lower, upper } = expandRange(min, max, opts)
  return { min: lower, max: upper }
}
