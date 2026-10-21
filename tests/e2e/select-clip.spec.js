import { expect, test } from '@playwright/test'

// system_3 #8402: an AspSelect inside a scroll container (AspDataTable's
// `overflow-x: auto` box) opened its absolutely positioned panel into the
// container's clip, so near the window bottom it flipped up and its options
// sat behind the box's edge — visible on screen as a sliver, unreachable by
// mouse. The panel is now fixed-positioned from the trigger. These tests use
// the hit test a pointer would use: what is actually on top at the option.

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 720 })
  await page.goto('/tests/e2e/fixtures/select-clip.html', { waitUntil: 'networkidle' })
})

const trigger = (page, id) => page.locator(`[data-test="select-${id}"]`)

// Scrolls the window so the trigger's bottom edge sits `fromBottom` px above
// the window's bottom edge.
const placeTrigger = async (page, id, fromBottom) => {
  await trigger(page, id).evaluate((el, gap) => {
    window.scrollBy(0, el.getBoundingClientRect().bottom - (window.innerHeight - gap))
  }, fromBottom)
}

const hitTest = (page, label) =>
  page.getByRole('option', { name: label }).evaluate((o) => {
    const r = o.getBoundingClientRect()
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
    return top === o || o.contains(top)
  })

const panelBox = (page) =>
  page.locator('.select__panel:visible').evaluate((p) => {
    const r = p.getBoundingClientRect()
    return {
      top: r.top,
      bottom: r.bottom,
      left: r.left,
      right: r.right,
      flipped: p.classList.contains('select__panel--flipped'),
    }
  })

test('near the window bottom the panel flips up over the box edge and every option is reachable', async ({
  page,
}) => {
  await placeTrigger(page, 1, 60)
  await trigger(page, 1).click()
  const box = await panelBox(page)
  expect(box.flipped).toBe(true)
  expect(box.top).toBeGreaterThanOrEqual(0)
  for (const label of ['option a', 'option b', 'option f']) {
    expect(await hitTest(page, label), `${label} is on top`).toBe(true)
  }
  await page.getByRole('option', { name: 'option b' }).click()
  await expect(page.locator('#value')).toHaveText('b|null|null')
})

test('opening downward from the last row, the panel extends past the box bottom and stays reachable', async ({
  page,
}) => {
  await trigger(page, 3).evaluate((el) => window.scrollBy(0, el.getBoundingClientRect().top - 100))
  await trigger(page, 3).click()
  const box = await panelBox(page)
  const boxBottom = await page.locator('#box').evaluate((b) => b.getBoundingClientRect().bottom)
  expect(box.flipped).toBe(false)
  expect(box.bottom, 'the panel reaches past the scroll box').toBeGreaterThan(boxBottom)
  expect(await hitTest(page, 'option f')).toBe(true)
})

test('the panel follows its trigger when the page scrolls', async ({ page }) => {
  await trigger(page, 2).evaluate((el) => window.scrollBy(0, el.getBoundingClientRect().top - 150))
  await trigger(page, 2).click()
  const offset = async () => {
    const t = await trigger(page, 2).evaluate((el) => el.getBoundingClientRect().bottom)
    return (await panelBox(page)).top - t
  }
  const before = await offset()
  await page.mouse.wheel(0, 60)
  await expect.poll(offset).toBeCloseTo(before, 0)
})

test('inside a transformed ancestor the panel still sits under its trigger', async ({ page }) => {
  await trigger(page, 't').evaluate((el) =>
    window.scrollBy(0, el.getBoundingClientRect().top - 150)
  )
  await trigger(page, 't').click()
  const t = await trigger(page, 't').evaluate((el) => {
    const r = el.getBoundingClientRect()
    return { left: r.left, bottom: r.bottom }
  })
  const box = await panelBox(page)
  expect(Math.round(box.left)).toBe(Math.round(t.left))
  expect(box.top - t.bottom).toBeGreaterThanOrEqual(0)
  expect(box.top - t.bottom).toBeLessThan(12)
  await page.getByRole('option', { name: 'option d' }).click()
  await expect(page.locator('#value-t')).toHaveText('d')
})

test('with little room on both sides the panel is capped to the window and scrolls inside', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 200 })
  await placeTrigger(page, 2, 70)
  await trigger(page, 2).click()
  const box = await panelBox(page)
  expect(box.top).toBeGreaterThanOrEqual(0)
  expect(box.bottom).toBeLessThanOrEqual(200)
  // Opens on option a; five steps down is option f, scrolled into the capped
  // panel after the active index settles.
  for (let i = 0; i < 5; i += 1) await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('option', { name: 'option f' })).toHaveAttribute(
    'data-active',
    'true'
  )
  await expect
    .poll(() => hitTest(page, 'option f'), {
      message: 'the last option scrolls into the capped panel',
    })
    .toBe(true)
})
