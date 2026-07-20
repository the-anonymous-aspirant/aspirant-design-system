import { expect, test } from '@playwright/test'

import { MEASURE } from './contrast-measure.js'

/**
 * Regression cover for the probe's background-image blindness (#2467).
 *
 * `effectiveBg` composited `backgroundColor` up the ancestor chain and never
 * read `background-image`, so any component painting a translucent wash as a
 * gradient layer was measured against the wrong surface. The direction is what
 * made it dangerous rather than merely imprecise: in the light theme the wash
 * is black, so the probe read a lighter surface than reality and was
 * conservative; in the DARK theme the wash is white, so it read #2a2a2a where
 * the screen paints #373737 and OVERSTATED contrast — passing colours that are
 * sub-AA on screen. A guard that fails safe in one theme and unsafe in the
 * other reads green either way.
 *
 * Every expected ratio below was computed independently of the probe (plain
 * WCAG arithmetic over the composited surface) and is asserted exactly, not as
 * a threshold. A threshold would let the old behaviour pass: the un-composited
 * reading is HIGHER, so `toBeGreaterThan(AA)` is satisfied by the bug.
 *
 * The fixture uses literal colours rather than tokens, so these values do not
 * move with the theme. Running both themes proves the probe carries no
 * theme-dependent behaviour of its own; the theme-specific danger is covered by
 * the real component matrix.
 */

const THEMES = ['light', 'dark']

// surface -> [expected ratio, what a wrong probe would report instead]
const CASES = {
  'wash-white': [7.69, 'ignoring background-image reads 14.74; double-compositing reads 4.58'],
  'wash-black': [11.54, 'ignoring background-image reads 18.43'],
  'wash-order': [9.9, 'compositing layers in declaration order reads 14.48'],
  'wash-translucent': [2.83, 'flattening the node alpha early reads 1.00'],
  'wash-url': [14.74, 'a non-gradient image must be ignored, not guessed at'],
  'wash-varying': [7.69, 'a varying gradient must report its WORST stop, not 16.29 or an average'],
}

for (const theme of THEMES) {
  test(`gradient washes composite onto the measured surface (${theme})`, async ({ page }) => {
    const q = theme === 'dark' ? '?theme=dark' : ''
    await page.goto(`/tests/e2e/fixtures/gradient-wash.html${q}`, { waitUntil: 'networkidle' })

    const measured = Object.fromEntries(
      (await page.evaluate(MEASURE)).map((r) => [r.surface, r.ratio]),
    )

    for (const [surface, [expected, wrongly]] of Object.entries(CASES)) {
      expect(measured[surface], `${surface} was not measured at all in ${theme}`).toBeDefined()
      expect(
        measured[surface],
        `${surface} in ${theme}: expected ${expected} from the composited surface — ${wrongly}`,
      ).toBe(expected)
    }
  })
}

test('the probe reads the same wash the browser actually paints', async ({ page }) => {
  // The arithmetic above is self-consistent; this asserts it matches the
  // renderer. Playwright screenshots the element and samples a real pixel, so a
  // compositing model that is internally tidy but disagrees with the browser
  // fails here. Sampled from a corner inside the padding box, away from the
  // text glyphs.
  await page.goto('/tests/e2e/fixtures/gradient-wash.html', { waitUntil: 'networkidle' })

  for (const [selector, expected] of [
    ['.wash-white', [83, 83, 83]],
    ['.wash-black', [192, 192, 192]],
    ['.wash-order', [67, 67, 67]],
  ]) {
    const shot = await page.locator(selector).screenshot()
    const px = await page.evaluate(async (bytes) => {
      const blob = new Blob([new Uint8Array(bytes)], { type: 'image/png' })
      const bmp = await createImageBitmap(blob)
      const cv = new OffscreenCanvas(bmp.width, bmp.height)
      const ctx = cv.getContext('2d')
      ctx.drawImage(bmp, 0, 0)
      return [...ctx.getImageData(1, 1, 1, 1).data].slice(0, 3)
    }, [...shot])

    for (let i = 0; i < 3; i++) {
      expect(
        Math.abs(px[i] - expected[i]),
        `${selector} channel ${i}: browser painted ${px} but the model expects ${expected}`,
      ).toBeLessThanOrEqual(1)
    }
  }
})
