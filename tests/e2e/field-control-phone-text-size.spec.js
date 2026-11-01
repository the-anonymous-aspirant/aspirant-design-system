import { expect, test } from '@playwright/test'

// §3.122 P9 / §1.9 — operator ruling c57324 (hold c57011 item 2 on #9221):
// below 768px every DS text field, select and textarea's TYPED/SELECTED text
// renders at --text-base (16px, phone-first default for a fairphone target);
// 768px and up keep --text-sm (13.6px). The caption family (label/hint/error)
// is unaffected — only the control's own text changes. Phone-first per §3.122
// P1: the base rule is unconditional, the `min-width: 768px` media query is
// the only override.

const PHONE = { width: 390, height: 844 }
const DESKTOP = { width: 1024, height: 800 }
const TEXT_BASE = '16px'
const TEXT_SM = '13.6px'

const fontSize = (locator) => locator.evaluate((el) => getComputedStyle(el).fontSize)

test.beforeEach(async ({ page }) => {
  await page.setViewportSize(PHONE)
  await page.goto('/tests/e2e/fixtures/phone-text-size.html', { waitUntil: 'networkidle' })
})

test('AspInput, AspSelect and AspTextarea control text is --text-base (16px) below 768px', async ({
  page,
}) => {
  await expect(fontSize(page.locator('#input-hint input'))).resolves.toBe(TEXT_BASE)
  await expect(fontSize(page.locator('#textarea-hint textarea'))).resolves.toBe(TEXT_BASE)
  await expect(fontSize(page.locator('#select-field .select__trigger'))).resolves.toBe(TEXT_BASE)

  await page.locator('#select-field .select__trigger').click()
  await expect(fontSize(page.locator('#select-field .select__option').first())).resolves.toBe(
    TEXT_BASE
  )
})

test('AspInput, AspSelect and AspTextarea control text is --text-sm (13.6px) from 768px up', async ({
  page,
}) => {
  await page.setViewportSize(DESKTOP)

  await expect(fontSize(page.locator('#input-hint input'))).resolves.toBe(TEXT_SM)
  await expect(fontSize(page.locator('#textarea-hint textarea'))).resolves.toBe(TEXT_SM)
  await expect(fontSize(page.locator('#select-field .select__trigger'))).resolves.toBe(TEXT_SM)

  await page.locator('#select-field .select__trigger').click()
  await expect(fontSize(page.locator('#select-field .select__option').first())).resolves.toBe(
    TEXT_SM
  )
})

// Positive control: these read real resolved values, not three empty
// strings matching by accident of a missing element (same discipline as
// caption-parity.spec.js).
const CAPTIONS = [
  { control: 'input-hint', caption: 'label' },
  { control: 'input-hint', caption: 'hint' },
  { control: 'input-error', caption: 'error' },
  { control: 'textarea-hint', caption: 'label' },
  { control: 'textarea-hint', caption: 'hint' },
  { control: 'textarea-error', caption: 'error' },
  { control: 'select-field', caption: 'label' },
]

const captionSelector = (caption) => (caption === 'label' ? 'label' : `.field__message--${caption}`)

test('label, hint and error font sizes do not change across the 768px breakpoint', async ({
  page,
}) => {
  const atPhone = {}
  for (const { control, caption } of CAPTIONS) {
    atPhone[`${control}/${caption}`] = await fontSize(
      page.locator(`#${control} ${captionSelector(caption)}`)
    )
  }
  // Positive control: every reading is a real resolved px value, not an
  // empty string a missing selector would yield by accident.
  for (const size of Object.values(atPhone)) expect(size).toMatch(/^\d+(\.\d+)?px$/)

  await page.setViewportSize(DESKTOP)
  await page.reload({ waitUntil: 'networkidle' })

  for (const { control, caption } of CAPTIONS) {
    const key = `${control}/${caption}`
    const atDesktop = await fontSize(page.locator(`#${control} ${captionSelector(caption)}`))
    expect(atDesktop, `${key} changed across the breakpoint`).toBe(atPhone[key])
    // None of these is the control's own --text-base — this change touches
    // only the typed/selected text, never the caption family.
    expect(atDesktop).not.toBe(TEXT_BASE)
  }
})
