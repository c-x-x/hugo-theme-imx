import { mobileQuery } from "./core/dom.js";
import { getStorageItem, setStorageItem } from "./core/storage.js";
import { onMediaQueryChange } from "./core/media-query.js";
export function initToc() {
  if (!document.querySelector(".sidebar-toggle, .toc")) return;

  // ============================================
  // Sidebar Toggle - 侧边栏切换
  // ============================================
  const sidebarToggle = document.querySelector('.sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');
  const articlePage = document.querySelector('.article-page');
  const articleTools = document.querySelector('.article-tools');

  if (sidebarToggle && sidebar) {
    function updateSidebarIcon(isOpen) {
      sidebarToggle.innerHTML = isOpen
        ? '<svg width="24" height="24" fill="currentColor"><use href="#icon-close"></use></svg>'
        : '<svg width="24" height="24" fill="currentColor"><use href="#icon-menu"></use></svg>';
    }

    function updateSidebarState(isOpen) {
      updateSidebarIcon(isOpen);
      sidebarToggle.setAttribute('aria-expanded', String(isOpen));
      sidebarToggle.setAttribute('aria-label', isOpen ? '关闭目录' : '打开目录');
      if (articleTools) {
        articleTools.classList.toggle('is-toc-open', isOpen);
      }
    }

    function setArticleTocCollapsed(isCollapsed) {
      if (!articlePage) {
        return;
      }

      articlePage.classList.toggle('article-page-toc-collapsed', !mobileQuery.matches && isCollapsed);
    }

    function syncSidebarMode() {
      if (mobileQuery.matches) {
        sidebar.classList.remove('collapsed');
        sidebar.classList.remove('active');
        sidebarToggle.classList.remove('active');
        setArticleTocCollapsed(false);
        updateSidebarState(false);
        return;
      }

      sidebar.classList.remove('active');
      sidebarToggle.classList.remove('active');
      const isCollapsed = getStorageItem('sidebarCollapsed') === 'true';
      sidebar.classList.toggle('collapsed', isCollapsed);
      setArticleTocCollapsed(isCollapsed);
      updateSidebarState(!isCollapsed);
    }

    syncSidebarMode();

    sidebarToggle.addEventListener('click', () => {
      if (mobileQuery.matches) {
        const isOpen = !sidebar.classList.contains('active');
        sidebar.classList.toggle('active', isOpen);
        sidebarToggle.classList.toggle('active', isOpen);
        updateSidebarState(isOpen);
        return;
      }

      sidebarToggle.classList.remove('active');
      const isCollapsed = sidebar.classList.contains('collapsed');
      const nextCollapsed = !isCollapsed;
      sidebar.classList.toggle('collapsed', nextCollapsed);
      setArticleTocCollapsed(nextCollapsed);
      setStorageItem('sidebarCollapsed', nextCollapsed);
      updateSidebarState(isCollapsed);
    });

    onMediaQueryChange(mobileQuery, () => {
      syncSidebarMode();
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
    const articleContent = document.querySelector('.article-content');
    const tocLinkByHash = new Map();
    let activeTocLink = null;
    let headingPositions = [];
    let tocGeometryDirty = true;
    let tocUpdateInstant = false;
    let tocUpdateFrame = 0;
    let tocScrollFrame = 0;
    const tocReducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

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

    function rebuildTocGeometry() {
      const scrollTop = window.scrollY;
      headingPositions = Array.from(headings, heading => ({
        link: getTocLinkForHeading(heading),
        top: scrollTop + heading.getBoundingClientRect().top
      })).filter(item => item.link);
      tocGeometryDirty = false;
    }

    function updateTocByScroll(instant = false) {
      tocUpdateFrame = 0;

      if (tocGeometryDirty) {
        rebuildTocGeometry();
      }

      if (headingPositions.length === 0) {
        return;
      }

      const probeTop = window.scrollY + Math.min(Math.max(window.innerHeight * 0.22, 112), 168);
      let low = 0;
      let high = headingPositions.length - 1;
      let activeIndex = 0;

      while (low <= high) {
        const middle = Math.floor((low + high) / 2);

        if (headingPositions[middle].top <= probeTop) {
          activeIndex = middle;
          low = middle + 1;
        } else {
          high = middle - 1;
        }
      }

      setActiveTocLink(headingPositions[activeIndex].link, instant);
    }

    function requestTocUpdate(instant = false, refreshGeometry = false) {
      tocUpdateInstant = tocUpdateInstant || instant;
      tocGeometryDirty = tocGeometryDirty || refreshGeometry;

      if (tocUpdateFrame) {
        return;
      }

      tocUpdateFrame = window.requestAnimationFrame(() => {
        const nextInstant = tocUpdateInstant;
        tocUpdateInstant = false;
        updateTocByScroll(nextInstant);
      });
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

    updateTocByScroll(true);
    window.addEventListener('scroll', () => requestTocUpdate(false), { passive: true });
    window.addEventListener('resize', () => requestTocUpdate(true, true));
    window.addEventListener('load', () => requestTocUpdate(true, true), { once: true });

    if (articleContent && 'ResizeObserver' in window) {
      const articleResizeObserver = new ResizeObserver(() => requestTocUpdate(true, true));
      articleResizeObserver.observe(articleContent);
    }

    if (articleContent) {
      articleContent.querySelectorAll('img').forEach(image => {
        if (!image.complete) {
          image.addEventListener('load', () => requestTocUpdate(true, true), { once: true });
        }
      });
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => requestTocUpdate(true, true));
    }
  }

}
