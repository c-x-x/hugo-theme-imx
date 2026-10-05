const { test, expect } = require('@playwright/test');

async function ready(page, path = '/') {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-imx-page-state', 'ready');
}

function destinations(page) {
  return page.evaluate(() => {
    const rules = [...document.querySelectorAll('script[type="speculationrules"]')]
      .flatMap(node => JSON.parse(node.textContent).prefetch.flatMap(rule => rule.urls));
    return [...rules, ...[...document.querySelectorAll('link[data-imx-prefetch]')].map(node => node.href)];
  });
}

test('plain articles skip math and diagram downloads', async ({ page }) => {
  const requests = [];
  page.on('request', request => { if (/katex|mermaid/.test(request.url())) requests.push(request.url()); });
  await ready(page, '/posts/regression-long-article/');
  expect(requests).toEqual([]);
  await expect(page.locator('.article-content')).toBeVisible();
});

test('math loads its libraries and renders only when needed', async ({ page }) => {
  await ready(page, '/math-regression/');
  await expect(page.locator('.katex')).toHaveCount(2);
  await expect(page.locator('script[src*="mermaid.min.js"]')).toHaveCount(0);
  await expect(page.locator('link[href*="katex.min.css"]')).toHaveCount(1);
});

test('diagram pages do not load formula libraries', async ({ page }) => {
  await ready(page, '/mermaid-regression/');
  await expect(page.locator('.mermaid svg')).toBeVisible();
  await expect(page.locator('script[src*="katex"]')).toHaveCount(0);
});

test('intent prefetch is same-origin, bounded and does not execute target scripts', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => {
    const links = [
      ...Array.from({ length: 12 }, (_, i) => `/posts/?probe=${i}`),
      'https://example.com/', '/index.json', '/posts/#section', '/posts/?q=hello'
    ];
    for (const href of links) {
      const a = document.createElement('a'); a.href = href; a.textContent = href;
      a.dataset.probe = ''; document.body.append(a);
      a.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    }
    const paths = ['/posts/', '/about/', '/categories/', '/tags/',
      '/posts/imx-theme-introduction/', '/posts/imx-configuration-deployment-guide/',
      '/posts/regression-long-article/'];
    for (const href of paths) {
      const a = document.createElement('a'); a.href = href;
      document.body.append(a);
      a.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    }
  });
  const urls = await destinations(page);
  expect(urls.length).toBeGreaterThan(0);
  expect(urls.length).toBeLessThanOrEqual(6);
  expect(new Set(urls).size).toBe(urls.length);
  for (const href of urls) {
    const url = new URL(href);
    expect(url.origin).toBe(new URL(page.url()).origin);
    expect(url.search).toBe(''); expect(url.hash).toBe('');
    expect(url.pathname).not.toBe('/index.json');
  }
  const rules = await page.locator('script[type="speculationrules"]').allTextContents();
  rules.forEach(rule => expect(JSON.parse(rule).prerender).toBeUndefined());
});

for (const settings of [{ saveData: true }, { effectiveType: '2g' }]) {
  test(`prefetch respects network preferences ${JSON.stringify(settings)}`, async ({ page }) => {
    await page.addInitScript(value => Object.defineProperty(navigator, 'connection', { configurable: true, value }), settings);
    await ready(page);
    await page.locator('.hero-action-secondary').hover();
    await page.waitForTimeout(1600);
    expect(await destinations(page)).toEqual([]);
  });
}

test('repeat visits have no artificial entrance wait and delayed loaders stay hidden', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await ready(page);
  await expect(page.locator('[data-page-loader]')).toHaveCount(0);
  await page.addInitScript(() => {
    window.loadingShown = false;
    new MutationObserver(() => {
      if (document.documentElement.classList.contains('imx-page-loading')) window.loadingShown = true;
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  });
  await ready(page, '/tags/');
  expect(await page.evaluate(() => performance.now())).toBeLessThan(450);
  expect(await page.evaluate(() => window.loadingShown)).toBe(false);
  await expect(page.locator('[data-page-loader]')).toHaveCount(0);
});

test('a slow repeat visit still shows loading and safely releases content', async ({ page }) => {
  await ready(page);
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route(/\/images\/imx\/default-avatar\.jpg(?:\?|$)/, async route => { await gate; await route.continue(); });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveClass(/imx-page-loading/);
  await expect(page.locator('[data-page-content]')).toHaveAttribute('inert', '');
  release();
  await expect(page.locator('html')).toHaveAttribute('data-imx-page-state', 'ready');
  await expect(page.locator('[data-page-content]')).not.toHaveAttribute('inert', '');
});

test('real prefetch warms HTTP cache and a reload receives updated HTML', async ({ page }) => {
  const http = require('node:http');
  const fs = require('node:fs');
  const path = require('node:path');
  const source = fs.readFileSync(path.join(__dirname, '../assets/js/page-prefetch.js'), 'utf8');
  const requests = [];
  let version = 1;
  let tagsRequests = 0;
  const server = http.createServer((request, response) => {
    if (request.url === '/prefetch.js') {
      response.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'public, max-age=60' });
      response.end(source); return;
    }
    if (request.url === '/about/') requests.push(request.headers);
    if (request.url === '/tags/') tagsRequests++;
    response.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'public, max-age=60' });
    response.end(`<html><body><p>version-${version}</p><a href="/about/">About</a><a href="/tags/">Tags</a>
      <script type="module">import {initPagePrefetch} from '/prefetch.js';
      window.__IMX_PAGE_READY__ = true; initPagePrefetch();</script></body></html>`);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.getByRole('link', { name: 'About' }).hover();
    await expect.poll(() => requests.length).toBe(1);
    expect(requests[0]['sec-purpose'] || requests[0].purpose).toContain('prefetch');
    await page.getByRole('link', { name: 'Tags' }).hover();
    await expect.poll(() => tagsRequests).toBe(1);
    await page.getByRole('link', { name: 'About' }).click();
    await expect(page.locator('p')).toHaveText('version-1');
    expect(requests.length).toBe(1);
    version = 2;
    await page.reload();
    await expect(page.locator('p')).toHaveText('version-2');
    expect(requests.length).toBe(2);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

