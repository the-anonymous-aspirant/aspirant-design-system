import { expect, test } from '@playwright/test'

// AspBadge `disabled` on the remove × (system_3 #5272).
//
// The defect this closes is not that the behaviour was wrong — it is that the
// prop did not exist. A consumer bound `:disabled` on AspBadge, the component
// declares no such prop and does not set `inheritAttrs: false`, so Vue put the
// attribute on the root `<span>` where it means nothing, and the × stayed live
// through the mutation the caller was guarding against.
//
// So the assertions below are about the OUTCOME a user gets — a × that does not
// fire, is not focusable, and does not look available — rather than about which
// attribute carries it. A rewrite that kept the behaviour keeps these green.

const FIXTURE = '/tests/e2e/fixtures/badge-disabled.html'

test.describe('#5272 AspBadge disabled remove', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FIXTURE, { waitUntil: 'networkidle' })
  })

  test('a disabled × does not emit remove when clicked', async ({ page }) => {
    const button = page.locator('#disabled-chip .badge__remove')
    await expect(button).toHaveCount(1)
    await expect(page.locator('#disabled-events')).toHaveText('0')

    // force:true because Playwright's actionability check would otherwise
    // REFUSE the click on a disabled control and the test would pass without
    // ever testing the guard — the failure mode this file exists to avoid.
    await button.click({ force: true })
    await expect(page.locator('#disabled-events')).toHaveText('0')
  })

  test('positive control: the same click on an enabled × does emit', async ({ page }) => {
    // Without this, the assertion above passes just as well against a fixture
    // that is broken, a selector that matches nothing, or an app that never
    // mounted. The two differ by one prop.
    const button = page.locator('#enabled-chip .badge__remove')
    await expect(page.locator('#enabled-events')).toHaveText('0')
    await button.click({ force: true })
    await expect(page.locator('#enabled-events')).toHaveText('1')
  })

  test('a disabled × is out of the tab order', async ({ page }) => {
    const enabled = page.locator('#enabled-chip .badge__remove')
    const disabled = page.locator('#disabled-chip .badge__remove')

    await enabled.focus()
    await expect(enabled).toBeFocused()

    // A disabled button cannot take focus; asserting the enabled sibling can is
    // what makes this a statement about the state rather than about the page.
    await disabled.focus().catch(() => {})
    await expect(disabled).not.toBeFocused()
  })

  test('a disabled × is visibly non-interactive, and hover does not light it up', async ({
    page,
  }) => {
    const disabled = page.locator('#disabled-chip .badge__remove')
    const enabled = page.locator('#enabled-chip .badge__remove')

    const style = (loc) =>
      loc.evaluate((el) => {
        const cs = getComputedStyle(el)
        return { opacity: Number(cs.opacity), cursor: cs.cursor, background: cs.backgroundColor }
      })

    const off = await style(disabled)
    const on = await style(enabled)
    expect(off.opacity, 'the disabled × is dimmed').toBeLessThan(on.opacity)
    expect(off.cursor).toBe('not-allowed')

    // Positive control FIRST, and it is the one that has to wait: the hover
    // fill arrives through a `transition`, so reading the computed style on the
    // next tick catches it mid-flight or not at all. Poll until it lands.
    const enabledBefore = on.background
    await enabled.hover()
    await expect
      .poll(async () => (await style(enabled)).background, {
        message: 'the enabled × repaints on hover',
      })
      .not.toBe(enabledBefore)

    // Now the assertion this test is for. The disabled × must NOT repaint —
    // and unlike the control above, "not yet" and "never" look the same, so it
    // is checked only after the enabled sibling has proved the transition has
    // had time to complete.
    const before = off.background
    await disabled.hover({ force: true })
    await expect
      .poll(async () => (await style(enabled)).background, {
        message: 'the enabled × has settled back off hover',
      })
      .toBe(enabledBefore)
    expect((await style(disabled)).background, 'hover must not repaint a disabled ×').toBe(before)
  })

  test('the `filter` variant gets the same treatment', async ({ page }) => {
    // `filter` renders its × unconditionally, on a different code path from
    // `chip` + `removable`; the guard has to cover both or half the callers get
    // a prop that silently does nothing — which is the original defect again.
    const button = page.locator('#disabled-filter .badge__remove')
    await expect(button).toBeDisabled()
    await button.click({ force: true })
    await expect(page.locator('#filter-events')).toHaveText('0')
  })

  test('disabled bound false renders exactly what omitting it renders', async ({ page }) => {
    // The additive guarantee: every call site that predates this prop keeps its
    // DOM. Compared as markup, not as a class list, so an attribute added on
    // the way through fails here.
    const omitted = await page.locator('#enabled-chip .badge').innerHTML()
    const explicitFalse = await page.locator('#explicit-false .badge').innerHTML()
    expect(explicitFalse).toBe(omitted)
    await expect(page.locator('#explicit-false .badge__remove')).not.toBeDisabled()
  })

  test('both themes: the disabled treatment survives the dark build', async ({ page }) => {
    // Both themes is the unconditional axis (§3.90). The dimming is an opacity,
    // which is theme-independent by construction — but "by construction" is the
    // claim this checks rather than assumes, since the hover rule it depends on
    // is token-driven and the tokens do flip.
    await page.goto(`${FIXTURE}?theme=dark`, { waitUntil: 'networkidle' })

    const disabled = page.locator('#disabled-chip .badge__remove')
    await expect(disabled).toBeDisabled()

    const cs = await disabled.evaluate((el) => {
      const s = getComputedStyle(el)
      return { opacity: Number(s.opacity), cursor: s.cursor, background: s.backgroundColor }
    })
    expect(cs.opacity).toBeLessThan(1)
    expect(cs.cursor).toBe('not-allowed')

    // Same ordering discipline as the light-theme case: prove the transition
    // has run at all on the enabled sibling before concluding the disabled one
    // did not repaint.
    const enabled = page.locator('#enabled-chip .badge__remove')
    const bg = (loc) => loc.evaluate((el) => getComputedStyle(el).backgroundColor)
    const enabledBefore = await bg(enabled)
    await enabled.hover()
    await expect.poll(() => bg(enabled)).not.toBe(enabledBefore)

    const before = cs.background
    await disabled.hover({ force: true })
    await expect.poll(() => bg(enabled)).toBe(enabledBefore)
    expect(await bg(disabled)).toBe(before)
  })
})
