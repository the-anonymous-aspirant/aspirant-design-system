import { expect, test } from '@playwright/test'

// #3007 regression: rendered order must be a faithful function of PAYLOAD
// order -- identity in chronological, exact reverse in newest-first -- for
// turns the sort key cannot distinguish. The backend orders the transcript at
// full microsecond precision; Date.parse carries only milliseconds, so any
// explicit tie-break (id lexicography, source name) re-decides same-millisecond
// pairs from information the backend did not sort by. That rendered
// same-displayed-minute turns inverted: the operator's message above an
// earlier turn, with both stamps reading `16:38`.
//
// The fixture's entries all share one displayed minute on purpose -- the
// visible timestamps cannot carry the order, so these assertions fail on any
// re-decided tie and pass only when payload order survives the render.

const PAYLOAD_BODIES = [
  'payload 1 manager prose',
  'payload 2 operator comment',
  'payload 3 older same-ms comment',
  'payload 4 newer same-ms comment',
  'payload 5 comment before prose',
  'payload 6 same-ms prose',
  'payload 7 undated first',
  'payload 8 undated second',
]

const bodies = (page) => page.locator('.chat-bubble__content')

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/e2e/fixtures/chat-order.html', { waitUntil: 'networkidle' })
})

test('chronological render preserves payload order for same-minute turns', async ({ page }) => {
  // Covers the repro pair (prose + comment 761 ms apart), two same-millisecond
  // pairs whose id/source lexicography disagrees with payload order, and the
  // undated tail. Any tie-break regression inverts at least one pair.
  await expect(bodies(page)).toHaveText(PAYLOAD_BODIES)
})

test('newest-first render is the exact reverse of payload order', async ({ page }) => {
  // Newest-first must be the reversed payload, never a re-sorted variant of
  // it: the repro pair renders operator-then-manager here precisely because
  // the payload says the operator turn is newer.
  await page.locator('#drive-newest').click()
  await expect(bodies(page)).toHaveText(PAYLOAD_BODIES.slice().reverse())
})

test('flipping the order back restores payload order', async ({ page }) => {
  // Sort is client-side over the fetched window; a round-trip through
  // newest-first must not permute equal-key turns.
  await page.locator('#drive-newest').click()
  await page.locator('#drive-oldest').click()
  await expect(bodies(page)).toHaveText(PAYLOAD_BODIES)
})
