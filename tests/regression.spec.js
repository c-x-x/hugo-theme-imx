const { test, expect } = require('@playwright/test');

const viewports = [
  { width: 2048, height: 1024 },
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 375, height: 812 }
];

const routes = [
  ['home', '/', '.imx-home-entry-hero'],
  ['posts', '/posts/', '.featured-grid'],
  ['article', '/posts/regression-long-article/', '.article-page'],
  ['categories', '/categories/', '.taxonomy-section'],
  ['tags', '/tags/', '.taxonomy-section'],
  ['about', '/about/', '.about-content'],
  ['not-found', '/missing-regression-page/', '.not-found-page']
];

function watchConsole(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const location = message.location().url || '';
    const isExpected404Document = location.includes('/missing-regression-page/');
    if (!isExpected404Document) errors.push(message.text());
  });
  return errors;
}

async function stubVisitorAPIs(page) {
  const response = JSON.stringify({
    success: true,
    ip: '203.0.113.10',
    country: 'China',
    country_code: 'CN',
    region: 'Shanghai',
    city: 'Shanghai'
  });
  await page.route(/https:\/\/(ipwho\.is|ipapi\.co|freeipapi\.com|api\.ip\.sb)\//, route => {
    route.fulfill({ status: 200, contentType: 'application/json', body: response });
  });
}

async function disableMotion(page) {
  await page.addStyleTag({ content: `
    *, *::before, *::after {
      animation-duration: 0.001ms !important;
      animation-delay: 0ms !important;
      transition-duration: 0.001ms !important;
      scroll-behavior: auto !important;
    }
  ` });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.waitForTimeout(150);
}

async function openStablePage(page, route) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await disableMotion(page);
}

async function expectNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

for (const viewport of viewports) {
  test(`critical pages render at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const errors = watchConsole(page);
    await stubVisitorAPIs(page);

    for (const [, route, selector] of routes) {
      await openStablePage(page, route);
      await expect(page.locator(selector).first()).toBeVisible();
      await expect(page.locator('.navbar-container')).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }

    expect(errors).toEqual([]);
  });
}

test('theme modes, desktop dock, mobile menu and article toc remain operational', async ({ page }) => {
  const errors = watchConsole(page);
  await stubVisitorAPIs(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openStablePage(page, '/');

  const uiFontFamilies = await page.evaluate(() => ['body', '.navbar-brand', '.post-card-title'].map(selector => {
    const element = document.querySelector(selector);
    return getComputedStyle(element).fontFamily;
  }));
  uiFontFamilies.forEach(fontFamily => expect(fontFamily.toLowerCase()).toContain('imx inter'));

  await page.evaluate(() => {
    localStorage.setItem('themeMode', 'light');
    location.reload();
  });
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  await page.evaluate(() => {
    localStorage.setItem('themeMode', 'dark');
    location.reload();
  });
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.evaluate(() => {
    localStorage.setItem('themeMode', 'auto');
    location.reload();
  });
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('html')).toHaveAttribute('data-theme-mode', 'auto');
  await page.evaluate(() => scrollTo(0, document.querySelector('#featured-posts').offsetTop + 24));
  await expect(page.locator('body')).toHaveClass(/imx-dock-merged/);
  await expect(page.locator('.navbar')).toHaveClass(/is-dock-merged/);
  await expect(page.locator('.navbar-dock-shell')).toBeVisible();

  await page.setViewportSize({ width: 375, height: 812 });
  await openStablePage(page, '/');
  await page.locator('.mobile-menu-toggle').click();
  await expect(page.locator('.mobile-menu-toggle')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.navbar-menu')).toHaveClass(/active/);
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ width: 375, height: 541 });
  await openStablePage(page, '/posts/imx-theme-introduction/');
  await page.locator('.sidebar-toggle').click();
  await expect(page.locator('.sidebar')).toHaveClass(/active/);
  const mobileTocLayout = await page.evaluate(() => {
    const sidebar = document.querySelector('.article-page .sidebar');
    const toc = document.querySelector('.article-page .toc');
    const sidebarRect = sidebar.getBoundingClientRect();
    return {
      sidebarHeight: sidebarRect.height,
      tocHeight: toc.getBoundingClientRect().height,
      sidebarCenter: sidebarRect.top + sidebarRect.height / 2,
      sidebarBottom: sidebarRect.bottom,
      viewportHeight: window.innerHeight
    };
  });
  expect(Math.abs(mobileTocLayout.sidebarHeight - mobileTocLayout.tocHeight)).toBeLessThanOrEqual(1);
  expect(Math.abs(mobileTocLayout.sidebarCenter - mobileTocLayout.viewportHeight / 2)).toBeLessThanOrEqual(1);
  expect(mobileTocLayout.sidebarBottom).toBeLessThanOrEqual(mobileTocLayout.viewportHeight);
  await expectNoHorizontalOverflow(page);

  await openStablePage(page, '/posts/imx-configuration-deployment-guide/');
  await page.locator('.sidebar-toggle').click();
  const longMobileTocLayout = await page.evaluate(() => {
    const toc = document.querySelector('.article-page .toc');
    const rect = toc.getBoundingClientRect();
    return {
      top: rect.top,
      bottom: rect.bottom,
      scrollable: toc.scrollHeight > toc.clientHeight
    };
  });
  expect(longMobileTocLayout.top).toBeGreaterThanOrEqual(87);
  expect(longMobileTocLayout.bottom).toBeLessThanOrEqual(541);
  expect(longMobileTocLayout.scrollable).toBe(true);
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ width: 1024, height: 768 });
  await openStablePage(page, '/posts/regression-long-article/');
  await expect(page.locator('.article-content')).toBeVisible();
  await expect(page.locator('.toc')).toBeVisible();
  await expect(page.locator('.toc a')).toHaveCount(8);
  const articleSerifWeights = await page.evaluate(() => ({
    link: getComputedStyle(document.querySelector('.article-content a')).fontWeight,
    strong: getComputedStyle(document.querySelector('.article-content strong')).fontWeight
  }));
  expect(articleSerifWeights).toEqual({ link: '700', strong: '700' });
  const articleIsLong = await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight * 2);
  expect(articleIsLong).toBe(true);
  await page.evaluate(() => {
    const heading = document.querySelector('#regression-section-7');
    const headingTop = heading.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, Math.max(0, headingTop - 120));
  });
  await page.evaluate(() => new Promise(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
  await expect(page.locator('.toc a[href="#regression-section-7"]')).toHaveClass(/active/);
  await expectNoHorizontalOverflow(page);

  expect(errors).toEqual([]);
});

for (const mode of ['light', 'dark']) {
  for (const [name, route] of routes.filter(([name]) => ['home', 'article', 'about'].includes(name))) {
    test(`capture ${name} in ${mode} mode`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await stubVisitorAPIs(page);
      await page.addInitScript(themeMode => localStorage.setItem('themeMode', themeMode), mode);
      await openStablePage(page, route);
      await expect(page.locator('html')).toHaveAttribute('data-theme', mode);
      await expect(page.locator(routes.find(([routeName]) => routeName === name)[2]).first()).toBeVisible();
      if (name === 'about') {
        await expect(page.locator('[data-visitor-ip]')).toHaveText('203.0.113.10');
        await expect(page.locator('[data-visitor-location]')).toHaveText('上海');
        const inlineCodeStyle = await page.locator('.about-content code').evaluate(element => {
          const style = getComputedStyle(element);
          return {
            backgroundColor: style.backgroundColor,
            borderColor: style.borderColor
          };
        });
        const accent = mode === 'light' ? '122, 90, 50' : '212, 198, 178';
        expect(inlineCodeStyle.backgroundColor).toBe(`rgba(${accent}, 0.08)`);
        expect(inlineCodeStyle.borderColor).toBe(`rgba(${accent}, 0.22)`);
      }
      await page.screenshot({
        path: testInfo.outputPath(`${name}-${mode}.png`),
        fullPage: true,
        animations: 'disabled',
        caret: 'hide'
      });
    });
  }
}
