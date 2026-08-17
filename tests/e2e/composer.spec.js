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

// --- Enter-to-send (system_3 #3677 AC2) --------------------------------------
// AspComposer now consumes AspTextarea, which never intercepts Enter on its
// own — these tests prove Enter-to-send stayed put on the composer itself
// through the refactor, and that Shift/Ctrl/Meta+Enter still insert a newline
// rather than sending.

test('Enter sends the message', async ({ page }) => {
  await expect(page.locator('#sent')).toHaveText('0')
  const field = plain(page).locator('.asp-composer__input')
  await field.click()
  await field.type('hello')
  await field.press('Enter')
  await expect(page.locator('#sent')).toHaveText('1')
})

test('Shift+Enter, Ctrl+Enter and Meta+Enter insert a newline instead of sending', async ({
  page,
}) => {
  const field = plain(page).locator('.asp-composer__input')
  await field.click()
  await field.type('line one')
  await field.press('Shift+Enter')
  await field.type('line two')
  await field.press('Control+Enter')
  await field.type('line three')
  await field.press('Meta+Enter')
  await field.type('line four')

  await expect(field).toHaveValue('line one\nline two\nline three\nline four')
  await expect(page.locator('#sent')).toHaveText('0')
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

// --- attachments (system_3 #3112) -------------------------------------------
// The acceptance the prop's `undefined` default exists to buy: an unbound mount
// must be indistinguishable from the pre-prop composer. Then, in order of what
// buys what — binding buys the paperclip, entries buy the strip.

const unbound = (page) => page.locator('#attach-unbound')
const emptyBound = (page) => page.locator('#attach-empty')
const filled = (page) => page.locator('#attach-filled')

test('attachments unbound: no paperclip, no strip, no leading container', async ({ page }) => {
  // Absence, not zero-width — an empty flex item would still nudge Send.
  await expect(unbound(page).locator('[data-testid="composer-attach"]')).toHaveCount(0)
  await expect(unbound(page).locator('[data-testid="composer-attachments"]')).toHaveCount(0)
  await expect(unbound(page).locator('.asp-composer__leading')).toHaveCount(0)
  await expect(unbound(page).locator('[data-testid="composer-file-input"]')).toHaveCount(0)
})

test('attachments unbound: Send keeps the pre-prop right-edge alignment', async ({ page }) => {
  const send = await unbound(page).locator('.asp-composer__send').boundingBox()
  const row = await unbound(page).locator('.asp-composer__controls').boundingBox()
  expect(row.x + row.width - (send.x + send.width)).toBeLessThanOrEqual(1)
})

test('bound but EMPTY: the paperclip renders and the strip does not', async ({ page }) => {
  // The distinction the undefined-vs-[] default encodes: binding buys the
  // affordance, entries buy the strip. An empty strip container would be a
  // spacer that lies about state.
  await expect(emptyBound(page).locator('[data-testid="composer-attach"]')).toBeVisible()
  await expect(emptyBound(page).locator('[data-testid="composer-attachments"]')).toHaveCount(0)
})

test('the paperclip is labelled and clears the 44px touch floor', async ({ page }) => {
  const attach = emptyBound(page).locator('[data-testid="composer-attach"]')
  await expect(attach).toHaveAttribute('aria-label', 'Attach file')
  const box = await attach.boundingBox()
  expect(box.height).toBeGreaterThanOrEqual(44)
  expect(box.width).toBeGreaterThanOrEqual(44)
})

test('the paperclip sits IMMEDIATELY LEFT of Send — one control cluster (system_3 #3994)', async ({ page }) => {
  // Operator ask 2026-08-17: attach appears NEXT TO Send, not a full row away
  // in the leading cluster. Left of Send, and adjacent — the gap between the
  // two is the row's own gap token, not the leading container's auto-margin
  // stretch (allow up to 24px so a token change doesn't false-fail).
  const attachBox = await emptyBound(page).locator('[data-testid="composer-attach"]').boundingBox()
  const sendBox = await emptyBound(page).locator('.asp-composer__send').boundingBox()
  expect(attachBox.x + attachBox.width).toBeLessThanOrEqual(sendBox.x)
  expect(sendBox.x - (attachBox.x + attachBox.width)).toBeLessThanOrEqual(24)
})

test('attach bound WITHOUT a leading slot: no leading container in the DOM', async ({ page }) => {
  // The leading container now belongs to the slot alone (#3994) — attach no
  // longer summons it, so an attach-only composer keeps a slot-free left edge.
  await expect(emptyBound(page).locator('.asp-composer__leading')).toHaveCount(0)
})

test('picking a file emits attach with the raw File', async ({ page }) => {
  await expect(page.locator('#attach-events')).toHaveText('0')
  // setInputFiles drives the real hidden <input type="file">, which is why it is
  // visually-hidden rather than display:none.
  await emptyBound(page)
    .locator('[data-testid="composer-file-input"]')
    .setInputFiles({ name: 'picked.png', mimeType: 'image/png', buffer: Buffer.from('x') })
  await expect(page.locator('#attach-events')).toHaveText('1')
  await expect(page.locator('#last-attached')).toHaveText('picked.png')
  // And the parent's array — not the composer's own state — is what grew.
  await expect(emptyBound(page).locator('[data-testid="composer-attachment"]')).toHaveCount(1)
})

test('bound with entries: one chip each, named, with a per-entry remove', async ({ page }) => {
  const chips = filled(page).locator('[data-testid="composer-attachment"]')
  await expect(chips).toHaveCount(2)
  await expect(chips.nth(0)).toContainText('screenshot.png')
  await expect(chips.nth(0)).toContainText('412 KB')
  await expect(chips.nth(1)).toHaveAttribute('data-status', 'uploading')
  // Per-entry accessible name: five identical "Remove" buttons are unusable.
  await expect(filled(page).getByRole('button', { name: 'Remove screenshot.png' })).toBeVisible()
})

test('the chip strip renders ABOVE the field', async ({ page }) => {
  const strip = await filled(page).locator('[data-testid="composer-attachments"]').boundingBox()
  const field = await filled(page).locator('.asp-composer__input').boundingBox()
  expect(strip.y + strip.height).toBeLessThanOrEqual(field.y)
})

test('an entry with no `image` field renders no <img>, no blob:/data: source', async ({ page }) => {
  // Neither `#attach-filled` entry sets `image` — this component never invents
  // a preview on its own. (Whether a caller SHOULD set `image` is the #3641
  // security-ruling gate, tested elsewhere; this fixture proves the absence
  // case stays exactly today's chip.)
  await expect(filled(page).locator('[data-testid="composer-attachments"] img')).toHaveCount(0)
  const sources = await filled(page)
    .locator('[data-testid="composer-attachments"] [src], [data-testid="composer-attachments"] [href]')
    .count()
  expect(sources).toBe(0)
})

// --- thumbnail (system_3 #3641) ----------------------------------------------
const thumbMount = (page) => page.locator('#attach-thumb')

test('an entry with `image` renders a fixed 40x40 thumbnail box', async ({ page }) => {
  const thumb = thumbMount(page).locator('[data-testid="composer-attachment-thumb"]')
  await expect(thumb).toHaveCount(1)
  await expect(thumb.locator('img')).toHaveAttribute('alt', 'screenshot.png')
  const box = await thumb.boundingBox()
  expect(box.width).toBeCloseTo(40, 0)
  expect(box.height).toBeCloseTo(40, 0)
})

test('an entry with no `image` field sits beside a thumbnail entry unchanged', async ({ page }) => {
  const chips = thumbMount(page).locator('[data-testid="composer-attachment"]')
  await expect(chips.nth(1)).toContainText('rows.csv')
  await expect(chips.nth(1).locator('[data-testid="composer-attachment-thumb"]')).toHaveCount(0)
})

test('a failed thumbnail load degrades to the plain chip — no broken box left behind', async ({ page }) => {
  const chips = thumbMount(page).locator('[data-testid="composer-attachment"]')
  const brokenChip = chips.nth(2)
  await expect(brokenChip).toContainText('broken.png')
  // Wait for the deliberately-404ing <img> to fire `error` and for the thumb
  // span to leave the DOM — not merely become invisible.
  await expect(brokenChip.locator('[data-testid="composer-attachment-thumb"]')).toHaveCount(0, {
    timeout: 5000,
  })
  // The name and meta are still there — degrade, not disappearance.
  await expect(brokenChip).toContainText('3 KB')
})

test('✕ removes through the PARENT array and emits the removed entry', async ({ page }) => {
  await expect(page.locator('#remove-events')).toHaveText('0')
  await filled(page).getByRole('button', { name: 'Remove screenshot.png' }).click()
  // The chip is gone because the parent's array shortened — the composer holds
  // no list of its own to mutate.
  await expect(filled(page).locator('[data-testid="composer-attachment"]')).toHaveCount(1)
  await expect(page.locator('#remove-events')).toHaveText('1')
  await expect(page.locator('#last-removed')).toHaveText('screenshot.png')
})

test('pasting a file emits attach; pasting TEXT does not', async ({ page }) => {
  const before = Number(await page.locator('#attach-events').textContent())
  await emptyBound(page).locator('.asp-composer__input').evaluate((el) => {
    const dt = new DataTransfer()
    dt.items.add(new File(['x'], 'pasted.png', { type: 'image/png' }))
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }))
  })
  await expect(page.locator('#attach-events')).toHaveText(String(before + 1))
  await expect(page.locator('#last-attached')).toHaveText('pasted.png')

  // An ordinary text paste must fall through untouched — this handler cannot be
  // allowed to hijack typing into the draft.
  await emptyBound(page).locator('.asp-composer__input').evaluate((el) => {
    const dt = new DataTransfer()
    dt.setData('text/plain', 'just some text')
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }))
  })
  await expect(page.locator('#attach-events')).toHaveText(String(before + 1))
})

test('dropping a file on the composer emits attach', async ({ page }) => {
  const before = Number(await page.locator('#attach-events').textContent())
  await emptyBound(page).locator('.asp-composer').evaluate((el) => {
    const dt = new DataTransfer()
    dt.items.add(new File(['x'], 'dropped.csv', { type: 'text/csv' }))
    el.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }))
  })
  await expect(page.locator('#attach-events')).toHaveText(String(before + 1))
  await expect(page.locator('#last-attached')).toHaveText('dropped.csv')
})

test('send still emits the TEXT only, with attachments bound', async ({ page }) => {
  const field = filled(page).locator('.asp-composer__input')
  await field.fill('with an attachment')
  await filled(page).locator('.asp-composer__send').click()
  await expect(page.locator('#last-sent-text')).toHaveText('with an attachment')
})

test('AspChatArea forwards attachments only when given (opt-in)', async ({ page }) => {
  await expect(
    page.locator('#chat-attach-unbound [data-testid="composer-attach"]')
  ).toHaveCount(0)
  await expect(
    page.locator('#chat-attach-unbound [data-testid="composer-attachments"]')
  ).toHaveCount(0)
})

test('AspChatArea forwards attachments and attach at the bottom position too', async ({ page }) => {
  const chat = page.locator('#chat-attach-bound')
  await expect(chat.locator('[data-testid="composer-attach"]')).toBeVisible()
  await expect(chat.locator('[data-testid="composer-attachment"]')).toHaveCount(1)
  await expect(page.locator('#chat-attach-events')).toHaveText('0')
  await chat
    .locator('[data-testid="composer-file-input"]')
    .setInputFiles({ name: 'via-chat.png', mimeType: 'image/png', buffer: Buffer.from('x') })
  await expect(page.locator('#chat-attach-events')).toHaveText('1')
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
