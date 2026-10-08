import { celebrateFontSwitch } from "./font-confetti.js";
import { setStorageItem } from "./core/storage.js";

// The home avatar holds the hidden gesture; brand links stay native.
export function initFontSwitch() {
  if (!document.body.classList.contains('is-home')) return;
  const avatar = document.querySelector('[data-font-switch-avatar]');
  if (!avatar) return;

  let clicks = [];
  avatar.addEventListener('click', (event) => {
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
    celebrateFontSwitch();

    // Font metrics affect the animated navigation geometry.
    requestAnimationFrame(() => {
      document.fonts.ready.then(() => window.dispatchEvent(new Event('resize')));
    });
  });
}
