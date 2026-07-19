import { expect, test } from '@playwright/test'

// The acceptance criterion for this component is "comments + transcript
// verifiably merged in one stream" (#2381, fixing #2348). "Verifiably" is the
// operative word: a stream that renders in the right order is not proof the
// merge happened, because a fixture whose comments all sort last would look
// identical under concatenation. So the assertions below read the ORDER and the
// per-row SOURCE together.

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/e2e/fixtures/chat.html', { waitUntil: 'networkidle' })
})

const bubbles = (page) => page.locator('.chat-bubble')
const bodies = (page) => page.locator('.chat-bubble__content')

test('interleaves comments and transcript in creation order', async ({ page }) => {
  // The fixture alternates sources by timestamp on purpose. If the component
  // concatenated, this would read transcript×4 then comment×3.
  await expect(bodies(page)).toHaveText([
    'transcript one',
    'comment one',
    'transcript two',
    'comment two',
    // m3 and c3 share a created_at; the tie-break is source name, so the
    // comment lands first. Arbitrary but deterministic is the requirement --
    // what matters is that it does not vary between renders.
    'comment tied',
    'transcript three',
    'transcript undated',
  ])
})

test('the merged stream really contains both sources', async ({ page }) => {
  // Reading data-source is what makes the previous test proof rather than
  // coincidence: it shows the alternation is two origins, not one list.
  const sources = await bubbles(page).evaluateAll((els) => els.map((e) => e.dataset.source))
  expect(sources).toEqual([
    'transcript',
    'comment',
    'transcript',
    'comment',
    'comment',
    'transcript',
    'transcript',
  ])
})

test('an entry with no created_at sorts last instead of to 1970', async ({ page }) => {
  // Date.parse(null) is NaN, and NaN makes every comparison false — which does
  // not throw, it just silently scrambles the order. Asserting the undated row
  // is last is what pins that.
  await expect(bodies(page).last()).toHaveText('transcript undated')
})

test('equal timestamps keep a stable order across re-renders', async ({ page }) => {
  // m3 and c3 share a created_at. Without a tie-break the pair can swap between
  // renders, which reads to an operator as messages reordering themselves.
  const before = await bubbles(page).evaluateAll((els) => els.map((e) => e.dataset.source))
  await page.locator('#drive-newest').click()
  await page.locator('#drive-newest').click()
  const after = await bubbles(page).evaluateAll((els) => els.map((e) => e.dataset.source))
  expect(after).toEqual(before.slice().reverse())
})

test('order=newest-first reverses the merged stream, not one source', async ({ page }) => {
  await page.locator('#drive-newest').click()
  await expect(bodies(page)).toHaveText([
    'transcript undated',
    'transcript three',
    'comment tied',
    'comment two',
    'transcript two',
    'comment one',
    'transcript one',
  ])
})

test('own messages sit right and system-produced ones sit left', async ({ page }) => {
  // The §3.12 ruling. Side is derived from kind inside the component, so a
  // caller cannot render an agent message as the operator's.
  await expect(page.locator('.chat-bubble--own')).toHaveCount(3)
  await expect(page.locator('.chat-bubble--own[data-kind="operator"]')).toHaveCount(2)
  await expect(page.locator('.chat-bubble--own[data-kind="user"]')).toHaveCount(1)
  await expect(page.locator('.chat-bubble--inbound')).toHaveCount(4)
  for (const kind of ['agent', 'tool', 'system']) {
    await expect(page.locator(`.chat-bubble--inbound[data-kind="${kind}"]`)).toHaveCount(
      kind === 'agent' ? 2 : 1
    )
  }
})

test('filters hide kinds without disturbing the merge', async ({ page }) => {
  await page.locator('#drive-filter').click()
  await expect(bodies(page)).toHaveText(['transcript one', 'transcript three'])
})

test('a stream emptied by filters says so, rather than claiming there are no messages', async ({
  page,
}) => {
  // "No messages" in front of an active filter reads as a bug in the view.
  await page.locator('#drive-filter-none').click()
  await expect(page.locator('.empty-state')).toBeVisible()
  await expect(page.locator('.empty-state')).toContainText('No matching messages')
})

test('the composer sends and the stream is announced politely', async ({ page }) => {
  const input = page.locator('.chat-area__composer input')
  await input.fill('hello from the operator')
  await page.locator('.chat-area__composer button[type="submit"]').click()
  await expect(page.locator('#sent')).toHaveText('hello from the operator')

  // A message arriving while the operator is elsewhere on the page has to be
  // announced — but must not interrupt, hence polite rather than assertive.
  const stream = page.locator('.chat-area__stream')
  await expect(stream).toHaveAttribute('aria-live', 'polite')
  await expect(stream).toHaveRole('log')
})

test('send is refused when the composer holds only whitespace', async ({ page }) => {
  await page.locator('.chat-area__composer input').fill('   ')
  await expect(page.locator('.chat-area__composer button[type="submit"]')).toBeDisabled()
})
