import { expect, test } from '@playwright/test'

// §3.95: the caption treatment of the field-control family (AspInput,
// AspTextarea, AspSelect) is ONE design-of-record fact. Nothing in the DS
// compared the three before this test, which is how AspSelect's `.select__label`
// diverged to --text-xs silently while the other two rendered --text-sm /
// weight 500 / line-height 1.3. This is the durable anti-drift mechanism: a
// fourth control that mismatches, or a regression on an existing one, turns
// this red rather than surfacing as a form with two caption sizes a human has
// to notice. (Same discipline as textarea/input imperative-parity.)

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/e2e/fixtures/caption-parity.html', { waitUntil: 'networkidle' })
})

const caption = (page, wrapperId) => page.locator(`#${wrapperId} label`)

const captionType = (loc) =>
  loc.evaluate((el) => {
    const cs = getComputedStyle(el)
    return { fontSize: cs.fontSize, fontWeight: cs.fontWeight, lineHeight: cs.lineHeight }
  })

test('AspInput, AspTextarea and AspSelect render an identical caption treatment', async ({
  page,
}) => {
  // Locator.evaluate throws if the selector matches nothing, so a wrong
  // fixture id fails loudly here rather than comparing two empty reads as equal.
  const input = await captionType(caption(page, 'input-field'))
  const textarea = await captionType(caption(page, 'textarea-field'))
  const select = await captionType(caption(page, 'select-field'))

  // Positive control: the resolved values are real, not the empty strings a
  // silently-missing element would yield — so the equality below is a claim
  // about the type scale, not about three nothings matching.
  expect(input.fontSize).toMatch(/^\d+(\.\d+)?px$/)
  expect(input.fontWeight).toBe('500')
  expect(input.lineHeight).toMatch(/px$/)

  expect(textarea).toEqual(input)
  expect(select).toEqual(input)
})
