import { createGlyphGPU } from "./home-glyph-gpu.js";
import { htmlElement } from "./core/dom.js";
import { onMediaQueryChange } from "./core/media-query.js";

export function initHomeEntryHero() {
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
  let heroResizeTimer = 0;
  let typedTimer = 0;
  let glyphFrame = 0;
  let glyphContext = null;
  let glyphGPU = null;
  let glyphGPUFailed = false;
  let glyphRows = [];
  let glyphCanvasDirty = true;
  let glyphWidth = 1;
  let glyphHeight = 1;
  let glyphPixelRatio = 1;
  let glyphSpeed = 0.85;
  let glyphTargetSpeed = 0.85;
  let glyphPointer = { x: 1, y: 1 };
  let glyphLastFrameTime = 0;
  let glyphLastPaintTime = 0;
  let glyphAccentColor = '37, 99, 235';
  let glyphGlowCenterAlpha = 0.045;
  let glyphGlowMiddleAlpha = 0.015;
  let glyphGlowGradient = null;
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
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    // Mobile code text needs retina coverage instead of an upscaled 1.25x
    // surface. Keep desktop's existing budget and bound very dense displays.
    const pixelRatioLimit = width <= 768 ? 3 : 1.5;
    const ratio = Math.min(window.devicePixelRatio || 1, pixelRatioLimit);

    // Font/Dock updates also dispatch resize; keep the current rows and phase
    // when the backing surface does not actually need to change.
    if (glyphContext && width === glyphWidth && height === glyphHeight && ratio === glyphPixelRatio) {
      return { unchanged: true };
    }

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

    return { context, width, height, ratio };
  }

  function refreshGlyphGlow() {
    if (!glyphContext) {
      return;
    }

    glyphGlowGradient = glyphContext.createRadialGradient(
      glyphPointer.x,
      glyphPointer.y,
      0,
      glyphPointer.x,
      glyphPointer.y,
      0.34 * Math.max(glyphWidth, glyphHeight)
    );
    glyphGlowGradient.addColorStop(0, `rgba(${glyphAccentColor}, ${glyphGlowCenterAlpha})`);
    glyphGlowGradient.addColorStop(0.48, `rgba(${glyphAccentColor}, ${glyphGlowMiddleAlpha})`);
    glyphGlowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  }

  function refreshGlyphPaint() {
    const isDark = htmlElement.getAttribute('data-theme') === 'dark';
    const rowColor = isDark ? '244, 244, 245' : '24, 32, 48';
    glyphAccentColor = isDark ? '161, 161, 170' : '37, 99, 235';
    glyphGlowCenterAlpha = isDark ? 0.09 : 0.045;
    glyphGlowMiddleAlpha = isDark ? 0.03 : 0.015;

    for (let index = 0; index < glyphRows.length; index += 1) {
      const row = glyphRows[index];
      row.fillStyle = `rgba(${rowColor}, ${row.alpha})`;
    }

    refreshGlyphGlow();
  }

  function drawGlyphFrame(timestamp = performance.now()) {
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

    const glyphFrameInterval = 1000 / 60;
    const timeSincePaint = glyphLastPaintTime > 0
      ? timestamp - glyphLastPaintTime
      : glyphFrameInterval;

    if (timeSincePaint < glyphFrameInterval - 1) {
      if (canAnimateHomeEntry()) {
        glyphFrame = window.requestAnimationFrame(drawGlyphFrame);
      }
      return;
    }

    const elapsed = glyphLastFrameTime > 0 ? timestamp - glyphLastFrameTime : 1000 / 60;
    const frameScale = Math.min(Math.max(elapsed / (1000 / 60), 0.25), 3);
    const speedBlend = 1 - Math.pow(1 - 0.055, frameScale);
    glyphLastFrameTime = timestamp;
    glyphLastPaintTime = timestamp;

    if (!glyphGPU) context.clearRect(0, 0, glyphWidth, glyphHeight);
    glyphSpeed += (glyphTargetSpeed - glyphSpeed) * speedBlend;

    for (let index = 0; index < glyphRows.length; index += 1) {
      const row = glyphRows[index];
      row.x += row.speed * glyphSpeed * frameScale;

      while (row.x < -row.width / 2) {
        row.x += row.width / 2;
      }

      if (!glyphGPU) {
        context.fillStyle = row.fillStyle;
        context.fillText(row.content, row.x, row.y);
      }
    }

    if (glyphGPU) glyphGPU.draw(glyphPointer, htmlElement.getAttribute('data-theme') === 'dark');

    if (!glyphGPU && glyphGlowGradient) {
      context.globalCompositeOperation = 'lighter';
      context.fillStyle = glyphGlowGradient;
      // The gradient is fully transparent outside its radius. Avoid blending
      // those pixels across the entire screen on every animation frame.
      const radius = 0.34 * Math.max(glyphWidth, glyphHeight);
      context.fillRect(glyphPointer.x - radius, glyphPointer.y - radius, radius * 2, radius * 2);
      context.globalCompositeOperation = 'source-over';
    }

    if (canAnimateHomeEntry()) {
      glyphFrame = window.requestAnimationFrame(drawGlyphFrame);
    }
  }

  function canAnimateHomeEntry() {
    return heroVisible && documentVisible && !reduceMotionQuery.matches && window.__IMX_PAGE_READY__ !== false;
  }

  function stopGlyphAnimation() {
    window.cancelAnimationFrame(glyphFrame);
    glyphFrame = 0;
    glyphLastFrameTime = 0;
    glyphLastPaintTime = 0;
  }

  function startGlyphAnimation() {
    if (glyphFrame || !canAnimateHomeEntry()) {
      return;
    }

    glyphLastFrameTime = 0;
    glyphLastPaintTime = 0;
    glyphFrame = window.requestAnimationFrame(drawGlyphFrame);
  }

  function setupGlyphCanvas() {
    if (!glyphCanvas) {
      return;
    }

    const canvasState = prepareCanvas(glyphCanvas);
    if (!canvasState) {
      return;
    }
    glyphCanvasDirty = false;
    if (canvasState.unchanged) {
      startGlyphAnimation();
      return;
    }

    window.cancelAnimationFrame(glyphFrame);
    glyphFrame = 0;
    glyphLastFrameTime = 0;
    glyphLastPaintTime = 0;

    const { context, width, height, ratio } = canvasState;
    const isDark = htmlElement.getAttribute('data-theme') === 'dark';

    glyphWidth = width;
    glyphHeight = height;
    glyphPixelRatio = ratio;
    glyphPointer = { x: 0.62 * width, y: 0.36 * height };
    glyphSpeed = 0.85;
    glyphTargetSpeed = 0.85;
    context.font = '650 15px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';
    context.textBaseline = 'top';
    context.textAlign = 'left';
    glyphRows = Array.from({ length: Math.ceil(height / 18) + 2 }, (_, rowIndex) => {
      const content = createGlyphRow(width);

      return {
        alpha: Number((Math.random() * 0.24 + (isDark ? 0.22 : 0.2)).toFixed(3)),
        content,
        fillStyle: '',
        speed: -(Math.random() * 0.44 + 0.34),
        width: context.measureText(content).width,
        x: -(Math.random() * width),
        y: 18 * rowIndex
      };
    });
    refreshGlyphPaint();
    glyphGPU?.dispose();
    glyphGPU = null;
    if (!glyphGPUFailed) {
      glyphGPU = createGlyphGPU(glyphCanvas, glyphRows, width, height, ratio, context.font, () => {
        glyphGPU = null;
        glyphGPUFailed = true;
        hero.dataset.glyphRenderer = 'canvas';
        stopGlyphAnimation();
        if (canAnimateHomeEntry()) drawGlyphFrame();
      });
    }
    hero.dataset.glyphRenderer = glyphGPU ? 'webgl' : 'canvas';
    // Upload and draw the first frame under the loader, without starting motion.
    if (glyphGPU) glyphGPU.draw(glyphPointer, isDark);
    else {
      glyphRows.forEach(row => { context.fillStyle = row.fillStyle; context.fillText(row.content, row.x, row.y); });
    }

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
    refreshGlyphGlow();

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

    if (reduceMotionQuery.matches || !heroVisible || !documentVisible || window.__IMX_PAGE_READY__ === false) {
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

    // Present the full subtitle during entry; start the existing typing loop
    // only after the reader has had time to see the initial content.
    current.push(...chars);
    index = chars.length;
    typoFixed = true;
    setSubtitleText();
    schedule(deleteNext, 1850);
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
    glyphCanvasDirty = true;

    if (heroResizeTimer) {
      window.clearTimeout(heroResizeTimer);
    }

    heroResizeTimer = window.setTimeout(() => {
      heroResizeTimer = 0;

      if (heroResizeFrame) {
        return;
      }

      heroResizeFrame = window.requestAnimationFrame(() => {
        heroResizeFrame = 0;
        requestCanvasRender();
      });
    }, 120);
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

  window.__IMX_HOME_READY__ = document.fonts.ready.then(() => {
    if (!reduceMotionQuery.matches) setupGlyphCanvas();
  }).catch(() => {});
  initTypedSubtitle();

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

  const themeObserver = new MutationObserver(() => {
    refreshGlyphPaint();

    if (!glyphFrame) {
      drawGlyphFrame();
    }
  });
  themeObserver.observe(htmlElement, { attributes: true, attributeFilter: ['data-theme'] });

  function pauseHomeEntryMotion() {
    stopGlyphAnimation();
    stopTypedSubtitle(true);
  }

  function resumeHomeEntryMotion() {
    if (!heroVisible || !documentVisible || window.__IMX_PAGE_READY__ === false) {
      return;
    }

    if (glyphCanvasDirty || !glyphContext || glyphRows.length === 0) {
      requestCanvasRender();
    } else {
      startGlyphAnimation();
    }

    if (!typedActive) {
      initTypedSubtitle();
    }
  }

  document.addEventListener('imx:page-ready', resumeHomeEntryMotion);

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
