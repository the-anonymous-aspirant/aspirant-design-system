import { expect, test } from '@playwright/test'

// §3.113 (system_3 #8019): an icon in a text slot takes its size from the slot,
// not from AspIcon's standalone sm default (1rem). A named icon and a raw glyph
// in one slot therefore render at one size. Asserted on rendered geometry.

const FIXTURE = '/tests/e2e/fixtures/icon-slot-size.html'
const IDS = ['named-asset', 'named-glyph', 'raw']

// Per slot: its computed font-size (which is a raw glyph's size), and the
// rendered height of the AspIcon box when the slot holds a named icon.
const measure = (slots) =>
  slots.evaluateAll((els) =>
    els.map((slot) => {
      const icon = slot.querySelector('.asp-icon')
      return {
        named: !!icon,
        fontSize: parseFloat(getComputedStyle(slot).fontSize),
        height: icon ? icon.getBoundingClientRect().height : null,
      }
    }),
  )

const expectOneSize = (m) => {
  expect(m.map((x) => x.named)).toEqual([true, true, false])
  const raw = m[2].fontSize
  for (const x of m) expect(x.fontSize).toBeCloseTo(raw, 1)
  for (const x of m.slice(0, 2)) expect(Math.abs(x.height - raw)).toBeLessThanOrEqual(0.5)
}

for (const theme of ['light', 'dark']) {
  for (const collapsed of [false, true]) {
    test(`AspSidebarLink: named and raw icons render at the slot's size (${theme}, ${collapsed ? 'collapsed' : 'expanded'})`, async ({
      page,
    }) => {
      const q = new URLSearchParams()
      if (theme === 'dark') q.set('theme', 'dark')
      if (collapsed) q.set('collapsed', '1')
      await page.goto(`${FIXTURE}?${q}`, { waitUntil: 'networkidle' })
      const m = await measure(
        page.locator(IDS.map((id) => `[data-test="link-${id}"] .sidebar-link__icon`).join(', ')),
      )
      expectOneSize(m)
      // The slot is --text-lg, larger than AspIcon's standalone 1rem; this is
      // the gap §3.113 closes (16 vs 19.2 before).
      expect(m[2].fontSize).toBeGreaterThan(16.5)
    })
  }
}

test("AspListItem: named and raw icons render at the slot's size", async ({ page }) => {
  await page.goto(FIXTURE, { waitUntil: 'networkidle' })
  expectOneSize(await measure(page.locator('#list .list-item__icon')))
})

test('sm icons outside a text slot keep the standalone 1rem', async ({ page }) => {
  await page.goto(FIXTURE, { waitUntil: 'networkidle' })
  const icons = page.locator('#standalone .asp-icon--sm')
  // AspBackButton, AspInput type=search, AspComposer attach.
  await expect(icons).toHaveCount(3)
  const rem = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))
  for (const hgt of await icons.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) {
    expect(Math.abs(hgt - rem)).toBeLessThanOrEqual(0.5)
  }
})
