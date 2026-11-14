import { expect, test } from '@playwright/test'

// The system_3 console's five nav names (#8018): registered glyph-only, so
// AspSidebarLink renders them through AspIcon rather than verbatim, and they
// take the §1.4 hand-drawn upgrade once the SVG pipeline serves them.

const FIXTURE = '/tests/e2e/fixtures/nav-glyphs.html'

const GLYPHS = {
  agents: '◉',
  tasks: '☑',
  processes: '⟳',
  corpus: '§',
  artifacts: '▤',
}

// The agent page's subpage names (#9412): the same registration, with the
// text-presentation selector on the two glyphs that have an emoji form.
const SUBPAGE_GLYPHS = {
  responsibilities: '\u2696\uFE0E',
  improvement: '\u2197\uFE0E',
  owns: '◈',
  activity: '∿',
}

// aspirant-explorer's nav names (system_3 #10973): glyph-only, each in the
// house typeface's own coverage (checked against the Iosevka cmap).
const EXPLORER_GLYPHS = {
  overview: '◱',
  browse: '▦',
  datasets: '▤',
  documents: '▯',
  upload: '⇧',
  folder: '◫',
  image: '◪',
  audio: '♪',
  'message-export': '▭',
}

// Draws `text` white on a transparent canvas in `font` and returns the largest
// per-pixel channel spread (max-min of r,g,b) over opaque pixels. White ink
// gives ~0; a colour-emoji rendering gives a large spread.
const maxSpread = (page, text, font) =>
  page.evaluate(
    ([t, f]) => {
      const c = document.createElement('canvas')
      c.width = c.height = 64
      const ctx = c.getContext('2d')
      ctx.font = f
      ctx.fillStyle = '#fff'
      ctx.textBaseline = 'top'
      ctx.fillText(t, 4, 4)
      const d = ctx.getImageData(0, 0, 64, 64).data
      let max = 0
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 128) continue
        max = Math.max(max, Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]))
      }
      return max
    },
    [text, font]
  )

test('each nav name falls back to its glyph and has no image asset', async ({ page }) => {
  await page.goto(FIXTURE, { waitUntil: 'networkidle' })
  const reg = await page.evaluate(() => window.__registry)
  for (const [name, glyph] of Object.entries({ ...GLYPHS, ...SUBPAGE_GLYPHS, ...EXPLORER_GLYPHS })) {
    expect(reg[name].glyph, name).toBe(glyph)
    // registryAsset falls back to the name itself for a null asset; what keeps
    // AspIcon's image arm off is that the name is not an asset_map.json key.
    expect(reg[name].asset, name).toBe(name)
    expect(reg[name].mapped, name).toBe(false)
  }
})

for (const collapsed of [false, true]) {
  test(`AspSidebarLink renders each name via AspIcon, no fetch (${collapsed ? 'collapsed' : 'expanded'})`, async ({
    page,
  }) => {
    await page.goto(`${FIXTURE}${collapsed ? '?collapsed=1' : ''}`, { waitUntil: 'networkidle' })
    for (const [name, glyph] of Object.entries({ ...GLYPHS, ...SUBPAGE_GLYPHS, ...EXPLORER_GLYPHS })) {
      const icon = page.locator(`[data-test="nav-${name}"] .asp-icon`)
      await expect(icon.locator('.asp-icon__glyph')).toHaveText(glyph)
      await expect(icon.locator('.asp-icon__img')).toHaveCount(0)
    }
    const calls = await page.evaluate(() => window.__fetchCalls)
    expect(calls.filter((u) => [...Object.keys(GLYPHS), ...Object.keys(SUBPAGE_GLYPHS), ...Object.keys(EXPLORER_GLYPHS)].some((n) => u.includes(n)))).toEqual([])
  })
}

for (const theme of ['light', 'dark']) {
  test(`nav glyphs render monochrome, not as colour emoji (${theme})`, async ({ page }) => {
    await page.goto(`${FIXTURE}${theme === 'dark' ? '?theme=dark' : ''}`, {
      waitUntil: 'networkidle',
    })
    for (const [name, glyph] of Object.entries({ ...GLYPHS, ...SUBPAGE_GLYPHS, ...EXPLORER_GLYPHS })) {
      const el = page.locator(`[data-test="nav-${name}"] .asp-icon__glyph`)
      const font = await el.evaluate((e) => getComputedStyle(e).font)
      expect(await maxSpread(page, glyph, font), `${name} ${glyph}`).toBeLessThan(40)
    }
    // The subpage names at both sizes the agent page uses (#9412 acceptance 3).
    for (const [name, glyph] of Object.entries(SUBPAGE_GLYPHS)) {
      for (const size of ['sm', 'md']) {
        const el = page.locator(`[data-test="glyph-${name}-${size}"] .asp-icon__glyph`)
        await expect(el).toHaveText(glyph)
        const font = await el.evaluate((e) => getComputedStyle(e).font)
        expect(await maxSpread(page, glyph, font), `${name} ${size} ${glyph}`).toBeLessThan(40)
      }
    }
  })
}
