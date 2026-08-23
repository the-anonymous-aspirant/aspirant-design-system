import { expect, test } from '@playwright/test'

import { AA, AA_NON_TEXT, contrastRatio } from '../../src/utils/color_contrast.js'

// §3.78: a canvas-drawn chart cannot resolve a currentColor-relative token, so
// `--text-muted` fed raw into Chart.js rendered the axis/legend ink as opaque
// black — invisible on a dark surface ("black on black", #4173). The fix
// resolves the element's real inherited color and derives the muted ink from
// it. This spec asserts the RENDERED pixels, not a derived value: it samples the
// legend-text ink off the actual <canvas> and requires it to clear WCAG-AA text
// against the page surface, in both themes. The #chart-broken instance
// reproduces the pre-fix behaviour (raw token string) and is the test's teeth —
// on a dark surface it MUST fail, or the probe is measuring nothing.
//
// Only the axis/legend TEXT floor (item 1) is asserted here. Grid and series
// non-text floors (§3.78 items 2/3) bind to a surface-scope ruling that is open
// with design_agent; their assertions land with those token changes.

const THEMES = ['light', 'dark']

// Sample a horizontal band of a chart canvas and return the page surface (bg,
// read from an empty corner) and the modal ACHROMATIC non-background ink in that
// band. Saturated marks (series lines, legend swatches) are excluded, so the
// achromatic ink is the legend/axis text (top band) or the grid lines (mid
// band). `yFrom`/`yTo` are fractions of canvas height.
async function sampleInk(page, selector, yFrom, yTo) {
  const shot = await page.locator(selector).screenshot()
  return page.evaluate(async ({ bytes, yFrom, yTo }) => {
    const blob = new Blob([new Uint8Array(bytes)], { type: 'image/png' })
    const bmp = await createImageBitmap(blob)
    const cv = new OffscreenCanvas(bmp.width, bmp.height)
    const ctx = cv.getContext('2d')
    ctx.drawImage(bmp, 0, 0)
    const { width: W, height: H } = bmp
    const px = ctx.getImageData(0, 0, W, H).data
    const at = (x, y) => {
      const i = (y * W + x) * 4
      return [px[i], px[i + 1], px[i + 2], px[i + 3]]
    }
    // Background: an empty corner of the canvas shows the composited surface.
    const bg = at(2, 2)
    const chroma = (c) => Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2])
    const dist = (a, b) =>
      Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])
    const y0 = Math.max(0, Math.round(H * yFrom))
    const y1 = Math.min(H, Math.round(H * yTo))
    const counts = new Map()
    for (let y = y0; y < y1; y++) {
      for (let x = 0; x < W; x++) {
        const c = at(x, y)
        if (c[3] < 200) continue // skip transparent
        if (chroma(c) > 24) continue // skip saturated series / legend swatches
        if (dist(c, bg) < 40) continue // skip the surface itself
        const key = `${c[0] >> 3}|${c[1] >> 3}|${c[2] >> 3}`
        const e = counts.get(key) || { n: 0, r: 0, g: 0, b: 0 }
        e.n++
        e.r += c[0]
        e.g += c[1]
        e.b += c[2]
        counts.set(key, e)
      }
    }
    let best = null
    for (const e of counts.values()) if (!best || e.n > best.n) best = e
    const ink = best ? [Math.round(best.r / best.n), Math.round(best.g / best.n), Math.round(best.b / best.n)] : null
    return { bg: bg.slice(0, 3), ink, inkCount: best ? best.n : 0 }
  }, { bytes: [...shot], yFrom, yTo })
}

// Axis-tick text lives in the bottom band (legend is disabled on these charts,
// so there are no swatches to confuse the achromatic-ink sampler). Same muted
// ink the legend uses (§3.78 item 1).
const sampleLegendInk = (page, selector) => sampleInk(page, selector, 0.86, 1)
// Grid lines live in the plot mid-band, clear of the top legend and the bottom
// axis tick labels.
const sampleGridInk = (page, selector) => sampleInk(page, selector, 0.42, 0.74)

async function loadFixture(page, theme) {
  const q = theme === 'dark' ? '?theme=dark' : ''
  await page.goto(`/tests/e2e/fixtures/asp-chart-contrast.html${q}`, { waitUntil: 'networkidle' })
  // chart.js loads at runtime; wait for every AspChart to signal first paint.
  await page.waitForFunction(() => {
    const els = [...document.querySelectorAll('.asp-chart')]
    return els.length >= 6 && els.every((el) => el.dataset.rendered === 'true')
  })
}

// Sample the SATURATED (series) marks off a chart canvas and return the surface
// (bg, from an empty corner) and the significant color clusters — one per series
// fill. Achromatic marks (axis/legend/grid) are excluded by the chroma filter,
// so what remains is the series ink. Bars give large solid regions, so a cluster
// with a healthy pixel count is a real series, not anti-alias noise.
async function sampleSeriesInks(page, selector) {
  const shot = await page.locator(selector).screenshot()
  return page.evaluate(async (bytes) => {
    const blob = new Blob([new Uint8Array(bytes)], { type: 'image/png' })
    const bmp = await createImageBitmap(blob)
    const cv = new OffscreenCanvas(bmp.width, bmp.height)
    const ctx = cv.getContext('2d')
    ctx.drawImage(bmp, 0, 0)
    const { width: W, height: H } = bmp
    const px = ctx.getImageData(0, 0, W, H).data
    const at = (x, y) => {
      const i = (y * W + x) * 4
      return [px[i], px[i + 1], px[i + 2], px[i + 3]]
    }
    const bg = at(2, 2)
    const chroma = (c) => Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2])
    const counts = new Map()
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const c = at(x, y)
        if (c[3] < 200) continue
        if (chroma(c) <= 40) continue // keep only saturated series ink
        const key = `${c[0] >> 4}|${c[1] >> 4}|${c[2] >> 4}`
        const e = counts.get(key) || { n: 0, r: 0, g: 0, b: 0 }
        e.n++
        e.r += c[0]
        e.g += c[1]
        e.b += c[2]
        counts.set(key, e)
      }
    }
    // Rank by pixel count and return the solid cores first. A bar's solid
    // interior dwarfs its anti-aliased edge blends, so the top-K clusters are
    // the real series fills; edge/AA artifacts fall below them.
    const clusters = [...counts.values()]
      .filter((e) => e.n >= 200)
      .sort((a, b) => b.n - a.n)
      .map((e) => ({ ink: [Math.round(e.r / e.n), Math.round(e.g / e.n), Math.round(e.b / e.n)], n: e.n }))
    return { bg: bg.slice(0, 3), clusters }
  }, [...shot])
}

for (const theme of THEMES) {
  test(`[${theme}] axis/legend ink clears WCAG-AA text on --surface-page`, async ({ page }) => {
    await loadFixture(page, theme)
    const { bg, ink, inkCount } = await sampleLegendInk(page, '#chart-fixed canvas')

    expect(ink, 'expected to find rendered legend text ink on the canvas').not.toBeNull()
    expect(inkCount, 'legend text ink should be more than anti-alias noise').toBeGreaterThan(20)

    const ratio = contrastRatio([...ink, 1], [...bg, 1])
    expect(
      ratio,
      `legend ink ${JSON.stringify(ink)} vs surface ${JSON.stringify(bg)} = ${ratio.toFixed(2)}:1 (need >= ${AA})`,
    ).toBeGreaterThanOrEqual(AA)
  })
}

for (const theme of THEMES) {
  test(`[${theme}] grid ink clears WCAG-AA non-text on --surface-page`, async ({ page }) => {
    await loadFixture(page, theme)
    const { bg, ink, inkCount } = await sampleGridInk(page, '#chart-grid canvas')

    expect(ink, 'expected to find rendered grid ink on the canvas').not.toBeNull()
    expect(inkCount, 'grid ink should be more than anti-alias noise').toBeGreaterThan(20)

    const ratio = contrastRatio([...ink, 1], [...bg, 1])
    expect(
      ratio,
      `grid ink ${JSON.stringify(ink)} vs surface ${JSON.stringify(bg)} = ${ratio.toFixed(2)}:1 (need >= ${AA_NON_TEXT})`,
    ).toBeGreaterThanOrEqual(AA_NON_TEXT)
  })
}

// Teeth — the pre-fix behaviour, reproduced. On a dark surface the raw
// currentColor token renders as black, and the probe MUST catch it. (On a light
// surface opaque black is legible by coincidence — §3.78 measured 13.55:1 — so
// the teeth assertion is the dark case, exactly where the operator saw it.)
test('[dark] teeth: raw --text-muted token renders black-on-black and fails the probe', async ({ page }) => {
  await loadFixture(page, 'dark')
  const { bg, ink } = await sampleLegendInk(page, '#chart-broken canvas')
  expect(ink, 'expected to find the (black) rendered ink on the broken canvas').not.toBeNull()
  const ratio = contrastRatio([...ink, 1], [...bg, 1])
  expect(
    ratio,
    `broken legend ink ${JSON.stringify(ink)} vs surface ${JSON.stringify(bg)} = ${ratio.toFixed(2)}:1 — the probe must see this fail`,
  ).toBeLessThan(AA)
})

// §3.78 item 2 (#4187): every rendered series clears the 3:1 non-text floor
// against the surface it composites on. The palette is surface-resolved — a
// light-surface set on the page, a dark-surface set on the card (dark in both
// themes) — selected by the resolved background luminance.
for (const theme of THEMES) {
  test(`[${theme}] every page-mounted series clears the non-text floor vs --surface-page`, async ({
    page,
  }) => {
    await loadFixture(page, theme)
    const { bg, clusters } = await sampleSeriesInks(page, '#chart-page-series canvas')
    // 5 datasets → the 5 solid bar fills are the 5 largest clusters.
    const series = clusters.slice(0, 5).map((c) => c.ink)
    expect(series.length, 'expected 5 rendered series fills').toBe(5)
    for (const ink of series) {
      const ratio = contrastRatio([...ink, 1], [...bg, 1])
      expect(
        ratio,
        `page series ${JSON.stringify(ink)} vs ${JSON.stringify(bg)} = ${ratio.toFixed(2)}:1 (need >= ${AA_NON_TEXT})`,
      ).toBeGreaterThanOrEqual(AA_NON_TEXT)
    }
  })

  test(`[${theme}] every card-mounted series clears the non-text floor vs --surface-card`, async ({
    page,
  }) => {
    await loadFixture(page, theme)
    const { bg, clusters } = await sampleSeriesInks(page, '#chart-card-series canvas')
    const series = clusters.slice(0, 5).map((c) => c.ink)
    expect(series.length, 'expected 5 rendered series fills').toBe(5)
    for (const ink of series) {
      const ratio = contrastRatio([...ink, 1], [...bg, 1])
      expect(
        ratio,
        `card series ${JSON.stringify(ink)} vs ${JSON.stringify(bg)} = ${ratio.toFixed(2)}:1 (need >= ${AA_NON_TEXT})`,
      ).toBeGreaterThanOrEqual(AA_NON_TEXT)
    }
  })
}

// Series teeth — a deliberately near-surface series fill MUST be caught, or the
// per-series probe is measuring nothing.
test('[light] teeth: a near-surface series fill fails the non-text floor', async ({ page }) => {
  await loadFixture(page, 'light')
  const { bg, clusters } = await sampleSeriesInks(page, '#chart-series-teeth canvas')
  // 2 datasets → the two solid fills; the near-surface one must read below 3:1.
  const ratios = clusters.slice(0, 2).map((c) => contrastRatio([...c.ink, 1], [...bg, 1]))
  expect(
    Math.min(...ratios),
    `the near-surface bar must read below ${AA_NON_TEXT}: ratios ${ratios.map((r) => r.toFixed(2)).join(', ')}`,
  ).toBeLessThan(AA_NON_TEXT)
})
