import { expect, test } from '@playwright/test'

// system_3 #11585: `color-scheme` follows `data-theme`, from build/tokens.css.

test('data-theme sets color-scheme on the element and everything inside it; no attribute changes nothing', async ({
  page,
}) => {
  await page.goto('/tests/e2e/fixtures/color-scheme.html', { waitUntil: 'networkidle' })

  const scheme = (sel) => page.locator(sel).evaluate((el) => getComputedStyle(el).colorScheme)

  // No attribute: the browser default, untouched.
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe('normal')
  expect(await scheme('[data-case="none"] [data-native="date"]')).toBe('normal')

  // A dark root, and what is inside it.
  expect(await scheme('[data-case="dark"]')).toBe('dark')
  for (const n of ['date', 'file', 'color', 'scroll']) {
    expect(await scheme(`[data-probe="dark"] [data-native="${n}"]`)).toBe('dark')
  }

  // A light island inside the dark root.
  expect(await scheme('[data-case="light-island"]')).toBe('light')
  expect(await scheme('[data-probe="light-island"] [data-native="date"]')).toBe('light')
})

// The risk the task names: `color-scheme: dark` changes the browser's default
// colours for anything a component leaves unstyled. Render every component the
// contrast matrix renders, in dark, and compare each element's computed colours
// with the scheme on (as shipped) against the same page with it forced back to
// `normal`. A component that sets its own colours reads the same both ways.
test('in dark, no design-system component changes colour when color-scheme turns on', async ({ page }) => {
  await page.goto('/tests/e2e/fixtures/matrix.html?theme=dark', { waitUntil: 'networkidle' })
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe('dark')

  // Settle first: a checkbox mounted indeterminate starts a 150ms background
  // transition, and a read at its first frame gives the unchecked colour.
  // `color` is compared only where an element draws text itself; an
  // `appearance: none` input (AspCheckbox's box) computes a different `color`
  // under a dark scheme but paints nothing with it.
  const read = async () => {
    await page.waitForFunction(() => document.getAnimations().length === 0)
    return page.evaluate(() =>
      // `[id^="probe-"]` is the fixture's own harness (a bare "open modal"
      // button), not a component; it is unstyled on purpose and does go dark.
      [...document.querySelectorAll('#app *:not([id^="probe-"])')].map((el, i) => {
        const cs = getComputedStyle(el)
        const drawsText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
        return {
          i,
          tag: el.tagName.toLowerCase(),
          cls: el.className?.baseVal ?? el.className,
          bg: cs.backgroundColor,
          fg: drawsText ? cs.color : null,
          border: cs.borderTopColor,
        }
      })
    )
  }

  const withScheme = await read()
  expect(withScheme.length).toBeGreaterThan(100) // positive control: the matrix rendered

  await page.addStyleTag({ content: '*, :root { color-scheme: normal !important; }' })
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe('normal')
  const without = await read()

  expect(without.length).toBe(withScheme.length)
  const changed = withScheme.filter(
    (a, k) => a.bg !== without[k].bg || a.fg !== without[k].fg || a.border !== without[k].border
  )
  expect(changed, JSON.stringify(changed.slice(0, 10).map((a) => ({ ...a, before: without[a.i] })), null, 1)).toEqual([])
})
