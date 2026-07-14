import { mobileQuery } from "./core/dom.js";
import { onMediaQueryChange } from "./core/media-query.js";

export function initSharedDock() {
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
    const actionsRect = navbarActions ? navbarActions.getBoundingClientRect() : null;
    const themeToggleRect = navbarThemeToggle ? navbarThemeToggle.getBoundingClientRect() : null;
    const containerRect = navbarContainer.getBoundingClientRect();
    const currentBrandShift = parseFloat(lastDockBrandShift) || 0;
    const currentActionsShift = parseFloat(lastDockActionsShift) || 0;
    const currentGroupShift = parseFloat(lastDockGroupShift) || 0;
    const visualGap = Math.max(10, Math.min(18, window.innerWidth * 0.014));
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
    const actionsBaseLeft = actionsRect
      ? actionsRect.left - currentActionsShift - currentGroupShift
      : window.innerWidth;
    const actionsBaseRight = actionsRect
      ? actionsRect.right - currentActionsShift - currentGroupShift
      : window.innerWidth;
    const menuLeft = menuRect ? menuRect.left - currentGroupShift : 0;
    const menuRight = menuRect ? menuRect.right - currentGroupShift : window.innerWidth;
    const brandDistance = brandRect && menuRect
      ? Math.max(0, menuLeft - brandBaseRight - visualGap)
      : fallbackDistance;
    const actionsDistance = actionsRect && menuRect
      ? Math.max(0, actionsBaseLeft - menuRight - visualGap)
      : fallbackDistance;
    const widthRatio = brandRect && themeToggleRect && themeToggleRect.width > 0
      ? brandRect.width / themeToggleRect.width
      : 1;
    const actionsLead = Math.min(1.62, Math.max(1.12, 1 + (widthRatio - 1) * 0.18));
    const shellLeadingPad = 1;
    const shellTrailingPad = 1;
    const finalBrandLeft = brandBaseLeft + brandDistance;
    const finalBrandRight = brandBaseRight + brandDistance;
    const finalActionsLeft = actionsBaseLeft - actionsDistance;
    const finalActionsRight = actionsBaseRight - actionsDistance;
    const shellFinalLeft = Math.max(
      containerBaseLeft,
      Math.min(finalBrandLeft, menuLeft, finalActionsLeft) - shellLeadingPad
    );
    const shellFinalRight = Math.min(
      containerBaseRight,
      Math.max(finalBrandRight, menuRight, finalActionsRight) + shellTrailingPad
    );
    const shellWidth = Math.max(1, shellFinalRight - shellFinalLeft);
    const shellStartWidth = Math.min(
      shellWidth,
      Math.max(1, menuRight - menuLeft + shellLeadingPad + shellTrailingPad)
    );
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

  function getDockAttraction(progress, nextMerged) {
    if (mobileQuery.matches) {
      return 0;
    }

    if (reduceMotionQuery.matches) {
      return nextMerged ? 1 : 0;
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

  function setDockAttraction(progress, currentMetrics, nextMerged) {
    setDockAttractionValue(getDockAttraction(progress, nextMerged), currentMetrics);
  }

  function setMergedState(nextMerged) {
    if (merged === nextMerged) {
      return false;
    }

    merged = nextMerged;
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

    setDockAttraction(progress, currentMetrics, nextMerged);
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
