const { test, expect } = require('@playwright/test');

test.use({ reducedMotion: 'no-preference' });

for (const viewport of [{ width: 1440, height: 900 }, { width: 375, height: 812 }]) {
  test(`entry gently introduces content after loading at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).not.toHaveClass(/imx-page-loading/);
    await expect(page.locator('.imx-home-entry-ripple-ring')).toHaveCount(0);
    const content = page.locator('.imx-home-entry-content');
    await expect(content).toHaveCSS('animation-duration', '0.4s');
    await expect(content).toHaveCSS('animation-delay', '0s');
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
      const layers = await page.locator('.imx-home-entry-layer').evaluateAll(elements =>
        elements.map(element => {
          const style = getComputedStyle(element);
          return { clip: style.clipPath, animation: style.animationName, opacity: Number(style.opacity) };
        }));
      for (const layer of layers) {
        expect(layer.clip).toBe('none');
        expect(layer.animation).toBe('none');
        expect(layer.opacity).toBeGreaterThan(0);
      }
    }
    await expect(content).toHaveCSS('opacity', '1');
    await expect(content).toHaveCSS('transform', 'none');
    await expect(page.locator('.hero-title')).toBeVisible();
    await expect(page.locator('.hero-action-primary')).toBeVisible();
  });
}

test('subtitle is readable during entry before its typing loop begins', async ({ page }) => {
  await page.clock.install();
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.clock.runFor(700);
  await expect(page.locator('html')).not.toHaveClass(/imx-page-loading/);
  const subtitle = page.locator('[data-home-typed]');
  const full = await subtitle.getAttribute('aria-label');
  await expect(subtitle).toHaveText(full);
  await page.clock.runFor(450);
  await expect(subtitle).toHaveText(full);
  await page.clock.runFor(1600);
  await expect(subtitle).not.toHaveText(full);
});

test('reduced motion presents home content without entrance effects', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.imx-home-entry-content')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.imx-home-entry-content')).toHaveCSS('opacity', '1');
  await expect(page.locator('.imx-home-entry-grid')).toHaveCSS('clip-path', 'none');
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (type === 'webgl') return null;
      return getContext.call(this, type, ...args);
    };
    window.heroProbe = { rows: [], measures: 0, paints: 0, compare: false, difference: null };
    const prototype = CanvasRenderingContext2D.prototype;
    const fillText = prototype.fillText;
    const measureText = prototype.measureText;
    const fillRect = prototype.fillRect;
    const isHero = context => context.canvas.hasAttribute('data-home-glyph-canvas');
    prototype.fillText = function (text, ...args) {
      if (isHero(this)) heroProbe.rows.push(text);
      return fillText.call(this, text, ...args);
    };
    prototype.measureText = function (...args) {
      if (isHero(this)) heroProbe.measures++;
      return measureText.apply(this, args);
    };
    prototype.fillRect = function (...args) {
      if (!isHero(this) || this.globalCompositeOperation !== 'lighter') return fillRect.apply(this, args);
      heroProbe.paints++;
      let reference;
      if (heroProbe.compare) {
        const canvas = document.createElement('canvas');
        canvas.width = this.canvas.width;
        canvas.height = this.canvas.height;
        reference = canvas.getContext('2d');
        reference.drawImage(this.canvas, 0, 0);
        const transform = this.getTransform();
        reference.setTransform(transform);
        reference.globalCompositeOperation = 'lighter';
        reference.fillStyle = this.fillStyle;
        // Reference the original full-surface glow, including off-centre pointers.
        fillRect.call(reference, 0, 0, canvas.width / transform.a, canvas.height / transform.d);
      }
      const result = fillRect.apply(this, args);
      if (reference) {
        const expected = reference.getImageData(0, 0, this.canvas.width, this.canvas.height).data;
        const actual = this.getImageData(0, 0, this.canvas.width, this.canvas.height).data;
        let difference = 0;
        for (let i = 0; i < actual.length; i++) difference = Math.max(difference, Math.abs(actual[i] - expected[i]));
        heroProbe.difference = difference;
        heroProbe.compare = false;
      }
      // Keep probe memory bounded while the background runs.
      if (heroProbe.rows.length > 500) heroProbe.rows = heroProbe.rows.slice(-100);
      return result;
    };
  });
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 375, height: 812 }]) {
  test(`bounded glow matches the full-surface effect at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect.poll(() => page.evaluate(() => heroProbe.paints)).toBeGreaterThan(2);
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
      for (const point of [{ x: 20, y: 140 }, { x: viewport.width - 20, y: viewport.height - 80 }]) {
        await page.mouse.move(point.x, point.y);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await page.evaluate(() => { heroProbe.difference = null; heroProbe.compare = true; });
        await expect.poll(() => page.evaluate(() => heroProbe.difference)).toBe(0);
      }
    }
  });
}

test('home animation survives font changes, pauses offscreen and resizes when needed', async ({ page }) => {
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => heroProbe.paints)).toBeGreaterThan(2);
  const measures = await page.evaluate(() => heroProbe.measures);
  // WenKai signals a resize after font loading; this must not randomize the background.
  await page.locator('.navbar-logo-wrap').click({ clickCount: 3 });
  await expect(page.locator('html')).toHaveAttribute('data-font', 'wenkai');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(350);
  expect(await page.evaluate(() => heroProbe.measures)).toBe(measures);
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, document.body.scrollHeight); });
  await page.waitForTimeout(400);
  const paused = await page.evaluate(() => heroProbe.paints);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => heroProbe.paints)).toBe(paused);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => page.evaluate(() => heroProbe.paints)).toBeGreaterThan(paused);
  expect(await page.evaluate(() => heroProbe.measures)).toBe(measures);
  await page.setViewportSize({ width: 1000, height: 720 });
  await expect.poll(() => page.evaluate(() => heroProbe.measures)).toBeGreaterThan(measures);
  const canvas = page.locator('[data-home-glyph-canvas]');
  await expect(canvas).toHaveAttribute('width', '1000');
});
