import { defineConfig, devices } from '@playwright/test'

/**
 * Contrast regression suite for the component library (#2420).
 *
 * Guards the defect family found in #2415: components that assert an absolute
 * colour instead of deriving it from their surface. AspCard's surface is DARK
 * even in the light theme, so `--surface-card` and the light-theme body ink
 * were the identical hex and table text rendered invisible at 1:1.
 *
 * Runs against `vite dev` rather than a preview build: the fixtures import
 * `src/` directly, so the suite tests the components as authored.
 *
 * Mirrors aspirant-client's harness (same script names, same Playwright line)
 * so the two repos do not drift into different conventions. It is .js rather
 * than .ts only because this repo is JavaScript throughout.
 */
export default defineConfig({
  testDir: './tests/e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Contrast is deterministic; a single worker keeps the dev server predictable.
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:5174',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // tokens first: build/tokens.css is generated and gitignored, so a clean
    // checkout has nothing to measure against.
    //
    // Invoked via node_modules/.bin rather than `npm run` deliberately. The
    // package manager is not guaranteed on PATH in every environment this runs
    // in (the aspirant dev box has node and corepack but no npm or npx), and a
    // harness that cannot run where the work happens is not a harness. These
    // binaries are installed by any package manager, so this is portable.
    command:
      'node_modules/.bin/style-dictionary build --config style-dictionary.config.js && ' +
      'node_modules/.bin/vite --host 127.0.0.1 --port 5174 --strictPort',
    url: 'http://127.0.0.1:5174/tests/e2e/fixtures/matrix.html',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
