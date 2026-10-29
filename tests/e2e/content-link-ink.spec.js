/**
 * §3.119 decision 4 / system_3 #9137 — a link takes its setter's ink whatever
 * renders it. AspContent's link colour is a zero-specificity fallback, so the
 * consumer's setter rule decides: inside a card a markdown link and a plain
 * link compute the same colour; on the page, and with no consumer rule at
 * all, the DS formula still applies.
 */
import { expect, test } from '@playwright/test'

const open = async (page, { theme = 'light', consumer = false } = {}) => {
  const q = new URLSearchParams()
  if (theme === 'dark') q.set('theme', 'dark')
  if (consumer) q.set('consumer', '1')
  await page.goto(`/tests/e2e/fixtures/content-link-ink.html?${q}`, { waitUntil: 'networkidle' })
  // marked loads lazily; wait for both rendered markdown links.
  await expect(page.locator('.md a')).toHaveCount(2)
}

const ink = (page, sel) => page.locator(sel).evaluate((el) => getComputedStyle(el).color)

// What a token or formula resolves to on a given setter, read from a probe so
// the comparison is in the browser's own colour serialisation.
const resolve = (page, within, color) =>
  page.evaluate(
    ({ within, color }) => {
      const probe = document.createElement('span')
      probe.style.color = color
      document.querySelector(within).appendChild(probe)
      const c = getComputedStyle(probe).color
      probe.remove()
      return c
    },
    { within, color },
  )

const FORMULA = 'color-mix(in srgb, var(--brand-accent-800) 30%, currentColor)'

for (const theme of ['light', 'dark']) {
  test(`with the console's rule, a card's markdown link takes the card ink (${theme})`, async ({
    page,
  }) => {
    await open(page, { theme, consumer: true })
    const md = await ink(page, '#card .md a')
    const plain = await ink(page, '#card a.plain')
    expect(md).toBe(plain)
    expect(md).toBe(await resolve(page, '#card .card__body', 'var(--brand-accent-300)'))
    expect(md).toBe('rgb(130, 177, 255)') // #82b1ff, as the spec names it
  })

  test(`with the console's rule, a page markdown link keeps the page formula (${theme})`, async ({
    page,
  }) => {
    await open(page, { theme, consumer: true })
    expect(await ink(page, '#page .md a')).toBe(await resolve(page, '#page .md', FORMULA))
  })

  test(`with no consumer rule, the DS formula is the fallback (${theme})`, async ({ page }) => {
    await open(page, { theme })
    expect(await ink(page, '#page .md a')).toBe(await resolve(page, '#page .md', FORMULA))
    // In a card it mixes from the card's own ink, as before this change.
    expect(await ink(page, '#card .md a')).toBe(await resolve(page, '#card .md', FORMULA))
  })
}

test('the underline stays on the markdown link', async ({ page }) => {
  await open(page, { consumer: true })
  const deco = await page
    .locator('#card .md a')
    .first()
    .evaluate((el) => getComputedStyle(el).textDecorationLine)
  expect(deco).toBe('underline')
})
