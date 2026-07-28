import { expect, test } from '@playwright/test'

// #2779-A2: AspChatArea windows its render so a full transcript (up to the 500
// §3.28 fetch window) materialises ~windowSize bubbles, not all of them, and
// ships the ratified §3.25/§3.29 "Load N earlier" affordance. These assertions
// read the bound off the real DOM and check the affordance's a11y contract.

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/e2e/fixtures/chat-window.html', { waitUntil: 'networkidle' })
})

const bigBubbles = (page) => page.locator('#big .chat-bubble')
const bigButton = (page) => page.locator('#big [data-testid="load-earlier"]')
const bigPosition = (page) => page.locator('#big [data-testid="chat-position"]')

test('a long thread renders a bounded window, not every message', async ({ page }) => {
  // windowSize (50), not the full 120.
  await expect(bigBubbles(page)).toHaveCount(50)
})

test('the position line reads the canonical total, not the windowed slice', async ({ page }) => {
  await expect(bigPosition(page)).toHaveText(/showing 71.120 of 120/)
})

test('the Load-earlier button is a real, labelled, keyboard-operable control', async ({ page }) => {
  const btn = bigButton(page)
  await expect(btn).toBeVisible()
  await expect(btn).toHaveText('Load 50 earlier')
  await expect(btn).toHaveRole('button')
  // ≥44px touch target (§3.23).
  const box = await btn.boundingBox()
  expect(box.height).toBeGreaterThanOrEqual(44)
  // Reachable and operable by keyboard.
  await btn.focus()
  await expect(btn).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(bigBubbles(page)).toHaveCount(100)
})

test('loading earlier grows the window without moving the reading position', async ({ page }) => {
  // The oldest-shown message (chronological, at the top of the window) must stay
  // put: older content prepended above it is compensated by a scroll adjustment
  // (§3.25).
  const target = page.locator('#big .chat-bubble__content', { hasText: 'msg 71' })
  const before = await target.boundingBox()
  await bigButton(page).click()
  const after = await target.boundingBox()
  expect(Math.abs(after.y - before.y)).toBeLessThan(6)
  await expect(bigBubbles(page)).toHaveCount(100)
})

test('the button is ABSENT (not disabled) once nothing older remains', async ({ page }) => {
  await bigButton(page).click() // → 100
  await bigButton(page).click() // → 120, exhausted
  await expect(bigBubbles(page)).toHaveCount(120)
  await expect(bigButton(page)).toHaveCount(0)
  await expect(bigPosition(page)).toHaveText(/showing 1.120 of 120/)
})

test('a short thread renders whole, with no button and no position line', async ({ page }) => {
  await expect(page.locator('#small .chat-bubble')).toHaveCount(10)
  await expect(page.locator('#small [data-testid="load-earlier"]')).toHaveCount(0)
  await expect(page.locator('#small [data-testid="chat-position"]')).toHaveCount(0)
})

test('newest-first puts the button at the older (bottom) edge and loads without moving the top', async ({
  page,
}) => {
  await page.locator('#drive-newest').click()
  // Newest (msg 120) leads the stream; the button trails the list (older edge).
  await expect(bigBubbles(page).first().locator('.chat-bubble__content')).toHaveText('msg 120')

  const btn = bigButton(page)
  await expect(btn).toBeVisible()
  const listBox = await page.locator('#big .chat-area__list').boundingBox()
  const btnBox = await btn.boundingBox()
  expect(btnBox.y).toBeGreaterThan(listBox.y)

  // Older entries append BELOW the top-anchored newest, so the window grows and
  // the newest message stays first in DOM order (no re-anchor). Reading-position
  // restoration is the chronological prepend-above case (covered above); here
  // there is nothing above the newest to displace it.
  await btn.click()
  await expect(bigBubbles(page)).toHaveCount(100)
  await expect(bigBubbles(page).first().locator('.chat-bubble__content')).toHaveText('msg 120')
})
