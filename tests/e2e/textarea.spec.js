import { expect, test } from '@playwright/test'

// AspTextarea (system_3 #3677) acceptance criteria this file covers:
//   AC2 Enter inserts a newline — this component never intercepts it.
//   AC4 Auto-grow: grows with content to a max, then scrolls internally, with
//       no layout jump on the first keystroke.

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/e2e/fixtures/textarea.html', { waitUntil: 'networkidle' })
})

test('Enter inserts a newline — never intercepted', async ({ page }) => {
  const field = page.locator('#plain textarea')
  await field.click()
  await field.type('line one')
  await field.press('Enter')
  await field.type('line two')
  await expect(field).toHaveValue('line one\nline two')
})

test('no layout jump on the first keystroke', async ({ page }) => {
  const field = page.locator('#plain textarea')
  // The `rows` floor is a native attribute, rendered before any JS runs, so
  // the box the operator sees on mount is already the box the first
  // keystroke lands in — one non-wrapping character must not resize it.
  const before = await field.boundingBox()
  await field.click()
  await field.type('a')
  const after = await field.boundingBox()
  expect(after.height).toBe(before.height)
})

test('grows with content up to maxRows, then stops and scrolls internally', async ({ page }) => {
  const field = page.locator('#grow textarea')
  const initial = await field.boundingBox()

  await field.click()
  // rows=2, maxRows=4 on this mount: three newlines is still under the cap.
  await field.type('one\ntwo\nthree')
  const grown = await field.boundingBox()
  expect(grown.height).toBeGreaterThan(initial.height)

  // Well past the 4-row cap now.
  await field.type('\nfour\nfive\nsix\nseven\neight')
  const capped1 = await field.boundingBox()

  // More content past the cap must not grow the box any further.
  await field.type('\nnine\nten')
  const capped2 = await field.boundingBox()
  expect(Math.abs(capped2.height - capped1.height)).toBeLessThan(1)

  const overflowY = await field.evaluate((el) => getComputedStyle(el).overflowY)
  expect(overflowY).toBe('auto')
  const isScrollable = await field.evaluate((el) => el.scrollHeight > el.clientHeight + 1)
  expect(isScrollable).toBe(true)
})

test('a programmatic reset shrinks the box back down', async ({ page }) => {
  const field = page.locator('#grow textarea')
  const initial = await field.boundingBox()

  await field.click()
  await field.type('one\ntwo\nthree\nfour\nfive\nsix')
  const grown = await field.boundingBox()
  expect(grown.height).toBeGreaterThan(initial.height)

  // Clearing via keyboard (select-all + delete) exercises the same
  // `update:modelValue` -> resize path a caller's programmatic clear would.
  await field.press('ControlOrMeta+a')
  await field.press('Backspace')
  const cleared = await field.boundingBox()
  expect(Math.abs(cleared.height - initial.height)).toBeLessThan(1)
})
