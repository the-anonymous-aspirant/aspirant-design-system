/**
 * §3.99 Tier 1 / §3.119 decision 5 (system_3 #9139): every interactive DS
 * control clears 24 x 24 CSS px, measured with getBoundingClientRect, and a
 * primitive's own box renders the same under any parent: AspBackButton under
 * a column flex parent is as wide as its content, not the row.
 */
import { expect, test } from '@playwright/test'

const box = (page, sel) => page.locator(sel).first().evaluate((el) => {
  const r = el.getBoundingClientRect()
  return { w: r.width, h: r.height }
})

for (const theme of ['light', 'dark']) {
  test.describe(theme, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/tests/e2e/fixtures/target-size.html${theme === 'dark' ? '?theme=dark' : ''}`, {
        waitUntil: 'networkidle',
      })
      await expect(page.locator('#back button, #back a').first()).toBeVisible()
    })

    for (const [name, sel] of [
      ['AspButton size="sm"', '#sm .btn'],
      ['the AspFreshness refresh trigger', '#fresh [data-testid="freshness-refresh"]'],
      ['the AspDataTable sort button', '#sort .data-table__sort'],
      ['the AspBadge remove ×', '#chip .badge__remove'],
    ]) {
      test(`${name} clears 24 x 24`, async ({ page }) => {
        const b = await box(page, sel)
        expect(b.h, `${name} height`).toBeGreaterThanOrEqual(24)
        expect(b.w, `${name} width`).toBeGreaterThanOrEqual(24)
      })
    }

    test('a labelled sm button keeps its padding and font size', async ({ page }) => {
      const s = await page.locator('#sm .btn').evaluate((el) => {
        const cs = getComputedStyle(el)
        const probe = document.createElement('span')
        probe.style.cssText = 'padding: var(--space-2xs) var(--space-sm); font-size: var(--text-sm)'
        document.body.appendChild(probe)
        const want = getComputedStyle(probe)
        const out = {
          got: [cs.paddingTop, cs.paddingLeft, cs.fontSize],
          want: [want.paddingTop, want.paddingLeft, want.fontSize],
        }
        probe.remove()
        return out
      })
      expect(s.got).toEqual(s.want)
    })

    test('the removable × still takes only its 1.1em glyph in the layout', async ({ page }) => {
      // The × is a 24px hit area, but its negative margins give the extra back:
      // box + margins = the 1.1em glyph it was, so the pill keeps its size.
      const m = await page.locator('#chip .badge__remove').evaluate((el) => {
        const cs = getComputedStyle(el)
        const r = el.getBoundingClientRect()
        return {
          w: r.width + parseFloat(cs.marginLeft) + parseFloat(cs.marginRight),
          h: r.height + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom),
          glyph: 1.1 * parseFloat(cs.fontSize),
        }
      })
      expect(Math.abs(m.w - m.glyph)).toBeLessThanOrEqual(0.5)
      expect(Math.abs(m.h - m.glyph)).toBeLessThanOrEqual(0.5)
    })

    test('AspBackButton under a column flex parent is as wide as its content', async ({ page }) => {
      const m = await page.locator('#back').evaluate((sec) => {
        const btn = sec.firstElementChild
        const w = btn.getBoundingClientRect().width
        const clone = btn.cloneNode(true)
        clone.style.position = 'absolute'
        clone.style.width = 'max-content'
        clone.style.visibility = 'hidden'
        sec.appendChild(clone)
        const content = clone.getBoundingClientRect().width
        clone.remove()
        return { w, content, row: sec.clientWidth }
      })
      expect(m.row).toBe(1168)
      expect(Math.abs(m.w - m.content)).toBeLessThanOrEqual(1)
    })
  })
}
