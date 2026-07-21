const { defineConfig } = require('@playwright/test');

const externalServer = process.env.PLAYWRIGHT_EXTERNAL_SERVER === '1';
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:1417';
const giscusBaseURL = process.env.PLAYWRIGHT_GISCUS_BASE_URL || 'http://127.0.0.1:1418';

const webServers = externalServer ? undefined : [
  {
    command: 'hugo server --source exampleSite --destination /tmp/hugo-theme-imx-playwright-public --bind 127.0.0.1 --port 1417 --disableFastRender --cacheDir /tmp/hugo-theme-imx-playwright-cache --noBuildLock',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  },
  {
    command: 'HUGO_PARAMS_GISCUS_ENABLED=true hugo server --source exampleSite --destination /tmp/hugo-theme-imx-playwright-giscus-public --bind 127.0.0.1 --port 1418 --disableFastRender --cacheDir /tmp/hugo-theme-imx-playwright-giscus-cache --noBuildLock',
    url: giscusBaseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
];

module.exports = defineConfig({
  testDir: './tests',
  outputDir: 'test-results',
  snapshotPathTemplate: '{testDir}/snapshots/{arg}{ext}',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['line'], ['html', { outputFolder: 'playwright-report', open: 'never' }]]
    : 'line',
  use: {
    baseURL,
    browserName: process.env.PLAYWRIGHT_BROWSER || 'chromium',
    colorScheme: 'light',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure'
  },
  webServer: webServers
});
