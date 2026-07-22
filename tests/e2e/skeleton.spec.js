import { expect, test } from '@playwright/test'

// Behaviour and rendered contrast. The bars carry no text, so the shared
// contrast matrix (which measures text nodes) cannot see them — this suite owns
// AspSkeleton's ink, measured as WCAG 1.4.11 non-text contrast (3:1) of the
// painted bar against its immediate surface, on the page AND inside a dark card,
// in both themes.
//
// The load-bearing measurements run under REDUCED MOTION on purpose. The pulse
// animates the fill between a base and a brighter peak, so the base fill is the
// dimmest frame and therefore the worst case. Reduced motion pins the bar to
// that base with no interpolation, so a static reading is the guaranteed floor
// rather than whichever frame the sample happened to catch.

const FIXTURE = '/tests/e2e/fixtures/skeleton.html'
const NON_TEXT_AA = 3 // WCAG 1.4.11

const skeleton = (page, region) => page.locator(`#${region} .skeleton`)

// Composite the bar's fill (an alpha derived from currentColor) onto its opaque
// surface and return the WCAG ratio between the two. Mirrors the compositing in
// contrast-measure.js; kept small here because that probe only walks text nodes.
async function contrast(page, barSel, surfSel) {
  return page.evaluate(
    ([bs, ss]) => {
      const cv = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
      const norm = (c) => {
        cv.clearRect(0, 0, 1, 1)
        cv.fillStyle = '#000'
        cv.fillStyle = c
        cv.fillRect(0, 0, 1, 1)
        const [r, g, b, a] = cv.getImageData(0, 0, 1, 1).data
        return [r, g, b, a / 255]
      }
      const over = (fg, bg) => [
        fg[0] * fg[3] + bg[0] * (1 - fg[3]),
        fg[1] * fg[3] + bg[1] * (1 - fg[3]),
        fg[2] * fg[3] + bg[2] * (1 - fg[3]),
      ]
      const lum = ([r, g, b]) => {
        const f = (v) => {
          const s = v / 255
          return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
        }
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
      }
      const bar = document.querySelector(bs)
      const surf = document.querySelector(ss)
      const surfBg = norm(getComputedStyle(surf).backgroundColor)
      const painted = over(norm(getComputedStyle(bar).backgroundColor), surfBg)
      const [hi, lo] = [lum(painted), lum(surfBg)].sort((a, b) => b - a)
      return +((hi + 0.05) / (lo + 0.05)).toFixed(2)
    },
    [barSel, surfSel]
  )
}

test.describe('structure', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FIXTURE, { waitUntil: 'networkidle' })
  })

  test('text renders one bar per line, last line short', async ({ page }) => {
    const region = skeleton(page, 'text-page')
    await expect(region.locator('.skeleton__line')).toHaveCount(3)
    await expect(region.locator('.skeleton__bar')).toHaveCount(3)
    // Uniform-length lines read as a table; the ragged last line is what makes
    // the block read as prose.
    await expect(region.locator('.skeleton__bar--short')).toHaveCount(1)
    const bars = region.locator('.skeleton__bar')
    await expect(bars.last()).toHaveClass(/skeleton__bar--short/)
  })

  test('block renders one region at the requested height', async ({ page }) => {
    const bar = skeleton(page, 'block-page').locator('.skeleton__bar--block')
    await expect(bar).toHaveCount(1)
    // 8rem at the default 16px root = 128px. The footprint is exactly the size
    // the consumer asked for, which is what a no-reflow swap depends on.
    const h = await bar.evaluate((el) => Math.round(el.getBoundingClientRect().height))
    expect(h).toBe(128)
  })

  test('row renders rows x columns cells', async ({ page }) => {
    const region = skeleton(page, 'row-page')
    await expect(region.locator('.skeleton__row')).toHaveCount(3)
    await expect(region.locator('.skeleton__bar--cell')).toHaveCount(9)
  })
})

test.describe('accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FIXTURE, { waitUntil: 'networkidle' })
  })

  test('container is aria-busy and the decorative shapes are hidden', async ({ page }) => {
    await expect(skeleton(page, 'text-page')).toHaveAttribute('aria-busy', 'true')

    // Every decorative wrapper is removed from the accessibility tree, so a
    // screen reader announces nothing for the placeholder. Asserted on the
    // wrappers the component actually hides (line / block / row), which is what
    // takes their bars out of the tree with them.
    for (const region of ['text-page', 'block-page', 'row-page']) {
      const hidden = skeleton(page, region).locator('[aria-hidden="true"]')
      expect(await hidden.count()).toBeGreaterThan(0)
    }
    // The whole subtree is silent: no accessible name leaks from the shapes.
    const snap = await skeleton(page, 'text-page').ariaSnapshot()
    expect(snap.trim()).toBe('')
  })
})

test.describe('contrast (WCAG 1.4.11, >=3:1)', () => {
  // Both themes, both surfaces. A story-page-only measurement does not satisfy
  // criterion 2 (#2368 c9661): the binding case is a bar on a surface whose ink
  // the component did not set — the page, and the dark card.
  for (const theme of ['light', 'dark']) {
    test(`bars are perceivable on page and card (${theme})`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      const q = theme === 'dark' ? '?theme=dark' : ''
      await page.goto(`${FIXTURE}${q}`, { waitUntil: 'networkidle' })

      const cases = [
        ['#text-page .skeleton__bar', '#text-page'],
        ['#text-card .skeleton__bar', '[data-surface="card"]#text-card'],
        ['#block-page .skeleton__bar', '#block-page'],
        ['#block-card .skeleton__bar', '[data-surface="card"]#block-card'],
        ['#row-page .skeleton__bar', '#row-page'],
        ['#row-card .skeleton__bar', '[data-surface="card"]#row-card'],
      ]
      for (const [barSel, surfSel] of cases) {
        const ratio = await contrast(page, barSel, surfSel)
        expect(
          ratio,
          `${barSel} on ${surfSel} in ${theme} measured ${ratio}:1, below the ${NON_TEXT_AA}:1 non-text floor`
        ).toBeGreaterThanOrEqual(NON_TEXT_AA)
      }
    })
  }

  test('the fill is DERIVED from the surface, not a hardcoded grey', async ({ page }) => {
    // The #2415 guard. A grey hardcoded for the light page is invisible on a
    // dark card and vice versa. If the fill derives from currentColor, the same
    // component paints a different bar colour on the card than on the page —
    // and a "simplification" back to a literal makes these two equal, failing
    // loudly here rather than shipping an invisible skeleton.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(FIXTURE, { waitUntil: 'networkidle' })
    const bg = (sel) =>
      page
        .locator(sel)
        .first()
        .evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(await bg('#text-page .skeleton__bar')).not.toBe(await bg('#text-card .skeleton__bar'))
  })
})

test.describe('motion', () => {
  test('pulses by default and never animates opacity or the box', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto(FIXTURE, { waitUntil: 'networkidle' })
    const bar = skeleton(page, 'text-page').locator('.skeleton__bar').first()
    const style = await bar.evaluate((el) => {
      const cs = getComputedStyle(el)
      return { name: cs.animationName, opacity: cs.opacity }
    })
    // Vue scopes the keyframes name with a per-component hash, so match the
    // stem rather than the exact string.
    expect(style.name).toContain('asp-skeleton-pulse')
    // Opacity is untouched: an opacity pulse would drop the bar below 3:1 at its
    // trough and read as "disabled" (§3.21). The animation moves colour only.
    expect(style.opacity).toBe('1')
  })

  test('reduced motion removes all animation, static placeholder remains', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(FIXTURE, { waitUntil: 'networkidle' })
    const bar = skeleton(page, 'text-page').locator('.skeleton__bar').first()
    const style = await bar.evaluate((el) => {
      const cs = getComputedStyle(el)
      return { name: cs.animationName, opacity: cs.opacity, h: el.getBoundingClientRect().height }
    })
    // `none`, not a longer duration — a slowed pulse is still motion.
    expect(style.name).toBe('none')
    // Still there: reduced motion must not blank the placeholder.
    expect(style.opacity).toBe('1')
    expect(style.h).toBeGreaterThan(0)
  })
})

test.describe('layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FIXTURE, { waitUntil: 'networkidle' })
  })

  test('a text skeleton occupies exactly N line boxes of the type scale', async ({ page }) => {
    // The footprint invariant: 3 lines at 16px/1.5 is 3 x 24px = 72px, so a swap
    // to 3 real lines of the same scale cannot reflow. Derived from the line
    // height rather than hardcoded, so it holds when the scale changes.
    const box = skeleton(page, 'footprint')
    const { h, lh } = await box.evaluate((el) => ({
      h: el.getBoundingClientRect().height,
      lh: parseFloat(getComputedStyle(el).lineHeight),
    }))
    expect(Math.round(h)).toBe(Math.round(lh * 3))
  })

  test('swapping skeleton for real content of the same size does not reflow', async ({ page }) => {
    // The defect this component most easily causes, asserted rather than
    // eyeballed: the sentinel directly below the box must not move when the
    // block skeleton is replaced by a real region of the same nominal height.
    // Document-relative, not viewport-relative: clicking the below-the-fold
    // swap button scrolls the page into view, which moves the viewport but not
    // the document. Adding scrollY measures the reflow, not the scroll.
    const sentinelTop = () =>
      page
        .locator('#sentinel')
        .evaluate((el) => Math.round(el.getBoundingClientRect().top + window.scrollY))
    const before = await sentinelTop()
    await page.locator('#swap').click()
    await expect(page.locator('#real-region')).toBeVisible()
    expect(await sentinelTop()).toBe(before)
  })
})

test('does not collide with the §3.21 provisional treatment', async ({ page }) => {
  // Both on one page. §3.21 marks an in-flight item with a dashed border plus a
  // text suffix and forbids itself opacity; the skeleton must borrow neither
  // channel, so the two cannot be confused as "a real item, dimmed".
  await page.goto(FIXTURE, { waitUntil: 'networkidle' })
  const bar = page.locator('#skeleton-side .skeleton__bar').first()
  const skel = await bar.evaluate((el) => {
    const cs = getComputedStyle(el)
    return { border: cs.borderStyle, opacity: cs.opacity }
  })
  // The skeleton speaks through its fill: no border, full opacity.
  expect(skel.border).not.toContain('dashed')
  expect(skel.opacity).toBe('1')

  // The provisional item speaks through the dashed border — the channel the
  // skeleton left alone.
  const prov = await page
    .locator('#provisional')
    .evaluate((el) => getComputedStyle(el).borderTopStyle)
  expect(prov).toBe('dashed')
})
