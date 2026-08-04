import { expect, test } from '@playwright/test'

// AspIcon's SVG arm must not fetch anything when VITE_ICON_BASE is unset --
// the same guard the image arm already applies. Guards system_3 #3384: the
// unguarded SVG arm fired a real network request (and a real 404) at the
// server root for every unmapped icon under a console that never set the
// base. This suite's dev server never sets VITE_ICON_BASE, so it exercises
// the real "unconfigured" contract rather than a mock.

const FIXTURE = '/tests/e2e/fixtures/icon.html'

test.beforeEach(async ({ page }) => {
  await page.goto(FIXTURE, { waitUntil: 'networkidle' })
})

test('SVG-arm icon issues no network request when unconfigured, renders its glyph', async ({
  page,
}) => {
  const svgArm = page.locator('#svgArm .asp-icon')
  await expect(svgArm.locator('.asp-icon__glyph')).toHaveText('⌕')
  await expect(svgArm.locator('.asp-icon__svg')).toHaveCount(0)
  const calls = await page.evaluate(() => window.__fetchCalls)
  expect(calls.some((u) => u.includes('search'))).toBe(false)
})

test('image-arm icon keeps its existing unconfigured behaviour (no <img>, glyph shown)', async ({
  page,
}) => {
  const imgArm = page.locator('#imgArm .asp-icon')
  await expect(imgArm.locator('.asp-icon__glyph')).toHaveText('⌂')
  await expect(imgArm.locator('.asp-icon__img')).toHaveCount(0)
  const calls = await page.evaluate(() => window.__fetchCalls)
  expect(calls.some((u) => u.includes('home'))).toBe(false)
})
