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
  const sidebarOverlayQuery = window.matchMedia('(max-width: 768px)');
  const THEME_MODE_KEY = 'themeMode';
  const THEME_KEY = 'theme';
  const THEME_MODES = ['light', 'dark', 'auto'];
  const EAST_8_OFFSET = 8 * 60 * 60 * 1000;
  const isSafariBrowser = /^((?!android|chrome|crios|fxios|edg|opr).)*safari/i.test(navigator.userAgent);
  let autoThemeTimer = null;

  htmlElement.classList.toggle('is-safari-browser', isSafariBrowser);

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

  function onMediaQueryChange(query, callback) {
    if (query.addEventListener) {
      query.addEventListener('change', callback);
      return;
    }

    if (query.addListener) {
      query.addListener(callback);
    }
  }

  const springResult = { value: 0, velocity: 0 };

  function advanceSpring(value, velocity, target, frequency, dampingRatio, deltaTime) {
    const omega = Math.max(0.001, frequency * Math.PI * 2);
    const zeta = Math.max(0.001, dampingRatio);
    const time = Math.min(Math.max(deltaTime, 0), 0.08);
    const displacement = value - target;

    if (time === 0) {
      springResult.value = value;
      springResult.velocity = velocity;
      return;
    }

    if (zeta < 1) {
      const dampedOmega = omega * Math.sqrt(1 - zeta * zeta);
      const decay = Math.exp(-zeta * omega * time);
      const cos = Math.cos(dampedOmega * time);
      const sin = Math.sin(dampedOmega * time);
      const c2 = (velocity + zeta * omega * displacement) / dampedOmega;
      const nextDisplacement = decay * (displacement * cos + c2 * sin);
      const nextVelocity = decay * (
        -zeta * omega * (displacement * cos + c2 * sin) +
        (-displacement * dampedOmega * sin + c2 * dampedOmega * cos)
      );

      springResult.value = target + nextDisplacement;
      springResult.velocity = nextVelocity;
      return;
    }

    const decay = Math.exp(-omega * time);
    const c2 = velocity + omega * displacement;
    springResult.value = target + (displacement + c2 * time) * decay;
    springResult.velocity = (velocity - omega * c2 * time) * decay;
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

  function initHomeEntryHero() {
    const hero = document.querySelector('[data-home-entry]');

    if (!hero) {
      return;
    }

    const glyphCanvas = hero.querySelector('[data-home-glyph-canvas]');
    const typedSubtitle = hero.querySelector('[data-home-typed]');
    const javaGlyphAnnotations = [
      '@Override',
      '@Deprecated',
      '@SuppressWarnings("unchecked")',
      '@FunctionalInterface',
      '@Test',
      '@Bean',
      '@Autowired',
      '@Service',
      '@Repository',
      '@RestController',
      '@GetMapping',
      '@PostMapping',
      '@Transactional',
      '@Entity',
      '@Column(nullable = false)'
    ];
    const javaGlyphFragments = [
      'public final class',
      'private static final',
      'protected void',
      'record Result<T>',
      'interface Repository<T>',
      'enum Status',
      'extends AbstractService',
      'implements Serializable',
      'throws IOException',
      'try {',
      '} catch (Exception ex) {',
      '} finally {',
      'return Optional.empty();',
      'return ResponseEntity.ok(data);',
      'new HashMap<>()',
      'List<String>',
      'Map<String, Object>',
      'Optional<User>',
      'CompletableFuture<Result>',
      'Stream<Order>',
      'LocalDateTime.now()',
      'BigDecimal.ZERO',
      'Objects.requireNonNull(value)',
      'users.stream().map(User::name).toList()',
      'items.forEach(System.out::println)',
      'filter(item -> item.isActive())',
      'switch (status) {',
      'case READY -> start();',
      'case FAILED -> retry();',
      'default -> log.info("idle");',
      'if (value != null && value.isValid())',
      'for (int i = 0; i < size; i++)',
      'while (iterator.hasNext())',
      'synchronized (lock)',
      'var builder = new Builder();',
      'String.format("%s:%d", host, port)',
      'Path.of("src/main/java")',
      'Files.readString(path)',
      'LOGGER.debug("{}", event)'
    ];
    const javaGlyphKeywords = [
      'abstract',
      'assert',
      'boolean',
      'break',
      'case',
      'catch',
      'class',
      'continue',
      'default',
      'else',
      'extends',
      'false',
      'final',
      'finally',
      'for',
      'if',
      'implements',
      'import',
      'instanceof',
      'new',
      'null',
      'package',
      'private',
      'protected',
      'public',
      'return',
      'static',
      'super',
      'switch',
      'this',
      'throw',
      'throws',
      'true',
      'try',
      'var',
      'void',
      'while'
    ];
    const javaGlyphSymbols = [
      '::',
      '->',
      '==',
      '!=',
      '<=',
      '>=',
      '&&',
      '||',
      '++',
      '--',
      '+=',
      '-=',
      '?:',
      '<T>',
      '<K, V>',
      '[]',
      '{}',
      '()',
      ';',
      ',',
      '.',
      '...',
      '/* */',
      '//'
    ];
    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let renderFrame = 0;
    let heroResizeFrame = 0;
    let typedTimer = 0;
    let glyphFrame = 0;
    let glyphContext = null;
    let glyphRows = [];
    let glyphWidth = 1;
    let glyphHeight = 1;
    let glyphSpeed = 0.85;
    let glyphTargetSpeed = 0.85;
    let glyphPointer = { x: 1, y: 1 };
    let glyphMaskGradient = null;
    let heroVisible = true;
    let documentVisible = !document.hidden;
    let typedActive = false;
    let heroPointerFrame = 0;
    let heroPointerX = 0;
    let heroPointerY = 0;

    function pickRandom(items) {
      return items[Math.floor(Math.random() * items.length)];
    }

    function createGlyphRow(width) {
      const length = 2 * Math.ceil(width / 8.68);
      let row = '';

      while (row.length < length) {
        const roll = Math.random();
        const indent = Math.random() < 0.18 ? '  ' : '';
        let fragment;

        if (roll < 0.18) {
          fragment = pickRandom(javaGlyphAnnotations);
        } else if (roll < 0.66) {
          fragment = pickRandom(javaGlyphFragments);
        } else if (roll < 0.88) {
          fragment = `${pickRandom(javaGlyphKeywords)} ${pickRandom(javaGlyphSymbols)} ${pickRandom(javaGlyphKeywords)}`;
        } else {
          fragment = `${pickRandom(javaGlyphSymbols)} ${pickRandom(javaGlyphSymbols)} ${pickRandom(javaGlyphKeywords)}`;
        }

        row += `${indent}${fragment}${Math.random() < 0.46 ? ';' : ''}  `;
      }

      return row;
    }

    function prepareCanvas(canvas) {
      const rect = hero.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));

      if (canvas.width !== Math.round(width * ratio)) {
        canvas.width = Math.round(width * ratio);
      }

      if (canvas.height !== Math.round(height * ratio)) {
        canvas.height = Math.round(height * ratio);
      }

      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const context = canvas.getContext('2d');

      if (!context) {
        glyphContext = null;
        return null;
      }

      glyphContext = context;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);

      return { context, width, height };
    }

    function drawGlyphFrame() {
      glyphFrame = 0;

      if (!glyphCanvas) {
        return;
      }

      const context = glyphContext || glyphCanvas.getContext('2d');

      if (!context) {
        return;
      }

      if (!glyphContext) {
        glyphContext = context;
      }

      const isDark = htmlElement.getAttribute('data-theme') === 'dark';
      const rowColor = isDark ? '244, 244, 245' : '24, 32, 48';
      const accentColor = isDark ? '161, 161, 170' : '37, 99, 235';

      context.clearRect(0, 0, glyphWidth, glyphHeight);
      context.font = '650 15px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';
      context.textBaseline = 'top';
      context.textAlign = 'left';
      glyphSpeed += (glyphTargetSpeed - glyphSpeed) * 0.055;

      glyphRows.forEach((row) => {
        row.x += row.speed * glyphSpeed;

        if (row.x < -row.width / 2) {
          row.x += row.width / 2;
        }

        context.fillStyle = `rgba(${rowColor}, ${row.alpha})`;
        context.fillText(row.content, row.x, row.y);
      });

      context.save();
      context.globalCompositeOperation = 'destination-in';

      if (!glyphMaskGradient) {
        glyphMaskGradient = context.createLinearGradient(0, 0, glyphWidth, 0);
        glyphMaskGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        glyphMaskGradient.addColorStop(glyphWidth < 768 ? 0.08 : 0.16, 'rgba(0, 0, 0, 1)');
        glyphMaskGradient.addColorStop(glyphWidth < 768 ? 0.92 : 0.84, 'rgba(0, 0, 0, 1)');
        glyphMaskGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }

      context.fillStyle = glyphMaskGradient;
      context.fillRect(0, 0, glyphWidth, glyphHeight);
      context.restore();

      context.save();
      context.globalCompositeOperation = 'lighter';

      const glow = context.createRadialGradient(
        glyphPointer.x,
        glyphPointer.y,
        0,
        glyphPointer.x,
        glyphPointer.y,
        0.34 * Math.max(glyphWidth, glyphHeight)
      );
      glow.addColorStop(0, `rgba(${accentColor}, ${isDark ? 0.09 : 0.045})`);
      glow.addColorStop(0.48, `rgba(${accentColor}, ${isDark ? 0.03 : 0.015})`);
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      context.fillStyle = glow;
      context.fillRect(0, 0, glyphWidth, glyphHeight);
      context.restore();

      if (canAnimateHomeEntry()) {
        glyphFrame = window.requestAnimationFrame(drawGlyphFrame);
      }
    }

    function canAnimateHomeEntry() {
      return heroVisible && documentVisible && !reduceMotionQuery.matches;
    }

    function stopGlyphAnimation() {
      window.cancelAnimationFrame(glyphFrame);
      glyphFrame = 0;
    }

    function setupGlyphCanvas() {
      if (!glyphCanvas) {
        return;
      }

      window.cancelAnimationFrame(glyphFrame);
      glyphFrame = 0;

      const canvasState = prepareCanvas(glyphCanvas);

      if (!canvasState) {
        return;
      }

      const { context, width, height } = canvasState;
      const isDark = htmlElement.getAttribute('data-theme') === 'dark';

      glyphWidth = width;
      glyphHeight = height;
      glyphPointer = { x: 0.62 * width, y: 0.36 * height };
      glyphMaskGradient = null;
      glyphSpeed = 0.85;
      glyphTargetSpeed = 0.85;
      context.font = '650 15px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';
      glyphRows = Array.from({ length: Math.ceil(height / 18) + 2 }, (_, rowIndex) => {
        const content = createGlyphRow(width);

        return {
          alpha: (Math.random() * 0.24 + (isDark ? 0.22 : 0.2)).toFixed(3),
          content,
          speed: -(Math.random() * 0.44 + 0.34),
          width: context.measureText(content).width,
          x: -(Math.random() * width),
          y: 18 * rowIndex
        };
      });

      if (canAnimateHomeEntry()) {
        drawGlyphFrame();
      }
    }

    function updateGlyphPointer(clientX, clientY, rect = null) {
      if (!glyphCanvas) {
        return;
      }

      const glyphRect = rect || glyphCanvas.getBoundingClientRect();

      if (!glyphRect.width || !glyphRect.height) {
        return;
      }

      glyphPointer = {
        x: clientX - glyphRect.left,
        y: clientY - glyphRect.top
      };

      const halfWidth = glyphWidth / 2;
      glyphTargetSpeed = halfWidth > 0
        ? 0.55 + 2.6 * Math.abs((glyphPointer.x - halfWidth) / halfWidth)
        : 0.85;
    }

    function getSubtitleTypoPlan(chars) {
      const typoMap = {
        写: '学',
        技: '记',
        术: '书',
        记: '纪',
        录: '路',
        思: '斯',
        路: '录',
        何: '和',
        成: '呈',
        形: '型',
        文: '问',
        章: '张'
      };
      const mappedIndex = chars.findIndex((char, index) => (
        index > 0 &&
        index < chars.length - 1 &&
        Object.prototype.hasOwnProperty.call(typoMap, char)
      ));
      const typoIndex = mappedIndex >= 0
        ? mappedIndex
        : Math.max(1, Math.min(chars.length - 2, Math.floor(chars.length * 0.45)));
      const original = chars[typoIndex] || '';
      let wrongChar = typoMap[original];

      if (!wrongChar) {
        if (/^[a-z]$/i.test(original)) {
          wrongChar = original === 'x' ? 'z' : 'x';
        } else if (/^\d$/.test(original)) {
          wrongChar = original === '9' ? '8' : '9';
        } else {
          wrongChar = '的';
        }
      }

      if (wrongChar === original) {
        wrongChar = '的';
      }

      return { typoIndex, wrongChar };
    }

    function stopTypedSubtitle(resetText) {
      window.clearTimeout(typedTimer);
      typedTimer = 0;
      typedActive = false;

      if (resetText && typedSubtitle) {
        const text = typedSubtitle.dataset.homeTypedText || typedSubtitle.getAttribute('aria-label') || '';
        typedSubtitle.textContent = text;
      }
    }

    function initTypedSubtitle() {
      if (!typedSubtitle) {
        return;
      }

      const originalText = typedSubtitle.dataset.homeTypedText || typedSubtitle.textContent.trim();

      if (!originalText) {
        return;
      }

      typedSubtitle.dataset.homeTypedText = originalText;
      typedSubtitle.setAttribute('aria-label', originalText);
      typedSubtitle.setAttribute('aria-live', 'off');

      if (reduceMotionQuery.matches || !heroVisible || !documentVisible) {
        stopTypedSubtitle(false);
        typedSubtitle.textContent = originalText;
        return;
      }

      const chars = Array.from(originalText);

      if (chars.length < 3) {
        typedSubtitle.textContent = originalText;
        return;
      }

      stopTypedSubtitle(false);
      typedActive = true;

      const { typoIndex, wrongChar } = getSubtitleTypoPlan(chars);
      const current = [];
      let index = 0;
      let typoFixed = false;

      function setSubtitleText() {
        typedSubtitle.textContent = current.join('');
      }

      function schedule(callback, delay) {
        typedTimer = window.setTimeout(callback, delay);
      }

      function typeNext() {
        if (!typedActive) {
          return;
        }

        if (index >= chars.length) {
          schedule(deleteNext, 1850);
          return;
        }

        if (!typoFixed && index === typoIndex) {
          current.push(wrongChar);
          setSubtitleText();
          typoFixed = true;

          schedule(() => {
            if (!typedActive) {
              return;
            }

            current.pop();
            setSubtitleText();

            schedule(() => {
              if (!typedActive) {
                return;
              }

              current.push(chars[index]);
              index += 1;
              setSubtitleText();
              schedule(typeNext, 95 + Math.random() * 70);
            }, 180);
          }, 520);
          return;
        }

        current.push(chars[index]);
        index += 1;
        setSubtitleText();
        schedule(typeNext, chars[index - 1] === '，' ? 260 : 82 + Math.random() * 70);
      }

      function deleteNext() {
        if (!typedActive) {
          return;
        }

        if (current.length === 0) {
          index = 0;
          typoFixed = false;
          schedule(typeNext, 560);
          return;
        }

        current.pop();
        setSubtitleText();
        schedule(deleteNext, 34 + Math.random() * 24);
      }

      typedSubtitle.textContent = '';
      schedule(typeNext, 880);
    }

    function requestCanvasRender() {
      window.cancelAnimationFrame(renderFrame);

      if (!canAnimateHomeEntry()) {
        renderFrame = 0;
        return;
      }

      renderFrame = window.requestAnimationFrame(() => {
        renderFrame = 0;
        setupGlyphCanvas();
      });
    }

    function requestHeroResizeRefresh() {
      if (heroResizeFrame) {
        return;
      }

      heroResizeFrame = window.requestAnimationFrame(() => {
        heroResizeFrame = 0;
        setInitialRevealPoint();
        requestCanvasRender();
      });
    }

    function setHeroPoint(clientX, clientY, propertyX, propertyY, rect = hero.getBoundingClientRect()) {
      if (!rect.width || !rect.height) {
        return;
      }

      const x = Math.min(Math.max(((clientX - rect.left) / rect.width) * 100, 0), 100);
      const y = Math.min(Math.max(((clientY - rect.top) / rect.height) * 100, 0), 100);

      hero.style.setProperty(propertyX, `${x.toFixed(2)}%`);
      hero.style.setProperty(propertyY, `${y.toFixed(2)}%`);
    }

    function setInitialRevealPoint() {
      const anchor = hero.querySelector('.hero-avatar') || hero.querySelector('.hero-title');
      const rect = anchor ? anchor.getBoundingClientRect() : hero.getBoundingClientRect();

      setHeroPoint(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
        '--imx-home-entry-x',
        '--imx-home-entry-y'
      );
    }

    setInitialRevealPoint();
    requestCanvasRender();
    initTypedSubtitle();

    window.requestAnimationFrame(() => {
      hero.classList.add('imx-home-entry-started');
    });

    hero.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch') {
        return;
      }

      heroPointerX = event.clientX;
      heroPointerY = event.clientY;

      if (heroPointerFrame) {
        return;
      }

      heroPointerFrame = window.requestAnimationFrame(() => {
        heroPointerFrame = 0;
        const rect = hero.getBoundingClientRect();

        setHeroPoint(
          heroPointerX,
          heroPointerY,
          '--imx-home-pointer-x',
          '--imx-home-pointer-y',
          rect
        );
        updateGlyphPointer(heroPointerX, heroPointerY, rect);
      });
    });

    window.addEventListener('resize', requestHeroResizeRefresh);

    const themeObserver = new MutationObserver(requestCanvasRender);
    themeObserver.observe(htmlElement, { attributes: true, attributeFilter: ['data-theme'] });

    function pauseHomeEntryMotion() {
      stopGlyphAnimation();
      stopTypedSubtitle(true);
    }

    function resumeHomeEntryMotion() {
      if (!heroVisible || !documentVisible) {
        return;
      }

      requestCanvasRender();

      if (!typedActive) {
        initTypedSubtitle();
      }
    }

    if ('IntersectionObserver' in window) {
      const heroObserver = new IntersectionObserver((entries) => {
        const [entry] = entries;

        heroVisible = Boolean(entry && entry.isIntersecting);

        if (!heroVisible) {
          pauseHomeEntryMotion();
          return;
        }

        resumeHomeEntryMotion();
      }, { rootMargin: '120px 0px 120px 0px' });

      heroObserver.observe(hero);
    }

    document.addEventListener('visibilitychange', () => {
      documentVisible = !document.hidden;

      if (!documentVisible) {
        pauseHomeEntryMotion();
        return;
      }

      resumeHomeEntryMotion();
    });

    onMediaQueryChange(reduceMotionQuery, () => {
      stopGlyphAnimation();
      requestCanvasRender();
      initTypedSubtitle();
    });
  }

  function initSharedDock() {
    const hero = document.querySelector('[data-home-entry]');
    const featured = document.querySelector('#featured-posts');
    const navbar = document.querySelector('.navbar');
    const navbarContainer = navbar ? navbar.querySelector('.navbar-container') : null;
    const navbarMenu = navbar ? navbar.querySelector('.navbar-menu') : null;
    const navbarBrand = navbar ? navbar.querySelector('.navbar-brand') : null;
    const navbarActions = navbar ? navbar.querySelector('.navbar-actions') : null;
    const navbarThemeToggle = navbar ? navbar.querySelector('.theme-toggle') : null;
    const navbarDockShell = navbar ? navbar.querySelector('.navbar-dock-shell') : null;
    const hasHomeDockProgress = Boolean(hero && featured);
    if (
      !navbar ||
      !navbarContainer ||
      !navbarMenu ||
      !navbarBrand ||
      !navbarActions ||
      !navbarThemeToggle ||
      !navbarDockShell
    ) {
      return;
    }

    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let ticking = false;
    let merged = false;
    let snapTimer = 0;
    let snapFrame = 0;
    let snapping = false;
    let pendingSnapTarget = null;
    let metricsDirty = true;
    let metrics = null;
    let lastDockAttraction = -1;
    let lastDockBrandShift = '0px';
    let lastDockActionsShift = '0px';
    let lastDockGroupShift = '0px';
    let lastDockShellScaleX = '1.0000';
    let lastDockShellWidth = '0px';
    let lastDockShellX = '0px';
    let lastDockVisualKey = '';
    let dockAttracting = false;
    const dockMergeEnter = 0.88;
    const dockMergeExit = 0.8;
    const edgeSnapRange = 0.2;

    function getPageTop(element) {
      return element.getBoundingClientRect().top + window.scrollY;
    }

    function refreshMetrics() {
      const heroTop = hasHomeDockProgress ? getPageTop(hero) : 0;
      const featuredTop = hasHomeDockProgress ? getPageTop(featured) : window.innerHeight;
      const menuRect = navbarMenu ? navbarMenu.getBoundingClientRect() : null;
      const brandRect = navbarBrand ? navbarBrand.getBoundingClientRect() : null;
      const themeToggleRect = navbarThemeToggle ? navbarThemeToggle.getBoundingClientRect() : null;
      const containerRect = navbarContainer.getBoundingClientRect();
      const currentBrandShift = parseFloat(lastDockBrandShift) || 0;
      const currentActionsShift = parseFloat(lastDockActionsShift) || 0;
      const currentGroupShift = parseFloat(lastDockGroupShift) || 0;
      const visualGap = Math.max(10, Math.min(18, window.innerWidth * 0.014));
      const actionsGap = Math.max(4, Math.min(7, window.innerWidth * 0.0045));
      const fallbackDistance = menuRect
        ? Math.max(0, ((window.innerWidth - menuRect.width) / 2) * 0.58)
        : 0;
      const containerBaseLeft = containerRect.left - currentGroupShift;
      const containerBaseRight = containerRect.right - currentGroupShift;
      const brandBaseLeft = brandRect
        ? brandRect.left - currentBrandShift - currentGroupShift
        : 0;
      const brandBaseRight = brandRect
        ? brandRect.right - currentBrandShift - currentGroupShift
        : 0;
      const actionsBaseLeft = themeToggleRect
        ? themeToggleRect.left - currentActionsShift - currentGroupShift
        : window.innerWidth;
      const actionsBaseRight = themeToggleRect
        ? themeToggleRect.right - currentActionsShift - currentGroupShift
        : window.innerWidth;
      const menuLeft = menuRect ? menuRect.left - currentGroupShift : 0;
      const menuRight = menuRect ? menuRect.right - currentGroupShift : window.innerWidth;
      const brandDistance = brandRect && menuRect
        ? Math.max(0, menuLeft - brandBaseRight - visualGap)
        : fallbackDistance;
      const actionsDistance = themeToggleRect && menuRect
        ? Math.max(0, actionsBaseLeft - menuRight - actionsGap)
        : fallbackDistance;
      const widthRatio = brandRect && themeToggleRect && themeToggleRect.width > 0
        ? brandRect.width / themeToggleRect.width
        : 1;
      const actionsLead = Math.min(1.62, Math.max(1.12, 1 + (widthRatio - 1) * 0.18));
      const shellPad = 10;
      const finalBrandLeft = brandBaseLeft + brandDistance;
      const finalBrandRight = brandBaseRight + brandDistance;
      const finalActionsLeft = actionsBaseLeft - actionsDistance;
      const finalActionsRight = actionsBaseRight - actionsDistance;
      const shellFinalLeft = Math.max(
        containerBaseLeft,
        Math.min(finalBrandLeft, menuLeft, finalActionsLeft) - shellPad
      );
      const shellFinalRight = Math.min(
        containerBaseRight,
        Math.max(finalBrandRight, menuRight, finalActionsRight) + shellPad
      );
      const shellWidth = Math.max(1, shellFinalRight - shellFinalLeft);
      const shellStartWidth = Math.min(shellWidth, Math.max(1, menuRight - menuLeft + shellPad * 2));
      const shellFinalAbsoluteCenter = (shellFinalLeft + shellFinalRight) / 2;
      const containerAbsoluteCenter = (containerBaseLeft + containerBaseRight) / 2;
      const shellWidthValue = `${shellWidth.toFixed(2)}px`;

      if (shellWidthValue !== lastDockShellWidth) {
        lastDockShellWidth = shellWidthValue;
        navbar.style.setProperty('--home-dock-shell-width', shellWidthValue);
      }

      metrics = {
        actionsDistance,
        actionsLead,
        actionsBaseLeft,
        actionsBaseRight,
        brandBaseLeft,
        brandBaseRight,
        containerLeft: containerBaseLeft,
        containerRight: containerBaseRight,
        brandDistance,
        featuredTop,
        groupFinalShift: containerAbsoluteCenter - shellFinalAbsoluteCenter,
        heroTop,
        menuLeft,
        menuRight,
        shellFinalCenter: shellFinalAbsoluteCenter - containerBaseLeft,
        shellStartCenter: (menuLeft + menuRight) / 2 - containerBaseLeft,
        shellStartScaleX: shellStartWidth / shellWidth,
        shellWidth
      };
      metricsDirty = false;

      return metrics;
    }

    function getMetrics() {
      return metricsDirty || !metrics ? refreshMetrics() : metrics;
    }

    function smoothStep(edge0, edge1, value) {
      const point = Math.min(Math.max((value - edge0) / (edge1 - edge0), 0), 1);

      return point * point * (3 - 2 * point);
    }

    function lerp(start, end, amount) {
      return start + (end - start) * amount;
    }

    function getDockAttraction(progress) {
      if (mobileQuery.matches || reduceMotionQuery.matches) {
        return 0;
      }

      return smoothStep(0.06, 0.78, progress);
    }

    function resetDockAttraction() {
      if (
        lastDockAttraction === 0 &&
        lastDockBrandShift === '0px' &&
        lastDockActionsShift === '0px' &&
        lastDockGroupShift === '0px' &&
        lastDockShellScaleX === '1.0000' &&
        lastDockShellX === '0px' &&
        lastDockVisualKey === '0.000|0.000|0.9000|1.0000|0.800|0.140|0.110|0.280|1.000' &&
        !dockAttracting
      ) {
        return;
      }

      lastDockAttraction = 0;
      lastDockVisualKey = '0.000|0.000|0.9000|1.0000|0.800|0.140|0.110|0.280|1.000';
      navbar.style.setProperty('--home-dock-attraction', '0.000');
      navbar.style.setProperty('--home-dock-shell-opacity', '0.000');
      navbar.style.setProperty('--home-dock-shell-scale-x', '1.0000');
      navbar.style.setProperty('--home-dock-shell-scale-y', '0.9000');
      navbar.style.setProperty('--home-dock-part-scale', '1.0000');
      navbar.style.setProperty('--home-dock-part-bg-alpha', '0.800');
      navbar.style.setProperty('--home-dock-part-border-alpha', '0.140');
      navbar.style.setProperty('--home-dock-part-shadow-alpha', '0.110');
      navbar.style.setProperty('--home-dock-part-dark-shadow-alpha', '0.280');
      navbar.style.setProperty('--home-dock-part-overlay-alpha', '1.000');
      lastDockShellScaleX = '1.0000';
      lastDockShellX = '0px';
      navbar.style.setProperty('--home-dock-shell-x', '0px');

      if (lastDockBrandShift !== '0px') {
        lastDockBrandShift = '0px';
        navbar.style.setProperty('--home-dock-brand-shift', '0px');
      }

      if (lastDockActionsShift !== '0px') {
        lastDockActionsShift = '0px';
        navbar.style.setProperty('--home-dock-actions-shift', '0px');
      }

      if (lastDockGroupShift !== '0px') {
        lastDockGroupShift = '0px';
        navbar.style.setProperty('--home-dock-group-shift', '0px');
      }

      if (dockAttracting) {
        dockAttracting = false;
        navbar.classList.remove('is-home-dock-attracting');
      }
    }

    function writeDockVisualState(attraction) {
      const partPresence = 1 - smoothStep(0.08, 0.96, attraction);
      const shellPresence = smoothStep(0.03, 0.74, attraction);
      const shellOpacity = attraction <= 0.002 ? 0 : shellPresence;
      const shellScaleY = 0.9 + smoothStep(0.03, 0.82, attraction) * 0.1;
      const partScale = 1;
      const partBgAlpha = 0.8 * partPresence;
      const partBorderAlpha = 0.14 * partPresence;
      const partShadowAlpha = 0.11 * partPresence;
      const partDarkShadowAlpha = 0.28 * partPresence;
      const partOverlayAlpha = partPresence;
      const key = [
        attraction.toFixed(3),
        shellOpacity.toFixed(3),
        shellScaleY.toFixed(4),
        partScale.toFixed(4),
        partBgAlpha.toFixed(3),
        partBorderAlpha.toFixed(3),
        partShadowAlpha.toFixed(3),
        partDarkShadowAlpha.toFixed(3),
        partOverlayAlpha.toFixed(3)
      ].join('|');

      if (key === lastDockVisualKey) {
        return;
      }

      lastDockVisualKey = key;
      navbar.style.setProperty('--home-dock-attraction', attraction.toFixed(3));
      navbar.style.setProperty('--home-dock-shell-opacity', shellOpacity.toFixed(3));
      navbar.style.setProperty('--home-dock-shell-scale-y', shellScaleY.toFixed(4));
      navbar.style.setProperty('--home-dock-part-scale', partScale.toFixed(4));
      navbar.style.setProperty('--home-dock-part-bg-alpha', partBgAlpha.toFixed(3));
      navbar.style.setProperty('--home-dock-part-border-alpha', partBorderAlpha.toFixed(3));
      navbar.style.setProperty('--home-dock-part-shadow-alpha', partShadowAlpha.toFixed(3));
      navbar.style.setProperty('--home-dock-part-dark-shadow-alpha', partDarkShadowAlpha.toFixed(3));
      navbar.style.setProperty('--home-dock-part-overlay-alpha', partOverlayAlpha.toFixed(3));
    }

    function writeDockAttraction(attraction, currentMetrics) {
      const normalizedAttraction = Math.round(attraction * 1000) / 1000;

      writeDockVisualState(normalizedAttraction);

      if (normalizedAttraction === lastDockAttraction) {
        return;
      }

      lastDockAttraction = normalizedAttraction;

      const actionsAttraction = 1 - Math.pow(1 - normalizedAttraction, currentMetrics.actionsLead || 1.24);
      const nextDockAttracting = !merged && normalizedAttraction > 0.002 && normalizedAttraction < 0.998;
      const brandShift = `${(currentMetrics.brandDistance * normalizedAttraction).toFixed(2)}px`;
      const actionsShift = `${(-currentMetrics.actionsDistance * actionsAttraction).toFixed(2)}px`;
      const shellBlend = smoothStep(0.03, 0.9, normalizedAttraction);
      const groupShift = `${(currentMetrics.groupFinalShift * shellBlend).toFixed(2)}px`;
      const shellCenter = lerp(currentMetrics.shellStartCenter, currentMetrics.shellFinalCenter, shellBlend);
      const shellScaleX = lerp(currentMetrics.shellStartScaleX, 1, shellBlend).toFixed(4);
      const shellX = `${(shellCenter - currentMetrics.shellWidth / 2).toFixed(2)}px`;

      if (brandShift !== lastDockBrandShift) {
        lastDockBrandShift = brandShift;
        navbar.style.setProperty('--home-dock-brand-shift', brandShift);
      }

      if (actionsShift !== lastDockActionsShift) {
        lastDockActionsShift = actionsShift;
        navbar.style.setProperty('--home-dock-actions-shift', actionsShift);
      }

      if (groupShift !== lastDockGroupShift) {
        lastDockGroupShift = groupShift;
        navbar.style.setProperty('--home-dock-group-shift', groupShift);
      }

      if (shellScaleX !== lastDockShellScaleX) {
        lastDockShellScaleX = shellScaleX;
        navbar.style.setProperty('--home-dock-shell-scale-x', shellScaleX);
      }

      if (shellX !== lastDockShellX) {
        lastDockShellX = shellX;
        navbar.style.setProperty('--home-dock-shell-x', shellX);
      }

      if (nextDockAttracting !== dockAttracting) {
        dockAttracting = nextDockAttracting;
        navbar.classList.toggle('is-home-dock-attracting', dockAttracting);
      }
    }

    function setDockAttractionValue(attraction, currentMetrics) {
      writeDockAttraction(Math.min(Math.max(attraction, 0), 1), currentMetrics);
    }

    function setDockAttraction(progress, currentMetrics) {
      setDockAttractionValue(getDockAttraction(progress), currentMetrics);
    }

    function setMergedState(nextMerged) {
      if (merged === nextMerged) {
        return false;
      }

      merged = nextMerged;
      navbar.classList.remove('is-dock-flipping', 'is-home-dock-fusing');
      navbar.classList.toggle('is-dock-merged', merged);
      navbar.classList.toggle('is-home-dock-merged', merged);
      document.body.classList.toggle('imx-dock-merged', merged);
      document.body.classList.toggle('imx-home-dock-merged', merged);

      if (merged && dockAttracting) {
        dockAttracting = false;
        navbar.classList.remove('is-home-dock-attracting');
      }

      return true;
    }

    function smoothSnapEase(value) {
      return value * value * value * (value * (value * 6 - 15) + 10);
    }

    function cancelSnap() {
      if (snapTimer) {
        window.clearTimeout(snapTimer);
        snapTimer = 0;
      }
      pendingSnapTarget = null;

      if (snapFrame) {
        window.cancelAnimationFrame(snapFrame);
        snapFrame = 0;
      }

      if (snapping) {
        snapping = false;
      }
    }

    function animateScrollTo(targetY) {
      if (snapFrame) {
        window.cancelAnimationFrame(snapFrame);
        snapFrame = 0;
      }

      const startY = window.scrollY;
      const distance = targetY - startY;
      const duration = reduceMotionQuery.matches ? 0 : Math.min(560, Math.max(300, Math.abs(distance) * 0.44));
      const startTime = performance.now();

      if (Math.abs(distance) < 2 || duration === 0) {
        window.scrollTo({ left: 0, top: targetY, behavior: 'auto' });
        snapping = false;
        requestSync();
        return;
      }

      snapping = true;

      function step(timestamp) {
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const eased = smoothSnapEase(progress);

        window.scrollTo({ left: 0, top: startY + distance * eased, behavior: 'auto' });

        if (progress < 1) {
          snapFrame = window.requestAnimationFrame(step);
          return;
        }

        snapFrame = 0;
        snapping = false;
        requestSync();
      }

      snapFrame = window.requestAnimationFrame(step);
    }

    function scheduleEdgeSnap(scrollY, currentMetrics, progress) {
      if (mobileQuery.matches || snapping) {
        if (snapTimer) {
          window.clearTimeout(snapTimer);
          snapTimer = 0;
        }
        pendingSnapTarget = null;
        return;
      }

      let targetY = null;

      if (progress >= 0 && progress <= edgeSnapRange) {
        targetY = currentMetrics.heroTop;
      }

      if (targetY === null || Math.abs(targetY - scrollY) < 2) {
        if (snapTimer) {
          window.clearTimeout(snapTimer);
          snapTimer = 0;
        }
        pendingSnapTarget = null;
        return;
      }

      if (pendingSnapTarget !== null && Math.abs(pendingSnapTarget - targetY) < 1 && snapTimer) {
        return;
      }

      if (snapTimer) {
        window.clearTimeout(snapTimer);
      }

      pendingSnapTarget = targetY;
      snapTimer = window.setTimeout(() => {
        pendingSnapTarget = null;
        snapTimer = 0;
        animateScrollTo(targetY);
      }, 180);
    }

    function sync() {
      ticking = false;

      if (mobileQuery.matches) {
        cancelSnap();
        setMergedState(false);
        resetDockAttraction();
        return;
      }

      const scrollY = window.scrollY;
      const currentMetrics = getMetrics();
      const heroRange = Math.max(currentMetrics.featuredTop - currentMetrics.heroTop, window.innerHeight);
      const progress = (scrollY - currentMetrics.heroTop) / heroRange;
      const nextMerged = merged ? progress > dockMergeExit : progress >= dockMergeEnter;
      let mergedChanged = false;

      setDockAttraction(progress, currentMetrics);
      mergedChanged = setMergedState(nextMerged);

      if (hasHomeDockProgress) {
        const snapMetrics = mergedChanged ? getMetrics() : currentMetrics;
        scheduleEdgeSnap(scrollY, snapMetrics, progress);
      }
    }

    function requestSync() {
      if (ticking) {
        return;
      }

      ticking = true;
      window.requestAnimationFrame(sync);
    }

    window.addEventListener('wheel', (event) => {
      if (event.deltaY !== 0) {
        cancelSnap();
      }
    }, { passive: true });

    window.addEventListener('touchstart', cancelSnap, { passive: true });
    window.addEventListener('keydown', (event) => {
      if (
        event.key === 'ArrowDown' ||
        event.key === 'ArrowUp' ||
        event.key === 'PageDown' ||
        event.key === 'PageUp' ||
        event.key === 'Home' ||
        event.key === 'End' ||
        event.key === ' '
      ) {
        cancelSnap();
      }
    });

    window.addEventListener('scroll', requestSync, { passive: true });
    window.addEventListener('resize', () => {
      metricsDirty = true;
      lastDockAttraction = -1;
      requestSync();
    });
    onMediaQueryChange(mobileQuery, () => {
      metricsDirty = true;
      lastDockAttraction = -1;
      requestSync();
    });
    onMediaQueryChange(reduceMotionQuery, () => {
      lastDockAttraction = -1;
      requestSync();
    });

    requestSync();
  }

  // 获取保存的主题模式；没有明确选择时默认跟随自动模式
  function getThemeMode() {
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
  function applyThemeMode(mode, options = {}) {
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

  function initNavbarClock() {
    const clockElements = document.querySelectorAll('[data-beijing-clock]');
    const visitorIPElements = document.querySelectorAll('[data-visitor-ip]');
    const visitorLocationElements = document.querySelectorAll('[data-visitor-location]');

    if (!clockElements.length && !visitorIPElements.length && !visitorLocationElements.length) {
      return;
    }

    const clockFormatter = new Intl.DateTimeFormat('zh-CN', {
      hour: '2-digit',
      hour12: false,
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Shanghai'
    });
    let clockTimer = 0;
    let visitorIPText = '正在获取';
    let regionText = '定位中';
    let regionFullText = '定位中';
    const chinaRegionNames = {
      Anhui: '安徽',
      Beijing: '北京',
      Chongqing: '重庆',
      Fujian: '福建',
      Gansu: '甘肃',
      Guangdong: '广东',
      Guangxi: '广西',
      Guizhou: '贵州',
      Hainan: '海南',
      Hebei: '河北',
      Heilongjiang: '黑龙江',
      Henan: '河南',
      Hubei: '湖北',
      Hunan: '湖南',
      'Inner Mongolia': '内蒙古',
      Jiangsu: '江苏',
      Jiangxi: '江西',
      Jilin: '吉林',
      Liaoning: '辽宁',
      Ningxia: '宁夏',
      Qinghai: '青海',
      Shaanxi: '陕西',
      Shandong: '山东',
      Shanghai: '上海',
      Shanxi: '山西',
      Sichuan: '四川',
      Tianjin: '天津',
      Tibet: '西藏',
      Xinjiang: '新疆',
      Yunnan: '云南',
      Zhejiang: '浙江',
      'Hong Kong': '香港',
      Macau: '澳门',
      Taiwan: '台湾'
    };
    const chinaCityNames = {
      Beijing: '北京',
      Changsha: '长沙',
      Chengdu: '成都',
      Chongqing: '重庆',
      Guangzhou: '广州',
      Hangzhou: '杭州',
      Nanjing: '南京',
      Shanghai: '上海',
      Shenzhen: '深圳',
      Suzhou: '苏州',
      Tianjin: '天津',
      Wuhan: '武汉',
      "Xi'an": '西安',
      Xian: '西安'
    };
    const countryNames = {
      Canada: '加拿大',
      China: '中国',
      France: '法国',
      Germany: '德国',
      'Hong Kong': '香港',
      India: '印度',
      Japan: '日本',
      Macau: '澳门',
      Singapore: '新加坡',
      Taiwan: '台湾',
      'United Kingdom': '英国',
      'United States': '美国',
      'United States of America': '美国',
      USA: '美国'
    };
    const countryCodeNames = {
      CA: '加拿大',
      CN: '中国',
      DE: '德国',
      FR: '法国',
      GB: '英国',
      HK: '香港',
      IN: '印度',
      JP: '日本',
      MO: '澳门',
      SG: '新加坡',
      TW: '台湾',
      UK: '英国',
      US: '美国',
      USA: '美国'
    };
    function cleanPlaceName(value) {
      return String(value || '')
        .replace(/\s+/g, ' ')
        .replace(/ Province$/i, '')
        .replace(/ City$/i, '')
        .trim();
    }

    function getCountryName(country, countryCode) {
      const cleanCountry = cleanPlaceName(country);
      const cleanCode = String(countryCode || '').toUpperCase();

      return countryNames[cleanCountry] || countryCodeNames[cleanCode] || cleanCountry || cleanCode;
    }

    function withoutCountryPrefix(value, countryName) {
      const place = cleanPlaceName(value);

      return place
        .replace(new RegExp(`^${countryName}\\s*`, 'i'), '')
        .replace(/^United States(?: of America)?\s*/i, '')
        .replace(/^USA\s*/i, '')
        .replace(/^US\s+/i, '')
        .replace(/^美国\s*/, '')
        .replace(/州$/i, '')
        .trim();
    }

    function compactChinaPlace(value, aliases) {
      const place = cleanPlaceName(value);
      const normalized = aliases[place] || place;

      return normalized
        .replace(/壮族自治区|回族自治区|维吾尔自治区|自治区|特别行政区|省|市/g, '')
        .trim();
    }

    function formatRegion(data) {
      if (!data || data.success === false) {
        return null;
      }

      const city = data.city || data.cityName || '';
      const region = data.region || data.region_name || data.regionName || data.province || '';
      const country = data.country || data.country_name || data.countryName || '';
      const countryCode = String(data.country_code || data.countryCode || data.countryCode2 || '').toUpperCase();

      if (country === '中国' || country === 'China' || country === 'CN' || countryCode === 'CN') {
        const shortRegion = [
          compactChinaPlace(region, chinaRegionNames),
          compactChinaPlace(city, chinaCityNames)
        ].filter(Boolean).filter((item, index, array) => array.indexOf(item) === index).join('');

        return {
          full: shortRegion,
          short: shortRegion
        };
      }

      const countryName = getCountryName(country, countryCode);
      const cleanRegion = withoutCountryPrefix(region, countryName);
      const cleanCity = withoutCountryPrefix(city, countryName);
      const fullRegion = [
        countryName,
        cleanRegion,
        cleanCity
      ].filter(Boolean).filter((item, index, array) => array.indexOf(item) === index).join(' ');

      return {
        full: fullRegion,
        short: fullRegion
      };
    }

    function formatIPAddress(data) {
      if (!data || data.success === false) {
        return '';
      }

      return String(
        data.ip ||
        data.ipAddress ||
        data.ip_address ||
        data.query ||
        ''
      ).trim();
    }

    async function fetchRegionJSON(url) {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeout = controller ? window.setTimeout(() => controller.abort(), 2800) : 0;

      try {
        const response = await window.fetch(url, {
          cache: 'no-store',
          signal: controller ? controller.signal : undefined
        });

        if (!response.ok) {
          return null;
        }

        return await response.json();
      } catch (error) {
        return null;
      } finally {
        if (timeout) {
          window.clearTimeout(timeout);
        }
      }
    }

    function updateNavbarClock() {
      const time = clockFormatter.format(new Date());
      const text = regionText ? `${time} · ${regionText}` : time;
      const label = regionFullText && regionFullText !== regionText ? `${time} · ${regionFullText}` : text;

      clockElements.forEach((element) => {
        element.textContent = text;
        element.setAttribute('aria-label', label);
        element.setAttribute('title', label);
      });
    }

    function updateVisitorInfo() {
      visitorIPElements.forEach((element) => {
        element.textContent = visitorIPText;
      });

      visitorLocationElements.forEach((element) => {
        element.textContent = regionFullText === '定位中' ? '正在获取' : regionFullText;
      });
    }

    function startClockTimer() {
      window.clearInterval(clockTimer);
      updateNavbarClock();
      clockTimer = window.setInterval(updateNavbarClock, 1000);
    }

    async function loadRegion() {
      if (!window.fetch) {
        visitorIPText = '获取失败';
        regionText = '地区未知';
        regionFullText = '地区未知';
        updateNavbarClock();
        updateVisitorInfo();
        return;
      }

      const regionAPIs = [
        'https://ipwho.is/?lang=zh-CN',
        'https://ipapi.co/json/',
        'https://freeipapi.com/api/json',
        'https://api.ip.sb/geoip'
      ];

      for (let index = 0; index < regionAPIs.length; index += 1) {
        const data = await fetchRegionJSON(regionAPIs[index]);
        const nextIP = formatIPAddress(data);
        const nextRegion = formatRegion(data);

        if (nextIP) {
          visitorIPText = nextIP;
          updateVisitorInfo();
        }

        if (nextRegion && (nextRegion.full || nextRegion.short)) {
          regionText = nextRegion.full || nextRegion.short;
          regionFullText = nextRegion.full || nextRegion.short;
          updateNavbarClock();
          updateVisitorInfo();
          return;
        }
      }

      if (visitorIPText === '正在获取') {
        visitorIPText = '获取失败';
      }
      regionText = '地区未知';
      regionFullText = '地区未知';
      updateNavbarClock();
      updateVisitorInfo();
    }

    startClockTimer();
    updateVisitorInfo();
    loadRegion();

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        window.clearInterval(clockTimer);
        clockTimer = 0;
        return;
      }

      startClockTimer();
    });
  }

  function initArticleMarkdownLayout() {
    const articleContent = document.querySelector('.article-content');

    if (!articleContent) {
      return;
    }

    const emojiMarkerPattern = /^(?:✅|☑️|✔️|❌|✖️|⚠️|💡|📌|⭐|✨|🚀|🔧|📁|📂|🎯|📝|📖|📚|🔥|👉)/u;

    articleContent.querySelectorAll('ul > li').forEach((item) => {
      if (emojiMarkerPattern.test(item.textContent.trim())) {
        item.classList.add('article-list-emoji');
      }
    });
  }

  function initNotFoundGame() {
    const game = document.querySelector('[data-404-game]');

    if (!game) {
      return;
    }

    const canvas = game.querySelector('[data-404-canvas]');
    const scoreElement = game.querySelector('[data-404-score]');
    const livesElement = game.querySelector('[data-404-lives]');
    const startButton = game.querySelector('[data-404-start]');
    const resetButton = game.querySelector('[data-404-reset]');

    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    const randomBetween = (min, max) => min + Math.random() * (max - min);
    const clampNumber = (value, min, max) => Math.min(Math.max(value, min), max);
    const gameState = {
      frame: 0,
      running: false,
      score: 0,
      lives: 3,
      items: [],
      width: 720,
      height: 420,
      playerX: 360,
      targetX: 360,
      leftPressed: false,
      rightPressed: false,
      lastTime: 0,
      spawnTimer: 0,
      message: '点击开始，接住雪花'
    };

    let palette = getGamePalette();

    function getGamePalette() {
      const isDark = htmlElement.getAttribute('data-theme') === 'dark';

      return isDark
        ? {
            grid: 'rgba(238, 234, 227, 0.055)',
            snow: 'rgba(238, 234, 227, 0.96)',
            snowCore: 'rgba(238, 234, 227, 0.72)',
            shard: 'rgba(255, 255, 255, 0.32)',
            player: 'rgba(238, 234, 227, 0.94)',
            playerText: '#171716',
            text: 'rgba(238, 234, 227, 0.9)',
            muted: 'rgba(238, 234, 227, 0.46)'
          }
        : {
            grid: 'rgba(122, 90, 50, 0.075)',
            snow: 'rgba(15, 23, 42, 0.88)',
            snowCore: 'rgba(122, 90, 50, 0.42)',
            shard: 'rgba(15, 23, 42, 0.38)',
            player: 'rgba(5, 5, 5, 0.94)',
            playerText: '#ffffff',
            text: 'rgba(36, 33, 29, 0.92)',
            muted: 'rgba(95, 88, 80, 0.56)'
          };
    }

    function updateStats() {
      if (scoreElement) {
        scoreElement.textContent = String(gameState.score);
      }

      if (livesElement) {
        livesElement.textContent = String(Math.max(gameState.lives, 0));
      }
    }

    function setStartButtonLabel() {
      if (startButton) {
        startButton.textContent = gameState.running ? '进行中' : '开始';
      }
    }

    function resizeGameCanvas() {
      const rect = canvas.getBoundingClientRect();
      const nextWidth = Math.max(280, Math.round(rect.width || canvas.clientWidth || 720));
      const nextHeight = Math.max(230, Math.round(rect.height || canvas.clientHeight || 420));
      const ratio = Math.min(window.devicePixelRatio || 1, 2);

      gameState.width = nextWidth;
      gameState.height = nextHeight;
      canvas.width = Math.round(nextWidth * ratio);
      canvas.height = Math.round(nextHeight * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      gameState.playerX = clampNumber(gameState.playerX, 48, nextWidth - 48);
      gameState.targetX = clampNumber(gameState.targetX, 48, nextWidth - 48);
      drawGame();
    }

    function drawRoundedRect(x, y, width, height, radius) {
      const nextRadius = Math.min(radius, width / 2, height / 2);

      context.beginPath();
      context.moveTo(x + nextRadius, y);
      context.lineTo(x + width - nextRadius, y);
      context.quadraticCurveTo(x + width, y, x + width, y + nextRadius);
      context.lineTo(x + width, y + height - nextRadius);
      context.quadraticCurveTo(x + width, y + height, x + width - nextRadius, y + height);
      context.lineTo(x + nextRadius, y + height);
      context.quadraticCurveTo(x, y + height, x, y + height - nextRadius);
      context.lineTo(x, y + nextRadius);
      context.quadraticCurveTo(x, y, x + nextRadius, y);
      context.closePath();
    }

    function drawSnowflake(item) {
      const armLength = item.size;

      context.save();
      context.translate(item.x, item.y);
      context.rotate(item.rotation);
      context.strokeStyle = palette.snow;
      context.fillStyle = palette.snowCore;
      context.lineWidth = Math.max(1.4, item.size * 0.12);
      context.lineCap = 'round';
      context.lineJoin = 'round';

      for (let arm = 0; arm < 6; arm += 1) {
        context.rotate(Math.PI / 3);
        context.beginPath();
        context.moveTo(0, 0);
        context.lineTo(0, -armLength);
        context.moveTo(0, -armLength * 0.58);
        context.lineTo(-armLength * 0.28, -armLength * 0.82);
        context.moveTo(0, -armLength * 0.58);
        context.lineTo(armLength * 0.28, -armLength * 0.82);
        context.stroke();
      }

      context.beginPath();
      context.arc(0, 0, Math.max(2.4, item.size * 0.16), 0, Math.PI * 2);
      context.fill();
      context.restore();
    }

    function drawShard(item) {
      const size = item.size * 0.75;

      context.save();
      context.translate(item.x, item.y);
      context.rotate(item.rotation);
      context.strokeStyle = palette.shard;
      context.lineWidth = Math.max(2, item.size * 0.14);
      context.lineCap = 'round';

      context.beginPath();
      context.moveTo(-size, -size * 0.2);
      context.lineTo(size, size * 0.18);
      context.moveTo(-size * 0.35, -size);
      context.lineTo(size * 0.28, size);
      context.stroke();
      context.restore();
    }

    function drawBackground() {
      const spacing = Math.max(34, Math.min(58, gameState.width / 12));

      context.clearRect(0, 0, gameState.width, gameState.height);
      context.save();
      context.strokeStyle = palette.grid;
      context.lineWidth = 1;

      for (let x = spacing; x < gameState.width; x += spacing) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, gameState.height);
        context.stroke();
      }

      for (let y = spacing; y < gameState.height; y += spacing) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(gameState.width, y);
        context.stroke();
      }

      context.restore();
    }

    function drawPlayer() {
      const paddleWidth = Math.max(82, Math.min(126, gameState.width * 0.19));
      const paddleHeight = Math.max(13, Math.min(18, gameState.height * 0.045));
      const x = gameState.playerX - paddleWidth / 2;
      const y = gameState.height - paddleHeight - Math.max(18, gameState.height * 0.07);

      context.save();
      context.shadowBlur = 18;
      context.shadowColor = palette.player;
      context.fillStyle = palette.player;
      drawRoundedRect(x, y, paddleWidth, paddleHeight, paddleHeight / 2);
      context.fill();
      context.shadowBlur = 0;
      context.fillStyle = palette.playerText;
      context.font = '700 11px "IMX Inter", -apple-system, BlinkMacSystemFont, sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText('IMX', gameState.playerX, y + paddleHeight / 2);
      context.restore();
    }

    function drawGameMessage() {
      if (gameState.running) {
        return;
      }

      context.save();
      context.fillStyle = palette.text;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.font = '760 20px "IMX Inter", -apple-system, BlinkMacSystemFont, sans-serif';
      context.fillText(gameState.message, gameState.width / 2, gameState.height / 2 - 8);
      context.fillStyle = palette.muted;
      context.font = '600 13px "IMX Inter", -apple-system, BlinkMacSystemFont, sans-serif';
      context.fillText('雪花 +1，断片 -1', gameState.width / 2, gameState.height / 2 + 22);
      context.restore();
    }

    function drawGame() {
      drawBackground();
      gameState.items.forEach((item) => {
        if (item.type === 'snow') {
          drawSnowflake(item);
          return;
        }

        drawShard(item);
      });
      drawPlayer();
      drawGameMessage();
    }

    function spawnItem() {
      const isSnow = Math.random() > 0.22;
      const size = randomBetween(12, 22);

      gameState.items.push({
        type: isSnow ? 'snow' : 'shard',
        x: randomBetween(size + 10, gameState.width - size - 10),
        y: -size - 8,
        size,
        velocityY: randomBetween(86, 142) + Math.min(gameState.score * 1.7, 80),
        velocityX: randomBetween(-16, 16),
        rotation: randomBetween(0, Math.PI * 2),
        spin: randomBetween(-1.6, 1.6)
      });
    }

    function endGame(message) {
      gameState.running = false;
      gameState.message = message;
      window.cancelAnimationFrame(gameState.frame);
      gameState.frame = 0;
      setStartButtonLabel();
      drawGame();
    }

    function updateGame(deltaTime) {
      const paddleWidth = Math.max(82, Math.min(126, gameState.width * 0.19));
      const paddleHeight = Math.max(13, Math.min(18, gameState.height * 0.045));
      const paddleY = gameState.height - paddleHeight - Math.max(18, gameState.height * 0.07);
      const keyboardSpeed = gameState.width * 0.86;

      if (gameState.leftPressed) {
        gameState.targetX -= keyboardSpeed * deltaTime;
      }

      if (gameState.rightPressed) {
        gameState.targetX += keyboardSpeed * deltaTime;
      }

      gameState.targetX = clampNumber(gameState.targetX, paddleWidth / 2 + 8, gameState.width - paddleWidth / 2 - 8);
      gameState.playerX += (gameState.targetX - gameState.playerX) * Math.min(1, deltaTime * 14);
      gameState.spawnTimer -= deltaTime;

      if (gameState.spawnTimer <= 0) {
        spawnItem();
        gameState.spawnTimer = randomBetween(0.28, 0.54);
      }

      gameState.items = gameState.items.filter((item) => {
        item.x += item.velocityX * deltaTime;
        item.y += item.velocityY * deltaTime;
        item.rotation += item.spin * deltaTime;

        const hitPaddle =
          item.y + item.size >= paddleY &&
          item.y - item.size <= paddleY + paddleHeight &&
          Math.abs(item.x - gameState.playerX) <= paddleWidth / 2 + item.size * 0.5;

        if (hitPaddle) {
          if (item.type === 'snow') {
            gameState.score += 1;
          } else {
            gameState.lives -= 1;
          }

          updateStats();
          return false;
        }

        if (item.y > gameState.height + item.size) {
          if (item.type === 'snow') {
            gameState.lives -= 1;
            updateStats();
          }

          return false;
        }

        return item.x > -40 && item.x < gameState.width + 40;
      });

      if (gameState.lives <= 0) {
        endGame(`本局得分 ${gameState.score}`);
      }
    }

    function tickGame(time) {
      if (!gameState.running) {
        return;
      }

      if (!gameState.lastTime) {
        gameState.lastTime = time;
      }

      const deltaTime = Math.min((time - gameState.lastTime) / 1000, 0.033);
      gameState.lastTime = time;

      updateGame(deltaTime);
      drawGame();

      if (gameState.running) {
        gameState.frame = window.requestAnimationFrame(tickGame);
      }
    }

    function startGame() {
      if (gameState.running) {
        return;
      }

      gameState.running = true;
      gameState.message = '';
      gameState.lastTime = 0;
      gameState.spawnTimer = 0.15;
      canvas.focus({ preventScroll: true });
      setStartButtonLabel();
      window.cancelAnimationFrame(gameState.frame);
      gameState.frame = window.requestAnimationFrame(tickGame);
    }

    function resetGame(startAfterReset = false) {
      gameState.running = false;
      gameState.score = 0;
      gameState.lives = 3;
      gameState.items = [];
      gameState.leftPressed = false;
      gameState.rightPressed = false;
      gameState.lastTime = 0;
      gameState.spawnTimer = 0;
      gameState.message = '点击开始，接住雪花';
      gameState.playerX = gameState.width / 2;
      gameState.targetX = gameState.width / 2;
      window.cancelAnimationFrame(gameState.frame);
      gameState.frame = 0;
      updateStats();
      setStartButtonLabel();
      drawGame();

      if (startAfterReset) {
        startGame();
      }
    }

    function moveTargetFromPointer(event) {
      const rect = canvas.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;

      gameState.targetX = clampNumber(pointerX, 0, gameState.width);
    }

    canvas.addEventListener('pointerdown', (event) => {
      canvas.setPointerCapture(event.pointerId);
      moveTargetFromPointer(event);
      canvas.focus({ preventScroll: true });

      if (!gameState.running) {
        startGame();
      }
    }, { passive: true });

    canvas.addEventListener('pointermove', (event) => {
      moveTargetFromPointer(event);
    }, { passive: true });

    canvas.addEventListener('pointerup', (event) => {
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    }, { passive: true });

    document.addEventListener('keydown', (event) => {
      const target = event.target;

      if (target && /^(INPUT|TEXTAREA|SELECT)$/i.test(target.tagName)) {
        return;
      }

      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
        gameState.leftPressed = true;
        event.preventDefault();
      }

      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
        gameState.rightPressed = true;
        event.preventDefault();
      }

      if ((event.key === ' ' || event.key === 'Enter') && document.activeElement === canvas) {
        if (!gameState.running) {
          startGame();
        }

        event.preventDefault();
      }
    });

    document.addEventListener('keyup', (event) => {
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
        gameState.leftPressed = false;
      }

      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
        gameState.rightPressed = false;
      }
    });

    if (startButton) {
      startButton.addEventListener('click', () => startGame());
    }

    if (resetButton) {
      resetButton.addEventListener('click', () => resetGame(true));
    }

    window.addEventListener('resize', resizeGameCanvas);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        window.cancelAnimationFrame(gameState.frame);
        gameState.frame = 0;
        return;
      }

      if (gameState.running) {
        gameState.lastTime = 0;
        gameState.frame = window.requestAnimationFrame(tickGame);
      }
    });

    const themeObserver = new MutationObserver(() => {
      palette = getGamePalette();
      drawGame();
    });

    themeObserver.observe(htmlElement, { attributes: true, attributeFilter: ['data-theme'] });
    resizeGameCanvas();
    resetGame(false);
  }

  // 初始化主题
  applyThemeMode(getThemeMode(), { persist: false });
  initNavbarClock();
  initHomeEntryHero();
  initSharedDock();
  initArticleMarkdownLayout();
  initNotFoundGame();

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
  const articlePage = document.querySelector('.article-page');

  if (sidebarToggle && sidebar) {
    function updateSidebarIcon(isOpen) {
      sidebarToggle.innerHTML = isOpen
        ? '<svg width="24" height="24" fill="currentColor"><use href="#icon-close"></use></svg>'
        : '<svg width="24" height="24" fill="currentColor"><use href="#icon-menu"></use></svg>';
    }

    function setArticleTocCollapsed(isCollapsed) {
      if (!articlePage) {
        return;
      }

      articlePage.classList.toggle('article-page-toc-collapsed', !sidebarOverlayQuery.matches && isCollapsed);
    }

    function syncSidebarMode() {
      if (sidebarOverlayQuery.matches) {
        sidebar.classList.remove('collapsed');
        sidebar.classList.remove('active');
        sidebarToggle.classList.remove('active');
        setArticleTocCollapsed(false);
        updateSidebarIcon(false);
        return;
      }

      sidebar.classList.remove('active');
      sidebarToggle.classList.remove('active');
      const isCollapsed = getStorageItem('sidebarCollapsed') === 'true';
      sidebar.classList.toggle('collapsed', isCollapsed);
      setArticleTocCollapsed(isCollapsed);
      updateSidebarIcon(!isCollapsed);
    }

    syncSidebarMode();

    sidebarToggle.addEventListener('click', () => {
      if (sidebarOverlayQuery.matches) {
        const isOpen = !sidebar.classList.contains('active');
        sidebar.classList.toggle('active', isOpen);
        sidebarToggle.classList.toggle('active', isOpen);
        updateSidebarIcon(isOpen);
        return;
      }

      sidebarToggle.classList.remove('active');
      const isCollapsed = sidebar.classList.contains('collapsed');
      const nextCollapsed = !isCollapsed;
      sidebar.classList.toggle('collapsed', nextCollapsed);
      setArticleTocCollapsed(nextCollapsed);
      setStorageItem('sidebarCollapsed', nextCollapsed);
      updateSidebarIcon(isCollapsed);
    });

    onMediaQueryChange(mobileQuery, () => {
      syncSidebarMode();
    });

    onMediaQueryChange(sidebarOverlayQuery, () => {
      syncSidebarMode();
    });
  }

  // ============================================
  // Reading Progress Bar - 阅读进度条
  // ============================================
  const progressBar = document.querySelector('.reading-progress');

  if (progressBar) {
    let progressFrame = 0;
    let progressDocumentHeight = 0;
    let progressBoundsDirty = true;
    let lastProgressScale = '';

    function updateProgressBounds() {
      const windowHeight = window.innerHeight;
      progressDocumentHeight = document.documentElement.scrollHeight - windowHeight;
      progressBoundsDirty = false;
    }

    function renderReadingProgress() {
      progressFrame = 0;

      if (progressBoundsDirty) {
        updateProgressBounds();
      }

      const scrolled = window.scrollY;
      const progress = progressDocumentHeight <= 0
        ? 0
        : Math.min(Math.max((scrolled / progressDocumentHeight) * 100, 0), 100);

      const nextProgressScale = `scaleX(${(progress / 100).toFixed(4)})`;

      if (nextProgressScale !== lastProgressScale) {
        lastProgressScale = nextProgressScale;
        progressBar.style.transform = nextProgressScale;
      }
    }

    function requestReadingProgress() {
      if (progressFrame) {
        return;
      }

      progressFrame = window.requestAnimationFrame(renderReadingProgress);
    }

    updateProgressBounds();
    requestReadingProgress();

    window.addEventListener('scroll', requestReadingProgress, { passive: true });
    window.addEventListener('resize', () => {
      progressBoundsDirty = true;
      requestReadingProgress();
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
    const tocContainer = document.querySelector('.article-page .toc') || document.querySelector('.toc');
    const tocLinkByHash = new Map();
    let activeTocLink = null;
    let tocUpdateFrame = 0;
    let tocScrollFrame = 0;
    const tocReducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const observerOptions = {
      rootMargin: '-100px 0px -66%',
      threshold: 0
    };

    function addTocHashVariant(hash, link) {
      if (!hash) {
        return;
      }

      tocLinkByHash.set(hash, link);

      try {
        tocLinkByHash.set(decodeURIComponent(hash), link);
      } catch (error) {
        // Keep the original hash when it is already decoded or malformed.
      }
    }

    function getTocLinkForHeading(heading) {
      const id = heading ? heading.getAttribute('id') : '';

      if (!id) {
        return null;
      }

      return tocLinkByHash.get(`#${id}`) || tocLinkByHash.get(`#${encodeURIComponent(id)}`) || null;
    }

    function followActiveTocLink(link, instant = false) {
      if (!tocContainer || !link || tocContainer.scrollHeight <= tocContainer.clientHeight + 2) {
        return;
      }

      if (tocScrollFrame) {
        window.cancelAnimationFrame(tocScrollFrame);
      }

      tocScrollFrame = window.requestAnimationFrame(() => {
        tocScrollFrame = 0;

        const tocRect = tocContainer.getBoundingClientRect();
        const linkRect = link.getBoundingClientRect();
        const linkCenter = linkRect.top - tocRect.top + tocContainer.scrollTop + linkRect.height / 2;
        const targetTop = linkCenter - tocContainer.clientHeight * 0.42;
        const maxTop = tocContainer.scrollHeight - tocContainer.clientHeight;
        const nextTop = Math.min(Math.max(targetTop, 0), maxTop);
        const currentDelta = Math.abs(tocContainer.scrollTop - nextTop);

        if (currentDelta < 2) {
          return;
        }

        tocContainer.scrollTo({
          top: nextTop,
          behavior: instant || tocReducedMotionQuery.matches ? 'auto' : 'smooth'
        });
      });
    }

    function setActiveTocLink(nextActiveLink, instant = false) {
      if (!nextActiveLink || nextActiveLink === activeTocLink) {
        if (nextActiveLink) {
          followActiveTocLink(nextActiveLink, instant);
        }

        return;
      }

      if (activeTocLink) {
        activeTocLink.classList.remove('active');
      }

      nextActiveLink.classList.add('active');
      activeTocLink = nextActiveLink;
      followActiveTocLink(nextActiveLink, instant);
    }

    function updateTocByScroll(instant = false) {
      tocUpdateFrame = 0;

      const probeY = Math.min(Math.max(window.innerHeight * 0.22, 112), 168);
      let currentHeading = headings[0];

      headings.forEach(heading => {
        if (heading.getBoundingClientRect().top <= probeY) {
          currentHeading = heading;
        }
      });

      setActiveTocLink(getTocLinkForHeading(currentHeading), instant);
    }

    function requestTocUpdate(instant = false) {
      if (tocUpdateFrame) {
        return;
      }

      tocUpdateFrame = window.requestAnimationFrame(() => updateTocByScroll(instant));
    }

    tocLinks.forEach(link => {
      const href = link.getAttribute('href');

      if (!href) {
        return;
      }

      addTocHashVariant(href, link);

      try {
        const url = new URL(href, window.location.href);

        if (url.pathname === window.location.pathname) {
          addTocHashVariant(url.hash, link);
        }
      } catch (error) {
        // Hash-only links are already handled above.
      }
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveTocLink(getTocLinkForHeading(entry.target));
        }
      });
    }, observerOptions);

    headings.forEach(heading => {
      if (heading.getAttribute('id')) {
        observer.observe(heading);
      }
    });

    updateTocByScroll(true);
    window.addEventListener('scroll', () => requestTocUpdate(false), { passive: true });
    window.addEventListener('resize', () => requestTocUpdate(true));
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

      const searchTerm = query.toLowerCase();
      const results = searchIndex.filter(item => {
        const title = String(item.title || '').toLowerCase();
        const content = String(item.content || '').toLowerCase();

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
  const CODE_LANGUAGE_ALIASES = {
    sh: 'bash',
    shell: 'bash',
    zsh: 'bash',
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    rb: 'ruby',
    yml: 'yaml',
    md: 'markdown',
    html: 'html',
    xml: 'html'
  };
  const CODE_LANGUAGE_LABELS = {
    bash: 'Bash',
    c: 'C',
    cpp: 'C++',
    css: 'CSS',
    go: 'Go',
    html: 'HTML',
    java: 'Java',
    javascript: 'JavaScript',
    json: 'JSON',
    markdown: 'Markdown',
    php: 'PHP',
    python: 'Python',
    ruby: 'Ruby',
    rust: 'Rust',
    text: 'Text',
    typescript: 'TypeScript',
    yaml: 'YAML'
  };
  const CODE_LANGUAGE_TAB_SIZES = {
    bash: 2,
    css: 2,
    html: 2,
    javascript: 2,
    json: 2,
    markdown: 2,
    typescript: 2,
    yaml: 2,
    c: 4,
    cpp: 4,
    go: 4,
    java: 4,
    php: 4,
    python: 4,
    ruby: 2,
    rust: 4
  };

  function normalizeCodeLanguage(language) {
    const normalized = String(language || '')
      .trim()
      .toLowerCase()
      .replace(/^language-/, '')
      .replace(/^lang-/, '');

    return CODE_LANGUAGE_ALIASES[normalized] || normalized || 'text';
  }

  function detectCodeLanguage(block, codeElement) {
    const preElement = codeElement.closest('pre');
    const candidates = [
      codeElement.dataset.lang,
      preElement && preElement.dataset.lang,
      block.dataset.lang
    ];
    const classSources = [
      codeElement.className,
      preElement && preElement.className,
      block.className
    ];

    classSources.forEach(className => {
      const match = String(className || '').match(/\b(?:language|lang)-([a-z0-9_+-]+)/i);

      if (match) {
        candidates.push(match[1]);
      }
    });

    return normalizeCodeLanguage(candidates.find(Boolean));
  }

  document.querySelectorAll('.highlight').forEach((block, index) => {
    const codeElement = block.querySelector('code');

    if (!codeElement) {
      return;
    }

    const language = detectCodeLanguage(block, codeElement);
    const languageLabel = CODE_LANGUAGE_LABELS[language] || language.toUpperCase();
    const tabSize = CODE_LANGUAGE_TAB_SIZES[language] || 2;
    const header = document.createElement('div');
    const windowControls = document.createElement('span');
    const langLabel = document.createElement('span');

    block.dataset.codeLang = language;
    block.style.setProperty('--code-tab-size', String(tabSize));
    codeElement.style.tabSize = tabSize;
    header.className = 'code-block-header';
    windowControls.className = 'code-window-controls';
    windowControls.setAttribute('aria-hidden', 'true');
    windowControls.innerHTML = '<span></span><span></span><span></span>';
    langLabel.className = 'code-lang-label';
    langLabel.textContent = languageLabel;

    // 添加复制按钮
    const button = document.createElement('button');
    button.className = 'copy-code-button';
    button.type = 'button';
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

    header.append(windowControls, langLabel, button);
    block.insertBefore(header, block.firstChild);
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

    onMediaQueryChange(mobileQuery, () => {
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
    let metricByLink = new Map();
    let isPointerTracking = false;
    let resizeTimeout = null;
    let metricsFrame = null;
    let pointerFrame = null;
    let pointerClientX = 0;
    let indicatorFrame = null;
    let lastFrameTime = 0;
    let activeMenuLink = null;
    const indicatorVisualCache = new Map();
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

      activeMenuLink = activeLink;
      navbarMenu.classList.toggle('has-active', Boolean(activeLink));

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
      metricByLink = new Map(itemMetrics.map(metric => [metric.link, metric]));

    }

    function metricForLink(link) {
      return metricByLink.get(link);
    }

    function setIndicatorVisualVariable(name, value) {
      if (indicatorVisualCache.get(name) === value) {
        return;
      }

      indicatorVisualCache.set(name, value);
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
            Math.abs(distance) * 1.05 + Math.abs(indicator.velocity) * 0.016,
            0,
            stretchLimit
          );
      const renderedWidth = Math.min(baseWidth + stretch, indicatorAreaWidth + 8);
      const baseElementWidth = Math.max(indicator.targetWidth, 1);
      const renderedCenter = indicator.center + distance * 0.5;
      const minLeft = -4;
      const maxLeft = Math.max(minLeft, indicatorAreaWidth - renderedWidth + 4);
      const visualLeft = clamp(renderedCenter - renderedWidth / 2, minLeft, maxLeft);
      const visualCenter = visualLeft + renderedWidth / 2;
      const left = visualCenter - baseElementWidth / 2;
      const direction = Math.abs(distance) > 0.35
        ? Math.sign(distance)
        : (Math.abs(indicator.velocity) > 6
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
      const scaleX = clamp(renderedWidth / baseElementWidth, 0.72, 2.35);
      const scaleY =
        1 +
        lift * 0.105 +
        visualEnergy * 0.07 -
        widthBounce * 0.03 * lift;
      const skew = direction * visualEnergy * -2.4;
      const edgeOpacity = indicator.visible
        ? lift * (0.22 + energy * 0.5)
        : 0;

      indicator.direction = direction || indicator.direction;

      setIndicatorVisualVariable('--indicator-x', `${left.toFixed(2)}px`);
      setIndicatorVisualVariable('--indicator-width', `${baseElementWidth.toFixed(2)}px`);
      setIndicatorVisualVariable('--indicator-scale-x', scaleX.toFixed(4));
      setIndicatorVisualVariable('--indicator-scale-y', scaleY.toFixed(4));
      setIndicatorVisualVariable('--indicator-skew', `${skew.toFixed(2)}deg`);
      setIndicatorVisualVariable('--indicator-edge-opacity', edgeOpacity.toFixed(3));
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
      const deltaTime = clamp(elapsed / 1000, 1 / 120, 1 / 24);
      const centerFrequency = isPointerTracking ? 7.6 : 6.2;
      const centerDamping = isPointerTracking ? 0.74 : 0.78;
      const widthFrequency = isPointerTracking ? 6.2 : 5.4;
      const widthDamping = isPointerTracking ? 0.78 : 0.82;

      advanceSpring(
        indicator.center,
        indicator.velocity,
        indicator.targetCenter,
        centerFrequency,
        centerDamping,
        deltaTime
      );
      indicator.center = springResult.value;
      indicator.velocity = springResult.velocity;

      advanceSpring(
        indicator.width,
        indicator.widthVelocity,
        indicator.targetWidth,
        widthFrequency,
        widthDamping,
        deltaTime
      );
      indicator.width = springResult.value;
      indicator.widthVelocity = springResult.velocity;

      advanceSpring(
        indicator.lift,
        indicator.liftVelocity,
        indicator.liftTarget,
        5.2,
        0.82,
        deltaTime
      );
      indicator.lift = springResult.value;
      indicator.liftVelocity = springResult.velocity;

      lastFrameTime = timestamp;

      renderIndicator();

      const settled =
        Math.abs(indicator.targetCenter - indicator.center) < 0.04 &&
        Math.abs(indicator.targetWidth - indicator.width) < 0.04 &&
        Math.abs(indicator.velocity) < 3 &&
        Math.abs(indicator.widthVelocity) < 3 &&
        Math.abs(indicator.liftTarget - indicator.lift) < 0.002 &&
        Math.abs(indicator.liftVelocity) < 0.08;

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
      const nextWidth = Math.max(width, 0);
      const targetDelta = center - indicator.targetCenter;
      const widthDelta = nextWidth - indicator.targetWidth;

      if (
        !instant &&
        indicator.visible &&
        options.visible !== false &&
        Math.abs(targetDelta) < 0.25 &&
        Math.abs(widthDelta) < 0.25
      ) {
        return;
      }

      indicator.targetCenter = center;
      indicator.targetWidth = nextWidth;
      indicator.visible = options.visible !== false;

      if (instant) {
        stopIndicatorAnimation();
        indicator.center = center;
        indicator.width = nextWidth;
        indicator.velocity = 0;
        indicator.widthVelocity = 0;
        indicator.initialized = true;
        renderIndicator();
        return;
      }

      indicator.velocity += clamp(targetDelta * (isPointerTracking ? 2.4 : 4.2), -760, 760);
      indicator.widthVelocity += clamp(widthDelta * 2.8, -420, 420);

      startIndicatorAnimation();
    }

    function setIndicatorLift(target, instant = false) {
      indicator.liftTarget = clamp(target, 0, 1);
      navbarMenu.classList.toggle('is-indicator-lifted', indicator.liftTarget > 0.05);

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
      setIndicatorVisualVariable('--indicator-x', '0px');
      setIndicatorVisualVariable('--indicator-width', '0px');
      setIndicatorVisualVariable('--indicator-scale-x', '1');
      setIndicatorVisualVariable('--indicator-inset-y', '0px');
      setIndicatorVisualVariable('--indicator-scale-y', '1');
      setIndicatorVisualVariable('--indicator-skew', '0deg');
      navbarMenu.classList.remove('is-indicator-lifted');
    }

    function updateLiquidIndicator(link, instant = false, options = {}) {
      if (!isDesktopNavbar()) return;

      if (!options.skipMetricsRefresh) {
        refreshNavbarMetrics();
      }

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

      if (localX <= leftMetric.center) {
        rightMetric = leftMetric;
      } else if (localX >= rightMetric.center) {
        leftMetric = rightMetric;
      } else {
        for (let index = 0; index < itemMetrics.length - 1; index += 1) {
          const current = itemMetrics[index];
          const next = itemMetrics[index + 1];

          if (localX >= current.center && localX <= next.center) {
            leftMetric = current;
            rightMetric = next;
            break;
          }
        }
      }

      const distance = rightMetric.center - leftMetric.center;
      const ratio = distance === 0
        ? 0
        : clamp((localX - leftMetric.center) / distance, 0, 1);
      const width = leftMetric.width + (rightMetric.width - leftMetric.width) * ratio;

      setIndicatorTarget(localX, width);
    }

    function schedulePointerTarget(clientX) {
      pointerClientX = clientX;

      if (pointerFrame !== null) {
        return;
      }

      pointerFrame = window.requestAnimationFrame(() => {
        pointerFrame = null;
        updateIndicatorTargetByPointer(pointerClientX);
      });
    }

    function restoreActiveIndicator(skipMetricsRefresh = false, instant = false) {
      if (activeMenuLink) {
        updateLiquidIndicator(activeMenuLink, instant, { skipMetricsRefresh });
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
        activeMenuLink = link;
        navbarMenu.classList.add('has-active');

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
      schedulePointerTarget(event.clientX);
    }, { passive: true });

    navbarMenu.addEventListener('pointermove', (event) => {
      if (!isPointerTracking || event.pointerType === 'touch') return;

      schedulePointerTarget(event.clientX);
    }, { passive: true });

    function stopPointerTracking() {
      isPointerTracking = false;
      if (pointerFrame !== null) {
        window.cancelAnimationFrame(pointerFrame);
        pointerFrame = null;
      }
      setIndicatorLift(0);
      restoreActiveIndicator();
    }

    navbarMenu.addEventListener('pointerleave', stopPointerTracking, { passive: true });
    navbarMenu.addEventListener('pointercancel', stopPointerTracking, { passive: true });

    function initializeIndicator(skipMetricsRefresh = false) {
      setActiveLink();

      if (!isDesktopNavbar()) {
        hideIndicator();
        return;
      }

      if (activeMenuLink) {
        updateLiquidIndicator(activeMenuLink, true, { skipMetricsRefresh });
      } else {
        hideIndicator();
      }
    }

    initializeIndicator();

    function scheduleNavbarMetricsRefresh() {
      if (metricsFrame !== null) {
        return;
      }

      metricsFrame = window.requestAnimationFrame(() => {
        metricsFrame = null;
        refreshNavbarMetrics();
        if (!isPointerTracking) restoreActiveIndicator(true, true);
      });
    }

    // 窗口大小改变时重新计算 - rAF 合并，避免 resize/融合动画期间抖动。
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(scheduleNavbarMetricsRefresh, 80);
    });
    window.addEventListener('imx:navigation-layout-change', scheduleNavbarMetricsRefresh);

    if ('ResizeObserver' in window) {
      const navbarResizeObserver = new ResizeObserver(scheduleNavbarMetricsRefresh);

      navbarResizeObserver.observe(navbarMenu);
    }

    onMediaQueryChange(reducedMotionQuery, () => initializeIndicator());

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
