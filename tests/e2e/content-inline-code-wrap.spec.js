/**
 * system_3 #9770 (UX walk 2026-11-02 C1): an inline `code` span inside
 * AspContent or AspProse wraps rather than forcing the column to scroll
 * sideways. Before the rule, `/corpus/347`'s inline code measured a right
 * edge of 458/406px in a 390px viewport and the content box scrolled. A
 * fenced block (`pre code`) keeps its own horizontal-scroll affordance —
 * the `:not(pre code)` carve-out the design spec names.
 */
import { expect, test } from '@playwright/test'

const open = async (page, theme) => {
  await page.goto(`/tests/e2e/fixtures/content-inline-code-wrap.html?theme=${theme}`, {
    waitUntil: 'networkidle',
  })
  await expect(page.locator('#md code')).toHaveCount(1)
}

const inlineGeometry = (page, id) =>
  page.locator(`#${id}`).evaluate((section) => {
    const code = section.querySelector('code')
    const s = section.getBoundingClientRect()
    const r = code.getBoundingClientRect()
    return { sectionRight: s.right, right: r.right, overflowWrap: getComputedStyle(code).overflowWrap }
  })

for (const theme of ['light', 'dark']) {
  for (const id of ['md', 'prose']) {
    test(`a long inline code span stays inside its 390px column (${id}, ${theme})`, async ({
      page,
    }) => {
      await open(page, theme)
      const g = await inlineGeometry(page, id)
      expect(g.overflowWrap).toBe('anywhere')
      expect(g.right).toBeLessThanOrEqual(g.sectionRight + 0.5)
    })
  }
}

test('a fenced code block keeps its own horizontal scroll, not a reflow (contrast)', async ({
  page,
}) => {
  await open(page, 'light')
  const g = await page.locator('#fenced').evaluate((section) => {
    const pre = section.querySelector('pre')
    const code = pre.querySelector('code')
    const s = section.getBoundingClientRect()
    const p = pre.getBoundingClientRect()
    return {
      sectionRight: s.right,
      preRight: p.right,
      overflowWrap: getComputedStyle(code).overflowWrap,
      scrollsSideways: pre.scrollWidth > pre.clientWidth,
    }
  })
  // The reset: `pre code` is NOT wrapped, so the long identifier still forces
  // the pre wider than its content box — `overflow-x: auto` absorbs it rather
  // than the column scrolling.
  expect(g.overflowWrap).toBe('normal')
  expect(g.scrollsSideways).toBe(true)
  // The scroll BOX itself still fits the column — only its content overflows.
  expect(g.preRight).toBeLessThanOrEqual(g.sectionRight + 0.5)
})
