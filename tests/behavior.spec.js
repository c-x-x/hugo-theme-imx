const { test, expect } = require('@playwright/test');

const giscusBaseURL = process.env.PLAYWRIGHT_GISCUS_BASE_URL || 'http://127.0.0.1:1418';
const visitorCacheKey = 'imx-about-visitor-info';
const visitorAPIURLs = [
  'https://ipwho.is/?lang=zh-CN',
  'https://ipapi.co/json/',
  'https://freeipapi.com/api/json',
  'https://api.ip.sb/geoip'
];
const consoleErrors = new WeakMap();

test.beforeEach(async ({ page }) => {
  const errors = [];
  consoleErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
});

test.afterEach(async ({ page }) => {
  expect(consoleErrors.get(page)).toEqual([]);
});

function visitorPayload(overrides = {}) {
  return {
    success: true,
    ip: '203.0.113.10',
    country: 'China',
    country_code: 'CN',
    region: 'Shanghai',
    city: 'Shanghai',
    ...overrides
  };
}

test('search replays a query entered before the index finishes loading', async ({ page }) => {
  await page.route('**/index.json', async route => {
    await new Promise(resolve => setTimeout(resolve, 700));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{
        title: '一场克制的相遇',
        summary: 'IMX 主题介绍',
        content: '阅读始终是第一件事',
        permalink: '/posts/imx-theme-introduction/'
      }])
    });
  });

  await page.goto('/posts/', { waitUntil: 'domcontentloaded' });
  await page.locator('.search-input').fill('克制');

  const result = page.locator('.search-result-item[href="/posts/imx-theme-introduction/"]');
  await expect(result).toBeVisible();
  await expect(result.locator('mark')).toHaveText('克制');
  await result.click();
  await expect(page).toHaveURL(/\/posts\/imx-theme-introduction\/$/);
});

test('mobile TOC exposes and synchronizes its accessible state', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/posts/imx-theme-introduction/', { waitUntil: 'domcontentloaded' });

  const toggle = page.locator('.sidebar-toggle');
  const sidebar = page.locator('.sidebar');
  await expect(sidebar).toHaveAttribute('id', 'article-toc');
  await expect(toggle).toHaveAttribute('aria-controls', 'article-toc');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(toggle).toHaveAttribute('aria-label', '关闭目录');
  await expect(page.locator('.article-tools')).toHaveClass(/is-toc-open/);

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toHaveAttribute('aria-label', '打开目录');
});

test('static comment demo is clearly labelled and cannot submit comments', async ({ page }) => {
  const giscusRequests = [];
  page.on('request', request => {
    if (request.url().startsWith('https://giscus.app/')) giscusRequests.push(request.url());
  });

  await page.goto('/posts/imx-theme-introduction/', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('.article-tools .comment-jump-btn')).toHaveAttribute('href', '#comments');
  await expect(page.locator('#comments .comments-demo')).toBeVisible();
  await expect(page.locator('#comments .comments-demo-label')).toHaveText('模拟展示');
  await expect(page.locator('#comments')).toContainText('无法发布或保存评论');
  await expect(page.locator('#comments script[src="https://giscus.app/client.js"]')).toHaveCount(0);
  await expect(page.locator('#comments iframe, #comments form, #comments input, #comments textarea, #comments button')).toHaveCount(0);
  expect(giscusRequests).toEqual([]);
});

test('Giscus-enabled build renders the real comment controls and host', async ({ page }) => {
  await page.route('https://giscus.app/client.js', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: ''
  }));

  await page.goto(`${giscusBaseURL}/posts/imx-theme-introduction/`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.article-tools .comment-jump-btn')).toBeVisible();
  await expect(page.locator('#comments .giscus-host')).toBeVisible();
  await expect(page.locator('.giscus-host > script[src="https://giscus.app/client.js"]')).toHaveCount(1);
});

test('Giscus receives the matching theme when the page theme changes', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('themeMode', 'light'));
  await page.route('https://giscus.app/client.js', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: ''
  }));

  await page.goto(`${giscusBaseURL}/posts/imx-theme-introduction/`, { waitUntil: 'domcontentloaded' });
  const expectedDarkTheme = await page.locator('.giscus-host').getAttribute('data-dark-theme');
  const message = await page.evaluate(async () => {
    const frame = document.createElement('iframe');
    frame.className = 'giscus-frame';
    document.body.appendChild(frame);
    window.__imxGiscusMessages = [];
    frame.contentWindow.postMessage = (data, targetOrigin) => {
      window.__imxGiscusMessages.push({ data, targetOrigin });
    };
    document.documentElement.dataset.theme = 'dark';
    await new Promise(resolve => setTimeout(resolve, 0));
    return window.__imxGiscusMessages.at(-1);
  });

  expect(message).toEqual({
    data: { giscus: { setConfig: { theme: expectedDarkTheme } } },
    targetOrigin: 'https://giscus.app'
  });
});

test('About visitor APIs keep all four exact URLs and their fallback order', async ({ page }) => {
  const requests = [];
  await page.addInitScript(() => {
    const originalSetTimeout = window.setTimeout.bind(window);
    window.__imxVisitorTimeouts = [];
    window.setTimeout = (callback, delay, ...args) => {
      window.__imxVisitorTimeouts.push(delay);
      return originalSetTimeout(callback, delay, ...args);
    };
  });
  await page.route(/https:\/\/(ipwho\.is|ipapi\.co|freeipapi\.com|api\.ip\.sb)\//, route => {
    const url = route.request().url();
    requests.push(url);
    if (url !== visitorAPIURLs[3]) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(visitorPayload())
    });
  });

  await page.goto('/about/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-visitor-ip]')).toHaveText('203.0.113.10');
  await expect(page.locator('[data-visitor-location]')).toHaveText('上海');
  expect(requests).toEqual(visitorAPIURLs);
  const visitorTimeouts = await page.evaluate(() => window.__imxVisitorTimeouts);
  expect(visitorTimeouts.filter(delay => delay === 2800)).toHaveLength(4);
});

test('About visitor falls back after a timed-out provider', async ({ page }) => {
  await page.addInitScript(firstURL => {
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (url, options = {}) => {
      if (String(url) !== firstURL) return nativeFetch(url, options);

      return new Promise((resolve, reject) => {
        options.signal.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        }, { once: true });
      });
    };
  }, visitorAPIURLs[0]);
  const requests = [];
  await page.route(/https:\/\/(ipapi\.co|freeipapi\.com|api\.ip\.sb)\//, route => {
    requests.push(route.request().url());
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(visitorPayload())
    });
  });

  await page.goto('/about/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-visitor-ip]')).toHaveText('203.0.113.10', { timeout: 5_000 });
  await expect(page.locator('[data-visitor-location]')).toHaveText('上海');
  expect(requests).toEqual([visitorAPIURLs[1]]);
});

test('About visitor preserves the default display when all providers fail', async ({ page }) => {
  const requests = [];
  await page.route(/https:\/\/(ipwho\.is|ipapi\.co|freeipapi\.com|api\.ip\.sb)\//, route => {
    requests.push(route.request().url());
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await page.goto('/about/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-visitor-ip]')).toHaveText('获取失败');
  await expect(page.locator('[data-visitor-location]')).toHaveText('地区未知');
  expect(requests).toEqual(visitorAPIURLs);
});

test('About visitor cache suppresses requests for ten minutes', async ({ page }) => {
  let requestCount = 0;
  await page.addInitScript(({ key, payload }) => {
    sessionStorage.setItem(key, JSON.stringify(payload));
  }, {
    key: visitorCacheKey,
    payload: { ip: '198.51.100.8', location: '缓存地区', timestamp: Date.now() }
  });
  await page.route(/https:\/\/(ipwho\.is|ipapi\.co|freeipapi\.com|api\.ip\.sb)\//, route => {
    requestCount += 1;
    return route.fulfill({ status: 500, body: '{}' });
  });

  await page.goto('/about/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-visitor-ip]')).toHaveText('198.51.100.8');
  await expect(page.locator('[data-visitor-location]')).toHaveText('缓存地区');
  expect(requestCount).toBe(0);
});

test('About visitor cache expires after ten minutes', async ({ page }) => {
  const requests = [];
  await page.addInitScript(({ key, payload }) => {
    sessionStorage.setItem(key, JSON.stringify(payload));
  }, {
    key: visitorCacheKey,
    payload: {
      ip: '198.51.100.8',
      location: '过期地区',
      timestamp: Date.now() - 10 * 60 * 1000 - 1
    }
  });
  await page.route(/https:\/\/(ipwho\.is|ipapi\.co|freeipapi\.com|api\.ip\.sb)\//, route => {
    requests.push(new URL(route.request().url()).hostname);
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(visitorPayload())
    });
  });

  await page.goto('/about/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-visitor-ip]')).toHaveText('203.0.113.10');
  expect(requests).toEqual(['ipwho.is']);
});
