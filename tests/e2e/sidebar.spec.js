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

// --- One shell breakpoint; a hidden sidebar sheds its shadow (§3.119, #9135) --
// useMobile() said (max-width: 768px) and AspAppShell said (min-width: 768px),
// so at exactly 768px the sidebar was off-canvas AND the menu button hidden:
// no navigation (#9104 B1-2). Exactly one of the two must be visible and
// operable at every width around the bound.

const inView = (b, vw) => b && b.width > 0 && b.x >= 0 && b.x < vw

for (const width of [767, 768, 769]) {
  test(`at ${width}px exactly one of the menu button and the rail is usable`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    await open(page)
    const menu = page.locator('.app-shell__menu')
    const aside = page.locator('aside').first()
    const menuShown = await menu.isVisible()
    const railShown = inView(await aside.boundingBox(), width)
    expect(menuShown !== railShown, `menu ${menuShown}, rail ${railShown}`).toBe(true)
    // The bound itself: below 768 is mobile, 768 and up is desktop.
    expect(menuShown).toBe(width < 768)

    if (menuShown) {
      // Operable: the menu button brings the sidebar on screen.
      await menu.click()
      await expect.poll(async () => inView(await aside.boundingBox(), width)).toBe(true)
    } else {
      // Operable: a rail link is on screen and takes a click.
      const link = aside.getByRole('link', { name: 'Tasks' })
      await expect(link).toBeVisible()
      await link.click()
      await expect(page).toHaveURL(/#Tasks$/)
    }
  })
}

// One painted row of the page at y, as [r, g, b] per x (decoded in the page).
const row = async (page, y) => {
  const shot = await page.screenshot({ clip: { x: 0, y, width: 390, height: 1 } })
  return page.evaluate(async (bytes) => {
    const bmp = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: 'image/png' }))
    const cv = new OffscreenCanvas(bmp.width, bmp.height)
    const ctx = cv.getContext('2d')
    ctx.drawImage(bmp, 0, 0)
    const d = ctx.getImageData(0, 0, bmp.width, 1).data
    const out = []
    for (let x = 0; x < bmp.width; x++) out.push([d[x * 4], d[x * 4 + 1], d[x * 4 + 2]])
    return out
  }, [...shot])
}
const differs = (a, b) => a.some((v, i) => Math.abs(v - b[i]) > 1)

test('at 390px in light a hidden sidebar casts no shadow; an open one does', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await open(page)
  // The fixture page keeps the UA's 8px body margin (white); a phone shell
  // starts at x = 0, so take it away here, where the left edge is measured.
  await page.addStyleTag({ content: 'body { margin: 0; background: var(--surface-page); }' })
  // The shell must be mounted with the sidebar closed, or an empty page would
  // pass the strip check without measuring anything.
  await expect(page.locator('.app-shell__menu')).toBeVisible()
  await expect(page.locator('aside.sidebar--mobile-hidden')).toHaveCount(1)
  // y = 400 is empty page below the header and the main text; x = 350 is far
  // from any shadow, so it is the page colour the strip must equal (#9104
  // B1-12 measured a ramp at x = 0-22, red 211 -> 228 against 228).
  const hidden = await row(page, 400)
  const ground = hidden[350]
  const shaded = hidden.slice(0, 23).map((p, x) => [x, p]).filter(([, p]) => differs(p, ground))
  expect(shaded, `ground ${ground}; shaded x: ${JSON.stringify(shaded)}`).toEqual([])

  // Control: open the sidebar; its shadow darkens the page just right of it,
  // compared with the far page under the same overlay.
  await page.locator('.app-shell__menu').click()
  const aside = page.locator('aside').first()
  await expect.poll(async () => (await aside.boundingBox())?.x).toBe(0)
  await page.waitForTimeout(400) // the slide and the shadow transition
  const right = Math.ceil((await aside.boundingBox()).width)
  const shown = await row(page, 400)
  expect(differs(shown[right + 2], shown[350]), `x=${right + 2} ${shown[right + 2]} vs ${shown[350]}`).toBe(true)
})

// §3.120 Q12 / system_3 #9181 — the rail returns to its last DESKTOP state after
// a narrow spell. Going mobile collapses the sidebar (the overlay starts
// closed); coming back restores whatever the rail was before, rather than
// leaving an expanded rail collapsed. Driven by real viewport resizes, which
// fire the `matchMedia` change events useMobile listens to.
const emits = (page) => page.evaluate(() => window.__collapsedEmits || [])
const railState = (page) => page.locator('[data-test="brand"]').getAttribute('data-collapsed')
const WIDE = { width: 1440, height: 900 }
const NARROW = { width: 700, height: 900 }

for (const [start, query] of [
  ['expanded', ''],
  ['collapsed', '?collapsed=1'],
]) {
  test(`desktop ${start} → narrow → wide comes back ${start} (§3.120 Q12)`, async ({ page }) => {
    await page.setViewportSize(WIDE)
    await open(page, query)
    await expect.poll(() => railState(page)).toBe(String(start === 'collapsed'))
    expect(await emits(page)).toEqual([])

    await page.setViewportSize(NARROW)
    await expect(page.locator('aside.sidebar--mobile-hidden')).toHaveCount(1)
    // Going mobile emits a collapse only when the rail was open (unchanged).
    expect(await emits(page)).toEqual(start === 'expanded' ? [true] : [])

    await page.setViewportSize(WIDE)
    await expect(page.locator('aside.sidebar--mobile')).toHaveCount(0)
    await expect.poll(() => railState(page)).toBe(String(start === 'collapsed'))
    expect((await emits(page)).at(-1)).toBe(start === 'collapsed')
  })
}

test('mounted narrow → wide comes back expanded (§3.120 Q12)', async ({ page }) => {
  await page.setViewportSize(NARROW)
  await open(page, '?collapsed=1')
  await expect(page.locator('aside.sidebar--mobile-hidden')).toHaveCount(1)
  await page.setViewportSize(WIDE)
  await expect(page.locator('aside.sidebar--mobile')).toHaveCount(0)
  await expect.poll(() => railState(page)).toBe('false')
  expect(await emits(page)).toEqual([false])
})

test('the mobile overlay still opens from the menu and closes on its scrim (#9181)', async ({ page }) => {
  await page.setViewportSize(NARROW)
  await open(page)
  await expect(page.locator('aside.sidebar--mobile-hidden')).toHaveCount(1)
  await page.locator('.app-shell__menu').click()
  await expect(page.locator('.sidebar-overlay')).toBeVisible()
  await expect(page.locator('aside.sidebar--mobile-hidden')).toHaveCount(0)
  await page.locator('.sidebar-overlay').click({ position: { x: 600, y: 400 } })
  await expect(page.locator('.sidebar-overlay')).toHaveCount(0)
  await expect(page.locator('aside.sidebar--mobile-hidden')).toHaveCount(1)
})
