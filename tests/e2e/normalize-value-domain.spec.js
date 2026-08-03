import { expect, test } from '@playwright/test'

import {
  PERCENT_DOMAIN,
  collectValues,
  expandRange,
  niceStep,
  normalizeValueDomain,
  roundToUnit,
} from '../../src/utils/normalize_value_domain.js'

// A Chart.js data object from a bare value array — one dataset.
const d = (...arrays) => ({ datasets: arrays.map((data) => ({ data })) })

// ---------------------------------------------------------------------------
// §3.60. The rule is TYPE-AWARE: a magnitude chart keeps its zero baseline and
// gains TOP headroom only; a position chart gets a focused, padded range on
// BOTH ends, sign-corrected so it never clips, rounded to the metric's unit and
// clamped to its natural domain. Each is asserted as a NUMBER here rather than
// inferred from a rendered canvas — an off-by-one in an axis bound is invisible
// in a screenshot and wrong on a page.
// ---------------------------------------------------------------------------

test.describe('roundToUnit — outward rounding without float drift', () => {
  test('ceils and floors to the unit', () => {
    expect(roundToUnit(33, 1, 'up')).toBe(33)
    expect(roundToUnit(32.1, 1, 'up')).toBe(33)
    expect(roundToUnit(9.9, 1, 'down')).toBe(9)
  })

  test('a value already on a decimal boundary does not gain a spurious step', () => {
    // 104.5 / 0.1 is 1044.9999999999998 in binary float; a naive ceil would
    // return 104.6.
    expect(roundToUnit(104.5, 0.1, 'up')).toBe(104.5)
    expect(roundToUnit(0.3, 0.1, 'down')).toBe(0.3)
  })
})

test.describe('niceStep — proportional to the metric scale', () => {
  test('integer data keeps an integer step (a count axis stays whole)', () => {
    expect(niceStep(1, 5, { allInteger: true })).toBe(1)
    expect(niceStep(0, 30, { allInteger: true })).toBe(1)
    expect(niceStep(0, 3000, { allInteger: true })).toBe(100)
  })

  test('fractional data gets a fine step (a ratio is not rounded to integers)', () => {
    expect(niceStep(0.92, 0.98, {})).toBeCloseTo(0.001, 6)
  })

  test('a percent axis rounds to one decimal regardless of span', () => {
    expect(niceStep(0, 100, { unit: '%' })).toBe(0.1)
  })
})

test.describe('collectValues — every finite value, across datasets', () => {
  test('flattens datasets and drops non-finite entries', () => {
    expect(collectValues(d([1, 2], [3, null, 4]))).toEqual([1, 2, 3, 4])
    expect(collectValues([5, NaN, 7])).toEqual([5, 7])
    expect(collectValues({ datasets: [] })).toEqual([])
  })
})

test.describe('position (line) — focused, padded, sign-correct on both ends', () => {
  test('all-positive counts expand outward and bracket the data', () => {
    const y = normalizeValueDomain(d([10, 20, 30]), { encoding: 'position' })
    // 0.9*10 floored, 1.1*30 ceiled.
    expect(y).toEqual({ min: 9, max: 33 })
    expect(y.min).toBeLessThan(10)
    expect(y.max).toBeGreaterThan(30)
  })

  test('a negative bound is NEVER clipped — it expands further from zero', () => {
    // The naive 0.9*min would move -30 to -27, INSIDE the data. The sign-correct
    // form pushes it to -33.
    expect(normalizeValueDomain(d([-30, -10]), { encoding: 'position' })).toEqual({
      min: -33,
      max: -9,
    })
  })

  test('a straddling range pads both ends outward from the data', () => {
    const y = normalizeValueDomain(d([-10, 40]), { encoding: 'position' })
    expect(y.min).toBeLessThanOrEqual(-10)
    expect(y.max).toBeGreaterThanOrEqual(40)
  })

  test('a percent axis clamps the padded upper to 100', () => {
    // 1.1*95 = 104.5 is nonsensical on a percentage axis.
    expect(normalizeValueDomain(d([80, 95]), { encoding: 'position', unit: '%' })).toEqual({
      min: 72,
      max: 100,
    })
  })

  test('a count axis floors the lower bound at 0', () => {
    const y = normalizeValueDomain(d([2, 8]), { encoding: 'position' })
    expect(y.min).toBeGreaterThanOrEqual(0)
  })

  test('a fractional ratio keeps a fine, focused frame', () => {
    const y = normalizeValueDomain(d([0.92, 0.98]), { encoding: 'position' })
    expect(y.min).toBeGreaterThan(0.5)
    expect(y.min).toBeLessThan(0.92)
    expect(y.max).toBeGreaterThan(0.98)
  })
})

test.describe('position — degenerate fallbacks never collapse the domain', () => {
  test('a flat series pads symmetrically, never zero-height', () => {
    // p = max(1 unit, round(0.1*|V|)); |7| gives p = 1.
    expect(normalizeValueDomain(d([7, 7, 7]), { encoding: 'position' })).toEqual({
      min: 6,
      max: 8,
    })
  })

  test('an all-zero series is [0, 1 unit], never [0, 0]', () => {
    expect(normalizeValueDomain(d([0, 0, 0]), { encoding: 'position' })).toEqual({ min: 0, max: 1 })
  })

  test('an empty series forces no domain (auto-fit is left alone)', () => {
    expect(normalizeValueDomain(d([]), { encoding: 'position' })).toEqual({})
    expect(normalizeValueDomain(d([null, NaN]), { encoding: 'position' })).toEqual({})
  })
})

test.describe('magnitude (bar) — zero baseline held, TOP headroom only', () => {
  test('emits a suggestedMax and does NOT lift the min off zero', () => {
    const y = normalizeValueDomain(d([10, 20, 30]), { encoding: 'magnitude' })
    // 1.1*30 ceiled; no min/max keys, so the caller's beginAtZero holds 0.
    expect(y).toEqual({ suggestedMax: 33 })
    expect(y).not.toHaveProperty('min')
    expect(y).not.toHaveProperty('suggestedMin')
  })

  test('a percent bar clamps the headroom to 100', () => {
    expect(normalizeValueDomain(d([50, 95]), { encoding: 'magnitude', unit: '%' })).toEqual({
      suggestedMax: 100,
    })
  })

  test('an all-zero bar series is [0, 1 unit], not a zero-height cell', () => {
    expect(normalizeValueDomain(d([0, 0]), { encoding: 'magnitude' })).toEqual({ suggestedMax: 1 })
  })
})

test.describe('magnitude-diverging (two-series sparkline) — interior zero, both ends', () => {
  test('pads above the max positive and below the min negative', () => {
    // done series negated: values straddle zero.
    const y = normalizeValueDomain(d([5, 12], [-3, -8]), { encoding: 'magnitude-diverging' })
    expect(y.suggestedMin).toBeLessThan(-8)
    expect(y.suggestedMax).toBeGreaterThan(12)
  })

  test('keeps zero interior even for a one-sided (all-positive) window', () => {
    // An all-created hour: the down side is empty, but 0 must stay the datum so
    // the polarity reads honestly.
    const y = normalizeValueDomain(d([3, 7, 10]), { encoding: 'magnitude-diverging' })
    expect(y.suggestedMin).toBeLessThanOrEqual(0)
    expect(y.suggestedMax).toBeGreaterThan(10)
  })

  test('an all-zero diverging window is symmetric, never zero-height', () => {
    const y = normalizeValueDomain(d([0, 0], [0, 0]), { encoding: 'magnitude-diverging' })
    expect(y.suggestedMin).toBeLessThan(0)
    expect(y.suggestedMax).toBeGreaterThan(0)
  })
})

test.describe('expandRange + PERCENT_DOMAIN — the shared clamp', () => {
  test('percent bounds never leave [0, 100]', () => {
    const { lower, upper } = expandRange(1, 99, { unit: '%' })
    expect(lower).toBeGreaterThanOrEqual(PERCENT_DOMAIN[0])
    expect(upper).toBeLessThanOrEqual(PERCENT_DOMAIN[1])
  })
})
