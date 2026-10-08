const { test, expect } = require('@playwright/test');

async function clickAvatar(page, count = 3) {
  for (let index = 0; index < count; index++) {
    await page.locator('[data-font-switch-avatar]').click();
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
    await clickAvatar(page, 2);
    await expect(page.locator('html')).toHaveAttribute('data-font', 'default');
    await clickAvatar(page, 1);
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
    await page.locator('.navbar-logo-wrap').click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('body')).toHaveClass(/is-home/);
    await clickAvatar(page);
    await expect(page.locator('html')).toHaveAttribute('data-font', 'default');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-font', 'default');
  });
}

test('font gesture expires after five seconds and ignores modified clicks', async ({ page }) => {
  await page.goto('/');
  await page.clock.install();
  await clickAvatar(page, 2);
  await page.clock.runFor(5100);
  await clickAvatar(page, 1);
  await expect(page.locator('html')).toHaveAttribute('data-font', 'default');
  // Modified clicks must not count toward the avatar gesture.
  expect(await page.locator('[data-font-switch-avatar]').evaluate(logo => {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
    let preventedByGesture;
    logo.addEventListener('click', click => {
      preventedByGesture = click.defaultPrevented;
      click.preventDefault();
    }, { once: true });
    logo.dispatchEvent(event);
    return preventedByGesture;
  })).toBe(false);
  await clickAvatar(page, 1);
  await expect(page.locator('html')).toHaveAttribute('data-font', 'default');
  await clickAvatar(page, 1);
  await expect(page.locator('html')).toHaveAttribute('data-font', 'wenkai');
});

test('font switch still works when browser storage is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('Storage disabled'); };
    Storage.prototype.setItem = () => { throw new Error('Storage disabled'); };
  });
  await page.goto('/');
  await clickAvatar(page);
  await expect(page.locator('html')).toHaveAttribute('data-font', 'wenkai');
  await clickAvatar(page);
  await expect(page.locator('html')).toHaveAttribute('data-font', 'default');
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 375, height: 812 }]) {
  test(`avatar celebration is full-screen, short-lived and non-blocking at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-imx-page-state', 'ready');
    await clickAvatar(page);
    const confetti = page.locator('.font-confetti');
    await expect(confetti).toHaveCount(1);
    await expect(confetti).toHaveCSS('pointer-events', 'none');
    const bounds = await confetti.boundingBox();
    expect(bounds.x).toBe(0);
    expect(bounds.y).toBe(0);
    expect(bounds.width).toBe(viewport.width);
    expect(bounds.height).toBe(viewport.height);
    await expect.poll(() => confetti.evaluate(canvas => canvas.getContext('2d')
      .getImageData(0, 0, canvas.width, canvas.height).data.some((value, index) => index % 4 === 3 && value > 0))).toBe(true);
    await clickAvatar(page);
    await expect(confetti).toHaveCount(1);
    await expect(page.locator('html')).toHaveAttribute('data-font', 'default');
    await expect(confetti).toHaveCount(0, { timeout: 5000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await clickAvatar(page);
    await expect(page.locator('html')).toHaveAttribute('data-font', 'wenkai');
    await expect(confetti).toHaveCount(0);
  });
}
