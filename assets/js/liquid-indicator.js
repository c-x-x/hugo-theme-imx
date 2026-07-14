import { mobileQuery } from "./core/dom.js";
import { onMediaQueryChange } from "./core/media-query.js";
import { advanceSpring, springResult } from "./core/motion.js";
export function initLiquidIndicator() {
  const navbarMenu = document.querySelector(".navbar-menu");
  if (!navbarMenu) return;

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

}
