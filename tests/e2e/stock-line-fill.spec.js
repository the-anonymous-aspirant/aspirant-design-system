/**
 * §3.120 Q3 / system_3 #9179 — a stock line is padded by its own range, so a
 * level that moves a little still reads as movement. Measured from the
 * rendered canvas pixels, not from the chart options: the rows that carry
 * line ink, as a share of the 48px cell.
 */
import { expect, test } from '@playwright/test'

const open = async (page, theme) => {
  await page.goto(`/tests/e2e/fixtures/stock-line-fill.html${theme === 'dark' ? '?theme=dark' : ''}`, {
    waitUntil: 'networkidle',
  })
  await page.locator('#disk canvas').waitFor()
  // Chart.js animates the first draw; measure the settled frame.
  await page.waitForTimeout(1200)
}

// Vertical extent of inked rows on the cell's canvas, in CSS px, and the
// canvas height. A row is inked when any pixel in it is more than half opaque.
const extent = (page, id) =>
  page.locator(`#${id} canvas`).evaluate((cv) => {
    const ctx = cv.getContext('2d')
    const { width, height } = cv
    const px = ctx.getImageData(0, 0, width, height).data
    let top = -1
    let bottom = -1
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (px[(y * width + x) * 4 + 3] > 127) {
          if (top < 0) top = y
          bottom = y
          break
        }
      }
    }
    const scale = height / cv.getBoundingClientRect().height
    return { inked: (bottom - top + 1) / scale, cell: height / scale }
  })

// Before §3.120 Q3 both cells inked 10 of 48px (21%). DISK (a continuous
// percentage) clears 60%. BACKLOG is integer data with a 1-unit range: the
// one-unit minimum pad and whole-unit bounds give it a [50, 53] frame, so its
// floor is that frame's share: 33% predicted, 20px (42%) measured with the dots.
// Ruled on #9179 (question c56676, design_agent's yes in c56684): the inked span
// must reach the share its domain predicts, so 40% here and 60% otherwise.
const FLOOR = { backlog: 0.4, disk: 0.6 }

for (const theme of ['light', 'dark']) {
  for (const id of ['backlog', 'disk']) {
    test(`a small-range stock line fills the cell (${id}, ${theme})`, async ({ page }) => {
      await open(page, theme)
      const { inked, cell } = await extent(page, id)
      console.log(`FILL ${theme} ${id} ${inked.toFixed(1)}/${cell}px = ${((100 * inked) / cell).toFixed(0)}%`)
      expect(cell).toBe(48)
      expect(inked / cell, `${id} (${theme}): ${inked.toFixed(1)} of ${cell}px`).toBeGreaterThanOrEqual(FLOOR[id])
    })
  }
}
