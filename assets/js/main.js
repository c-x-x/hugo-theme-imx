// IMX Theme JavaScript
// 主题切换、侧边栏、搜索、阅读进度条等功能

(function() {
  'use strict';

  // ============================================
  // Theme Toggle - 主题切换
  // ============================================
  const themeToggle = document.querySelector('.theme-toggle');
  const themeLogos = document.querySelectorAll('[data-logo-light][data-logo-dark]');
  const htmlElement = document.documentElement;
  const mobileQuery = window.matchMedia('(max-width: 768px)');
  const THEME_MODE_KEY = 'themeMode';
  const THEME_KEY = 'theme';
  const THEME_MODES = ['light', 'dark', 'auto'];
  const EAST_8_OFFSET = 8 * 60 * 60 * 1000;
  let autoThemeTimer = null;

  function getStorageItem(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function setStorageItem(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      // Ignore storage errors so theme switching still works in restricted contexts.
    }
  }

  function getSameOriginPath(url) {
    try {
      const rawURL = String(url || '').trim();

      if (!rawURL) {
        return null;
      }

      const parsedURL = new URL(rawURL, window.location.href);

      if (parsedURL.origin !== window.location.origin) {
        return null;
      }

      return `${parsedURL.pathname}${parsedURL.search}${parsedURL.hash}`;
    } catch (error) {
      return null;
    }
  }

  // 获取保存的主题模式，兼容旧版 theme 存储
  function getThemeMode() {
    const savedMode = getStorageItem(THEME_MODE_KEY);

    if (THEME_MODES.includes(savedMode)) {
      return savedMode;
    }

    const legacyTheme = getStorageItem(THEME_KEY);
    return legacyTheme === 'dark' ? 'dark' : 'light';
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
  function setTheme(theme) {
    htmlElement.setAttribute('data-theme', theme);
    setStorageItem(THEME_KEY, theme);
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
  function applyThemeMode(mode, options = {}) {
    const { persist = true } = options;
    const safeMode = THEME_MODES.includes(mode) ? mode : 'light';
    const theme = safeMode === 'auto' ? getAutoTheme() : safeMode;

    htmlElement.setAttribute('data-theme-mode', safeMode);
    setTheme(theme);

    if (persist) {
      setStorageItem(THEME_MODE_KEY, safeMode);
    }

    updateThemeButton(safeMode, theme);
    scheduleAutoThemeSync(safeMode);
  }

  // 初始化主题
  applyThemeMode(getThemeMode(), { persist: false });

  // 主题切换事件
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const currentMode = htmlElement.getAttribute('data-theme-mode') || getThemeMode();
      const currentIndex = THEME_MODES.indexOf(currentMode);
      const nextMode = THEME_MODES[(currentIndex + 1) % THEME_MODES.length];

      applyThemeMode(nextMode);
    });
  }

  // ============================================
  // Sidebar Toggle - 侧边栏切换
  // ============================================
  const sidebarToggle = document.querySelector('.sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');

  if (sidebarToggle && sidebar) {
    function updateSidebarIcon(isOpen) {
      sidebarToggle.innerHTML = isOpen
        ? '<svg width="24" height="24" fill="currentColor"><use href="#icon-close"></use></svg>'
        : '<svg width="24" height="24" fill="currentColor"><use href="#icon-menu"></use></svg>';
    }

    function syncSidebarMode() {
      if (mobileQuery.matches) {
        sidebar.classList.remove('collapsed');
        sidebar.classList.remove('active');
        sidebarToggle.classList.remove('active');
        updateSidebarIcon(false);
        return;
      }

      sidebar.classList.remove('active');
      sidebarToggle.classList.remove('active');
      const isCollapsed = getStorageItem('sidebarCollapsed') === 'true';
      sidebar.classList.toggle('collapsed', isCollapsed);
      updateSidebarIcon(!isCollapsed);
    }

    syncSidebarMode();

    sidebarToggle.addEventListener('click', () => {
      if (mobileQuery.matches) {
        const isOpen = !sidebar.classList.contains('active');
        sidebar.classList.toggle('active', isOpen);
        sidebarToggle.classList.toggle('active', isOpen);
        updateSidebarIcon(isOpen);
        return;
      }

      sidebarToggle.classList.remove('active');
      const isCollapsed = sidebar.classList.contains('collapsed');
      sidebar.classList.toggle('collapsed', !isCollapsed);
      setStorageItem('sidebarCollapsed', !isCollapsed);
      updateSidebarIcon(isCollapsed);
    });

    mobileQuery.addEventListener('change', () => {
      syncSidebarMode();
    });
  }

  // ============================================
  // Reading Progress Bar - 阅读进度条
  // ============================================
  const progressBar = document.querySelector('.reading-progress');

  if (progressBar) {
    window.addEventListener('scroll', () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight - windowHeight;
      const scrolled = window.scrollY;
      const progress = documentHeight <= 0
        ? 0
        : Math.min(Math.max((scrolled / documentHeight) * 100, 0), 100);

      progressBar.style.width = progress + '%';
    });
  }

  // ============================================
  // Smooth Scroll - 平滑滚动
  // ============================================
  // CSS 中已经有 scroll-behavior: smooth 和 scroll-margin-top
  // 锚点跳转使用浏览器原生行为即可，无需 JavaScript 干预

  // ============================================
  // TOC Active Link - 目录激活
  // ============================================
  const tocLinks = document.querySelectorAll('.toc a');
  const headings = document.querySelectorAll('.article-content h2, .article-content h3, .article-content h4, .article-content h5, .article-content h6');

  if (tocLinks.length > 0 && headings.length > 0) {
    const observerOptions = {
      rootMargin: '-100px 0px -66%',
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          if (id) {
            tocLinks.forEach(link => {
              link.classList.remove('active');
              if (link.getAttribute('href') === '#' + id) {
                link.classList.add('active');
              }
            });
          }
        }
      });
    }, observerOptions);

    headings.forEach(heading => {
      if (heading.getAttribute('id')) {
        observer.observe(heading);
      }
    });
  }

  // ============================================
  // Search Functionality - 搜索功能
  // ============================================
  const searchInput = document.querySelector('.search-input');
  const searchResults = document.querySelector('.search-results');

  if (searchInput && searchResults) {
    let searchIndex = [];
    const searchIndexURL = document.body.dataset.searchIndex || '/index.json';

    // 加载搜索索引
    fetch(searchIndexURL)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Search index request failed: ${response.status}`);
        }

        return response.json();
      })
      .then(data => {
        searchIndex = Array.isArray(data) ? data : [];
      })
      .catch(() => console.warn('IMX Theme: 未找到搜索索引，请确认首页启用了 JSON 输出。'));

    // 搜索函数
    function performSearch(query) {
      if (!query || query.length < 2) {
        searchResults.classList.remove('active');
        return;
      }

      const results = searchIndex.filter(item => {
        const title = String(item.title || '').toLowerCase();
        const content = String(item.content || '').toLowerCase();
        const searchTerm = query.toLowerCase();
        return title.includes(searchTerm) || content.includes(searchTerm);
      }).slice(0, 10);

      displayResults(results, query);
    }

    // 显示搜索结果
    function displayResults(results, query) {
      searchResults.textContent = '';

      if (results.length === 0) {
        const emptyResult = document.createElement('div');
        emptyResult.className = 'search-result-item';
        emptyResult.textContent = '未找到相关内容';
        searchResults.appendChild(emptyResult);
      } else {
        const fragment = document.createDocumentFragment();
        let visibleCount = 0;

        results.forEach(result => {
          const permalink = getSameOriginPath(result.permalink);

          if (!permalink) {
            return;
          }

          const link = document.createElement('a');
          const title = document.createElement('h3');
          const summary = document.createElement('p');

          link.href = permalink;
          link.className = 'search-result-item';
          title.innerHTML = highlightText(result.title, query);
          summary.innerHTML = highlightText(result.summary || '', query);

          link.append(title, summary);
          fragment.appendChild(link);
          visibleCount += 1;
        });

        if (visibleCount === 0) {
          const emptyResult = document.createElement('div');
          emptyResult.className = 'search-result-item';
          emptyResult.textContent = '未找到相关内容';
          searchResults.appendChild(emptyResult);
        } else {
          searchResults.appendChild(fragment);
        }
      }

      searchResults.classList.add('active');
    }

    // 高亮搜索词
    function highlightText(text, query) {
      const escapedText = String(text || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedQuery})`, 'gi');

      return escapedText.replace(regex, '<mark>$1</mark>');
    }

    // 搜索输入事件
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        performSearch(e.target.value);
      }, 300);
    });

    // 点击外部关闭搜索结果
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-container')) {
        searchResults.classList.remove('active');
      }
    });
  }

  // ============================================
  // Code Copy Button - 代码复制按钮
  // ============================================
  document.querySelectorAll('.highlight').forEach((block, index) => {
    const codeElement = block.querySelector('code');

    if (!codeElement) {
      return;
    }

    // 添加复制按钮
    const button = document.createElement('button');
    button.className = 'copy-code-button';
    button.textContent = '复制';

    button.addEventListener('click', () => {
      copyText(codeElement.textContent || '').then(() => {
        button.textContent = '已复制';
        setTimeout(() => {
          button.textContent = '复制';
        }, 2000);
      }).catch(() => {
        button.textContent = '复制失败';
        setTimeout(() => {
          button.textContent = '复制';
        }, 2000);
      });
    });

    block.appendChild(button);

    // 添加语言标签（右下角）
    const langElement = block.querySelector('code[data-lang]');
    if (langElement) {
      const lang = langElement.getAttribute('data-lang') || 'bash';
      const langLabel = document.createElement('span');
      langLabel.className = 'code-lang-label';
      langLabel.textContent = lang;
      block.appendChild(langLabel);
    } else {
      // 没有 data-lang，默认显示 bash
      const langLabel = document.createElement('span');
      langLabel.className = 'code-lang-label';
      langLabel.textContent = 'bash';
      block.appendChild(langLabel);
    }
  });

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }

    return new Promise((resolve, reject) => {
      const textarea = document.createElement('textarea');

      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.top = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();

      try {
        if (document.execCommand('copy')) {
          resolve();
        } else {
          reject(new Error('Copy command failed'));
        }
      } catch (error) {
        reject(error);
      } finally {
        textarea.remove();
      }
    });
  }

  // ============================================
  // Mobile Menu Toggle - 移动端菜单
  // ============================================
  const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
  const navbarMenu = document.querySelector('.navbar-menu');

  if (mobileMenuToggle && navbarMenu) {
    mobileMenuToggle.setAttribute('aria-expanded', 'false');

    function setMobileMenu(open) {
      navbarMenu.classList.toggle('active', open);
      mobileMenuToggle.classList.toggle('active', open);
      mobileMenuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      mobileMenuToggle.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
      document.body.classList.toggle('mobile-menu-open', open);
    }

    mobileMenuToggle.addEventListener('click', () => {
      setMobileMenu(!navbarMenu.classList.contains('active'));
    });

    navbarMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        if (mobileQuery.matches) {
          setMobileMenu(false);
        }
      });
    });

    document.addEventListener('click', (e) => {
      if (
        mobileQuery.matches &&
        navbarMenu.classList.contains('active') &&
        !e.target.closest('.navbar-container')
      ) {
        setMobileMenu(false);
      }
    });

    window.addEventListener('resize', () => {
      if (!mobileQuery.matches) {
        setMobileMenu(false);
      }
    });
  }

  // ============================================
  // Lazy Load Images - 图片懒加载
  // ============================================
  const images = document.querySelectorAll('img[data-src]');

  if ('IntersectionObserver' in window && images.length > 0) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          observer.unobserve(img);
        }
      });
    });

    images.forEach(img => imageObserver.observe(img));
  }

  // ============================================
  // Animation on Scroll - 滚动动画
  // ============================================
  const animatedElements = document.querySelectorAll('.post-card, .sidebar-widget');

  if ('IntersectionObserver' in window && animatedElements.length > 0) {
    const animationObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('fade-in');
          animationObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1
    });

    animatedElements.forEach(el => animationObserver.observe(el));
  }

  // ============================================
  // External Links - 外部链接在新标签打开
  // ============================================
  document.querySelectorAll('a[href]').forEach(link => {
    try {
      const linkURL = new URL(link.href, window.location.href);

      if (
        (linkURL.protocol === 'http:' || linkURL.protocol === 'https:') &&
        linkURL.origin !== window.location.origin
      ) {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      }
    } catch (error) {
      // Ignore malformed href values and leave them untouched.
    }
  });

  // ============================================
  // Liquid Glass Navbar - iOS 风格液态玻璃导航栏
  // ============================================
  // 使用前面已声明的 navbarMenu

  if (navbarMenu) {
    const menuLinks = Array.from(navbarMenu.querySelectorAll('a'));
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let menuRect = null;
    let indicatorOriginX = 0;
    let indicatorAreaWidth = 0;
    let itemMetrics = [];
    let isPointerTracking = false;
    let resizeTimeout = null;
    let indicatorFrame = null;
    let lastFrameTime = 0;
    const indicator = {
      center: 0,
      width: 0,
      targetCenter: 0,
      targetWidth: 0,
      velocity: 0,
      widthVelocity: 0,
      lift: 0,
      liftTarget: 0,
      liftVelocity: 0,
      direction: 0,
      visible: false,
      initialized: false
    };

    // 设置当前激活页面，支持自定义菜单和子目录部署。
    function setActiveLink() {
      function normalizePath(path) {
        return path.replace(/\/$/, '') || '/';
      }

      const normalizedCurrentPath = normalizePath(window.location.pathname);
      let activeLink = null;
      let activePathLength = -1;

      menuLinks.forEach(link => {
        link.classList.remove('active');
        link.removeAttribute('aria-current');

        const linkURL = new URL(link.href, window.location.href);
        if (linkURL.origin !== window.location.origin) return;

        const linkPath = linkURL.pathname;
        const normalizedLinkPath = normalizePath(linkPath);
        const exactMatch = normalizedLinkPath === normalizedCurrentPath;
        const sectionMatch = normalizedLinkPath !== '/' &&
          normalizedCurrentPath.startsWith(`${normalizedLinkPath}/`);

        if ((exactMatch || sectionMatch) && normalizedLinkPath.length > activePathLength) {
          activeLink = link;
          activePathLength = normalizedLinkPath.length;
        }
      });

      if (activeLink) {
        activeLink.classList.add('active');
        activeLink.setAttribute('aria-current', 'page');
      }

      return Boolean(activeLink);
    }

    function isDesktopNavbar() {
      return !mobileQuery.matches;
    }

    function clamp(value, min, max) {
      return Math.min(Math.max(value, min), max);
    }

    function refreshNavbarMetrics() {
      menuRect = navbarMenu.getBoundingClientRect();
      const menuStyle = window.getComputedStyle(navbarMenu);
      const borderLeft = parseFloat(menuStyle.borderLeftWidth) || 0;
      const borderRight = parseFloat(menuStyle.borderRightWidth) || 0;
      indicatorOriginX = menuRect.left + borderLeft;
      indicatorAreaWidth = Math.max(menuRect.width - borderLeft - borderRight, 0);
      itemMetrics = menuLinks
        .map(link => {
          const item = link.parentElement;
          if (!item) return null;
          const itemRect = item.getBoundingClientRect();
          const left = itemRect.left - indicatorOriginX;
          const width = itemRect.width;

          return {
            link,
            left,
            width,
            center: left + width / 2
          };
        })
        .filter(Boolean);
    }

    function metricForLink(link) {
      return itemMetrics.find(metric => metric.link === link);
    }

    function setIndicatorVisualVariable(name, value) {
      navbarMenu.style.setProperty(name, value);
    }

    function renderIndicator() {
      if (!menuRect || !indicator.initialized) return;

      const distance = indicator.targetCenter - indicator.center;
      const baseWidth = Math.max(indicator.width, 1);
      const stretchLimit = Math.min(
        indicatorAreaWidth * 0.34,
        Math.max(indicator.targetWidth * 1.4, 56)
      );
      const stretch = reducedMotionQuery.matches
        ? 0
        : clamp(
            Math.abs(distance) * 1.05 + Math.abs(indicator.velocity) * 0.2,
            0,
            stretchLimit
          );
      const renderedWidth = Math.min(baseWidth + stretch, indicatorAreaWidth + 8);
      const renderedCenter = indicator.center + distance * 0.5;
      const minLeft = -4;
      const maxLeft = Math.max(minLeft, indicatorAreaWidth - renderedWidth + 4);
      const left = clamp(renderedCenter - renderedWidth / 2, minLeft, maxLeft);
      const direction = Math.abs(distance) > 0.35
        ? Math.sign(distance)
        : (Math.abs(indicator.velocity) > 0.08
            ? Math.sign(indicator.velocity)
            : indicator.direction);
      const energy = clamp(
        stretch / Math.max(indicator.targetWidth * 1.1, 1),
        0,
        1
      );
      const lift = clamp(indicator.lift, 0, 1.12);
      const visualEnergy = lift * energy;
      const widthBounce = clamp(
        Math.abs(indicator.targetWidth - indicator.width) /
          Math.max(indicator.targetWidth, 1),
        0,
        0.35
      );
      const indicatorInsetY = -lift * 2.75 - visualEnergy * 2.75;
      const scaleY =
        1 +
        lift * 0.045 +
        visualEnergy * 0.11 -
        widthBounce * 0.04 * lift;
      const skew = direction * visualEnergy * -2.4;
      const edgeOpacity = indicator.visible
        ? lift * (0.22 + energy * 0.5)
        : 0;

      indicator.direction = direction || indicator.direction;

      setIndicatorVisualVariable('--indicator-x', `${left.toFixed(3)}px`);
      setIndicatorVisualVariable('--indicator-width', `${renderedWidth.toFixed(3)}px`);
      setIndicatorVisualVariable('--indicator-inset-y', `${indicatorInsetY.toFixed(3)}px`);
      setIndicatorVisualVariable('--indicator-scale-y', scaleY.toFixed(4));
      setIndicatorVisualVariable('--indicator-skew', `${skew.toFixed(3)}deg`);
      setIndicatorVisualVariable('--indicator-energy', energy.toFixed(4));
      setIndicatorVisualVariable('--indicator-direction', String(direction || 0));
      setIndicatorVisualVariable('--indicator-light-x', `${(50 + direction * visualEnergy * 18).toFixed(2)}%`);
      setIndicatorVisualVariable('--indicator-blur', `${(10 + lift * 14 + visualEnergy * 10).toFixed(2)}px`);
      setIndicatorVisualVariable('--indicator-saturation', `${(130 + lift * 50 + visualEnergy * 65).toFixed(1)}%`);
      setIndicatorVisualVariable('--indicator-shadow-y', `${(lift * (8 + energy * 5)).toFixed(2)}px`);
      setIndicatorVisualVariable('--indicator-shadow-blur', `${(lift * (18 + energy * 20)).toFixed(2)}px`);
      setIndicatorVisualVariable(
        '--indicator-shadow-color',
        `rgba(15, 23, 42, ${(lift * (0.09 + energy * 0.09)).toFixed(3)})`
      );
      setIndicatorVisualVariable('--indicator-glow-blur', `${(lift * (12 + energy * 28)).toFixed(2)}px`);
      setIndicatorVisualVariable(
        '--indicator-glow-color',
        `rgba(var(--color-primary-rgb), ${(lift * (0.05 + energy * 0.15)).toFixed(3)})`
      );
      setIndicatorVisualVariable('--indicator-inset-x', `${(-direction * visualEnergy * 8).toFixed(2)}px`);
      setIndicatorVisualVariable('--indicator-inset-alpha', (0.08 + lift * 0.07 + visualEnergy * 0.08).toFixed(3));
      setIndicatorVisualVariable('--indicator-brightness', (1 + lift * 0.05 + visualEnergy * 0.04).toFixed(3));
      setIndicatorVisualVariable('--indicator-edge-angle', `${(105 + direction * visualEnergy * 20).toFixed(2)}deg`);
      setIndicatorVisualVariable('--indicator-edge-blur', `${(visualEnergy * 0.35).toFixed(2)}px`);
      setIndicatorVisualVariable('--indicator-edge-shadow-x', `${(direction * visualEnergy * 3).toFixed(2)}px`);
      setIndicatorVisualVariable('--indicator-edge-shadow-blur', `${(lift * (2 + energy * 4)).toFixed(2)}px`);
      setIndicatorVisualVariable('--indicator-edge-opacity', edgeOpacity.toFixed(3));
      setIndicatorVisualVariable('--indicator-tint-alpha', (0.04 + lift * 0.02 + visualEnergy * 0.06).toFixed(3));
      setIndicatorVisualVariable('--indicator-surface-alpha', (0.2 + lift * 0.22 + visualEnergy * 0.08).toFixed(3));
      setIndicatorVisualVariable('--indicator-highlight-alpha', (0.58 + lift * 0.18 + visualEnergy * 0.14).toFixed(3));
      setIndicatorVisualVariable('--indicator-border-alpha', (0.32 + lift * 0.24).toFixed(3));
      setIndicatorVisualVariable('--indicator-bottom-alpha', (0.06 + lift * 0.06).toFixed(3));
      setIndicatorVisualVariable('--indicator-outline-alpha', (0.18 + lift * 0.16 + visualEnergy * 0.12).toFixed(3));
      setIndicatorVisualVariable('--menu-outline-alpha', (0.14 + lift * 0.16).toFixed(3));
      setIndicatorVisualVariable('--indicator-opacity', indicator.visible ? '1' : '0');
    }

    function stopIndicatorAnimation() {
      if (indicatorFrame !== null) {
        cancelAnimationFrame(indicatorFrame);
        indicatorFrame = null;
      }

      lastFrameTime = 0;
    }

    function animateIndicator(timestamp) {
      const elapsed = lastFrameTime ? timestamp - lastFrameTime : 16.667;
      const frameScale = clamp(elapsed / 16.667, 0.5, 2);
      const centerStiffness = isPointerTracking ? 0.34 : 0.22;
      const centerDamping = isPointerTracking ? 0.68 : 0.72;
      const widthStiffness = isPointerTracking ? 0.27 : 0.2;
      const widthDamping = isPointerTracking ? 0.7 : 0.74;
      const liftStiffness = 0.16;
      const liftDamping = 0.74;

      lastFrameTime = timestamp;

      indicator.velocity = (
        indicator.velocity +
        (indicator.targetCenter - indicator.center) * centerStiffness * frameScale
      ) * Math.pow(centerDamping, frameScale);
      indicator.center += indicator.velocity * frameScale;

      indicator.widthVelocity = (
        indicator.widthVelocity +
        (indicator.targetWidth - indicator.width) * widthStiffness * frameScale
      ) * Math.pow(widthDamping, frameScale);
      indicator.width += indicator.widthVelocity * frameScale;

      indicator.liftVelocity = (
        indicator.liftVelocity +
        (indicator.liftTarget - indicator.lift) * liftStiffness * frameScale
      ) * Math.pow(liftDamping, frameScale);
      indicator.lift += indicator.liftVelocity * frameScale;

      renderIndicator();

      const settled =
        Math.abs(indicator.targetCenter - indicator.center) < 0.04 &&
        Math.abs(indicator.targetWidth - indicator.width) < 0.04 &&
        Math.abs(indicator.velocity) < 0.04 &&
        Math.abs(indicator.widthVelocity) < 0.04 &&
        Math.abs(indicator.liftTarget - indicator.lift) < 0.002 &&
        Math.abs(indicator.liftVelocity) < 0.002;

      if (settled) {
        indicator.center = indicator.targetCenter;
        indicator.width = indicator.targetWidth;
        indicator.velocity = 0;
        indicator.widthVelocity = 0;
        indicator.lift = indicator.liftTarget;
        indicator.liftVelocity = 0;
        indicatorFrame = null;
        lastFrameTime = 0;
        renderIndicator();
        return;
      }

      indicatorFrame = requestAnimationFrame(animateIndicator);
    }

    function startIndicatorAnimation() {
      if (indicatorFrame === null) {
        indicatorFrame = requestAnimationFrame(animateIndicator);
      }
    }

    function setIndicatorTarget(center, width, options = {}) {
      if (!Number.isFinite(center) || !Number.isFinite(width)) return;

      const instant =
        Boolean(options.instant) ||
        reducedMotionQuery.matches ||
        !indicator.initialized;

      indicator.targetCenter = center;
      indicator.targetWidth = Math.max(width, 0);
      indicator.visible = options.visible !== false;

      if (instant) {
        stopIndicatorAnimation();
        indicator.center = center;
        indicator.width = Math.max(width, 0);
        indicator.velocity = 0;
        indicator.widthVelocity = 0;
        indicator.initialized = true;
        renderIndicator();
        return;
      }

      startIndicatorAnimation();
    }

    function setIndicatorLift(target, instant = false) {
      indicator.liftTarget = clamp(target, 0, 1);

      if (instant || reducedMotionQuery.matches) {
        indicator.lift = indicator.liftTarget;
        indicator.liftVelocity = 0;
        renderIndicator();
        return;
      }

      startIndicatorAnimation();
    }

    function hideIndicator() {
      stopIndicatorAnimation();
      indicator.visible = false;
      indicator.velocity = 0;
      indicator.widthVelocity = 0;
      indicator.lift = 0;
      indicator.liftTarget = 0;
      indicator.liftVelocity = 0;
      setIndicatorVisualVariable('--indicator-opacity', '0');
      setIndicatorVisualVariable('--indicator-edge-opacity', '0');
    }

    function updateLiquidIndicator(link, instant = false) {
      if (!isDesktopNavbar()) return;

      refreshNavbarMetrics();

      const metric = metricForLink(link);
      if (!metric) {
        hideIndicator();
        return;
      }

      setIndicatorTarget(metric.center, metric.width, { instant });
    }

    // 目标点紧跟鼠标，玻璃主体由弹簧追赶；二者距离用于形成横向拉伸。
    function updateIndicatorTargetByPointer(clientX) {
      if (!isDesktopNavbar()) return;

      if (!menuRect || itemMetrics.length !== menuLinks.length) {
        refreshNavbarMetrics();
      }

      if (!menuRect || itemMetrics.length === 0) return;

      const localX = clamp(clientX - indicatorOriginX, 0, indicatorAreaWidth);
      let leftMetric = itemMetrics[0];
      let rightMetric = itemMetrics[itemMetrics.length - 1];

      for (let index = 0; index < itemMetrics.length - 1; index += 1) {
        const current = itemMetrics[index];
        const next = itemMetrics[index + 1];

        if (localX >= current.center && localX <= next.center) {
          leftMetric = current;
          rightMetric = next;
          break;
        }

        if (localX < itemMetrics[0].center) {
          rightMetric = itemMetrics[0];
          break;
        }

        if (localX > itemMetrics[itemMetrics.length - 1].center) {
          leftMetric = itemMetrics[itemMetrics.length - 1];
          break;
        }
      }

      const distance = rightMetric.center - leftMetric.center;
      const ratio = distance === 0
        ? 0
        : clamp((localX - leftMetric.center) / distance, 0, 1);
      const width = leftMetric.width + (rightMetric.width - leftMetric.width) * ratio;

      setIndicatorTarget(localX, width);
    }

    function restoreActiveIndicator() {
      const activeLink = navbarMenu.querySelector('a.active');

      if (activeLink) {
        updateLiquidIndicator(activeLink, false);
      } else {
        hideIndicator();
      }
    }

    menuLinks.forEach(link => {
      link.addEventListener('click', () => {
        menuLinks.forEach(item => {
          item.classList.remove('active');
          item.removeAttribute('aria-current');
        });
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');

        if (isDesktopNavbar()) {
          updateLiquidIndicator(link, false);
        }
      });
    });

    navbarMenu.addEventListener('pointerenter', (event) => {
      if (!isDesktopNavbar() || event.pointerType === 'touch') return;

      isPointerTracking = true;
      setIndicatorLift(1);
      refreshNavbarMetrics();
      updateIndicatorTargetByPointer(event.clientX);
    });

    navbarMenu.addEventListener('pointermove', (event) => {
      if (!isPointerTracking || event.pointerType === 'touch') return;

      updateIndicatorTargetByPointer(event.clientX);
    });

    function stopPointerTracking() {
      isPointerTracking = false;
      setIndicatorLift(0);
      restoreActiveIndicator();
    }

    navbarMenu.addEventListener('pointerleave', stopPointerTracking);
    navbarMenu.addEventListener('pointercancel', stopPointerTracking);

    function initializeIndicator() {
      setActiveLink();

      if (!isDesktopNavbar()) {
        hideIndicator();
        return;
      }

      const activeLink = navbarMenu.querySelector('a.active');

      if (activeLink) {
        updateLiquidIndicator(activeLink, true);
      } else {
        hideIndicator();
      }
    }

    initializeIndicator();

    // 窗口大小改变时重新计算 - 防抖优化
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        refreshNavbarMetrics();
        initializeIndicator();
      }, 100);
    });

    if ('ResizeObserver' in window) {
      const navbarResizeObserver = new ResizeObserver(() => {
        refreshNavbarMetrics();

        if (!isPointerTracking) initializeIndicator();
      });

      navbarResizeObserver.observe(navbarMenu);
      menuLinks.forEach(link => {
        if (link.parentElement) {
          navbarResizeObserver.observe(link.parentElement);
        }
      });
    }

    reducedMotionQuery.addEventListener('change', initializeIndicator);

    // 页面可见性变化时重新计算（解决某些浏览器的布局问题）
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        setTimeout(() => {
          // 重新设置 active 状态
          initializeIndicator();
        }, 100);
      }
    });
  }

})();
