import { expect, test } from '@playwright/test'

// AspAppShell forwards sidebar-header / sidebar-footer into AspSidebar, and the
// desktop collapse toggle is a muted chevron at the sidebar's bottom edge that
// overlaps nothing (system_3 #8009, §3.8 brand / §3.12 collapse affordance).

const open = (page, query = '') =>
  page.goto(`/tests/e2e/fixtures/sidebar.html${query}`, { waitUntil: 'networkidle' })

const box = async (loc) => {
  await loc.scrollIntoViewIfNeeded()
  return loc.boundingBox()
}

const intersects = (a, b) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height

test('the header slot lands in the sidebar header, not inside <nav> (§3.8)', async ({ page }) => {
  await open(page)
  const brand = page.locator('[data-test="brand"]')
  await expect(brand).toHaveText('System 3')
  expect(await brand.evaluate((el) => !!el.closest('aside .sidebar__header'))).toBe(true)
  expect(await brand.evaluate((el) => !!el.closest('nav'))).toBe(false)
  const footer = page.locator('[data-test="sidebar-footer"]')
  expect(await footer.evaluate((el) => !!el.closest('aside .sidebar__footer'))).toBe(true)
})

test('the brand is centred, bigger, on the heading ink', async ({ page }) => {
  await open(page)
  const s = await page.locator('aside .sidebar__header').evaluate((el) => {
    const c = getComputedStyle(el)
    return { justify: c.justifyContent, align: c.textAlign, size: parseFloat(c.fontSize) }
  })
  expect(s.justify).toBe('center')
  expect(s.align).toBe('center')
  const body = await page.locator('aside nav').evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
  expect(s.size).toBeGreaterThan(body)
})

test('collapsed: the header stays in the rail with collapsed=true; the footer hides', async ({ page }) => {
  await open(page, '?collapsed=1')
  const brand = page.locator('[data-test="brand"]')
  await expect(brand).toBeVisible()
  await expect(brand).toHaveText('S3')
  await expect(brand).toHaveAttribute('data-collapsed', 'true')
  await expect(page.locator('aside .sidebar__footer')).toBeHidden()
})

test('the toggle collapses and expands, and the header follows', async ({ page }) => {
  await open(page)
  const toggle = page.locator('aside .sidebar__toggle')
  await expect(toggle).toHaveAttribute('aria-label', 'Collapse sidebar')
  await toggle.click()
  await expect(page.locator('[data-test="brand"]')).toHaveText('S3')
  await expect(toggle).toHaveAttribute('aria-label', 'Expand sidebar')
  await toggle.click()
  await expect(page.locator('[data-test="brand"]')).toHaveText('System 3')
})

for (const state of ['expanded', 'collapsed']) {
  test(`${state}: the toggle sits inside the rail at its bottom and overlaps nothing`, async ({ page }) => {
    await open(page, state === 'collapsed' ? '?collapsed=1' : '')
    const aside = await box(page.locator('aside'))
    const t = await box(page.locator('aside .sidebar__toggle'))
    // Inside the rail horizontally (it used to hang 16px outside the edge).
    expect(t.x).toBeGreaterThanOrEqual(aside.x)
    expect(t.x + t.width).toBeLessThanOrEqual(aside.x + aside.width + 0.5)
    // At the bottom: below every link and the header.
    const others = [
      page.locator('aside .sidebar__header'),
      page.locator('[data-test="page-title"]'),
      ...(await page.locator('aside nav a, aside nav .sidebar-link').all()),
    ]
    if (state === 'expanded') others.push(page.locator('aside .sidebar__footer'))
    for (const o of others) {
      if (!(await o.isVisible())) continue
      const b = await o.boundingBox()
      expect(intersects(t, b), `toggle overlaps ${await o.evaluate((el) => el.className || el.tagName)}`).toBe(false)
      expect(t.y, 'toggle is below it').toBeGreaterThanOrEqual(b.y)
    }
  })
}

test('on a long page the toggle stays at the visible bottom edge (sticky)', async ({ page }) => {
  await open(page, '?long=1')
  await page.evaluate(() => window.scrollTo(0, 0))
  const vh = page.viewportSize().height
  // boundingBox is viewport-relative: read it WITHOUT scrolling the toggle in.
  const t = await page.locator('aside .sidebar__toggle').boundingBox()
  expect(t.y + t.height).toBeLessThanOrEqual(vh + 0.5)
  expect(t.y + t.height).toBeGreaterThan(vh - 64) // pinned near the bottom, not at the top
})

test('muted at rest, --text-on-dark on hover, focus ring kept (§3.12)', async ({ page }) => {
  await open(page)
  const toggle = page.locator('aside .sidebar__toggle')
  // The reference spans resolve the two tokens in the toggle's own context.
  const ref = (token) =>
    page.locator('aside').evaluate((aside, t) => {
      const s = document.createElement('span')
      s.style.color = `var(${t})`
      aside.appendChild(s)
      const c = getComputedStyle(s).color
      s.remove()
      return c
    }, token)
  const muted = await ref('--text-muted')
  const onDark = await ref('--text-on-dark')
  expect(muted).not.toBe(onDark)
  expect(await toggle.evaluate((el) => getComputedStyle(el).color)).toBe(muted)
  await toggle.hover()
  await page.waitForTimeout(250) // past --transition-fast, read the settled hover
  expect(await toggle.evaluate((el) => getComputedStyle(el).color)).toBe(onDark)
  await page.mouse.move(600, 10)
  await toggle.focus()
  expect(await toggle.evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe('none')
})

test('mobile: a bare AspSidebar keeps its ✕ where it was (unchanged)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await open(page, '?standalone=1')
  const toggle = page.locator('aside .sidebar__toggle')
  await expect(toggle).toHaveText('✕')
  const s = await toggle.evaluate((el) => {
    const c = getComputedStyle(el)
    return { position: c.position, radius: c.borderTopLeftRadius }
  })
  expect(s.position).toBe('absolute')
  expect(parseFloat(s.radius)).toBeGreaterThan(10) // the round ✕, not the desktop chevron
})

test('mobile shell: no sidebar toggle, the header hamburger opens the nav (unchanged)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await open(page)
  await expect(page.locator('aside .sidebar__toggle')).toHaveCount(0)
  await expect(page.locator('.app-shell__menu')).toBeVisible()
})
