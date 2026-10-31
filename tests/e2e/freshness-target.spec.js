/**
 * §3.99 Tier 2 / §3.122 P8 (system_3 #9241): AspFreshness' refresh trigger is
 * icon-only, small in both dimensions, so its hit area is 44 x 44 CSS px, and
 * its look does not change: the glyph, the pending spinner and the failed glyph
 * render at the size they had before (measured on 6d2c995 with
 * getBoundingClientRect). The box itself grows rather than an overlay, so a
 * neighbour one --space-xs away keeps a hit area of its own.
 */
import { expect, test } from '@playwright/test'

// Before #9241: the sm glyph, spinner and failed glyph were 13.59px (1em of
// --text-sm), and the md glyph 16px (1em of --text-base).
const BEFORE = { sm: 13.59, md: 16 }

const rect = (loc) =>
  loc.evaluate((el) => {
    const r = el.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })

for (const theme of ['light', 'dark']) {
  test.describe(theme, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/tests/e2e/fixtures/freshness.html${theme === 'dark' ? '?theme=dark' : ''}`, {
        waitUntil: 'networkidle',
      })
      await expect(page.locator('#neighbour [data-testid="neighbour"]')).toBeVisible()
    })

    for (const [id, size] of [['normal', 'sm'], ['md', 'md'], ['triggerOnly', 'sm']]) {
      test(`#${id}: a 44 x 44 box, the ${size} glyph unchanged, every point within ±20px of centre hits it`, async ({ page }) => {
        const trigger = page.locator(`#${id} [data-testid="freshness-refresh"]`)
        const box = await rect(trigger)
        expect(box.w).toBeGreaterThanOrEqual(44)
        expect(box.h).toBeGreaterThanOrEqual(44)

        const glyph = await rect(trigger.locator('svg'))
        expect(Math.abs(glyph.w - BEFORE[size])).toBeLessThanOrEqual(0.5)
        expect(Math.abs(glyph.h - BEFORE[size])).toBeLessThanOrEqual(0.5)
        // Centred in the square.
        expect(Math.abs(glyph.x + glyph.w / 2 - (box.x + box.w / 2))).toBeLessThanOrEqual(0.5)
        expect(Math.abs(glyph.y + glyph.h / 2 - (box.y + box.h / 2))).toBeLessThanOrEqual(0.5)

        const misses = await trigger.evaluate((el) => {
          const r = el.getBoundingClientRect()
          const cx = r.x + r.width / 2
          const cy = r.y + r.height / 2
          const out = []
          // ±20px on each axis, and the grid between. The four exact corners
          // (±20, ±20) sit 2px in from both edges, inside the button's 8px
          // border-radius, which Chromium hit-tests as the rounded shape.
          for (const dx of [-20, -10, 0, 10, 20])
            for (const dy of [-20, -10, 0, 10, 20]) {
              if (Math.abs(dx) === 20 && Math.abs(dy) === 20) continue
              const hit = document.elementFromPoint(cx + dx, cy + dy)
              if (!hit || !el.contains(hit)) out.push(`${dx},${dy}`)
            }
          return out
        })
        expect(misses).toEqual([])
      })
    }

    test('pending and failed keep the spinner and the failed glyph at their size', async ({ page }) => {
      const spinner = await rect(page.locator('#pending [data-testid="freshness-refresh"] .btn__spinner'))
      expect(Math.abs(spinner.w - BEFORE.sm)).toBeLessThanOrEqual(0.5)
      expect(Math.abs(spinner.h - BEFORE.sm)).toBeLessThanOrEqual(0.5)
      const failed = await rect(page.locator('#failed [data-testid="freshness-failed"] svg'))
      expect(Math.abs(failed.w - BEFORE.sm)).toBeLessThanOrEqual(0.5)
      expect(Math.abs(failed.h - BEFORE.sm)).toBeLessThanOrEqual(0.5)
      const box = await rect(page.locator('#pending [data-testid="freshness-refresh"]'))
      expect(box.w).toBeGreaterThanOrEqual(44)
      expect(box.h).toBeGreaterThanOrEqual(44)
    })

    test('a button one --space-xs away keeps its own hit area', async ({ page }) => {
      const trigger = page.locator('#neighbour [data-testid="freshness-refresh"]')
      const other = page.locator('#neighbour [data-testid="neighbour"]')
      const [a, b] = [await rect(trigger), await rect(other)]
      const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
      expect(overlap).toBe(false)
      // Each one's centre and its inner edge nearest the other resolve to itself.
      const owns = (loc, pts) =>
        loc.evaluate((el, ps) => ps.every(([x, y]) => el.contains(document.elementFromPoint(x, y))), pts)
      const mid = (r) => r.y + r.h / 2
      expect(await owns(trigger, [[a.x + a.w / 2, mid(a)], [a.x + a.w - 1, mid(a)]])).toBe(true)
      expect(await owns(other, [[b.x + b.w / 2, mid(b)], [b.x + 1, mid(b)]])).toBe(true)
    })
  })
}
