import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT ?? 3000);
export const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './tests/ui/specs',
  outputDir: './test-results/ui',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  // Percentage scales with whatever runner size CI gives us, rather than
  // pinning a number that is wrong on half of them.
  workers: process.env.CI ? '50%' : undefined,
  timeout: 30_000,
  expect: { timeout: 7_000 },

  reporter: process.env.CI
    ? [['html', { outputFolder: 'playwright-report/ui', open: 'never' }], ['github']]
    : [['html', { outputFolder: 'playwright-report/ui', open: 'never' }], ['list']],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Traces already carry a DOM snapshot per step, so video would duplicate
    // that at a cost on every test.
    video: 'off',
    // Bounded so a hung action fails fast with a useful message instead of
    // consuming the whole test timeout.
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    // The app formats money and sorts titles with Intl. Pinning locale and
    // timezone keeps those assertions independent of the machine running them.
    locale: 'en-US',
    timezoneId: 'UTC',
  },

  // chromium runs the whole suite; firefox and webkit run the @core subset so
  // cross-browser coverage stays honest without tripling CI time.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, grep: /@core/ },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, grep: /@core/ },
  ],

  webServer: {
    command: 'npm start',
    url: `${BASE_URL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    // Surfaced in CI logs, so a server that fails to boot says why.
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
