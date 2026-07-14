import { htmlElement, themeLogos, themeToggle } from "./core/dom.js";
import { getStorageItem, setStorageItem } from "./core/storage.js";

const THEME_MODE_KEY = "themeMode";
const THEME_KEY = "theme";
const THEME_MODES = ["light", "dark", "auto"];
const EAST_8_OFFSET = 8 * 60 * 60 * 1000;
let autoThemeTimer = null;

// 获取保存的主题模式；没有明确选择时默认跟随自动模式
export function getThemeMode() {
  const savedMode = getStorageItem(THEME_MODE_KEY);

  if (THEME_MODES.includes(savedMode)) {
    return savedMode;
  }

  return 'auto';
}

// 按东八区时间计算自动主题：18:00 后深色，08:00 后浅色
function getEast8Date(date = new Date()) {
  return new Date(date.getTime() + EAST_8_OFFSET);
}

function getAutoTheme(date = new Date()) {
  const east8Hour = getEast8Date(date).getUTCHours();
  return east8Hour >= 18 || east8Hour < 8 ? 'dark' : 'light';
}

function getNextAutoThemeDelay() {
  const now = new Date();
  const east8Now = getEast8Date(now);
  const east8Boundary = new Date(east8Now);
  const hour = east8Now.getUTCHours();

  east8Boundary.setUTCMinutes(0, 0, 0);

  if (hour < 8) {
    east8Boundary.setUTCHours(8);
  } else if (hour < 18) {
    east8Boundary.setUTCHours(18);
  } else {
    east8Boundary.setUTCDate(east8Boundary.getUTCDate() + 1);
    east8Boundary.setUTCHours(8);
  }

  return Math.max(1000, east8Boundary.getTime() - east8Now.getTime());
}

// 设置实际主题
function setTheme(theme, options = {}) {
  const { persistTheme = true } = options;

  htmlElement.setAttribute('data-theme', theme);

  if (persistTheme) {
    setStorageItem(THEME_KEY, theme);
  }

  updateThemeAssets(theme);
}

function updateThemeAssets(theme) {
  const favicons = window.__IMX_FAVICONS__;
  const favicon = document.querySelector('link[data-imx-favicon]');
  const faviconHref = favicons && (theme === 'dark' ? favicons.dark : favicons.light);

  if (favicon && faviconHref) {
    favicon.setAttribute('href', faviconHref);
  }

  themeLogos.forEach((logo) => {
    const logoSource = theme === 'dark' ? logo.dataset.logoDark : logo.dataset.logoLight;

    if (logoSource && logo.getAttribute('src') !== logoSource) {
      logo.setAttribute('src', logoSource);
    }
  });
}

// 更新主题图标
function updateThemeButton(mode, theme) {
  if (!themeToggle) {
    return;
  }

  const icon = theme === 'dark' ? 'icon-moon' : 'icon-sun';
  const labelMap = {
    light: '主题模式：手动浅色，点击切换为深色',
    dark: '主题模式：手动深色，点击切换为自动',
    auto: `主题模式：自动（当前${theme === 'dark' ? '深色' : '浅色'}），点击切换为手动浅色`
  };

  themeToggle.innerHTML = `<svg class="theme-toggle-icon" width="20" height="20" fill="currentColor"><use href="#${icon}"></use></svg><span class="theme-toggle-auto-badge" aria-hidden="true">A</span>`;
  themeToggle.setAttribute('aria-label', labelMap[mode]);
  themeToggle.setAttribute('title', labelMap[mode]);
  themeToggle.dataset.themeMode = mode;
}

function scheduleAutoThemeSync(mode) {
  if (autoThemeTimer) {
    window.clearTimeout(autoThemeTimer);
    autoThemeTimer = null;
  }

  if (mode !== 'auto') {
    return;
  }

  autoThemeTimer = window.setTimeout(() => {
    applyThemeMode('auto', { persist: false });
  }, getNextAutoThemeDelay());
}

// 设置主题模式
export function applyThemeMode(mode, options = {}) {
  const { persist = true } = options;
  const safeMode = THEME_MODES.includes(mode) ? mode : 'auto';
  const theme = safeMode === 'auto' ? getAutoTheme() : safeMode;

  htmlElement.setAttribute('data-theme-mode', safeMode);
  setTheme(theme, { persistTheme: persist });

  if (persist) {
    setStorageItem(THEME_MODE_KEY, safeMode);
  }

  updateThemeButton(safeMode, theme);
  scheduleAutoThemeSync(safeMode);
}

export function initTheme() {
  applyThemeMode(getThemeMode(), { persist: false });
}

export function bindThemeToggle() {
  if (!themeToggle) return;

  themeToggle.addEventListener("click", () => {
    const currentMode = htmlElement.getAttribute("data-theme-mode") || getThemeMode();
    const currentIndex = THEME_MODES.indexOf(currentMode);
    const nextMode = THEME_MODES[(currentIndex + 1) % THEME_MODES.length];
    applyThemeMode(nextMode);
  });
}
