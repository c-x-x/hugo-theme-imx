// Let the browser cache likely next documents without rendering hidden pages.
export function initPagePrefetch() {
  const connection = navigator.connection;
  function allowed() {
    return !document.hidden && navigator.onLine !== false &&
      !(connection && (connection.saveData || /(^|-)2g$/.test(connection.effectiveType)));
  }
  const seen = new Set();
  const limit = 6;
  let hoverTimer;
  const supportsRules = typeof HTMLScriptElement.supports === 'function' && HTMLScriptElement.supports('speculationrules');
  let rules = null;

  function prefetch(link) {
    if (!allowed() || !link || seen.size >= limit || link.hasAttribute('download') ||
        link.matches('[data-no-prefetch], [rel~="nofollow"]') || (link.target && link.target !== '_self')) return;
    let url;
    try { url = new URL(link.href, location.href); } catch { return; }
    if (url.origin !== location.origin || !/^https?:$/.test(url.protocol) || url.search || url.hash ||
        url.pathname === location.pathname || /\.[a-z0-9]+$/i.test(url.pathname) || seen.has(url.href)) return;
    seen.add(url.href);
    if (supportsRules) {
      // Browsers process a script only once, so each rule update needs a new node.
      rules?.remove();
      rules = document.createElement('script');
      rules.type = 'speculationrules';
      rules.dataset.imxPrefetch = '';
      rules.textContent = JSON.stringify({ prefetch: [{ urls: Array.from(seen), eagerness: 'immediate' }] });
      document.head.append(rules);
    } else {
      const hint = document.createElement('link');
      hint.rel = 'prefetch';
      hint.href = url.href;
      hint.dataset.imxPrefetch = '';
      if (hint.relList.supports && hint.relList.supports('prefetch')) {
        document.head.append(hint);
      } else {
        // Safari fallback: reuse HTTP caching; never keep a private HTML cache.
        fetch(url.href, { credentials: 'same-origin', priority: 'low', headers: { Accept: 'text/html' } }).catch(() => {});
      }
    }
  }

  document.addEventListener('pointerover', event => {
    clearTimeout(hoverTimer);
    const link = event.target.closest('a[href]');
    if (link) hoverTimer = setTimeout(() => prefetch(link), 120);
  });
  document.addEventListener('pointerout', () => clearTimeout(hoverTimer));
  document.addEventListener('focusin', event => prefetch(event.target.closest('a[href]')));
  document.addEventListener('pointerdown', event => {
    if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      prefetch(event.target.closest('a[href]'));
    }
  });
  function warmNextPages() {
    if (!allowed()) return;
    // Only two likely destinations during idle; remaining budget follows intent.
    const candidates = [
      ...document.querySelectorAll('.hero-entry-card, .post-navigation a'),
      ...document.querySelectorAll('.navbar-menu a')
    ];
    for (const link of candidates) {
      prefetch(link);
      if (seen.size >= 2) break;
    }
  }
  function scheduleWarmup() {
    if ('requestIdleCallback' in window) requestIdleCallback(warmNextPages, { timeout: 2500 });
    else setTimeout(warmNextPages, 1500);
  }
  if (window.__IMX_PAGE_READY__) scheduleWarmup();
  else document.addEventListener('imx:page-ready', scheduleWarmup, { once: true });
}
