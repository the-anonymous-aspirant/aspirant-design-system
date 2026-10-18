import { expect, test } from '@playwright/test'

// AspButton icon-only affordance (§3.89, #4328): size="icon" is a FIXED square
// ≥44px hit target (not a label-width pill), requires an accessible name, and
// composes with every variant — while text buttons are untouched.

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/e2e/fixtures/button.html', { waitUntil: 'networkidle' })
})

const box = (page, id) => page.locator(`#${id} button`).boundingBox()

test('size="icon" renders a square ≥44×44 box (AC1)', async ({ page }) => {
  const b = await box(page, 'icon-ghost')
  expect(b.width).toBeGreaterThanOrEqual(44)
  expect(b.height).toBeGreaterThanOrEqual(44)
  // Square: width and height agree within a sub-pixel tolerance.
  expect(Math.abs(b.width - b.height)).toBeLessThan(1.5)
})

test('a wide glyph does not stretch the square (fixed box, not label-driven) (AC1)', async ({
  page,
}) => {
  const wide = await box(page, 'icon-wide')
  // Eight 'W's would blow out a padded pill; the fixed box stays ~44px wide.
  expect(wide.width).toBeLessThanOrEqual(46)
  expect(Math.abs(wide.width - wide.height)).toBeLessThan(1.5)
})

test('size="icon" with no accessible name triggers a dev warning (AC2)', async ({ page }) => {
  const warnings = []
  page.on('console', (m) => {
    if (m.type() === 'warning') warnings.push(m.text())
  })
  // Re-run the module with the listener attached so the mount-time warn is seen.
  await page.reload({ waitUntil: 'networkidle' })
  expect(warnings.some((w) => /accessible name/i.test(w))).toBe(true)
})

test('every variant renders in icon shape as a square (AC3)', async ({ page }) => {
  for (const variant of ['primary', 'secondary', 'ghost', 'destructive']) {
    const btn = page.locator(`#icon-${variant} button`)
    await expect(btn).toHaveClass(new RegExp(`btn--${variant}`))
    await expect(btn).toHaveClass(/btn--size-icon/)
    const b = await btn.boundingBox()
    expect(b.width, variant).toBeGreaterThanOrEqual(44)
    expect(Math.abs(b.width - b.height), variant).toBeLessThan(1.5)
  }
})

test('icon buttons keep a focus ring (AC3)', async ({ page }) => {
  const btn = page.locator('#icon-ghost button')
  await btn.focus()
  const shadow = await btn.evaluate((el) => getComputedStyle(el).boxShadow)
  expect(shadow).not.toBe('none') // --shadow-focus applied via :focus-visible
})

test('text buttons render byte-identically — a padded label pill, not a square (AC4)', async ({
  page,
}) => {
  const btn = page.locator('#text button')
  // The .btn__label wrapper is retained for text buttons.
  await expect(btn.locator('.btn__label')).toHaveText('Save changes')
  await expect(btn).not.toHaveClass(/btn--size-icon/)
  const b = await btn.boundingBox()
  // Label-driven width, clearly wider than the 44px icon square.
  expect(b.width).toBeGreaterThan(60)
  // Non-zero horizontal padding preserved (not the icon shape's padding:0).
  const padX = await btn.evaluate((el) => getComputedStyle(el).paddingLeft)
  expect(parseFloat(padX)).toBeGreaterThan(0)
})

// AspButton unboxed inline variant="link" (§3.97, #4565): a real <button> that
// draws no box in any state, inherits its ink from the setter, and shows an
// underline as the affordance.

test('variant="link" renders with NO box — zero padding, no border, no bg, no radius (AC2)', async ({
  page,
}) => {
  const btn = page.locator('#link-muted button').first()
  const s = await btn.evaluate((el) => {
    const c = getComputedStyle(el)
    return {
      padding: c.padding,
      borderWidth: c.borderTopWidth,
      bg: c.backgroundColor,
      radius: c.borderTopLeftRadius,
      minHeight: c.minHeight,
    }
  })
  expect(s.padding).toBe('0px')
  expect(parseFloat(s.borderWidth)).toBe(0)
  expect(s.bg).toBe('rgba(0, 0, 0, 0)') // transparent — no fill at rest
  expect(s.radius).toBe('0px')
  expect(s.minHeight).toBe('0px') // no min-block-size box
})

test('link hover adds no box — background stays transparent (AC2)', async ({ page }) => {
  const btn = page.locator('#link-muted button').first()
  await btn.hover()
  const bg = await btn.evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(bg).toBe('rgba(0, 0, 0, 0)') // a fill would re-box it
})

test('link ink follows the setter — a muted run stays muted, not a pinned brand (AC3)', async ({
  page,
}) => {
  const btnColor = await page
    .locator('#link-muted button')
    .first()
    .evaluate((el) => getComputedStyle(el).color)
  const runColor = await page.locator('#link-muted').evaluate((el) => getComputedStyle(el).color)
  const refMuted = await page.locator('#ref-muted').evaluate((el) => getComputedStyle(el).color)
  expect(btnColor).toBe(runColor) // inherits the ambient run's ink
  expect(btnColor).toBe(refMuted) // == --text-muted, NOT a hardcoded brand
})

test('link ink follows a call-site brand colour, distinct from the muted context (AC3)', async ({
  page,
}) => {
  const brandBtn = await page
    .locator('#link-brand button')
    .evaluate((el) => getComputedStyle(el).color)
  const refBrand = await page.locator('#ref-brand').evaluate((el) => getComputedStyle(el).color)
  const refMuted = await page.locator('#ref-muted').evaluate((el) => getComputedStyle(el).color)
  expect(brandBtn).toBe(refBrand) // call-site color: var(--brand-primary) wins
  expect(brandBtn).not.toBe(refMuted) // proves the ink is not pinned to one value
})

test('link is underlined at rest (AC4)', async ({ page }) => {
  const deco = await page
    .locator('#link-muted button')
    .first()
    .evaluate((el) => getComputedStyle(el).textDecorationLine)
  expect(deco).toContain('underline')
})

test('link keeps the focus ring and stays a <button> (AC5)', async ({ page }) => {
  const btn = page.locator('#link-muted button').first()
  expect(await btn.evaluate((el) => el.tagName)).toBe('BUTTON')
  await btn.focus()
  const shadow = await btn.evaluate((el) => getComputedStyle(el).boxShadow)
  expect(shadow).not.toBe('none') // --shadow-focus applied via :focus-visible
})

test('disabled link keeps not-allowed + reduced opacity (AC5)', async ({ page }) => {
  const btn = page.locator('#link-disabled button')
  await expect(btn).toBeDisabled()
  const s = await btn.evaluate((el) => ({
    cursor: getComputedStyle(el).cursor,
    opacity: getComputedStyle(el).opacity,
  }))
  expect(s.cursor).toBe('not-allowed')
  expect(parseFloat(s.opacity)).toBeLessThan(1)
})

// AspButton variant="destructive" label contrast (§3.108, #7969): the label is
// TEXT on a filled surface, so the fill is --feedback-error-solid (white 5.62:1),
// never the --feedback-error mark fill (white 3.59:1, under the 4.5 text floor).
// Pinned as an equality against the resolved tokens AND as a measured ratio, in
// both themes, at rest, on hover, and on the always-dark card -- so neither a
// swap back to the mark token nor a token value drifting under 4.5 goes green.

const rgb = (s) => {
  const m = s.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/)
  if (!m) throw new Error(`unparsed colour: ${s}`)
  return { c: [+m[1], +m[2], +m[3]], a: m[4] === undefined ? 1 : +m[4] }
}
const lum = ([r, g, b]) => {
  const f = (v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
// `filter: brightness(k)` scales EVERY painted pixel, the label included.
const brightness = (filter) => {
  if (!filter || filter === 'none') return 1
  const m = filter.match(/^brightness\(([\d.]+)\)$/)
  if (!m) throw new Error(`unexpected destructive hover filter: ${filter}`)
  return +m[1]
}
const scale = (c, k) => c.map((v) => Math.min(255, v * k))

const paint = (loc) =>
  loc.evaluate((el) => {
    const s = getComputedStyle(el)
    return { bg: s.backgroundColor, fg: s.color, filter: s.filter }
  })
const refBg = (page, id) =>
  page.locator(`#${id}`).evaluate((el) => getComputedStyle(el).backgroundColor)

for (const theme of ['light', 'dark']) {
  test.describe(`destructive label contrast (${theme})`, () => {
    test.beforeEach(async ({ page }) => {
      const q = theme === 'dark' ? '?theme=dark' : ''
      await page.goto(`/tests/e2e/fixtures/button.html${q}`, { waitUntil: 'networkidle' })
    })

    test('fill is --feedback-error-solid, not the --feedback-error mark fill (§3.108)', async ({
      page,
    }) => {
      const p = await paint(page.locator('#destructive button'))
      expect(p.bg).toBe(await refBg(page, 'ref-error-solid'))
      expect(p.bg).not.toBe(await refBg(page, 'ref-error-mark'))
      const onDark = await page
        .locator('#ref-on-dark')
        .evaluate((el) => getComputedStyle(el).color)
      expect(p.fg).toBe(onDark)
    })

    test('label measures ≥ 4.5:1 at rest, on the page and on the dark card', async ({ page }) => {
      for (const sel of ['#destructive button', '#destructive-card button']) {
        const p = await paint(page.locator(sel))
        const bg = rgb(p.bg)
        expect(bg.a, `${sel} fill must be opaque`).toBe(1)
        const r = ratio(rgb(p.fg).c, bg.c)
        expect(r, `${sel} ${p.fg} on ${p.bg}`).toBeGreaterThanOrEqual(4.5)
      }
    })

    test('hover darkens (never lightens) and the label stays ≥ 4.5:1', async ({ page }) => {
      const btn = page.locator('#destructive button')
      await btn.hover()
      // Past --transition-fast, so the settled hover is read (see contrast.spec).
      await page.waitForTimeout(250)
      const p = await paint(btn)
      const k = brightness(p.filter)
      expect(k, 'hover must show a delta').toBeLessThan(1)
      const r = ratio(scale(rgb(p.fg).c, k), scale(rgb(p.bg).c, k))
      expect(r, `hover ${p.fg} on ${p.bg} × brightness(${k})`).toBeGreaterThanOrEqual(4.5)
    })

    test('focus-visible keeps the ring and the solid fill', async ({ page }) => {
      const btn = page.locator('#destructive button')
      await btn.focus()
      const s = await btn.evaluate((el) => ({
        shadow: getComputedStyle(el).boxShadow,
        bg: getComputedStyle(el).backgroundColor,
      }))
      expect(s.shadow).not.toBe('none')
      expect(s.bg).toBe(await refBg(page, 'ref-error-solid'))
    })

    test('disabled keeps not-allowed + reduced opacity', async ({ page }) => {
      const btn = page.locator('#destructive-disabled button')
      await expect(btn).toBeDisabled()
      const s = await btn.evaluate((el) => ({
        cursor: getComputedStyle(el).cursor,
        opacity: getComputedStyle(el).opacity,
      }))
      expect(s.cursor).toBe('not-allowed')
      expect(parseFloat(s.opacity)).toBeLessThan(1)
    })
  })
}
