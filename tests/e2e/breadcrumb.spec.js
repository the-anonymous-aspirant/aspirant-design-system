import { expect, test } from '@playwright/test'

// Behaviour, not appearance. The contrast suite owns the ink; what this owns is
// the half of the spec that a colour probe cannot see — whether a deep path
// collapses, whether the collapsed middle is still REACHABLE, and whether the
// row keeps its promise never to wrap or push the page sideways.
//
// The reachability assertion is the load-bearing one. A static ellipsis renders
// identically to a real overflow control and looks correct in every screenshot,
// and it is exactly what would make the component unusable for #2536.

const FIXTURE = '/tests/e2e/fixtures/breadcrumb.html'

const crumb = (page, region) => page.locator(`#${region} .breadcrumb`)
const labels = (page, region) => crumb(page, region).locator('.breadcrumb__label')
const overflow = (page, region) => crumb(page, region).locator('.breadcrumb__overflow')

test.beforeEach(async ({ page }) => {
  await page.goto(FIXTURE, { waitUntil: 'networkidle' })
})

test('is a labelled landmark wrapping an ordered list', async ({ page }) => {
  await expect(crumb(page, 'shallow')).toHaveRole('navigation')
  await expect(crumb(page, 'shallow')).toHaveAccessibleName('Breadcrumb')
  await expect(crumb(page, 'shallow').locator('ol')).toHaveCount(1)
})

test('marks the current item and leaves it uninteractive', async ({ page }) => {
  const current = labels(page, 'mid').last()
  await expect(current).toHaveAttribute('aria-current', 'page')
  // The current item is a span, not a link — "not a link" is the semantic, and
  // a styled anchor that still navigates would satisfy neither the corpus nor
  // a keyboard user tabbing through the trail.
  expect(await current.evaluate((el) => el.tagName)).toBe('SPAN')
  await expect(current).not.toHaveClass(/breadcrumb__label--link/)
})

test('separators are hidden from the accessibility tree', async ({ page }) => {
  const separators = crumb(page, 'mid').locator('.breadcrumb__sep')
  expect(await separators.count()).toBeGreaterThan(0)
  for (const sep of await separators.all()) {
    await expect(sep).toHaveAttribute('aria-hidden', 'true')
  }
  // The name a screen reader builds must not contain the glyph. This is the
  // assertion that catches someone "simplifying" the separator back into the
  // label text, which reads as "Home chevron Level 1".
  const name = await crumb(page, 'mid').locator('ol').evaluate((el) => el.innerText)
  expect(name).not.toContain('›')
})

test('distinguishes ancestors from the current item by more than colour', async ({ page }) => {
  const ancestor = labels(page, 'mid').first()
  const current = labels(page, 'mid').last()
  // The underline is the non-colour cue (WCAG 1.4.1). Asserted in the RESTING
  // state on purpose: a distinction that only appears on hover is invisible to
  // a reader who never hovers.
  expect(await ancestor.evaluate((el) => getComputedStyle(el).textDecorationLine)).toContain(
    'underline'
  )
  expect(await current.evaluate((el) => getComputedStyle(el).textDecorationLine)).not.toContain(
    'underline'
  )
})

test('ancestor ink is derived rather than raw --brand-accent', async ({ page }) => {
  // Guards the #2419-shaped resolution specifically. Raw #82b1ff measures ~1.7:1
  // on the light page; the contrast suite would catch that too, but this names
  // the reason so a future "simplification" back to the token fails loudly.
  const color = await labels(page, 'mid')
    .first()
    .evaluate((el) => getComputedStyle(el).color)
  expect(color).not.toBe('rgb(130, 177, 255)')
})

test.describe('collapse', () => {
  test.use({ viewport: { width: 320, height: 900 } })

  test('a shallow path does not collapse', async ({ page }) => {
    await expect(overflow(page, 'shallow')).toHaveCount(0)
    await expect(labels(page, 'shallow')).toHaveCount(2)
  })

  test('a deep path collapses the middle and keeps root plus the last two', async ({ page }) => {
    await expect(overflow(page, 'deep')).toHaveCount(1)

    const texts = await labels(page, 'deep').allInnerTexts()
    expect(texts[0]).toBe('Home')
    expect(texts.at(-1)).toBe('Current')
    expect(texts.at(-2)).toBe('Level 10')
    // Something was actually dropped — otherwise the control above is
    // decoration on a row that never collapsed.
    expect(texts.length).toBeLessThan(12)
  })

  test('the hidden ancestors remain reachable', async ({ page }) => {
    const control = overflow(page, 'deep')
    await expect(control).toHaveRole('button')
    await expect(control).toHaveAttribute('aria-expanded', 'false')

    await control.click()
    await expect(control).toHaveAttribute('aria-expanded', 'true')

    const panel = crumb(page, 'deep').locator('.breadcrumb__panel')
    await expect(panel).toBeVisible()
    // Every item the row dropped is in the panel, as a real link. A static
    // ellipsis would pass every assertion above this one and fail here.
    const shown = await labels(page, 'deep').allInnerTexts()
    const hidden = await panel.locator('.breadcrumb__panel-link').allInnerTexts()
    for (let i = 1; i <= 10; i += 1) {
      const label = `Level ${i}`
      expect(
        shown.includes(label) || hidden.includes(label),
        `"${label}" is in neither the visible row nor the overflow panel — the path has a hole in it`
      ).toBe(true)
    }
    await expect(panel.locator('.breadcrumb__panel-link').first()).toHaveAttribute('href', /level-/)
  })

  test('the overflow control is keyboard-operable and dismissible on Escape', async ({ page }) => {
    const control = overflow(page, 'deep')
    await control.focus()
    await expect(control).toBeFocused()

    await page.keyboard.press('Enter')
    await expect(control).toHaveAttribute('aria-expanded', 'true')

    await page.keyboard.press('Escape')
    await expect(control).toHaveAttribute('aria-expanded', 'false')
    // Focus returns to the control rather than being dropped on <body>, which
    // would strand a keyboard user at the top of the document.
    await expect(control).toBeFocused()
  })

  test('never wraps and never scrolls the page sideways', async ({ page }) => {
    // Criterion 5, at the narrowest supported viewport with the deepest path.
    const scrolls = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
    expect(scrolls, 'the page gained a horizontal scrollbar').toBe(false)

    // Single line: every item's box shares one top edge. A wrapped row would
    // put the tail on a second one.
    const tops = await labels(page, 'deep').evaluateAll((els) =>
      els.map((el) => Math.round(el.getBoundingClientRect().top))
    )
    expect(new Set(tops).size, `items landed on ${new Set(tops).size} lines`).toBe(1)
  })
})

test.describe('long labels', () => {
  test.use({ viewport: { width: 900, height: 900 } })

  test('one long label truncates instead of collapsing the rest', async ({ page }) => {
    // The whole point of per-item truncation: a single long name must not cost
    // the user the rest of their path.
    await expect(overflow(page, 'long-label')).toHaveCount(0)
    await expect(labels(page, 'long-label')).toHaveCount(3)

    const long = labels(page, 'long-label').nth(1)
    expect(await long.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true)
  })

  test('the full text is exposed through a tooltip', async ({ page }) => {
    const long = labels(page, 'long-label').nth(1)
    await long.hover()
    const tip = page.locator('.asp-tooltip')
    await expect(tip).toBeVisible()
    await expect(tip).toHaveText('a directory name long enough that it cannot possibly fit')
  })

  test('a label that fits gets no tooltip', async ({ page }) => {
    // The `disabled` pass-through has to actually be wired: a tooltip under
    // every crumb would be noise, and would make the assertion above vacuous.
    await labels(page, 'long-label').first().hover()
    await page.waitForTimeout(250)
    await expect(page.locator('.asp-tooltip')).toHaveCount(0)
  })
})

test('emits navigate with the item that was clicked', async ({ page }) => {
  await labels(page, 'mid').first().click()
  await expect(page.locator('#navigated')).toHaveText('Home')
})
