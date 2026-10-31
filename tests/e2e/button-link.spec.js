/**
 * AspButton rendered as a link (system_3 #9246, §3.23): a button that
 * navigates is an <a> — `href` directly, `to` through the app's RouterLink —
 * and looks exactly like the <button> rendering of the same variant and size.
 * The fixture carries a hostile app-level `a` rule (ink + underline), as
 * aspirant-client's style.css does, and a stub RouterLink that records
 * navigations on window.__nav.
 */
import { expect, test } from '@playwright/test'

const PROPS = ['backgroundColor', 'color', 'borderRadius', 'height', 'paddingTop', 'paddingLeft', 'fontSize', 'fontWeight', 'textDecorationLine']

const style = (loc) =>
  loc.evaluate((el, props) => {
    const cs = getComputedStyle(el)
    const out = Object.fromEntries(props.map((p) => [p, cs[p]]))
    out.height = el.getBoundingClientRect().height.toFixed(2)
    return out
  }, PROPS)

for (const theme of ['light', 'dark']) {
  test.describe(theme, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/tests/e2e/fixtures/button-link.html${theme === 'dark' ? '?theme=dark' : ''}`, {
        waitUntil: 'networkidle',
      })
      await expect(page.locator('[data-render="card-to"]')).toBeVisible()
    })

    test('href renders an <a href>, to renders the RouterLink <a>, the default stays a <button> (AC1)', async ({ page }) => {
      const row = page.locator('.row[data-variant="primary"][data-size="md"]')
      const tags = await row.locator('[data-render]').evaluateAll((els) =>
        els.map((e) => `${e.dataset.render}:${e.tagName}:${e.getAttribute('href')}:${e.getAttribute('type')}`),
      )
      expect(tags).toEqual(['button:BUTTON:null:button', 'href:A:/somewhere:null', 'to:A:/:null'])
    })

    test('a to link navigates client-side, and its click still emits', async ({ page }) => {
      await page.locator('.row[data-variant="primary"][data-size="md"] [data-render="to"]').click()
      expect(await page.evaluate(() => window.__nav)).toEqual(['/'])
      await page.locator('.row[data-variant="ghost"][data-size="sm"] [data-render="to"]').focus()
      await page.keyboard.press('Enter')
      expect(await page.evaluate(() => window.__nav)).toEqual(['/', '/'])
    })

    test('target=_blank gets rel="noopener noreferrer" unless the caller sets rel (AC1)', async ({ page }) => {
      expect(await page.locator('[data-render="blank"]').getAttribute('rel')).toBe('noopener noreferrer')
      expect(await page.locator('[data-render="blank-rel"]').getAttribute('rel')).toBe('noopener')
    })

    for (const variant of ['primary', 'secondary', 'ghost', 'destructive'])
      for (const size of ['sm', 'md', 'lg'])
        test(`${variant} ${size}: href and to compute the same as the <button> (AC2)`, async ({ page }) => {
          const row = page.locator(`.row[data-variant="${variant}"][data-size="${size}"]`)
          // Compared across different elements, or the equality proves nothing.
          expect(await row.locator('[data-render]').evaluateAll((els) => els.map((e) => e.tagName))).toEqual(['BUTTON', 'A', 'A'])
          const button = await style(row.locator('[data-render="button"]'))
          expect(button.textDecorationLine).toBe('none')
          expect(await style(row.locator('[data-render="href"]'))).toEqual(button)
          expect(await style(row.locator('[data-render="to"]'))).toEqual(button)
        })

    test('on an AspCard the link keeps the variant ink over the app `.card a` rule (AC2)', async ({ page }) => {
      expect(await page.locator('[data-render="card-to"]').evaluate((e) => e.tagName)).toBe('A')
      const s = await style(page.locator('[data-render="card-to"]'))
      const ref = await style(page.locator('.row[data-variant="primary"][data-size="md"] [data-render="button"]'))
      expect(s.color).toBe(ref.color)
      expect(s.backgroundColor).toBe(ref.backgroundColor)
      expect(s.textDecorationLine).toBe('none')
    })

    test('variant="link" keeps its own underline when rendered as a link', async ({ page }) => {
      expect(await page.locator('[data-render="link-variant"]').evaluate((e) => e.tagName)).toBe('A')
      expect((await style(page.locator('[data-render="link-variant"]'))).textDecorationLine).toBe('underline')
    })

    test('disabled and loading links have no target, are named disabled, and are not activatable (AC3)', async ({ page }) => {
      for (const sel of ['[data-render="href-disabled"]', '[data-render="to-loading"]']) {
        const el = page.locator(sel)
        expect(await el.evaluate((e) => e.tagName)).toBe('A')
        expect(await el.getAttribute('href')).toBeNull()
        expect(await el.getAttribute('aria-disabled')).toBe('true')
        expect(await el.getAttribute('tabindex')).toBe('-1')
        expect(await el.evaluate((e) => getComputedStyle(e).pointerEvents)).toBe('none')
        await el.dispatchEvent('click')
      }
      expect(await page.evaluate(() => window.__clicks)).toBe(0)
      expect(await page.evaluate(() => window.__nav)).toEqual([])
    })
  })
}
