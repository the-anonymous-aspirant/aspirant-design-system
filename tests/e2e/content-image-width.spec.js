/**
 * system_3 #9578 (UX walk 2026-11-02 R2): an image inside AspContent or
 * AspProse never exceeds its column. Before the rule, a 1440px screenshot
 * rendered at its natural width in a 390px column and the column clipped it.
 */
import { expect, test } from '@playwright/test'

const open = async (page, theme) => {
  await page.goto(`/tests/e2e/fixtures/content-image-width.html?theme=${theme}`, {
    waitUntil: 'networkidle',
  })
  // marked loads lazily; wait for both markdown images and the prose one.
  await expect(page.locator('section img')).toHaveCount(3)
  // Every image decoded, so its box reflects the real 1440x360 bitmap.
  await page.waitForFunction(() =>
    [...document.querySelectorAll('section img')].every((i) => i.complete && i.naturalWidth > 0),
  )
}

const geometry = (page, id) =>
  page.locator(`#${id}`).evaluate((section) => {
    const img = section.querySelector('img')
    const s = section.getBoundingClientRect()
    const r = img.getBoundingClientRect()
    return {
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      sectionRight: s.right,
      right: r.right,
      width: r.width,
      height: r.height,
    }
  })

for (const theme of ['light', 'dark']) {
  for (const id of ['md', 'md-link', 'prose']) {
    test(`a 1440px image stays inside its 390px column (${id}, ${theme})`, async ({ page }) => {
      await open(page, theme)
      const g = await geometry(page, id)
      // The fixture is what the test claims: a bitmap wider than the column.
      expect(g.naturalWidth).toBe(1440)
      expect(g.width).toBeLessThan(g.naturalWidth)
      expect(g.right).toBeLessThanOrEqual(g.sectionRight + 0.5)
      // Scaled, not squashed: the aspect ratio holds (height: auto).
      expect(g.height / g.width).toBeCloseTo(g.naturalHeight / g.naturalWidth, 2)
    })
  }
}
