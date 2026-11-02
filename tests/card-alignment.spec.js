const { test, expect } = require('@playwright/test');

for (const path of ['/', '/posts/']) {
  for (const width of [390, 820, 1095, 1440]) {
    test(`card rows are centered on ${path} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('data-imx-page-state', 'ready');
      const grids = page.locator('.featured-grid');
      expect(await grids.count()).toBeGreaterThan(0);
      for (const grid of await grids.all()) {
        await grid.scrollIntoViewIfNeeded();
        await expect.poll(() => grid.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          const cards = Array.from(element.children, (card) => card.getBoundingClientRect());
          const row = cards.filter((card) => Math.abs(card.top - cards[0].top) < 1);
          const left = Math.min(...row.map((card) => card.left));
          const right = Math.max(...row.map((card) => card.right));
          return Math.abs((left - bounds.left) - (bounds.right - right));
        })).toBeLessThan(1);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    });
  }
}
