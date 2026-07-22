const { test, expect } = require('@playwright/test');

const giscusBaseURL = process.env.PLAYWRIGHT_GISCUS_BASE_URL || 'http://127.0.0.1:1418';

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
  await page.route('https://giscus.app/client.js', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: ''
  }));
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

  await page.setViewportSize({ width: 398, height: 541 });
  await openStablePage(page, `${giscusBaseURL}/posts/imx-theme-introduction/`);
  await expect(page.locator('.article-tools')).toHaveCount(1);
  await expect(page.locator('.article-tools-actions')).toHaveCount(1);
  await expect(page.locator('.article-tools')).toHaveClass(/has-comments/);
  await page.locator('.sidebar-toggle').click();
  await expect(page.locator('.sidebar')).toHaveClass(/active/);
  const mobileTocLayout = await page.evaluate(() => {
    const sidebar = document.querySelector('.article-page .sidebar');
    const toc = document.querySelector('.article-page .toc');
    const tools = document.querySelector('.article-tools');
    const actions = document.querySelector('.article-tools-actions');
    const toggle = document.querySelector('.sidebar-toggle');
    const commentButton = document.querySelector('.comment-jump-btn');
    const lastTopLevelItem = toc.querySelector(':scope > nav > ul > li:last-child');
    const penultimateTopLevelItem = toc.querySelector(':scope > nav > ul > li:nth-last-child(2)');
    const sidebarRect = sidebar.getBoundingClientRect();
    const toolsRect = tools.getBoundingClientRect();
    const actionsRect = actions.getBoundingClientRect();
    const toggleRect = toggle.getBoundingClientRect();
    const commentRect = commentButton.getBoundingClientRect();
    return {
      toolsContainsSidebar: tools.contains(sidebar),
      toolsContainsActions: tools.contains(actions),
      sidebarHeight: sidebarRect.height,
      sidebarLeft: sidebarRect.left,
      sidebarWidth: sidebarRect.width,
      tocHeight: toc.getBoundingClientRect().height,
      tocPaddingTop: parseFloat(getComputedStyle(toc).paddingTop),
      tocPaddingBottom: parseFloat(getComputedStyle(toc).paddingBottom),
      lastItemPaddingRight: parseFloat(getComputedStyle(lastTopLevelItem).paddingRight),
      penultimateItemPaddingRight: parseFloat(getComputedStyle(penultimateTopLevelItem).paddingRight),
      sidebarCenter: sidebarRect.top + sidebarRect.height / 2,
      sidebarBottom: sidebarRect.bottom,
      toolsRight: toolsRect.right,
      toolsWidth: toolsRect.width,
      toolsBottom: toolsRect.bottom,
      toolsTop: toolsRect.top,
      toolsBackground: getComputedStyle(tools).backgroundColor,
      sidebarBackground: getComputedStyle(sidebar).backgroundColor,
      actionsLeft: actionsRect.left,
      actionsRight: actionsRect.right,
      actionsBottom: actionsRect.bottom,
      actionsFlexDirection: getComputedStyle(actions).flexDirection,
      actionsBorderLeftWidth: getComputedStyle(actions).borderLeftWidth,
      actionsBorderTopWidth: getComputedStyle(actions).borderTopWidth,
      actionsBorderRightWidth: getComputedStyle(actions).borderRightWidth,
      actionsBorderBottomWidth: getComputedStyle(actions).borderBottomWidth,
      actionsBackground: getComputedStyle(actions).backgroundColor,
      actionsBoxShadow: getComputedStyle(actions).boxShadow,
      toggleBottom: toggleRect.bottom,
      sidebarRight: sidebarRect.right,
      commentRight: commentRect.right,
      commentRadius: getComputedStyle(commentButton).borderRadius,
      toggleRadius: getComputedStyle(toggle).borderRadius,
      viewportHeight: window.innerHeight
    };
  });
  expect(mobileTocLayout.toolsContainsSidebar).toBe(true);
  expect(mobileTocLayout.toolsContainsActions).toBe(true);
  expect(Math.abs(mobileTocLayout.sidebarHeight - mobileTocLayout.tocHeight)).toBeLessThanOrEqual(1);
  expect(Math.abs(mobileTocLayout.toolsBottom - mobileTocLayout.toggleBottom)).toBeLessThanOrEqual(1);
  expect(Math.abs(mobileTocLayout.sidebarBottom - mobileTocLayout.toolsBottom)).toBeLessThanOrEqual(1);
  expect(Math.abs(mobileTocLayout.sidebarWidth - (mobileTocLayout.toolsWidth - 2))).toBeLessThanOrEqual(1);
  expect(mobileTocLayout.toolsWidth).toBeGreaterThanOrEqual(278);
  expect(mobileTocLayout.toolsWidth).toBeLessThanOrEqual(310);
  expect(mobileTocLayout.actionsLeft).toBeGreaterThan(mobileTocLayout.sidebarLeft);
  expect(Math.abs(mobileTocLayout.actionsRight - (mobileTocLayout.toolsRight - 1))).toBeLessThanOrEqual(1);
  expect(Math.abs(mobileTocLayout.actionsBottom - (mobileTocLayout.toolsBottom - 1))).toBeLessThanOrEqual(1);
  expect(mobileTocLayout.actionsFlexDirection).toBe('column');
  expect(Math.abs(mobileTocLayout.tocPaddingBottom - mobileTocLayout.tocPaddingTop)).toBeLessThanOrEqual(1);
  expect(mobileTocLayout.lastItemPaddingRight).toBeGreaterThanOrEqual(55);
  expect(mobileTocLayout.lastItemPaddingRight).toBeLessThanOrEqual(70);
  expect(mobileTocLayout.penultimateItemPaddingRight).toBeGreaterThanOrEqual(55);
  expect(mobileTocLayout.actionsBorderLeftWidth).toBe('0px');
  expect(mobileTocLayout.actionsBorderTopWidth).toBe('0px');
  expect(mobileTocLayout.actionsBorderRightWidth).toBe('0px');
  expect(mobileTocLayout.actionsBorderBottomWidth).toBe('0px');
  expect(mobileTocLayout.actionsBackground).toBe('rgba(0, 0, 0, 0)');
  expect(mobileTocLayout.actionsBoxShadow).toBe('none');
  expect(mobileTocLayout.commentRight).toBeLessThanOrEqual(398);
  expect(mobileTocLayout.commentRadius).toBe('12px');
  expect(mobileTocLayout.toggleRadius).toBe('12px');
  expect(mobileTocLayout.toolsBackground).not.toBe('rgba(0, 0, 0, 0)');
  expect(mobileTocLayout.sidebarBackground).toBe('rgba(0, 0, 0, 0)');
  expect(mobileTocLayout.sidebarCenter).toBeGreaterThan(mobileTocLayout.viewportHeight / 2);
  expect(mobileTocLayout.toolsTop).toBeGreaterThanOrEqual(87);
  expect(mobileTocLayout.toolsBottom).toBeLessThanOrEqual(mobileTocLayout.viewportHeight);
  await expectNoHorizontalOverflow(page);

  await openStablePage(page, '/posts/imx-configuration-deployment-guide/');
  await page.locator('.sidebar-toggle').click();
  const longMobileTocLayout = await page.evaluate(() => {
    const toc = document.querySelector('.article-page .toc');
    const tools = document.querySelector('.article-tools');
    const actions = document.querySelector('.article-tools-actions');
    const toggle = document.querySelector('.sidebar-toggle');
    const rect = toc.getBoundingClientRect();
    const toolsRect = tools.getBoundingClientRect();
    const actionsRect = actions.getBoundingClientRect();
    const toggleRect = toggle.getBoundingClientRect();
    return {
      top: rect.top,
      bottom: rect.bottom,
      toolsTop: toolsRect.top,
      toolsBottom: toolsRect.bottom,
      toggleBottom: toggleRect.bottom,
      actionsRight: actionsRect.right,
      toolsRight: toolsRect.right,
      scrollable: toc.scrollHeight > toc.clientHeight
    };
  });
  expect(longMobileTocLayout.top).toBeGreaterThanOrEqual(87);
  expect(longMobileTocLayout.bottom).toBeLessThanOrEqual(541);
  expect(Math.abs(longMobileTocLayout.top - longMobileTocLayout.toolsTop)).toBeLessThanOrEqual(1);
  expect(Math.abs(longMobileTocLayout.bottom - longMobileTocLayout.toolsBottom)).toBeLessThanOrEqual(1);
  expect(Math.abs(longMobileTocLayout.bottom - longMobileTocLayout.toggleBottom)).toBeLessThanOrEqual(2);
  expect(Math.abs(longMobileTocLayout.actionsRight - (longMobileTocLayout.toolsRight - 1))).toBeLessThanOrEqual(1);
  expect(longMobileTocLayout.scrollable).toBe(true);
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ width: 320, height: 568 });
  await openStablePage(page, '/posts/imx-theme-introduction/');
  await page.locator('.sidebar-toggle').click();
  const narrowMobileTocLayout = await page.evaluate(() => {
    const toolsRect = document.querySelector('.article-tools').getBoundingClientRect();
    const sidebarRect = document.querySelector('.article-page .sidebar').getBoundingClientRect();
    return {
      toolsLeft: toolsRect.left,
      toolsRight: toolsRect.right,
      left: sidebarRect.left,
      width: toolsRect.width
    };
  });
  expect(narrowMobileTocLayout.toolsLeft).toBeGreaterThanOrEqual(8);
  expect(narrowMobileTocLayout.toolsRight).toBeLessThanOrEqual(320);
  expect(narrowMobileTocLayout.left).toBeGreaterThanOrEqual(8);
  expect(narrowMobileTocLayout.width).toBeLessThanOrEqual(304);
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

test('desktop dock merges and restores with normal motion enabled', async ({ page }) => {
  const errors = watchConsole(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts && document.fonts.ready);

  await page.evaluate(() => scrollTo(0, document.querySelector('#featured-posts').offsetTop + 24));
  await expect(page.locator('body')).toHaveClass(/imx-dock-merged/);
  await expect(page.locator('.navbar')).toHaveClass(/is-dock-merged/);

  await page.evaluate(() => scrollTo(0, 0));
  await expect(page.locator('body')).not.toHaveClass(/imx-dock-merged/);
  await expect(page.locator('.navbar')).not.toHaveClass(/is-dock-merged/);
  expect(errors).toEqual([]);
});

test('404 game starts from keyboard and resets its visible state', async ({ page }) => {
  const errors = watchConsole(page);
  await page.goto('/missing-regression-page/', { waitUntil: 'domcontentloaded' });
  const canvas = page.locator('[data-404-canvas]');
  const start = page.locator('[data-404-start]');
  const reset = page.locator('[data-404-reset]');

  await expect(start).toHaveText('开始');
  await expect(page.locator('[data-404-score]')).toHaveText('0');
  await expect(page.locator('[data-404-lives]')).toHaveText('3');
  await canvas.focus();
  await page.keyboard.press('Space');
  await expect(start).toHaveText('进行中');
  await reset.click();
  await expect(start).toHaveText('进行中');
  await expect(page.locator('[data-404-score]')).toHaveText('0');
  await expect(page.locator('[data-404-lives]')).toHaveText('3');
  expect(errors).toEqual([]);
});

test('mobile dock, comment and TOC buttons use translucent surfaces in both themes', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => {
    if (!localStorage.getItem('themeMode')) localStorage.setItem('themeMode', 'light');
  });
  await page.route('https://giscus.app/client.js', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: ''
  }));

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.navbar-container')).toHaveCSS('background-color', 'rgba(251, 250, 247, 0.68)');

  await page.evaluate(() => {
    localStorage.setItem('themeMode', 'dark');
    location.reload();
  });
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('.navbar-container')).toHaveCSS('background-color', 'rgba(23, 23, 22, 0.72)');

  await page.goto(`${giscusBaseURL}/posts/imx-theme-introduction/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('themeMode', 'dark');
    location.reload();
  });
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('.navbar-container')).toHaveCSS('background-color', 'rgba(23, 23, 22, 0.72)');
  await expect(page.locator('.comment-jump-btn')).toHaveCSS('background-color', 'rgba(23, 23, 22, 0.76)');
  await expect(page.locator('.sidebar-toggle')).toHaveCSS('background-color', 'rgba(23, 23, 22, 0.76)');
  await page.locator('.mobile-menu-toggle').click();
  await expect(page.locator('.navbar-menu')).toHaveCSS('background-color', 'rgba(23, 23, 22, 0.72)');
  await expect(page.locator('.navbar-menu')).toHaveCSS('backdrop-filter', 'blur(22px) saturate(1.65)');

  await page.evaluate(() => {
    localStorage.setItem('themeMode', 'light');
    location.reload();
  });
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('.navbar-container')).toHaveCSS('background-color', 'rgba(251, 250, 247, 0.68)');
  await expect(page.locator('.comment-jump-btn')).toHaveCSS('background-color', 'rgba(251, 250, 247, 0.72)');
  await expect(page.locator('.sidebar-toggle')).toHaveCSS('background-color', 'rgba(251, 250, 247, 0.72)');
  await page.locator('.mobile-menu-toggle').click();
  await expect(page.locator('.navbar-menu')).toHaveCSS('background-color', 'rgba(251, 250, 247, 0.68)');
  await expect(page.locator('.navbar-menu')).toHaveCSS('backdrop-filter', 'blur(22px) saturate(1.65)');
});

test('mobile menu leaves a long article scrollable while open', async ({ page }) => {
  const errors = watchConsole(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/posts/regression-long-article/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => scrollTo(0, 0));
  await page.locator('.mobile-menu-toggle').click();
  await expect(page.locator('.mobile-menu-toggle')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('body')).not.toHaveClass(/mobile-menu-open/);
  await page.mouse.wheel(0, 500);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('mobile navigation visibly highlights the current section on every primary route', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => localStorage.setItem('themeMode', 'light'));

  const routeExpectations = [
    ['/', '/'],
    ['/posts/', '/posts/'],
    ['/posts/imx-theme-introduction/', '/posts/'],
    ['/categories/', '/categories/'],
    ['/tags/', '/tags/'],
    ['/about/', '/about/']
  ];

  for (const [route, expectedHref] of routeExpectations) {
    await openStablePage(page, route);
    await page.locator('.mobile-menu-toggle').click();

    const activeLink = page.locator(`.navbar-menu a[href="${expectedHref}"]`);
    await expect(activeLink).toHaveClass(/active/);
    await expect(activeLink).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('.navbar-menu a.active')).toHaveCount(1);
    await expect(activeLink).toHaveCSS('background-color', 'rgba(122, 90, 50, 0.12)');
  }
});

test('static comment demo remains readable without overflow in both themes', async ({ page }) => {
  const errors = watchConsole(page);
  const expectedBackgrounds = {
    light: 'rgba(251, 250, 247, 0.72)',
    dark: 'rgba(23, 23, 22, 0.76)'
  };

  for (const viewport of [{ width: 1440, height: 900 }, { width: 375, height: 812 }]) {
    await page.setViewportSize(viewport);
    for (const mode of ['light', 'dark']) {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.evaluate(themeMode => localStorage.setItem('themeMode', themeMode), mode);
      await openStablePage(page, '/posts/imx-theme-introduction/');

      const demo = page.locator('#comments .comments-demo');
      await expect(page.locator('html')).toHaveAttribute('data-theme', mode);
      await expect(demo).toBeVisible();
      await expect(demo).toHaveCSS('background-color', expectedBackgrounds[mode]);
      await expect(demo).toHaveCSS('border-radius', '20px');
      await expect(page.locator('.comments-demo-label')).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
  }

  expect(errors).toEqual([]);
});

for (const mode of ['light', 'dark']) {
  for (const [name, route] of routes.filter(([name]) => ['home', 'article', 'about'].includes(name))) {
    test(`capture ${name} in ${mode} mode`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await stubVisitorAPIs(page);
      await page.addInitScript(themeMode => localStorage.setItem('themeMode', themeMode), mode);
      await openStablePage(page, route);
      await page.waitForLoadState('networkidle');
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
      await expect(page).toHaveScreenshot(`${name}-${mode}.png`, {
        fullPage: true,
        animations: 'disabled',
        caret: 'hide',
        maxDiffPixelRatio: 0.02,
        threshold: 0.3
      });
      await page.screenshot({
        path: testInfo.outputPath(`${name}-${mode}.png`),
        fullPage: true,
        animations: 'disabled',
        caret: 'hide'
      });
    });
  }
}
