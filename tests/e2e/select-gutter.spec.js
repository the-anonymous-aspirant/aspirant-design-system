import { expect, test } from '@playwright/test'

// An open AspSelect panel on a phone stays inside the page's 16px gutter
// (design_conventions §3.151, system_3 #10854). Before the fix, a trigger in
// the right half with options wider than the room to its right got a panel
// ending ON the screen edge: placePanel read an auto-width box's width, moved
// `left`, and the box re-fitted to the room to its right and regrew to the edge.

const open = (page, q = '') =>
  page.goto(`/tests/e2e/fixtures/select-gutter.html${q}`, { waitUntil: 'networkidle' })

// Every select keeps its panel in the DOM; only the open one is visible.
const panel = (page) => page.locator('.select__panel:visible')

async function boxes(page, test) {
  await page.locator(`[data-test="${test}"]`).click()
  await expect(panel(page)).toBeVisible()
  // Let the open settle: the panel is placed after a tick.
  await page.waitForTimeout(100)
  return page.evaluate(
    ([sel]) => {
      const t = document.querySelector(sel).getBoundingClientRect()
      const shown = [...document.querySelectorAll('.select__panel')].find((el) => el.getClientRects().length > 0)
      const p = shown.getBoundingClientRect()
      const opts = [...shown.querySelectorAll('[role="option"]')]
      const lineHeights = opts.map((o) => o.getBoundingClientRect().height)
      const single = Math.min(...lineHeights)
      return {
        vw: window.innerWidth,
        trigger: { left: t.left, right: t.right, width: t.width },
        panel: { left: p.left, right: p.right, width: p.width },
        wrapped: lineHeights.filter((h) => h > single + 2).length,
        options: opts.length,
      }
    },
    [`[data-test="${test}"]`]
  )
}

for (const [width, height] of [
  [390, 844],
  [360, 800],
]) {
  for (const theme of ['light', 'dark']) {
    test.describe(`phone ${width}x${height} ${theme}`, () => {
      test.use({ viewport: { width, height }, hasTouch: true, isMobile: true })

      for (const which of ['left-select', 'right-select']) {
        for (const bottom of [false, true]) {
          test(`${which}${bottom ? ' (opens above)' : ''}: the panel stays inside the 16px gutter`, async ({ page }) => {
            await open(page, `?theme=${theme}${bottom ? '&bottom=1' : ''}`)
            const b = await boxes(page, which)
            console.log(`${width} ${theme} ${which}${bottom ? ' above' : ''}`, JSON.stringify(b))
            expect(b.panel.left).toBeGreaterThanOrEqual(16 - 0.5)
            expect(b.panel.right).toBeLessThanOrEqual(b.vw - 16 + 0.5)
            expect(b.panel.width).toBeGreaterThanOrEqual(b.trigger.width - 0.5)
          })
        }
      }

      test('a searchable panel keeps its left edge and width while she types', async ({ page }) => {
        await open(page, `?theme=${theme}&searchable=1`)
        await page.locator('[data-test="right-select"]').click()
        await expect(panel(page)).toBeVisible()
        await page.waitForTimeout(100)
        const read = () => panel(page).evaluate((p) => {
          const r = p.getBoundingClientRect()
          return { left: r.left, width: r.width }
        })
        const before = await read()
        await page.keyboard.type('Gmail')
        await expect(page.locator('.select__panel:visible [role="option"]')).toHaveCount(1)
        const after = await read()
        expect(after).toEqual(before)
        expect(before.left).toBeGreaterThanOrEqual(16 - 0.5)
      })
    })
  }
}

test.describe('desktop 1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('a panel that already fits starts at its trigger, unchanged', async ({ page }) => {
    await open(page)
    const b = await boxes(page, 'left-select')
    expect(Math.abs(b.panel.left - b.trigger.left)).toBeLessThan(1)
    expect(b.panel.width).toBeGreaterThanOrEqual(b.trigger.width - 0.5)
    expect(b.panel.right).toBeLessThanOrEqual(b.vw - 8 + 0.5)
    // Wide enough for its longest option: nothing wraps when the room exists.
    expect(b.wrapped).toBe(0)
  })
})
