// Inlined in <head> so loading and its escape hatch do not depend on the main bundle.
(function () {
  const root = document.documentElement;
  const started = performance.now();
  let finished = false;
  let deadline;
  let warmup;
  let seenSite = false;
  try { seenSite = sessionStorage.getItem('imxSiteReady') === '1'; } catch {}
  window.__IMX_PAGE_READY__ = false;
  root.dataset.imxPageState = 'preparing';

  function showLoader() {
    if (finished) return;
    root.classList.add('imx-page-loading');
    document.querySelector('[data-page-content]')?.setAttribute('inert', '');
  }

  function reveal(immediate) {
    if (finished) return;
    finished = true;
    clearTimeout(deadline);
    clearTimeout(warmup);
    const wasVisible = root.classList.contains('imx-page-loading');
    window.__IMX_PAGE_READY__ = true;
    root.dataset.imxPageState = 'ready';
    try { sessionStorage.setItem('imxSiteReady', '1'); } catch {}
    root.classList.remove('imx-page-loading');
    const content = document.querySelector('[data-page-content]');
    if (content) content.removeAttribute('inert');
    const loader = document.querySelector('[data-page-loader]');
    if (loader) {
      loader.setAttribute('aria-hidden', 'true');
      if (immediate || !wasVisible) loader.remove();
      else setTimeout(() => loader.remove(), 350);
    }
    document.dispatchEvent(new Event('imx:page-ready'));
  }

  if (seenSite) warmup = setTimeout(showLoader, 120);
  else showLoader();
  // A failed script, font or image must never trap the reader behind the loader.
  deadline = setTimeout(() => reveal(false), 6000);
  window.addEventListener('pageshow', event => {
    if (event.persisted) {
      // Restoring browser history should show the cached page immediately.
      finished = false;
      reveal(true);
    }
  });

  window.addEventListener('pagereveal', event => {
    // Skipping an animation rejects ready; this is an expected fallback,
    // rather than an unhandled application error.
    event.viewTransition?.ready.catch(() => {});
    if (root.classList.contains('imx-page-loading')) event.viewTransition?.skipTransition();
  });

  document.addEventListener('DOMContentLoaded', async () => {
    if (finished) return;
    const content = document.querySelector('[data-page-content]');
    if (content && root.classList.contains('imx-page-loading')) content.setAttribute('inert', '');
    try {
      // Let layout select fonts and identify first-screen images. Lazy images
      // below the viewport and third-party widgets do not block presentation.
      await new Promise(resolve => setTimeout(resolve, 0));
      await window.__IMX_CONTENT_READY__;
      await window.__IMX_HOME_READY__;
      const images = Array.from(document.images).filter(image => {
        const rect = image.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight;
      });
      await Promise.all([
        document.fonts ? document.fonts.ready : Promise.resolve(),
        ...images.map(image => image.decode ? image.decode().catch(() => {}) : Promise.resolve())
      ]);
      const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const remaining = reducedMotion || seenSite ? 0 : Math.max(0, 450 - (performance.now() - started));
      if (remaining) await new Promise(resolve => setTimeout(resolve, remaining));
      // Native navigation transitions can suspend animation frames. Readiness
      // must not wait for a frame held by the transition itself.
      if (!seenSite) await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    } catch {
      // Resource failure leaves readable original content and normal navigation.
    } finally {
      reveal(false);
    }
  }, { once: true });
}());
