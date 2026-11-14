/**
 * §3.120 Q3 / system_3 #9179 — a stock line is padded by its own range, so a
 * level that moves still reads as movement — and, since the 2026-11-14
 * amendment (system_3 #11100), never in a frame narrower than the flat-series
 * frame, so drift against a large level reads as drift. Measured from the
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

// Before §3.120 Q3 both small-range cells inked 10 of 48px (21%). Q3 (#9179,
// c56676/c56684) then padded a line by its own range, so they filled 40-60%.
// The 2026-11-14 amendment (#10975, built in system_3 #11100) puts a floor
// under the frame: never narrower than the flat-series frame, ±10% of the
// largest absolute value. A range under about a sixth of its level is drift,
// and "backlog 51-52 again sits in a band, now on purpose". So:
// - backlog (1 in 52) and disk (1.5 points in 76%) take at most a third of
//   the cell;
// - cpu (22-38%, a range well over a sixth of its level) is the frame Q3 gave
//   it, unchanged by the amendment, and still fills at least 60%.
const SMALL = ['backlog', 'disk']
const CEILING = 1 / 3
const FLOOR = 0.6

for (const theme of ['light', 'dark']) {
  for (const id of SMALL) {
    test(`a line that barely moves against its level sits in a band (${id}, ${theme})`, async ({ page }) => {
      await open(page, theme)
      const { inked, cell } = await extent(page, id)
      console.log(`FILL ${theme} ${id} ${inked.toFixed(1)}/${cell}px = ${((100 * inked) / cell).toFixed(0)}%`)
      expect(cell).toBe(48)
      expect(inked, `${id} (${theme}): the line is drawn`).toBeGreaterThan(0)
      expect(inked / cell, `${id} (${theme}): ${inked.toFixed(1)} of ${cell}px`).toBeLessThanOrEqual(CEILING)
    })
  }

  test(`a line whose range is over a sixth of its level still fills the cell (cpu, ${theme})`, async ({ page }) => {
    await open(page, theme)
    const { inked, cell } = await extent(page, 'cpu')
    console.log(`FILL ${theme} cpu ${inked.toFixed(1)}/${cell}px = ${((100 * inked) / cell).toFixed(0)}%`)
    expect(cell).toBe(48)
    expect(inked / cell, `cpu (${theme}): ${inked.toFixed(1)} of ${cell}px`).toBeGreaterThanOrEqual(FLOOR)
  })
}
