import { expect, test } from '@playwright/test'

// system_3 #10033 (design_agent's spec and ruling c62075): the label hint "?"
// is a <button> beside the label, never inside it, so a tap opens the hint
// and focuses nothing; a second tap closes it; a tap on the label text still
// focuses the control. Its hit area is 44px wide below 768px and 24px from
// 768px up, from 11px above the label row to the top of the control, and it
// sits under every control, so a control always wins its own tap. The visible
// mark stays 14x14.

const FIELDS = [
  { id: 'input-with-hint', control: '.field__control', focusable: 'input' },
  { id: 'textarea-with-hint', control: '.field__textarea', focusable: 'textarea' },
  { id: 'select-with-hint', control: '.select__trigger', focusable: 'button.select__trigger' },
]

const geometry = (page, id, control) =>
  page.evaluate(
    ({ id, control }) => {
      const root = document.getElementById(id)
      const mark = root.querySelector('[data-asp-label-hint]')
      const row = mark.closest('.field__label-row, .select__label-row')
      const hit = getComputedStyle(mark, '::before')
      const m = mark.getBoundingClientRect()
      const r = row.getBoundingClientRect()
      const c = root.querySelector(control).getBoundingClientRect()
      const label = row.querySelector('label').getBoundingClientRect()
      // ::before is positioned against the row.
      const top = r.top + parseFloat(hit.top)
      return {
        inLabel: !!mark.closest('label'),
        tag: mark.tagName,
        mark: [Math.round(m.width), Math.round(m.height)],
        hit: [parseFloat(hit.width), parseFloat(hit.height)],
        hitTop: top,
        hitBottom: top + parseFloat(hit.height),
        rowTop: r.top,
        controlTop: c.top,
        centre: [m.left + m.width / 2, m.top + m.height / 2],
        labelText: [label.left + 6, label.top + label.height / 2],
      }
    },
    { id, control }
  )

const focusedIsMark = (page) =>
  page.evaluate(
    () => !!document.activeElement && document.activeElement.hasAttribute('data-asp-label-hint')
  )
const isFocused = (page, sel) =>
  page
    .locator(sel)
    .first()
    .evaluate((el) => el === document.activeElement || el.contains(document.activeElement))

for (const [width, hitWidth] of [
  [390, 44],
  [1440, 24],
]) {
  test.describe(`at ${width}px`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/tests/e2e/fixtures/label-hint.html', { waitUntil: 'networkidle' })
    })

    for (const f of FIELDS) {
      test(`${f.id}: a <button> beside the label; mark 14x14; hit area ${hitWidth} wide, 11px above the row down to the control`, async ({
        page,
      }) => {
        const g = await geometry(page, f.id, f.control)
        expect(g.inLabel, 'the mark is not inside the <label>').toBe(false)
        expect(g.tag).toBe('BUTTON')
        expect(g.mark).toEqual([14, 14])
        expect(g.hit[0]).toBe(hitWidth)
        expect(
          Math.abs(g.rowTop - 11 - g.hitTop),
          'reaches 11px above the row'
        ).toBeLessThanOrEqual(0.5)
        expect(Math.abs(g.controlTop - g.hitBottom), 'ends at the control top').toBeLessThanOrEqual(
          0.5
        )
        const h = g.hit[1]
        expect(h).toBeGreaterThanOrEqual(22 + 10)
        expect(h).toBeLessThanOrEqual(33.5)
        // WCAG 2.5.8 spacing exception: a 24px circle on the mark's centre
        // ends above the control (c62075).
        expect(
          g.centre[1] + 12,
          '2.5.8: the 24px circle stops above the control'
        ).toBeLessThanOrEqual(g.controlTop)
      })

      test(`${f.id}: a tap opens the hint and focuses nothing in the field; a second tap closes it`, async ({
        page,
      }) => {
        const g = await geometry(page, f.id, f.control)
        // Off the 14px circle but inside the hit area.
        const dx = width < 768 ? 15 : 10
        await page.mouse.click(g.centre[0] + dx, g.centre[1])
        await expect(page.getByRole('tooltip')).toBeVisible()
        expect(await focusedIsMark(page), 'the mark, not the field, has focus').toBe(true)
        expect(await isFocused(page, `#${f.id} ${f.focusable}`)).toBe(false)
        await expect(page.locator(`#${f.id} [data-asp-label-hint]`)).toHaveAttribute(
          'aria-expanded',
          'true'
        )
        await page.mouse.click(g.centre[0], g.centre[1])
        await expect(page.getByRole('tooltip')).toHaveCount(0)
        await expect(page.locator(`#${f.id} [data-asp-label-hint]`)).toHaveAttribute(
          'aria-expanded',
          'false'
        )
        expect(await isFocused(page, `#${f.id} ${f.focusable}`)).toBe(false)
      })

      test(`${f.id}: a tap on the label text, or on the field, focuses the field`, async ({
        page,
      }) => {
        const g = await geometry(page, f.id, f.control)
        await page.mouse.click(g.labelText[0], g.labelText[1])
        expect(await isFocused(page, `#${f.id} ${f.focusable}`), 'label text').toBe(true)
        await page.mouse.click(5, 880)
        await page.locator(`#${f.id} ${f.focusable}`).first().click()
        expect(await isFocused(page, `#${f.id} ${f.focusable}`), 'the field').toBe(true)
      })
    }

    test('with no gap between fields, the upper control wins its bottom edge; the lower "?" still opens', async ({
      page,
    }) => {
      const upper = await page.locator('#stacked-upper .field__control').boundingBox()
      // The upper control's bottom 2px, under the lower field's upward reach.
      const lowerMark = await geometry(page, 'stacked-lower', '.field__control')
      expect(lowerMark.hitTop, 'the reach does overlap the upper control here').toBeLessThan(
        upper.y + upper.height
      )
      const x = lowerMark.centre[0]
      const y = upper.y + upper.height - 1
      // The point belongs to the upper control, not to the lower hint's reach.
      const owner = await page.evaluate(
        ([x, y]) => {
          const el = document.elementFromPoint(x, y)
          return {
            inUpperControl: !!el.closest('#stacked-upper .field__control'),
            isHint: !!el.closest('[data-asp-label-hint]'),
          }
        },
        [x, y]
      )
      expect(owner, 'the upper control wins its bottom edge').toEqual({
        inUpperControl: true,
        isHint: false,
      })
      await page.mouse.click(x, y)
      await expect(page.getByRole('tooltip')).toHaveCount(0)
      await page.mouse.click(lowerMark.centre[0], lowerMark.centre[1])
      await expect(page.getByRole('tooltip')).toHaveText('The lower field.')
    })

    // The chip is placed from its anchor's box: an anchor with no box put it
    // at the page's top-left corner.
    test('the open hint sits next to its mark', async ({ page }) => {
      for (const f of FIELDS) {
        const mark = page.locator(`#${f.id} [data-asp-label-hint]`)
        const m = await mark.boundingBox()
        await page.mouse.click(m.x + m.width / 2, m.y + m.height / 2)
        const tip = await page.getByRole('tooltip').boundingBox()
        // Above the mark, or below it where there is no room above (AspTooltip
        // flips); either way next to it, and across from it.
        const gapV = Math.min(
          Math.abs(tip.y + tip.height - m.y),
          Math.abs(tip.y - (m.y + m.height))
        )
        expect(gapV, `${f.id}: the chip sits next to its mark`).toBeLessThanOrEqual(16)
        expect(
          tip.x <= m.x + m.width && tip.x + tip.width >= m.x,
          `${f.id}: the chip spans the mark across`
        ).toBe(true)
        await page.mouse.click(5, 880)
        // Let the closing chip's fade finish before the next one opens.
        await expect(page.getByRole('tooltip')).toHaveCount(0)
      }
    })

    test('a tap outside and Escape close an open hint', async ({ page }) => {
      const g = await geometry(page, 'input-with-hint', '.field__control')
      await page.mouse.click(g.centre[0], g.centre[1])
      await expect(page.getByRole('tooltip')).toBeVisible()
      await page.mouse.click(5, 880)
      await expect(page.getByRole('tooltip')).toHaveCount(0)
      await page.mouse.click(g.centre[0], g.centre[1])
      await expect(page.getByRole('tooltip')).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(page.getByRole('tooltip')).toHaveCount(0)
    })
  })
}
