import { mobileQuery } from "./core/dom.js";
import { onMediaQueryChange } from "./core/media-query.js";
export function initNavigation() {
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

}
