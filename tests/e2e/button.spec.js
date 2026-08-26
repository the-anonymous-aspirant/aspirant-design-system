import { expect, test } from '@playwright/test'

// AspButton icon-only affordance (§3.89, #4328): size="icon" is a FIXED square
// ≥44px hit target (not a label-width pill), requires an accessible name, and
// composes with every variant — while text buttons are untouched.

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/e2e/fixtures/button.html', { waitUntil: 'networkidle' })
})

const box = (page, id) => page.locator(`#${id} button`).boundingBox()

test('size="icon" renders a square ≥44×44 box (AC1)', async ({ page }) => {
  const b = await box(page, 'icon-ghost')
  expect(b.width).toBeGreaterThanOrEqual(44)
  expect(b.height).toBeGreaterThanOrEqual(44)
  // Square: width and height agree within a sub-pixel tolerance.
  expect(Math.abs(b.width - b.height)).toBeLessThan(1.5)
})

test('a wide glyph does not stretch the square (fixed box, not label-driven) (AC1)', async ({
  page,
}) => {
  const wide = await box(page, 'icon-wide')
  // Eight 'W's would blow out a padded pill; the fixed box stays ~44px wide.
  expect(wide.width).toBeLessThanOrEqual(46)
  expect(Math.abs(wide.width - wide.height)).toBeLessThan(1.5)
})

test('size="icon" with no accessible name triggers a dev warning (AC2)', async ({ page }) => {
  const warnings = []
  page.on('console', (m) => {
    if (m.type() === 'warning') warnings.push(m.text())
  })
  // Re-run the module with the listener attached so the mount-time warn is seen.
  await page.reload({ waitUntil: 'networkidle' })
  expect(warnings.some((w) => /accessible name/i.test(w))).toBe(true)
})

test('every variant renders in icon shape as a square (AC3)', async ({ page }) => {
  for (const variant of ['primary', 'secondary', 'ghost', 'destructive']) {
    const btn = page.locator(`#icon-${variant} button`)
    await expect(btn).toHaveClass(new RegExp(`btn--${variant}`))
    await expect(btn).toHaveClass(/btn--size-icon/)
    const b = await btn.boundingBox()
    expect(b.width, variant).toBeGreaterThanOrEqual(44)
    expect(Math.abs(b.width - b.height), variant).toBeLessThan(1.5)
  }
})

test('icon buttons keep a focus ring (AC3)', async ({ page }) => {
  const btn = page.locator('#icon-ghost button')
  await btn.focus()
  const shadow = await btn.evaluate((el) => getComputedStyle(el).boxShadow)
  expect(shadow).not.toBe('none') // --shadow-focus applied via :focus-visible
})

test('text buttons render byte-identically — a padded label pill, not a square (AC4)', async ({
  page,
}) => {
  const btn = page.locator('#text button')
  // The .btn__label wrapper is retained for text buttons.
  await expect(btn.locator('.btn__label')).toHaveText('Save changes')
  await expect(btn).not.toHaveClass(/btn--size-icon/)
  const b = await btn.boundingBox()
  // Label-driven width, clearly wider than the 44px icon square.
  expect(b.width).toBeGreaterThan(60)
  // Non-zero horizontal padding preserved (not the icon shape's padding:0).
  const padX = await btn.evaluate((el) => getComputedStyle(el).paddingLeft)
  expect(parseFloat(padX)).toBeGreaterThan(0)
})
