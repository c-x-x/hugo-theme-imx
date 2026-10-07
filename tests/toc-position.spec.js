const { test, expect } = require('@playwright/test');

test('TOC distinguishes real heading levels, including skipped levels', async ({ page }) => {
  await page.goto('/toc-overflow-regression/');
  await expect(page.locator('html')).toHaveAttribute('data-imx-page-state', 'ready');
  for (const [id, level] of [['什么是', '2'], ['skill', '3'], ['细节', '4'], ['跳级标题', '4']]) {
    const link = page.locator(`.toc a[href="#${id}"]`);
    await expect(link).toHaveAttribute('data-toc-level', level);
    expect(await link.evaluate(element => getComputedStyle(element, '::before').content)).toContain(level);
  }
  const left = async id => (await page.locator(`.toc a[href="#${id}"]`).boundingBox()).x;
  expect(await left('skill')).toBeGreaterThan(await left('什么是'));
  expect(await left('细节')).toBeGreaterThan(await left('skill'));
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 1038, height: 768 }]) {
  test(`desktop TOC stays pinned while the article scrolls at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/posts/regression-long-article/');
    await expect(page.locator('html')).toHaveAttribute('data-imx-page-state', 'ready');
    await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
    const sidebar = page.locator('.article-page .sidebar');
    const top = await sidebar.evaluate(element => parseFloat(getComputedStyle(element).top));
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
      for (const scrollY of [500, 1000, 1500]) {
        await page.evaluate(y => window.scrollTo(0, y), scrollY);
        await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scrollY);
        await expect.poll(async () => Math.abs((await sidebar.boundingBox()).y - top)).toBeLessThan(1);
        await expect(sidebar).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
      }
    }
  });
}

test('mobile TOC remains a fixed panel and the article can still scroll', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/posts/regression-long-article/');
  await expect(page.locator('html')).toHaveAttribute('data-imx-page-state', 'ready');
  await page.locator('.sidebar-toggle').click();
  await expect(page.locator('.article-tools')).toHaveClass(/is-toc-open/);
  const panel = page.locator('.article-tools');
  const before = await panel.boundingBox();
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, 800); });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(800);
  await expect.poll(async () => Math.abs((await panel.boundingBox()).y - before.y)).toBeLessThan(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});
