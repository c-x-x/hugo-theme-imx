const { test, expect } = require('@playwright/test');

async function clickLogo(page, count = 3) {
  for (let index = 0; index < count; index++) {
    await page.locator('.navbar-logo-wrap').click();
  }
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 375, height: 812 }]) {
  test(`hidden font gesture persists and restores at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const fonts = [];
    page.on('request', request => {
      if (request.url().includes('/wenkai-')) fonts.push(request.url());
    });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    expect(fonts).toEqual([]);
    // A normal click must not reload the home page and discard the gesture.
    await page.evaluate(() => { window.fontGestureDocument = true; });
    await clickLogo(page, 2);
    await expect(page.locator('html')).toHaveAttribute('data-font', 'default');
    await clickLogo(page, 1);
    await expect(page.locator('html')).toHaveAttribute('data-font', 'wenkai');
    expect(await page.evaluate(() => window.fontGestureDocument)).toBe(true);
    await page.evaluate(() => document.fonts.ready);
    expect(fonts.length).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.fonts.check('16px "IMX WenKai"', '首页中文'))).toBe(true);
    await page.goto('/posts/regression-long-article/');
    await expect(page.locator('html')).toHaveAttribute('data-font', 'wenkai');
    await expect(page.locator('.article-content')).toHaveCSS('font-family', /IMX WenKai/);
    await expect(page.locator('pre code').first()).not.toHaveCSS('font-family', /IMX WenKai/);
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    // Outside home, the logo is still an ordinary home link.
    await clickLogo(page, 1);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('body')).toHaveClass(/is-home/);
    await clickLogo(page);
    await expect(page.locator('html')).toHaveAttribute('data-font', 'default');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-font', 'default');
  });
}

test('font gesture expires after five seconds and ignores modified clicks', async ({ page }) => {
  await page.goto('/');
  await page.clock.install();
  await clickLogo(page, 2);
  await page.clock.runFor(5100);
  await clickLogo(page, 1);
  await expect(page.locator('html')).toHaveAttribute('data-font', 'default');
  // Avoid opening a real tab while checking the handler leaves modified links native.
  expect(await page.locator('.navbar-logo-wrap').evaluate(logo => {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
    let preventedByGesture;
    logo.closest('a').addEventListener('click', click => {
      preventedByGesture = click.defaultPrevented;
      click.preventDefault();
    }, { once: true });
    logo.dispatchEvent(event);
    return preventedByGesture;
  })).toBe(false);
  await clickLogo(page, 1);
  await expect(page.locator('html')).toHaveAttribute('data-font', 'default');
  await clickLogo(page, 1);
  await expect(page.locator('html')).toHaveAttribute('data-font', 'wenkai');
});

test('font switch still works when browser storage is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('Storage disabled'); };
    Storage.prototype.setItem = () => { throw new Error('Storage disabled'); };
  });
  await page.goto('/');
  await clickLogo(page);
  await expect(page.locator('html')).toHaveAttribute('data-font', 'wenkai');
  await clickLogo(page);
  await expect(page.locator('html')).toHaveAttribute('data-font', 'default');
});
