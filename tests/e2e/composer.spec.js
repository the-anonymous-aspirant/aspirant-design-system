import { expect, test } from '@playwright/test'

// Behaviour, not appearance. The §3.62 acceptance criteria are: (1) an EMPTY
// leading-controls slot leaves the composer visually unchanged — a lone
// right-aligned Send, no leading container in the DOM; (2) a FILLED slot renders
// its control LEFT of Send without shifting Send off the right edge; (3) the
// slot does not break the primary submit path.

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/e2e/fixtures/composer.html', { waitUntil: 'networkidle' })
})

const plain = (page) => page.locator('#plain')
const slotted = (page) => page.locator('#slotted')

test('an empty slot renders NO leading container — the composer is unchanged', async ({ page }) => {
  // The v-if on .asp-composer__leading must keep it out of the DOM entirely, so
  // there is no empty flex item nudging Send. Absence, not zero-width.
  await expect(plain(page).locator('.asp-composer__leading')).toHaveCount(0)
  // Send is still present and right-aligned in its controls row.
  await expect(plain(page).locator('.asp-composer__send')).toBeVisible()
})

test('a filled slot renders the control LEFT of Send', async ({ page }) => {
  const leading = slotted(page).locator('.asp-composer__leading')
  await expect(leading).toHaveCount(1)
  const trigger = slotted(page).locator('#add-artifact')
  await expect(trigger).toBeVisible()

  const triggerBox = await trigger.boundingBox()
  const sendBox = await slotted(page).locator('.asp-composer__send').boundingBox()
  // The trigger's right edge is left of the Send's left edge — genuinely leading.
  expect(triggerBox.x + triggerBox.width).toBeLessThanOrEqual(sendBox.x)
})

test('the slot does not disturb Send: it stays right-aligned in both mounts', async ({ page }) => {
  // Send's right edge should hug the composer's right edge whether or not the
  // slot is filled (margin-right:auto absorbs the gap, not Send).
  const plainSend = await plain(page).locator('.asp-composer__send').boundingBox()
  const plainRow = await plain(page).locator('.asp-composer__controls').boundingBox()
  const slottedSend = await slotted(page).locator('.asp-composer__send').boundingBox()
  const slottedRow = await slotted(page).locator('.asp-composer__controls').boundingBox()

  const rightGap = (send, row) => row.x + row.width - (send.x + send.width)
  // Within a pixel of the row's right edge in both cases.
  expect(rightGap(plainSend, plainRow)).toBeLessThanOrEqual(1)
  expect(rightGap(slottedSend, slottedRow)).toBeLessThanOrEqual(1)
})

test('the primary submit still fires with the slot filled', async ({ page }) => {
  await expect(page.locator('#sent')).toHaveText('0')
  const field = slotted(page).locator('.asp-composer__input')
  await field.fill('hello')
  await slotted(page).locator('.asp-composer__send').click()
  await expect(page.locator('#sent')).toHaveText('1')
})

// Regression (system_3 #3616): width:100% + a 1px border with no box-sizing
// pushed the field 2px past its parent's content-box width. box-sizing:
// border-box keeps the border inside the declared width.
test("the field's border-box never exceeds its parent's content width", async ({ page }) => {
  const field = plain(page).locator('.asp-composer__input')
  const parent = plain(page)
  const fieldBox = await field.boundingBox()
  const parentBox = await parent.boundingBox()
  expect(fieldBox.width).toBeLessThanOrEqual(parentBox.width)
})

test('AspChatArea forwards composer-leading only when given (opt-in)', async ({ page }) => {
  // No composer-leading slot on the chat area -> the embedded composer has no
  // leading container, so the conversation composer is unchanged.
  await expect(page.locator('#chat-plain .asp-composer__leading')).toHaveCount(0)
})

test('AspChatArea forwards composer-leading down to the embedded composer', async ({ page }) => {
  const leading = page.locator('#chat-slotted .asp-composer__leading')
  await expect(leading).toHaveCount(1)
  const trigger = page.locator('#chat-add-artifact')
  await expect(trigger).toBeVisible()
  // The forwarded trigger lands left of the chat composer's Send.
  const triggerBox = await trigger.boundingBox()
  const sendBox = await page.locator('#chat-slotted .asp-composer__send').boundingBox()
  expect(triggerBox.x + triggerBox.width).toBeLessThanOrEqual(sendBox.x)
})
