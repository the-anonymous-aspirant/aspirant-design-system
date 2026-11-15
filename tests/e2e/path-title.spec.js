import { expect, test } from '@playwright/test'

import { AA, MEASURE } from './contrast-measure.js'

// AspPathTitle — the folder path rendered as the page title (#2581). Behaviour
// (structure, collapse, keyboard, navigation) plus rendered contrast measured
// with the #2420 probe on the page surface AND inside a dark card, both themes,
// including the ancestor hover state, which paints (AC2 / §3.18).

const FIXTURE = '/tests/e2e/fixtures/path-title.html'

const title = (page, region) => page.locator(`#${region} .path-title`)
const segments = (page, region) => title(page, region).locator('.path-title__segment')

const pageScrollsSideways = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)

/** How many lines the rendered parts land on, by distinct top edge. */
const lineCount = async (page, region) => {
  const tops = await title(page, region)
    .locator('.path-title__segment, .path-title__ellipsis')
    .evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)))
  return new Set(tops).size
}

/**
 * The labels of segments whose name is not fully shown: cut by an ellipsis of
 * their own (content wider than the box) or reaching past the heading's edge,
 * where the heading's `overflow: hidden` clips them. Empty means every name
 * reads whole.
 */
const clippedSegments = (page, region) =>
  title(page, region)
    .locator('.path-title__segment')
    .evaluateAll((els) =>
      els
        .filter((el) => {
          const line = el.closest('.path-title__line').getBoundingClientRect()
          const box = el.getBoundingClientRect()
          return (
            el.scrollWidth > el.clientWidth + 1 ||
            box.right > line.right + 1 ||
            box.left < line.left - 1
          )
        })
        .map((el) => el.textContent.trim())
    )

test.describe('structure', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FIXTURE, { waitUntil: 'networkidle' })
  })

  test('renders segments with the last as the non-link current item', async ({ page }) => {
    const segs = segments(page, 'deep')
    await expect(segs).toHaveCount(5)

    const current = segs.last()
    await expect(current).toHaveClass(/path-title__segment--current/)
    await expect(current).toHaveAttribute('aria-current', 'page')
    // Current is a span, not an anchor — "not a link" is the semantic, and
    // positional currentness means it is current regardless of any href.
    expect(await current.evaluate((el) => el.tagName)).toBe('SPAN')
    await expect(current).not.toHaveClass(/path-title__segment--link/)
  })

  test('ancestors are real links distinguished by more than colour on hover', async ({ page }) => {
    const first = segments(page, 'deep').first()
    expect(await first.evaluate((el) => el.tagName)).toBe('A')
    // Resting: no underline (colour carries the link identity at rest); the
    // non-colour cue arrives on hover (WCAG 1.4.1, #2416) — a distinction that
    // is present for a pointer user at the moment of interaction.
    expect(await first.evaluate((el) => getComputedStyle(el).textDecorationLine)).not.toContain(
      'underline'
    )
    await first.hover()
    expect(await first.evaluate((el) => getComputedStyle(el).textDecorationLine)).toContain(
      'underline'
    )
  })

  test('ancestor ink is derived, not raw --text-hint', async ({ page }) => {
    // Guards the #2419 resolution: raw #82b1ff measures ~1.7:1 on the light page.
    // The contrast suite would catch that too, but this names the reason so a
    // future "simplification" back to the token fails loudly.
    const color = await segments(page, 'deep')
      .first()
      .evaluate((el) => getComputedStyle(el).color)
    expect(color).not.toBe('rgb(130, 177, 255)')
  })

  test('a single-segment path renders that segment as current with no separator', async ({
    page,
  }) => {
    const segs = segments(page, 'single')
    await expect(segs).toHaveCount(1)
    await expect(segs.first()).toHaveClass(/path-title__segment--current/)
    await expect(title(page, 'single').locator('.path-title__sep')).toHaveCount(0)
  })

  test('renders as an h1 heading so it is the page title, not a list', async ({ page }) => {
    // §3.8 / §3.22: the path occupies the title slot. A browse surface's h1 IS
    // its location, so a screen reader announces it as the heading.
    await expect(title(page, 'deep').locator('h1')).toHaveCount(1)
  })
})

test.describe('collapse (AC6)', () => {
  test.use({ viewport: { width: 320, height: 800 } })

  test.beforeEach(async ({ page }) => {
    await page.goto(FIXTURE, { waitUntil: 'networkidle' })
  })

  test('a deep path collapses the middle, keeping first and last', async ({ page }) => {
    const ellipsis = title(page, 'narrow').locator('.path-title__ellipsis')
    await expect(ellipsis).toHaveCount(1)

    const texts = await segments(page, 'narrow').allInnerTexts()
    expect(texts[0]).toBe('synthetic')
    expect(texts.at(-1)).toBe('documents')
    // Something was actually dropped — otherwise the ellipsis is decoration on a
    // path that never collapsed.
    expect(texts.length).toBeLessThan(12)
  })

  test('the elided segments are announced to assistive tech, not dropped', async ({ page }) => {
    // AC6: the hidden range must reach a screen reader. The sr-only span carries
    // the hidden labels; it is out of the viewport but in the accessibility tree.
    const announcement = title(page, 'narrow').locator('.path-title__sr-only')
    await expect(announcement).toHaveCount(1)
    const text = await announcement.innerText()
    expect(text).toMatch(/hidden:/)
    // At least one real middle label is named, so the announcement is not an
    // empty "… hidden" with nothing behind it.
    expect(text).toMatch(/level-\d+/)
  })

  test('wraps only once the collapse is exhausted, and never scrolls the page sideways', async ({
    page,
  }) => {
    expect(await pageScrollsSideways(page), 'the page gained a horizontal scrollbar').toBe(false)

    // A second line is allowed only when root + … + current is all that is left
    // and still does not fit. Wrapping while a middle segment is still shown
    // would spend a line the collapse could have saved.
    const lines = await lineCount(page, 'narrow')
    if (lines > 1) {
      expect(await segments(page, 'narrow').allInnerTexts()).toEqual(['synthetic', 'documents'])
    }
    expect(await clippedSegments(page, 'narrow')).toEqual([])
  })

  test('a short path of long names collapses the middle and keeps the current folder whole', async ({
    page,
  }) => {
    // The defect (#10972): three segments that shrank to "l… / syn… / doc…",
    // with no collapse at all. The collapse fires, and no name is cut.
    await expect(title(page, 'short').locator('.path-title__ellipsis')).toHaveCount(1)
    const texts = await segments(page, 'short').allInnerTexts()
    expect(texts).toEqual(['lake', 'documents'])
    expect(await clippedSegments(page, 'short')).toEqual([])
    expect(await pageScrollsSideways(page)).toBe(false)
  })

  test('a current name longer than a line wraps inside itself, whole', async ({ page }) => {
    const current = title(page, 'long-current').locator('.path-title__segment--current')
    await expect(current).toHaveText('fake-quarterly-report-with-a-very-long-folder-name-2999')
    expect(await clippedSegments(page, 'long-current')).toEqual([])
    // It took more than one line of its own, rather than one clipped line.
    const box = await current.boundingBox()
    const lineHeight = await current.evaluate((el) => parseFloat(getComputedStyle(el).lineHeight))
    expect(box.height).toBeGreaterThan(lineHeight * 1.5)
    expect(await pageScrollsSideways(page)).toBe(false)
  })
})

test.describe('a path that fits', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('shows every segment on one line, with no collapse', async ({ page }) => {
    await page.goto(FIXTURE, { waitUntil: 'networkidle' })
    await expect(title(page, 'short').locator('.path-title__ellipsis')).toHaveCount(0)
    expect(await segments(page, 'short').allInnerTexts()).toEqual([
      'lake',
      'synthetic',
      'documents',
    ])
    expect(await lineCount(page, 'short')).toBe(1)
    expect(await clippedSegments(page, 'short')).toEqual([])
  })
})

test.describe('keyboard + navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FIXTURE, { waitUntil: 'networkidle' })
  })

  test('each linked segment is focusable with a visible focus ring (AC4)', async ({ page }) => {
    const first = segments(page, 'deep').first()
    await first.focus()
    await expect(first).toBeFocused()
    const ring = await first.evaluate((el) => {
      const cs = getComputedStyle(el)
      return { shadow: cs.boxShadow, border: cs.borderTopWidth }
    })
    // The paired indicator: the focus shadow plus a 1px border (—shadow-focus
    // alone is sub-3:1 on the light surfaces, #2371).
    expect(ring.shadow).not.toBe('none')
    expect(ring.border).not.toBe('0px')
  })

  test('emits navigate with the clicked segment', async ({ page }) => {
    await segments(page, 'deep').first().click()
    await expect(page.locator('#navigated')).toHaveText('synthetic')
  })
})

test.describe('contrast (AC2 — page and card, both themes)', () => {
  // The inheritor is only meaningfully tested on a surface whose ink it did not
  // set: the page AND a dark AspCard, in both themes (§3.18; a story-page-only
  // measurement is insufficient, #2368 c9661). The ancestor hover paints, so it
  // is measured too.
  for (const theme of ['light', 'dark']) {
    test(`ancestor and current ink meet AA on page and card (${theme})`, async ({ page }) => {
      const q = theme === 'dark' ? '?theme=dark' : ''
      await page.goto(`${FIXTURE}${q}`, { waitUntil: 'networkidle' })

      const subAa = async (root) => {
        const rows = await page.evaluate(MEASURE, root)
        // Separators are decorative punctuation (aria-hidden), exempt from the
        // text-contrast minimum (WCAG 1.4.3); assert the meaningful text only.
        return rows.filter((r) => r.ratio < AA && !String(r.selector).includes('path-title__sep'))
      }

      for (const region of ['#title-page', '#title-card']) {
        const resting = await subAa(region)
        expect(
          resting,
          `${region} in ${theme}, resting:\n${resting.map((s) => `  ${s.ratio}:1 ${s.selector} "${s.text}"`).join('\n')}`
        ).toEqual([])
      }

      // The hover state paints a wash — measure it explicitly on both surfaces.
      for (const region of ['#title-page', '#title-card']) {
        await page.locator(`${region} .path-title__segment--link`).first().hover()
        await page.waitForTimeout(250)
        const hovered = (await page.evaluate(MEASURE, region)).filter(
          (r) => r.ratio < AA && String(r.selector).includes('path-title__segment--link')
        )
        expect(
          hovered,
          `${region} in ${theme}, hovered:\n${hovered.map((s) => `  ${s.ratio}:1 ${s.selector} "${s.text}"`).join('\n')}`
        ).toEqual([])
      }
    })
  }
})
