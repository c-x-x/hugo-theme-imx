import { setStorageItem } from "./core/storage.js";

// Keep the gesture on the home-page logo; the brand link elsewhere stays native.
export function initFontSwitch() {
  if (!document.body.classList.contains('is-home')) return;
  const logo = document.querySelector('.navbar-brand .navbar-logo-wrap');
  if (!logo) return;

  let clicks = [];
  logo.addEventListener('click', (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const now = performance.now();
    clicks = clicks.filter(time => now - time <= 5000);
    clicks.push(now);
    if (clicks.length < 3) return;
    clicks = [];

    const root = document.documentElement;
    const font = root.dataset.font === 'wenkai' ? 'default' : 'wenkai';
    root.dataset.font = font;
    setStorageItem('imxFont', font);

    // Font metrics affect the animated navigation geometry.
    requestAnimationFrame(() => {
      document.fonts.ready.then(() => window.dispatchEvent(new Event('resize')));
    });
  });
}
