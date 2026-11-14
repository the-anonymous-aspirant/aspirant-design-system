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
    // §3.120 Q3: 10% of the RANGE (20) each side, at least one unit.
    expect(y).toEqual({ min: 8, max: 32 })
    expect(y.min).toBeLessThan(10)
    expect(y.max).toBeGreaterThan(30)
  })

  test('a negative bound is NEVER clipped — it expands further from zero', () => {
    // Range padding is outward by construction: -30 goes to -32, never inside.
    expect(normalizeValueDomain(d([-30, -10]), { encoding: 'position' })).toEqual({
      min: -32,
      max: -8,
    })
  })

  test('a straddling range pads both ends outward from the data', () => {
    const y = normalizeValueDomain(d([-10, 40]), { encoding: 'position' })
    expect(y.min).toBeLessThanOrEqual(-10)
    expect(y.max).toBeGreaterThanOrEqual(40)
  })

  test('a percent axis pads by its range and clamps to [0, 100]', () => {
    // 80–95: the range (15) is just under a sixth of the level (95), so the
    // flat-series frame, ±9.5 about 87.5, is the wider (§3.120 Q3 amendment).
    expect(normalizeValueDomain(d([80, 95]), { encoding: 'position', unit: '%' })).toEqual({
      min: 78,
      max: 97,
    })
    expect(normalizeValueDomain(d([70, 95]), { encoding: 'position', unit: '%' })).toEqual({
      min: 67.5,
      max: 97.5,
    })
    expect(normalizeValueDomain(d([0, 100]), { encoding: 'position', unit: '%' })).toEqual({
      min: 0,
      max: 100,
    })
  })

  test('a small move against its level sits in a band, on purpose (§3.120 Q3 amendment)', () => {
    // #9104 B4-5 framed backlog 51–52 by its range, [50, 53], a full-height
    // climb. The 2026-11-14 amendment undoes that on purpose: one task in 52 is
    // not a trend, so the frame is ±10% of the level, centred on the series.
    expect(normalizeValueDomain(d([51, 52]), { encoding: 'position' })).toEqual({ min: 46, max: 57 })
    expect(normalizeValueDomain(d([74.3, 75.8]), { encoding: 'position', unit: '%' })).toEqual({
      min: 67.4,
      max: 82.7,
    })
  })

  test('magnitude and diverging domains are unchanged by the position rule', () => {
    // Values read at f2fbdeb, before §3.120 Q3.
    expect(normalizeValueDomain(d([10, 20, 30]), { encoding: 'magnitude' })).toEqual({ suggestedMax: 33 })
    expect(normalizeValueDomain(d([51, 52]), { encoding: 'magnitude' })).toEqual({ suggestedMax: 58 })
    expect(normalizeValueDomain(d([3, -2]), { encoding: 'magnitude-diverging' })).toEqual({
      suggestedMin: -3,
      suggestedMax: 4,
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

// The 10%-of-range frame as it was before the amendment, for "exactly today's
// frame" (system_3 #11100). Kept here, not exported: it is the reference the
// amendment must reproduce, not a second rule.
const rangeOnlyFrame = (lo, hi, opts = {}) => {
  const step = niceStep(lo, hi, opts)
  const pad = Math.max(0.1 * (hi - lo), step)
  return { min: Math.max(0, roundToUnit(lo - pad, step, 'down')), max: roundToUnit(hi + pad, step, 'up') }
}

test.describe('position — never narrower than the flat-series frame (§3.120 Q3 amendment)', () => {
  test("DB SIZE's 1.36% day occupies at most a fifth of its frame", () => {
    // 3.064 to 3.106 GB over 24 h was drawn as a full-height climb (O-16).
    const y = normalizeValueDomain(d([3.064, 3.08, 3.106]), { encoding: 'position' })
    expect(y).toEqual({ min: 2.774, max: 3.396 })
    expect((3.106 - 3.064) / (y.max - y.min)).toBeLessThanOrEqual(0.2)
  })

  test('a line whose range is over a sixth of its level keeps exactly today\'s frame', () => {
    // Level 100: a range of 20 (a fifth) is over the line, 15 is under it.
    for (const lo of [80, 75, 50, 10]) {
      expect(normalizeValueDomain(d([lo, 100]), { encoding: 'position' })).toEqual(rangeOnlyFrame(lo, 100, { allInteger: true }))
    }
    for (const [lo, hi, unit] of [[0.5, 0.98, ''], [40, 75, '%'], [1000, 1400, '']]) {
      const allInteger = Number.isInteger(lo) && Number.isInteger(hi)
      expect(normalizeValueDomain(d([lo, hi]), { encoding: 'position', unit })).toEqual(rangeOnlyFrame(lo, hi, { unit, allInteger }))
    }
  })

  test('a line under a sixth of its level gets the wider flat-series frame, centred on it', () => {
    const y = normalizeValueDomain(d([85, 100]), { encoding: 'position' })
    const old = rangeOnlyFrame(85, 100, { allInteger: true })
    expect(y.max - y.min).toBeGreaterThan(old.max - old.min)
    // ±10 about 92.5, rounded outward to whole units.
    expect(y).toEqual({ min: 82, max: 103 })
  })

  test('the frame widens smoothly across the cut-off, with no jump', () => {
    // Sweep the range from 2% to 40% of a level of 100. Before rounding, the
    // frame's width is 2 x max(range/2 + pad, 0.1 x level): continuous, and
    // never falling as the range grows. Rounding outward adds at most one unit
    // per side, so the drawn frame stays within two units of it everywhere,
    // including at the cut-off near a sixth (range 16.7).
    let prevExact = null
    for (let r = 2; r <= 40; r += 0.25) {
      const lo = 100 - r
      const y = normalizeValueDomain(d([lo, 100]), { encoding: 'position' })
      const step = niceStep(lo, 100, { allInteger: Number.isInteger(lo) })
      const exact = 2 * Math.max(r / 2 + Math.max(0.1 * r, step), 0.1 * 100)
      expect(y.max - y.min).toBeGreaterThanOrEqual(exact - 1e-9)
      expect(y.max - y.min).toBeLessThanOrEqual(exact + 2 * step + 1e-9)
      if (prevExact !== null) {
        expect(exact).toBeGreaterThanOrEqual(prevExact - 1e-9)
        // One sweep step moves the exact width by at most 1.2 x 0.25 (and by
        // nothing on the flat side): no jump at the cut-off.
        expect(exact - prevExact).toBeLessThanOrEqual(1.2 * 0.25 + 1e-9)
      }
      prevExact = exact
    }
  })

  test('a negative series is framed by its largest absolute value too', () => {
    const y = normalizeValueDomain(d([-101, -100]), { encoding: 'position' })
    expect(y).toEqual({ min: -111, max: -90 })
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
