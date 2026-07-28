import { expect, test } from '@playwright/test'

// The collapsed variant (#2775-A1, closing the §3.15 parity gap): a machinery
// turn is texture on a turn, not a turn, so it renders as a muted one-line
// <details>/<summary> the operator can open -- never a full bubble. A signal
// turn is unchanged: it shows its full body. The assertions below read the two
// side by side, and the collapsed one across the closed -> open transition,
// because "renders collapsed" is only proof if the body was actually hidden
// first.

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/e2e/fixtures/chat-collapsed.html', { waitUntil: 'networkidle' })
})

const collapsed = (page) => page.locator('.chat-bubble--collapsed')
const signal = (page) => page.locator('.chat-bubble:not(.chat-bubble--collapsed)')

test('a collapsed bubble shows its summary and hides its body', async ({ page }) => {
  await expect(collapsed(page)).toHaveCount(1)
  // The summary is the sender string, kind suffix and all.
  await expect(collapsed(page).locator('.chat-bubble__summary')).toBeVisible()
  await expect(collapsed(page).locator('.chat-bubble__summary')).toHaveText('bash · tool call')
  // Closed <details> keeps the body out of the layout entirely, not merely
  // visually hidden.
  await expect(collapsed(page).locator('.chat-bubble__content')).toBeHidden()
})

test('clicking the summary expands the collapsed bubble to reveal its body', async ({ page }) => {
  await collapsed(page).locator('.chat-bubble__summary').click()
  const body = collapsed(page).locator('.chat-bubble__content')
  await expect(body).toBeVisible()
  await expect(body).toContainText('machinery body hidden until expanded')
})

test('the native details keeps the keyboard toggle (focus + Enter)', async ({ page }) => {
  // No hand-rolled JS or ARIA: the browser gives focus + Enter/Space to a
  // <summary> for free, and the variant must not break it.
  // `press` focuses the summary and dispatches the key in one actionable step,
  // so the toggle is exercised through the real keyboard path.
  const summary = collapsed(page).locator('.chat-bubble__summary')
  await summary.press('Enter')
  await expect(collapsed(page).locator('.chat-bubble__content')).toBeVisible()
  await summary.press('Enter')
  await expect(collapsed(page).locator('.chat-bubble__content')).toBeHidden()
})

test('a signal (uncollapsed) bubble shows its full body from the start', async ({ page }) => {
  await expect(signal(page)).toHaveCount(1)
  // No summary element, and the body is visible without any interaction.
  await expect(signal(page).locator('.chat-bubble__summary')).toHaveCount(0)
  await expect(signal(page).locator('.chat-bubble__content')).toBeVisible()
  await expect(signal(page).locator('.chat-bubble__content')).toContainText(
    'signal body visible from the start'
  )
})

test('the collapsed summary is never amber (§1.3 reserves it)', async ({ page }) => {
  // The collapsed turn carries no tinted surface at all -- the amber own-fill is
  // not applied -- so its summary sits flat on the area surface in muted ink.
  const bg = await collapsed(page)
    .locator('.chat-bubble__collapsible')
    .evaluate((el) => getComputedStyle(el).backgroundColor)
  // Fully transparent: rgba(0, 0, 0, 0) in every engine.
  expect(bg).toBe('rgba(0, 0, 0, 0)')
})
