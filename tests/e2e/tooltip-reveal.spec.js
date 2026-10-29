/**
 * §3.119 R6 / system_3 #9138 — a truncation reveal never stringifies an
 * object, and a hover that carries meaning (a badge's legend, a timestamp's
 * absolute instant, a collapsed rail link's label) renders through
 * AspTooltip, not a native `title`.
 */
import { expect, test } from '@playwright/test'

const open = async (page, query = '') => {
  await page.goto(`/tests/e2e/fixtures/tooltip-reveal.html${query}`, { waitUntil: 'networkidle' })
  await expect(page.locator('#rail aside')).toHaveCount(1)
}

test.describe('AspDataTable truncation title', () => {
  test('no cell reveals "[object Object]"; an object reveals its JSON', async ({ page }) => {
    await open(page)
    const titles = await page.locator('#table td').evaluateAll((tds) => tds.map((td) => td.getAttribute('title')))
    expect(titles).not.toContain('[object Object]')
    const inputs = page.locator('#table tbody tr').first().locator('td').first()
    await expect(inputs).toHaveAttribute('title', '{"task_id":9138,"kind":"spawn"}')
    await expect(page.locator('#table tbody tr').nth(1).locator('td').first()).toHaveAttribute('title', '[1,2]')
  })

  test('a scalar reveals itself, an empty value reveals nothing, a title(row) hook wins', async ({
    page,
  }) => {
    await open(page)
    const row = (i) => page.locator('#table tbody tr').nth(i).locator('td')
    await expect(row(0).nth(1)).toHaveAttribute('title', 'a')
    expect(await row(0).nth(2).getAttribute('title')).toBeNull() // ''
    expect(await row(1).nth(2).getAttribute('title')).toBeNull() // null
    await expect(row(0).nth(3)).toHaveAttribute('title', 'hook:a')
    expect(await row(1).nth(3).getAttribute('title')).toBeNull() // the hook returned null
  })
})

test.describe('AspBadge legend', () => {
  for (const [id, text] of [
    ['b-status', 'Positive (pass / active / done)'],
    ['b-dot', 'Negative (fail / deprecated / cancelled)'],
    ['b-chip', 'A label chip'],
  ]) {
    test(`#${id}: no native title; hover shows the AspTooltip legend; described at rest`, async ({
      page,
    }) => {
      await open(page)
      const badge = page.locator(`#${id}`)
      expect(await badge.getAttribute('title')).toBeNull()
      // At rest, assistive tech gets the legend through aria-describedby.
      const described = await badge.evaluate((el) => {
        const ref = el.getAttribute('aria-describedby')
        return ref ? document.getElementById(ref)?.textContent : null
      })
      expect(described).toBe(text)
      await badge.hover()
      await expect(page.getByRole('tooltip')).toHaveText(text)
    })
  }

  test('a badge with no legend is untouched: no wrapper, no description', async ({ page }) => {
    await open(page)
    const plain = page.locator('#b-plain')
    expect(await plain.getAttribute('aria-describedby')).toBeNull()
    expect(await plain.evaluate((el) => el.parentElement.classList.contains('asp-tooltip-anchor'))).toBe(false)
  })

  test('100 badges add no tab stops', async ({ page }) => {
    await open(page)
    await page.locator('#before-many').focus()
    await page.keyboard.press('Tab')
    await expect(page.locator('#after-many')).toBeFocused()
  })
})

test('AspTimeSince: no native title; hover shows the ISO instant', async ({ page }) => {
  await open(page)
  const time = page.locator('#time time')
  expect(await time.getAttribute('title')).toBeNull()
  await time.hover()
  await expect(page.getByRole('tooltip')).toHaveText('2026-10-29T18:09:30.000Z')
})

test.describe('AspSidebarLink in a collapsed rail', () => {
  test('keyboard focus shows the label tooltip; the accessible name is the label', async ({
    page,
  }) => {
    await open(page)
    const link = page.locator('#rail a.sidebar-link').nth(1)
    await expect(link).toHaveAccessibleName('Tasks')
    expect(await link.getAttribute('title')).toBeNull()
    await link.focus()
    await expect(page.getByRole('tooltip')).toHaveText('Tasks')
  })

  test('expanded: no tooltip and no wrapper; the visible label names the link', async ({ page }) => {
    await open(page, '?expanded=1')
    const link = page.locator('#rail a.sidebar-link').nth(1)
    await expect(link).toHaveAccessibleName('Tasks')
    expect(await link.getAttribute('aria-label')).toBeNull()
    expect(await link.evaluate((el) => el.parentElement.classList.contains('asp-tooltip-anchor'))).toBe(false)
    await link.focus()
    await page.waitForTimeout(300)
    await expect(page.getByRole('tooltip')).toHaveCount(0)
  })
})
