import { expect, test } from '@playwright/test'

import { AA, MEASURE } from './contrast-measure.js'

const THEMES = ['light', 'dark']

// Hover states carry their own colour rules, and two real defects (the sidebar
// toggle and app-shell menu re-asserting an ambient ink over dark chrome) were
// invisible to a static pass. Anything with a :hover colour belongs here.
const HOVER_TARGETS = ['.sidebar__toggle', '.app-shell__menu', '.data-table__sort']

async function subAaSites(page, fixture, theme) {
  await page.goto(`/tests/e2e/fixtures/${fixture}`, { waitUntil: 'networkidle' })
  if (theme === 'dark') {
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
    await page.waitForTimeout(150)
  }

  const found = (await page.evaluate(MEASURE)).filter((r) => r.ratio < AA)

  for (const selector of HOVER_TARGETS) {
    const el = page.locator(selector).first()
    if (!(await el.count())) continue
    await el.hover().catch(() => {})
    await page.waitForTimeout(120)
    for (const r of await page.evaluate(MEASURE)) {
      if (r.ratio < AA && r.selector.includes(selector.slice(1))) {
        found.push({ ...r, selector: `${r.selector}:hover` })
      }
    }
  }

  // Dedupe: the same rule repeats across identical specimens per surface.
  const seen = new Set()
  return found.filter((r) => {
    const k = `${r.surface}|${r.selector}|${r.ratio}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

const report = (sites) =>
  sites
    .sort((a, b) => a.ratio - b.ratio)
    .map((s) => `  ${s.ratio}:1  [${s.surface}] ${s.selector} — "${s.text}"`)
    .join('\n')

for (const theme of THEMES) {
  test(`every component meets WCAG AA on every surface (${theme})`, async ({ page }) => {
    const sites = await subAaSites(page, 'matrix.html', theme)
    expect(sites, `sites below ${AA}:1 in ${theme} theme:\n${report(sites)}`).toEqual([])
  })
}

// The teeth check. Without this, a probe that silently stopped measuring
// anything would pass the suite above forever. Three separate defects in this
// probe were found while building it, one of which reported a regression that
// contradicted sound reasoning; a probe that has only ever agreed with us has
// not been tested.
test.describe('the probe itself', () => {
  for (const theme of THEMES) {
    test(`detects the known-bad control (${theme})`, async ({ page }) => {
      const sites = await subAaSites(page, 'known-bad.html', theme)
      expect(
        sites.length,
        `known-bad fixture reinstates shipped defects but the probe reported them clean in ${theme} — the probe is broken, not the library`
      ).toBeGreaterThan(0)
    })
  }

  test('detects the specific 1:1 invisible-text defect it was built for', async ({ page }) => {
    const sites = await subAaSites(page, 'known-bad.html', 'light')
    const invisible = sites.filter((s) => s.surface.startsWith('card') && s.ratio <= 1.1)
    expect(
      invisible.length,
      `expected ~1:1 text on a dark card from the reinstated #2416 defect; got:\n${report(sites)}`
    ).toBeGreaterThan(0)
  })
})
