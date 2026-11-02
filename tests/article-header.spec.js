const { test, expect } = require('@playwright/test');

for (const width of [1440, 1038, 820, 320, 375, 390, 430]) {
  test(`article title follows the reading column at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/posts/imx-configuration-deployment-guide/');
    await expect(page.locator('html')).toHaveAttribute('data-imx-page-state', 'ready');
    await page.evaluate(() => {
      document.querySelector('.article-title').textContent = 'Google / Squarespace 域名接入 Cloudflare DNS：完整保姆级教程';
    });
    if (width <= 768) {
      const typography = await page.locator('.article-title').evaluate((element) => {
        const style = getComputedStyle(element);
        return { fontSize: parseFloat(style.fontSize), lineHeight: parseFloat(style.lineHeight) };
      });
      expect(typography.fontSize).toBeLessThanOrEqual(31);
      expect(typography.lineHeight / typography.fontSize).toBeCloseTo(1.2, 1);
    }
    for (const state of width > 768 ? ['expanded', 'collapsed', 'expanded'] : ['expanded']) {
      if (state === 'collapsed') await page.locator('.sidebar-toggle').click();
      if (state === 'expanded' && await page.locator('.article-page-toc-collapsed').count()) {
        await page.locator('.sidebar-toggle').click();
      }
      await expect.poll(() => page.evaluate(() => {
        const body = document.querySelector('.article-content').getBoundingClientRect();
        return Math.max(...Array.from(document.querySelector('.article-header').children, (element) => {
          const rect = element.getBoundingClientRect();
          return Math.max(Math.abs(rect.left - body.left), Math.abs(rect.right - body.right));
        }));
      })).toBeLessThan(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
  });
}
