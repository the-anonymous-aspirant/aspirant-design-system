import { expect, test } from '@playwright/test'

import { AA, MEASURE } from './contrast-measure.js'

// AspTooltip replaces a `::after` pseudo-element chip (#2383). Each assertion
// below is one the ORIGINAL would have failed, rather than a restatement of
// what the component now does:
//
//   1. a pseudo-element is trapped in its trigger's overflow context, so a chip
//      inside an `overflow: hidden` box was cut off;
//   2. it has no way to flip, so a chip on a trigger near a viewport edge ran
//      off screen;
//   3. `:hover`-only CSS never opened for a keyboard user, and nothing wired
//      `aria-describedby`, so the text was invisible to a screen reader.
//
// Plus the contrast contract: the chip PAINTS --surface-card, dark in both
// themes, so its ink is declared rather than inherited (§3.18).

const THEMES = ['light', 'dark']

const open = async (page, theme) => {
  await page.goto(`/tests/e2e/fixtures/tooltip.html${theme === 'dark' ? '?theme=dark' : ''}`, {
    waitUntil: 'networkidle',
  })
  await page.locator('#trig-default').waitFor({ state: 'attached' })
}

const chip = (page) => page.locator('.asp-tooltip')

// --- the chip exists only while it is wanted ---------------------------------

test('no chip is in the DOM until a trigger is hovered', async ({ page }) => {
  await open(page, 'light')
  // Not merely hidden: an always-mounted chip per trigger is what the ::after
  // version cost, and it is why a table of 200 rows carried 200 of them.
  await expect(chip(page)).toHaveCount(0)
})

test('hover opens the chip and closes it again on leave', async ({ page }) => {
  await open(page, 'light')
  await page.locator('#trig-default').hover()
  await expect(chip(page)).toHaveText('Tasks merged in the last 7 days.')
  await expect(chip(page)).toHaveAttribute('role', 'tooltip')

  await page.locator('#after').hover()
  await expect(chip(page)).toHaveCount(0)
})

test('the chip is teleported to <body>, not left inside the trigger', async ({ page }) => {
  await open(page, 'light')
  await page.locator('#trig-default').hover()
  await expect(chip(page)).toBeVisible()
  // Defect 1's root cause. A chip parented anywhere under the call site inherits
  // that ancestor's clipping and stacking context.
  const parent = await chip(page).evaluate((el) => el.parentElement.tagName)
  expect(parent).toBe('BODY')
})

// --- defect 3: keyboard and screen-reader access ------------------------------

test('keyboard focus opens the chip, and does so without the hover delay', async ({ page }) => {
  await open(page, 'light')
  // #trig-slow carries openDelay: 600. Hovering it must NOT open the chip
  // within 200ms...
  await page.locator('#trig-slow').hover()
  await page.waitForTimeout(200)
  await expect(chip(page)).toHaveCount(0)

  // ...but a deliberate Tab is not an accidental traverse, so focus skips the
  // delay entirely. A 300ms budget is comfortably under the 600ms hover delay,
  // so this fails if focus is ever routed through the timer.
  await page.locator('#trig-slow').focus()
  await expect(chip(page)).toBeVisible({ timeout: 300 })
})

test('Tab from a neighbouring control reaches the trigger and opens the chip', async ({ page }) => {
  await open(page, 'light')
  await page.locator('#before').focus()
  await page.keyboard.press('Tab')
  await expect(page.locator('#trig-default')).toBeFocused()
  await expect(chip(page)).toBeVisible()
})

test('the anchor is aria-describedby the chip while it is up, and not after', async ({ page }) => {
  await open(page, 'light')
  const anchor = page.locator('#tip-default')
  await expect(anchor).not.toHaveAttribute('aria-describedby', /./)

  await page.locator('#trig-default').focus()
  await expect(chip(page)).toBeVisible()
  // The wiring, not just the presence of an id: a describedby pointing at
  // nothing announces nothing, which is indistinguishable from the old chip.
  const described = await anchor.getAttribute('aria-describedby')
  expect(described).toBeTruthy()
  expect(await chip(page).getAttribute('id')).toBe(described)

  await page.keyboard.press('Escape')
  await expect(chip(page)).toHaveCount(0)
  await expect(anchor).not.toHaveAttribute('aria-describedby', /./)
})

test('Escape dismisses the chip without moving focus', async ({ page }) => {
  await open(page, 'light')
  await page.locator('#trig-default').focus()
  await expect(chip(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(chip(page)).toHaveCount(0)
  // Per APG: dismissing the description must not cost the user their place.
  await expect(page.locator('#trig-default')).toBeFocused()
})

// --- defect 2: edge flip and viewport containment -----------------------------

test('a left-positioned chip with no room flips to the right of its trigger', async ({ page }) => {
  await open(page, 'light')
  await page.locator('#trig-left').hover()
  await expect(chip(page)).toBeVisible()
  const box = await chip(page).boundingBox()
  const trigger = await page.locator('#tip-left').boundingBox()
  // Preferred side is left; the trigger sits at x=0, so the chip must have
  // moved to the far side rather than off screen.
  expect(box.x).toBeGreaterThanOrEqual(trigger.x + trigger.width)
})

test('a top-positioned chip with no room flips below its trigger', async ({ page }) => {
  await open(page, 'light')
  await page.locator('#trig-top').hover()
  await expect(chip(page)).toBeVisible()
  const box = await chip(page).boundingBox()
  const trigger = await page.locator('#tip-top').boundingBox()
  expect(box.y).toBeGreaterThanOrEqual(trigger.y + trigger.height)
})

test('every chip stays inside the viewport on all four sides', async ({ page }) => {
  await open(page, 'light')
  const viewport = page.viewportSize()
  for (const id of ['default', 'left', 'top', 'slot', 'clipped']) {
    await page.locator(`#trig-${id}`).hover()
    await expect(chip(page)).toBeVisible()
    const box = await chip(page).boundingBox()
    const where = `#trig-${id} at ${JSON.stringify(box)}`
    expect(box.x, where).toBeGreaterThanOrEqual(0)
    expect(box.y, where).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width, where).toBeLessThanOrEqual(viewport.width)
    expect(box.y + box.height, where).toBeLessThanOrEqual(viewport.height)
    await page.locator('#after').hover()
  }
})

// --- defect 1: the clipping ancestor -----------------------------------------

test('a chip inside an overflow:hidden ancestor is not clipped', async ({ page }) => {
  await open(page, 'light')
  await page.locator('#trig-clipped').hover()
  await expect(chip(page)).toBeVisible()
  const box = await chip(page).boundingBox()
  const clipper = await page.locator('#clipper').boundingBox()
  // The whole point: the chip is taller than the 44px scroller and extends
  // beyond it. Inside the box it would have been cut to the box's bounds.
  const escapes = box.y < clipper.y || box.y + box.height > clipper.y + clipper.height
  expect(escapes, `chip ${JSON.stringify(box)} vs clipper ${JSON.stringify(clipper)}`).toBe(true)
})

// --- props --------------------------------------------------------------------

test('a disabled tooltip renders no chip at all', async ({ page }) => {
  await open(page, 'light')
  await page.locator('#trig-disabled').hover()
  await page.waitForTimeout(300)
  await expect(chip(page)).toHaveCount(0)
})

test('the content slot renders markup rather than the content prop', async ({ page }) => {
  await open(page, 'light')
  await page.locator('#trig-slot').hover()
  await expect(chip(page).locator('strong')).toHaveText('2026-07-18')
})

test('the chip never intercepts the pointer', async ({ page }) => {
  await open(page, 'light')
  await page.locator('#trig-default').hover()
  await expect(chip(page)).toBeVisible()
  // A chip clamped near an edge can overlap its own trigger. If it took the
  // pointer, the trigger would un-hover and the chip would flicker on and off.
  const events = await chip(page).evaluate((el) => getComputedStyle(el).pointerEvents)
  expect(events).toBe('none')
})

// --- contrast (§3.18) ----------------------------------------------------------

for (const theme of THEMES) {
  test(`the chip's ink clears AA on its own dark surface (${theme})`, async ({ page }) => {
    await open(page, theme)
    await page.locator('#trig-default').hover()
    await expect(chip(page)).toBeVisible()
    // Longer than --transition-fast (0.15s): a colour sampled mid-fade comes
    // back as an oklab transient, which is a false verdict, not a defect.
    await page.waitForTimeout(250)

    const sites = (await page.evaluate(MEASURE)).filter((r) => r.selector.includes('asp-tooltip'))
    // Guard the guard: a chip that measured nothing would pass vacuously, and
    // the chip is the only thing this test is here for.
    expect(sites.length).toBeGreaterThan(0)

    const failures = sites.filter((r) => r.ratio < AA)
    expect(
      failures,
      `sub-AA: ${failures.map((f) => `${f.selector} ${f.ratio}:1 ("${f.text}")`).join(', ')}`
    ).toEqual([])
  })
}
