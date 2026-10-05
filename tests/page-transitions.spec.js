const { test, expect } = require('@playwright/test');

// Playwright disables RenderDocument by default. Restore native browser
// features for cross-document captures; keep PaintHolding disabled.
test.use({ channel: 'chromium', launchOptions: { args: ['--disable-features=PaintHolding'] } });

test.beforeEach(async ({ page }) => {
  // Ensure the target HTML passes through the probe route. Speculation prefetch
  // can otherwise cache the uninstrumented document outside route interception.
  await page.addInitScript(() => Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true } }));
});

async function ready(page, path = '/') {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-imx-page-state', 'ready');
}

test('native page transitions run on normal internal navigation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.route('**/tags/', async route => {
    const response = await route.fetch();
    const body = (await response.text()).replace('<head>', `<head><script>
      window.transitionObserved = false;
      addEventListener('pagereveal', event => { window.transitionObserved = Boolean(event.viewTransition); });
    </script>`);
    await route.fulfill({ response, body });
  });
  await ready(page);
  await expect(page.locator('[data-page-loader]')).toHaveCount(0);
  await page.locator('.navbar-menu a[href="/tags/"]').click();
  await expect(page).toHaveURL(/\/tags\/$/);
  await expect(page.locator('html')).toHaveAttribute('data-imx-page-state', 'ready');

  await expect.poll(() => page.evaluate(() => window.transitionObserved)).toBe(true);
  await page.screenshot({ path: '/tmp/imx-smart-navigation-tags.png' });
});

test('reduced motion keeps internal navigation free of page transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/tags/', async route => {
    const response = await route.fetch();
    const body = (await response.text()).replace('<head>', `<head><script>
      window.transitionObserved = null;
      addEventListener('pagereveal', event => { window.transitionObserved = Boolean(event.viewTransition); });
    </script>`);
    await route.fulfill({ response, body });
  });
  await ready(page);
  await expect(page.locator('[data-page-loader]')).toHaveCount(0);
  await page.locator('.navbar-menu a[href="/tags/"]').click();
  await expect(page).toHaveURL(/\/tags\/$/);
  await expect.poll(() => page.evaluate(() => window.transitionObserved)).toBe(false);
  await expect(page.locator('main')).toBeVisible();
});

test('cold navigation skips the native transition without an unhandled rejection', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/tags/', async route => {
    const response = await route.fetch();
    const body = (await response.text()).replace('<head>', `<head><script>
      addEventListener('pagereveal', event => {
        window.coldTransitionObserved = Boolean(event.viewTransition && document.documentElement.classList.contains('imx-page-loading'));
      });
    </script>`);
    await route.fulfill({ response, body });
  });
  await ready(page);
  await expect(page.locator('[data-page-loader]')).toHaveCount(0);
  await page.evaluate(() => sessionStorage.removeItem('imxSiteReady'));
  await page.locator('.navbar-menu a[href="/tags/"]').click();
  await expect(page).toHaveURL(/\/tags\/$/);
  await expect.poll(() => page.evaluate(() => window.coldTransitionObserved)).toBe(true);
  await expect(page.locator('html')).toHaveAttribute('data-imx-page-state', 'ready');
  await expect(page.locator('main')).toBeVisible();
  expect(errors).toEqual([]);
});
