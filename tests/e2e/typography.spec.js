import { expect, test } from '@playwright/test'

// The scale itself is measured by the contrast suite and eyeballed in the
// story. What is asserted here is the part a screenshot cannot show: that the
// semantic DOM is right.

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/e2e/fixtures/typography.html', { waitUntil: 'networkidle' })
})

for (const level of [1, 2, 3, 4, 5, 6]) {
  test(`level ${level} renders an <h${level}>`, async ({ page }) => {
    const el = page.locator(`.heading`).nth(level - 1)
    await expect(el).toHaveText(`level ${level}`)
    expect(await el.evaluate((e) => e.tagName)).toBe(`H${level}`)
    // The accessible heading level is what assistive tech announces, and it
    // comes from the tag — assert it rather than inferring it from the tag.
    expect(await el.evaluate((e) => e.getAttribute('aria-level') ?? e.tagName[1])).toBe(
      String(level)
    )
  })
}

test('visual size can differ from semantic level without breaking the outline', async ({
  page,
}) => {
  const el = page.locator('#decoupled')
  expect(await el.evaluate((e) => e.tagName)).toBe('H4')
  // Same computed size as a level-1 heading, while staying an h4.
  const h1Size = await page.locator('.heading').first().evaluate((e) => getComputedStyle(e).fontSize)
  expect(await el.evaluate((e) => getComputedStyle(e).fontSize)).toBe(h1Size)
})

test('heading font sizes come from the token scale, not arbitrary values', async ({ page }) => {
  const scale = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement)
    return ['xs', 'sm', 'base', 'md', 'lg', 'xl', '2xl', '3xl'].map((s) => {
      const probe = document.createElement('div')
      probe.style.fontSize = cs.getPropertyValue(`--text-${s}`)
      document.body.appendChild(probe)
      const px = getComputedStyle(probe).fontSize
      probe.remove()
      return px
    })
  })
  for (const el of await page.locator('.heading').all()) {
    const size = await el.evaluate((e) => getComputedStyle(e).fontSize)
    expect(scale, `${size} is not a step on the type scale`).toContain(size)
  }
})

test('prose does not double-tint a code block', async ({ page }) => {
  // <pre><code> would otherwise stack the inline-code chip on the block tint.
  const inner = await page
    .locator('#prose pre code')
    .evaluate((e) => getComputedStyle(e).backgroundColor)
  expect(inner).toBe('rgba(0, 0, 0, 0)')
})

test('prose links are underlined, so the cue is not colour alone', async ({ page }) => {
  const deco = await page
    .locator('#prose a')
    .evaluate((e) => getComputedStyle(e).textDecorationLine)
  expect(deco).toContain('underline')
})

test('prose actually spaces its children (the rhythm rule wins the cascade)', async ({ page }) => {
  // Regression guard. The first version of this component paired the rhythm
  // rule with per-element margin resets whose type selectors outscored it, so
  // every paragraph rendered flush against the next -- in the one component
  // whose purpose is spacing. A screenshot caught it; nothing else did.
  const gap = await page.evaluate(() => {
    const kids = [...document.querySelector('#prose').children]
    const a = kids[0].getBoundingClientRect()
    const b = kids[1].getBoundingClientRect()
    return b.top - a.bottom
  })
  expect(gap, 'no vertical gap between prose children').toBeGreaterThan(8)
})
