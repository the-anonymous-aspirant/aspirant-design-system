import { expect, test } from '@playwright/test'

// §3.96: AspInput and AspTextarea are the text-entry family; both expose the
// SAME imperative contract (`el`, `focus`, `select`) so a caller fluent in one
// needs no new model for the other. AspTextarea previously exposed nothing — a
// `ref` yielded the component instance, `.focus()` was undefined, and a
// click-to-focus composer degraded silently (build green, render green, the
// caret never arrives). This test locks the two against drift: a future
// divergence turns it red rather than surfacing as a consumer runtime throw.
// (Same anti-drift discipline as the §3.95 caption-parity test.)

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/e2e/fixtures/imperative-parity.html', { waitUntil: 'networkidle' })
})

test('AspInput and AspTextarea expose the same imperative contract', async ({ page }) => {
  // The fixture reads the exposures off real template refs after mount, so a
  // missing exposure surfaces as `(missing)` / `undefined` here, not silence.
  const report = JSON.parse(await page.locator('#report').textContent())

  expect(report.input).toEqual({ focus: 'function', select: 'function', elTag: 'INPUT' })
  expect(report.textarea).toEqual({ focus: 'function', select: 'function', elTag: 'TEXTAREA' })

  // The member NAMES match across the family — the anti-drift invariant.
  expect(Object.keys(report.textarea).sort()).toEqual(Object.keys(report.input).sort())
})

test('AspTextarea focus() through a ref lands the caret in the inner textarea', async ({ page }) => {
  await page.locator('#focus-textarea').click()
  // The exposed focus() moved focus into the inner <textarea>, not the wrapper.
  const activeTag = await page.evaluate(() => document.activeElement?.tagName)
  expect(activeTag).toBe('TEXTAREA')
})
