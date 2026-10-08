const { test, expect } = require('@playwright/test');
test.use({ reducedMotion: 'no-preference', channel: 'chromium' });

test('text texture is prepared before reveal and reused for animation, theme and font changes', async ({ page }) => {
  await page.addInitScript(() => {
    // Exercise the renderer on CI software GL as well; production still rejects
    // major performance caveats and its fallback is tested separately.
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, options) {
      return getContext.call(this, type, type === 'webgl' ? { ...options, failIfMajorPerformanceCaveat: false } : options);
    };
    window.gpuProbe = { uploads: 0, draws: 0, text: 0 };
    const prototype = WebGLRenderingContext.prototype;
    for (const [method, key] of [['texImage2D', 'uploads'], ['drawArrays', 'draws']]) {
      const original = prototype[method];
      prototype[method] = function (...args) { gpuProbe[key]++; return original.apply(this, args); };
    }
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (...args) { gpuProbe.text++; return fillText.apply(this, args); };
    document.addEventListener('imx:page-ready', () => {
      gpuProbe.readyRenderer = document.querySelector('[data-home-entry]')?.dataset.glyphRenderer;
      gpuProbe.readyDraws = gpuProbe.draws;
    });
  });
  await page.goto('/');
  await expect(page.locator('[data-home-entry]')).toHaveAttribute('data-glyph-renderer', 'webgl');
  await expect.poll(() => page.evaluate(() => gpuProbe.readyRenderer)).toBe('webgl');
  expect(await page.evaluate(() => gpuProbe.readyDraws)).toBeGreaterThan(0);
  const prepared = await page.evaluate(() => ({ uploads: gpuProbe.uploads, text: gpuProbe.text }));
  await page.mouse.move(30, 200);
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => gpuProbe.uploads)).toBe(prepared.uploads);
  expect(await page.evaluate(() => gpuProbe.text)).toBe(prepared.text);
  await expect.poll(() => page.evaluate(() => gpuProbe.draws)).toBeGreaterThan(10);
  await page.locator('[data-font-switch-avatar]').click({ clickCount: 3 });
  await expect(page.locator('html')).toHaveAttribute('data-font', 'wenkai');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(350);
  expect(await page.evaluate(() => gpuProbe.uploads)).toBe(prepared.uploads);
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, document.body.scrollHeight); });
  await page.waitForTimeout(400);
  const paused = await page.evaluate(() => gpuProbe.draws);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => gpuProbe.draws)).toBe(paused);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => page.evaluate(() => gpuProbe.draws)).toBeGreaterThan(paused);
  await page.setViewportSize({ width: 1000, height: 720 });
  await expect(page.locator('[data-home-glyph-gpu]')).toHaveAttribute('width', '1000');
  await expect.poll(() => page.evaluate(() => gpuProbe.uploads)).toBeGreaterThan(prepared.uploads);
  await page.waitForTimeout(200);
  await expect(page.locator('[data-home-entry]')).toHaveAttribute('data-glyph-renderer', 'webgl');
  await page.locator('[data-home-glyph-gpu]').evaluate(canvas => canvas.getContext('webgl').getExtension('WEBGL_lose_context').loseContext());
  await expect(page.locator('[data-home-entry]')).toHaveAttribute('data-glyph-renderer', 'canvas');
  await expect(page.locator('[data-home-glyph-gpu]')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => gpuProbe.text)).toBeGreaterThan(prepared.text);
});

for (const failure of ['unavailable', 'context-error', 'precision', 'budget', 'texture-limit', 'allocation']) {
  test(`GPU ${failure} keeps the original animated Canvas`, async ({ page }) => {
    await page.addInitScript(failure => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, options) {
        if (type === 'webgl' && failure === 'unavailable') return null;
        if (type === 'webgl' && failure === 'context-error') throw new Error('Context unavailable');
        const context = original.call(this, type, options);
        if (type === 'webgl' && context) {
          if (failure === 'precision') context.getShaderPrecisionFormat = () => ({ precision: 0 });
          if (failure === 'texture-limit') {
            const getParameter = context.getParameter.bind(context);
            context.getParameter = parameter => parameter === context.MAX_TEXTURE_SIZE ? 64 : getParameter(parameter);
          } else if (failure === 'allocation') context.texImage2D = () => { throw new Error('Texture allocation unavailable'); };
        }
        return context;
      };
      if (failure === 'budget') {
        const measure = CanvasRenderingContext2D.prototype.measureText;
        CanvasRenderingContext2D.prototype.measureText = function (text) {
          return this.canvas.hasAttribute('data-home-glyph-canvas') ? { width: 15000 } : measure.call(this, text);
        };
      }
    }, failure);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-imx-page-state', 'ready');
    await expect(page.locator('[data-home-entry]')).toHaveAttribute('data-glyph-renderer', 'canvas');
    await expect(page.locator('[data-home-glyph-canvas]')).toHaveCSS('visibility', 'visible');
    await expect(page.locator('[data-home-glyph-gpu]')).toHaveCount(0);
  });
}

test('mobile GPU uses the existing pixel ratio and preserves responsive geometry', async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, options) {
      return getContext.call(this, type, type === 'webgl' ? { ...options, failIfMajorPerformanceCaveat: false } : options);
    };
  });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-imx-page-state', 'ready');
  await expect(page.locator('[data-home-entry]')).toHaveAttribute('data-glyph-renderer', 'webgl');
  const result = await page.locator('[data-home-glyph-gpu]').evaluate(canvas => {
    const source = document.querySelector('[data-home-glyph-canvas]');
    return { width: canvas.width, height: canvas.height, sourceWidth: source.width, sourceHeight: source.height,
      rect: canvas.getBoundingClientRect().toJSON(), sourceRect: source.getBoundingClientRect().toJSON() };
  });
  expect(result.width).toBe(result.sourceWidth);
  expect(result.height).toBe(result.sourceHeight);
  expect(result.rect).toEqual(result.sourceRect);
});

for (const ratio of [1, 1.5]) {
  test(`GPU text and pointer glow match a Canvas reference at ${ratio}x`, async ({ page }) => {
    const fs = require('node:fs');
    const path = require('node:path');
    await page.route('**/gpu-reference.js', route => route.fulfill({
      contentType: 'application/javascript', body: fs.readFileSync(path.join(__dirname, '../assets/js/home-glyph-gpu.js'), 'utf8')
    }));
    await page.goto('/about/');
    const differences = await page.evaluate(async ratio => {
      const { createGlyphGPU } = await import('/gpu-reference.js');
      const width = 320, height = 120;
      const font = '650 15px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';
      const source = document.createElement('canvas');
      source.width = width * ratio; source.height = height * ratio;
      source.style.width = `${width}px`; source.style.height = `${height}px`;
      document.body.append(source);
      const ctx = source.getContext('2d'); ctx.scale(ratio, ratio); ctx.font = font; ctx.textBaseline = 'top';
      const rows = Array.from({ length: 6 }, (_, index) => ({ content: 'public static void main(String[] args) { return null; }',
        width: ctx.measureText('public static void main(String[] args) { return null; }').width,
        x: -6, y: 18 * index, alpha: .32 }));
      // The reference exercises shader math even on software-only CI machines.
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, options) {
        return original.call(this, type, type === 'webgl' ? { ...options, failIfMajorPerformanceCaveat: false } : options);
      };
      const renderer = createGlyphGPU(source, rows, width, height, ratio, font, () => {});
      HTMLCanvasElement.prototype.getContext = original;
      if (!renderer) throw new Error('No GPU reference renderer');
      const gl = document.querySelector('[data-home-glyph-gpu]').getContext('webgl');
      const results = [];
      for (const dark of [false, true]) for (const pointer of [{ x: 160, y: 60 }, { x: 12, y: 110 }, { x: -1000, y: -1000 }]) {
        ctx.clearRect(0, 0, width, height);
        const color = dark ? '244,244,245' : '24,32,48';
        for (const row of rows) { ctx.fillStyle = `rgba(${color},${row.alpha})`; ctx.fillText(row.content, row.x, row.y); }
        const glow = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, .34 * width);
        const accent = dark ? '161,161,170' : '37,99,235';
        glow.addColorStop(0, `rgba(${accent},${dark ? .09 : .045})`);
        glow.addColorStop(.48, `rgba(${accent},${dark ? .03 : .015})`);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = glow; ctx.fillRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'source-over';
        renderer.draw(pointer, dark);
        const pixels = new Uint8Array(source.width * source.height * 4);
        gl.readPixels(0, 0, source.width, source.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        const expected = ctx.getImageData(0, 0, source.width, source.height).data;
        let sum = 0, max = 0;
        // Compare visible premultiplied color on a white background; GL readback
        // is premultiplied and vertically flipped, while ImageData is neither.
        for (let y = 0; y < source.height; y++) for (let x = 0; x < source.width; x++) {
          const a = (y * source.width + x) * 4;
          const b = ((source.height - 1 - y) * source.width + x) * 4;
          for (let channel = 0; channel < 3; channel++) {
            const reference = expected[a + channel] * expected[a + 3] / 255 + 255 - expected[a + 3];
            const actual = pixels[b + channel] + 255 - pixels[b + 3];
            const difference = Math.abs(reference - actual);
            sum += difference; max = Math.max(max, difference);
          }
        }
        results.push({ mean: sum / (source.width * source.height * 3), max });
      }
      renderer.dispose(); source.remove(); return results;
    }, ratio);
    for (const difference of differences) {
      // The static coverage uses texture interpolation rather than Canvas text
      // rasterization. Allow bounded edge variation, under 0.8% mean RGB error.
      expect(difference.mean).toBeLessThan(2);
      expect(difference.max).toBeLessThan(36);
    }
  });
}
