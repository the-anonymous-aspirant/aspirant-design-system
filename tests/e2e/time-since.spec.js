import { expect, test } from '@playwright/test'

import {
  DAY,
  HOUR,
  MINUTE,
  formatMagnitude,
  formatTimeSince,
  tickInterval,
  toMillis,
} from '../../src/utils/time_since.js'

// The acceptance criterion is "format rule matches to the second boundary", so
// the boundaries are asserted directly rather than sampled through a rendered
// string. Every one of these is a value where an off-by-one would be invisible
// in a screenshot and wrong in a log table.

test.describe('the format rule', () => {
  const CASES = [
    [0, '0s'],
    [1, '1s'],
    // The three unit boundaries, each checked on both sides.
    [MINUTE - 1, '59s'],
    [MINUTE, '1m'],
    [MINUTE + 1, '1m'],
    [HOUR - 1, '59m'],
    [HOUR, '1h'],
    [HOUR + 1, '1h'],
    [DAY - 1, '23h'],
    [DAY, '1d'],
    [DAY + 1, '1d'],
    [9 * DAY, '9d'],
    [365 * DAY, '365d'],
  ]

  for (const [seconds, expected] of CASES) {
    test(`${seconds}s renders "${expected}"`, () => {
      expect(formatMagnitude(seconds)).toBe(expected)
    })
  }

  test('floors before comparing, so 59.7s is never "60s"', () => {
    // Comparing the float and flooring afterwards prints a value the rule says
    // is unreachable.
    expect(formatMagnitude(59.7)).toBe('59s')
    expect(formatMagnitude(3599.9)).toBe('59m')
    expect(formatMagnitude(86399.9)).toBe('23h')
  })

  test('never emits a compound reading', () => {
    // "1h 22m" is the thing the rule exists to prevent (§2.7 terminal
    // aesthetic) — it breaks the column scan in a dense table.
    for (let s = 0; s < 3 * DAY; s += 137) {
      expect(formatMagnitude(s)).toMatch(/^\d+[smhd]$/)
    }
  })

  test('negative input floors to zero rather than printing "-3s"', () => {
    expect(formatMagnitude(-5)).toBe('0s')
  })
})

test.describe('variants', () => {
  const NOW = Date.parse('2026-07-19T12:00:00.000Z')
  const at = (offsetSeconds) => NOW + offsetSeconds * 1000

  test('elapsed reads "X ago"', () => {
    expect(formatTimeSince({ variant: 'elapsed', millis: at(-120), now: NOW }).text).toBe('2m ago')
  })

  test('duration reads bare, with no "ago"', () => {
    expect(formatTimeSince({ variant: 'duration', millis: at(-22 * MINUTE), now: NOW }).text).toBe(
      '22m'
    )
  })

  test('duration accepts a pre-computed magnitude', () => {
    expect(formatTimeSince({ variant: 'duration', seconds: 22 * MINUTE, now: NOW }).text).toBe('22m')
  })

  test('countdown reads "next X"', () => {
    expect(formatTimeSince({ variant: 'countdown', millis: at(180), now: NOW }).text).toBe('next 3m')
  })

  test('a countdown past its instant reads "due", not negative time', () => {
    // "next -3m" in a cron table is worse than useless.
    expect(formatTimeSince({ variant: 'countdown', millis: at(-180), now: NOW }).text).toBe('due')
    expect(formatTimeSince({ variant: 'countdown', millis: NOW, now: NOW }).text).toBe('due')
  })

  test('a future instant under elapsed stays truthful', () => {
    expect(formatTimeSince({ variant: 'elapsed', millis: at(300), now: NOW }).text).toBe('in 5m')
  })

  test('every reading carries the full ISO instant', () => {
    const r = formatTimeSince({ variant: 'elapsed', millis: at(-60), now: NOW })
    expect(r.iso).toBe('2026-07-19T11:59:00.000Z')
  })

  test('unparseable or absent input yields null, not a bogus reading', () => {
    expect(toMillis('not a date')).toBeNull()
    expect(toMillis(null)).toBeNull()
    expect(toMillis(new Date('nope'))).toBeNull()
    expect(formatTimeSince({ variant: 'elapsed', millis: null, now: NOW })).toBeNull()
  })
})

test.describe('live re-tick cadence', () => {
  test('scales with magnitude instead of running at 1Hz forever', () => {
    // A table of 200 nine-day-old timestamps must not wake the main thread 200
    // times a second to redraw text that changes daily.
    expect(tickInterval(5)).toBe(1000)
    expect(tickInterval(MINUTE)).toBe(60 * 1000)
    expect(tickInterval(9 * DAY)).toBe(60 * 60 * 1000)
  })
})

test.describe('the component renders it', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/e2e/fixtures/time-since.html', { waitUntil: 'networkidle' })
  })

  test('renders a <time> with a machine-readable datetime, not just a tooltip', async ({ page }) => {
    const el = page.locator('#elapsed time')
    expect(await el.evaluate((e) => e.tagName)).toBe('TIME')
    await expect(el).toHaveAttribute('datetime', '2026-07-19T11:58:00.000Z')
    await expect(el).toHaveAttribute('title', '2026-07-19T11:58:00.000Z')
    await expect(el).toHaveText('2m ago')
  })

  test('each variant renders its own grammar', async ({ page }) => {
    await expect(page.locator('#duration time')).toHaveText('22m')
    await expect(page.locator('#countdown time')).toHaveText('next 3m')
  })

  test('a missing instant renders an em dash, keeping the column shape', async ({ page }) => {
    const empty = page.locator('#empty .time-since--empty')
    await expect(empty).toHaveText('—')
    await expect(empty).toHaveAttribute('aria-label', 'no timestamp')
  })
})
