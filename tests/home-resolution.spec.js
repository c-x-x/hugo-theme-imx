const { test, expect } = require('@playwright/test');

for (const renderer of ['webgl', 'canvas']) {
  test.describe(`mobile retina ${renderer}`, () => {
    test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, reducedMotion: 'no-preference' });
    test('code background covers physical pixels in both themes', async ({ page }) => {
      await page.addInitScript(renderer => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, options) {
          if (type === 'webgl' && renderer === 'canvas') return null;
          return original.call(this, type, type === 'webgl' ? { ...options, failIfMajorPerformanceCaveat: false } : options);
        };
      }, renderer);
      await page.goto('/');
      await expect(page.locator('[data-home-entry]')).toHaveAttribute('data-glyph-renderer', renderer);
      for (const theme of ['light', 'dark']) {
        await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
        const canvas = page.locator(renderer === 'webgl' ? '[data-home-glyph-gpu]' : '[data-home-glyph-canvas]');
        const size = await canvas.evaluate(element => ({
          width: element.width, height: element.height,
          cssWidth: element.getBoundingClientRect().width,
          cssHeight: element.getBoundingClientRect().height, dpr: devicePixelRatio
        }));
        expect(size.dpr).toBe(3);
        expect(size.width).toBe(Math.round(size.cssWidth * size.dpr));
        expect(size.height).toBe(Math.round(size.cssHeight * size.dpr));
        await expect(canvas).toBeVisible();
      }
    });
  });
}
