/**
 * §3.120 Q1 / system_3 #9178 — a markdown heading sits one level below the
 * page title. AspContent's prose headings had margins and line-height only, so
 * they rendered at the browser's h1 32px / h2 24px, above a 22.4px route title.
 * An AspCard header steps down to --text-md with them.
 *
 * Asserts computed size and weight, not the class, and pins the body text
 * around the headings at the sizes it had before the ramp.
 */
import { expect, test } from '@playwright/test'

const open = async (page, theme) => {
  await page.goto(`/tests/e2e/fixtures/heading-ramp.html${theme === 'dark' ? '?theme=dark' : ''}`, {
    waitUntil: 'networkidle',
  })
  // marked loads at runtime; measure the rendered markdown, not the placeholder.
  await page.waitForFunction(() =>
    [...document.querySelectorAll('.asp-content')].every((el) => el.dataset.ready === 'true')
  )
}

const type = (page, sel) =>
  page.locator(sel).first().evaluate((el) => {
    const cs = getComputedStyle(el)
    return { size: cs.fontSize, weight: cs.fontWeight }
  })

for (const theme of ['light', 'dark']) {
  test(`markdown headings ramp below the page title (${theme})`, async ({ page }) => {
    await open(page, theme)
    const md = '#page .md'
    expect(await type(page, `${md} h1`)).toEqual({ size: '19.2px', weight: '700' })
    expect(await type(page, `${md} h2`)).toEqual({ size: '16.8px', weight: '700' })
    for (const level of ['h3', 'h4', 'h5', 'h6']) {
      expect(await type(page, `${md} ${level}`), level).toEqual({ size: '16px', weight: '700' })
    }
    // The largest markdown heading is still below the route title.
    const title = parseFloat((await type(page, '#page .route-title')).size)
    expect(parseFloat((await type(page, `${md} h1`)).size)).toBeLessThan(title)
  })

  test(`the body around the headings keeps its size (${theme})`, async ({ page }) => {
    await open(page, theme)
    // Values read at 0af1bf9, before the ramp.
    expect((await type(page, '#page .md p')).size).toBe('16px')
    expect((await type(page, '#page .md li')).size).toBe('16px')
    expect((await type(page, '#page .md p code')).size).toBe('14.4px')
  })

  test(`an AspCard header is --text-md bold (${theme})`, async ({ page }) => {
    await open(page, theme)
    expect(await type(page, '#card .card__header')).toEqual({ size: '16.8px', weight: '700' })
  })
}
