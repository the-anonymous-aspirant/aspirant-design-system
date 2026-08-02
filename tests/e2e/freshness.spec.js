import { expect, test } from '@playwright/test'

// AspFreshness is presentational, so the assertions prove the two things a
// composed control owns that a caller-assembled pair does not: (1) the states
// (pending/failed) render from the props, and (2) the failure state never
// mutates the displayed timestamp. The relative-time formatting itself is
// AspTimeSince's contract and is asserted there — here `now` is injected so the
// readings are fixed while these run.

test.describe('AspFreshness', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/e2e/fixtures/freshness.html', { waitUntil: 'networkidle' })
  })

  test('composes AspTimeSince + a refresh trigger as one control', async ({ page }) => {
    const normal = page.locator('#normal')
    // The label prefix + the AspTimeSince <time> read as one unit.
    await expect(normal).toContainText('Updated')
    await expect(normal.locator('time')).toHaveText('8m ago')
    await expect(normal.getByTestId('freshness-refresh')).toBeVisible()
  })

  test('clicking the trigger emits refresh (the caller performs the fetch)', async ({ page }) => {
    await page.locator('#normal').getByTestId('freshness-refresh').click()
    await expect.poll(() => page.evaluate(() => window.__refresh.normal)).toBe(1)
  })

  test('pending shows the spinner, disables the trigger, and swallows clicks', async ({ page }) => {
    const btn = page.locator('#pending').getByTestId('freshness-refresh')
    await expect(btn).toBeDisabled()
    await expect(btn).toHaveAttribute('aria-busy', 'true')
    await expect(btn.locator('.btn__spinner')).toBeVisible()
    // A disabled AspButton blocks the emit even under a forced click — the
    // caller is never asked to fetch twice while one is already in flight.
    await btn.click({ force: true })
    await page.waitForTimeout(50)
    expect(await page.evaluate(() => window.__refresh.pending)).toBe(0)
  })

  test('failure shows the warning glyph WITHOUT touching the timestamp', async ({ page }) => {
    const failed = page.locator('#failed')
    const glyph = failed.getByTestId('freshness-failed')
    await expect(glyph).toBeVisible()
    await expect(glyph).toHaveAttribute('aria-label', 'refresh failed, showing last known data')
    await expect(glyph).toHaveAttribute('title', 'refresh failed, showing last known data')
    // The displayed instant is byte-identical to a non-failed control with the
    // same last-successful-at: the component never blanks or advances it on a
    // failed refresh — the core honesty contract of the primitive.
    const failedText = await failed.locator('time').textContent()
    const normalText = await page.locator('#normal time').textContent()
    expect(failedText).toBe(normalText)
  })

  test('the failure glyph is absent unless failed, and suppressed while pending', async ({
    page,
  }) => {
    await expect(page.locator('#normal').getByTestId('freshness-failed')).toHaveCount(0)
    // failed + pending would tell the operator "failed" and "loading" at once —
    // the pending retry wins, so the glyph is suppressed. (#pending is not
    // failed; this asserts the absence, and the template's `failed && !pending`
    // guard is what enforces the suppression when both are true.)
    await expect(page.locator('#pending').getByTestId('freshness-failed')).toHaveCount(0)
  })

  test('long-idle reads a coarse magnitude, no forced "stale" treatment', async ({ page }) => {
    await expect(page.locator('#idle time')).toHaveText('3h ago')
  })

  // The failure glyph is a non-text mark (WCAG AA needs >=3:1, not 4.5:1). It
  // derives from currentColor via color-mix so it adapts to the surface polarity
  // — assert it clears 3:1 on the painted surface in BOTH themes rather than
  // trusting the derivation.
  for (const theme of ['light', 'dark']) {
    test(`the failure glyph clears AA non-text contrast (>=3:1) — ${theme}`, async ({ page }) => {
      await page.goto(`/tests/e2e/fixtures/freshness.html${theme === 'dark' ? '?theme=dark' : ''}`, {
        waitUntil: 'networkidle',
      })
      const ratio = await page.locator('#failed [data-testid="freshness-failed"]').evaluate((el) => {
        const parse = (c) => {
          const cv = document.createElement('canvas').getContext('2d')
          cv.fillStyle = '#000'
          cv.fillStyle = c
          cv.fillRect(0, 0, 1, 1)
          const [r, g, b, a] = cv.getImageData(0, 0, 1, 1).data
          return [r, g, b, a / 255]
        }
        const lum = ([r, g, b]) => {
          const f = (v) => {
            const s = v / 255
            return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
          }
          return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
        }
        const over = (fg, bg) => fg.map((v, i) => (i < 3 ? v * fg[3] + bg[i] * (1 - fg[3]) : 1))
        // First opaque painted ancestor is the effective surface.
        let bg = [255, 255, 255, 1]
        for (let n = el.parentElement; n; n = n.parentElement) {
          const c = parse(getComputedStyle(n).backgroundColor)
          if (c[3] === 1) {
            bg = c
            break
          }
        }
        const fg = over(parse(getComputedStyle(el).color), bg)
        const [hi, lo] = [lum(fg), lum(bg)].sort((a, b) => b - a)
        return (hi + 0.05) / (lo + 0.05)
      })
      expect(ratio).toBeGreaterThanOrEqual(3)
    })
  }
})
