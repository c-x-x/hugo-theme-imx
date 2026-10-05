const { test, expect } = require('@playwright/test');

for (const path of ['/', '/posts/', '/posts/regression-long-article/', '/about/', '/missing-regression-page/']) {
  test(`global loader releases usable content on ${path}`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).not.toHaveClass(/imx-page-loading/);
    await expect(page.locator('[data-page-loader]')).toHaveCount(0);
    await expect(page.locator('[data-page-content]')).not.toHaveAttribute('inert', '');
    await expect(page.locator('main')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 375, height: 812 }]) {
  test(`waits for a first-screen image, then starts home motion at ${viewport.width}px`, async ({ page }) => {
  await page.setViewportSize(viewport);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route(/\/images\/imx\/default-avatar\.jpg(?:\?|$)/, async route => {
    await gate;
    await route.continue();
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  await expect(page.locator('[data-page-loader]')).toBeVisible();
  await expect(page.locator('[data-page-content]')).toHaveAttribute('inert', '');
  await expect(page.locator('main')).toBeHidden();
  await expect(page.locator('.imx-home-entry-content')).toHaveCSS('animation-name', 'none');
  await page.screenshot({ path: `/tmp/imx-page-loader-light-${viewport.width}.png` });
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  await page.screenshot({ path: `/tmp/imx-page-loader-dark-${viewport.width}.png` });
  release();
  await expect(page.locator('[data-page-loader]')).toHaveCount(0);
  await expect(page.locator('.imx-home-entry-content')).toHaveCSS('animation-name', 'imxHomeEntryContentRise');
  await expect(page.locator('[data-home-typed]')).toHaveText(await page.locator('[data-home-typed]').getAttribute('aria-label'));
  await page.screenshot({ path: `/tmp/imx-page-loader-ready-${viewport.width}.png` });
});
}

test('a stalled image and unavailable main bundle cannot trap the page', async ({ page }) => {
  await page.clock.install();
  await page.route('**/js/main*.js', route => route.abort());
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route(/\/images\/imx\/default-avatar\.jpg(?:\?|$)/, async route => {
    await gate;
    await route.abort();
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveClass(/imx-page-loading/);
  await page.clock.runFor(6400);
  await expect(page.locator('[data-page-loader]')).toHaveCount(0);
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('[data-page-content]')).not.toHaveAttribute('inert', '');
  release();
});

test('reduced motion uses a static loading mark', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route(/\/images\/imx\/default-avatar\.jpg(?:\?|$)/, async route => {
    await gate;
    await route.continue();
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.imx-page-loader-mark span').first()).toHaveCSS('animation-name', 'none');
  release();
  await expect(page.locator('[data-page-loader]')).toHaveCount(0);
});

test('waits for the selected font before revealing content', async ({ page }) => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route(/\/fonts\/imx\/inter-variable\.[^/]+\.woff2/, async route => {
    await gate;
    await route.continue();
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  await expect(page.locator('html')).toHaveClass(/imx-page-loading/);
  release();
  await expect(page.locator('html')).not.toHaveClass(/imx-page-loading/);
  expect(await page.evaluate(() => document.fonts.status)).toBe('loaded');
});

test('without JavaScript the page stays visible', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(baseURL);
  await expect(page.locator('[data-page-loader]')).toBeHidden();
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('[data-page-content]')).not.toHaveAttribute('inert', '');
  await context.close();
});
