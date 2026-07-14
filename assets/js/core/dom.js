export const themeToggle = document.querySelector(".theme-toggle");
export const themeLogos = document.querySelectorAll("[data-logo-light][data-logo-dark]");
export const htmlElement = document.documentElement;
export const mobileQuery = window.matchMedia("(max-width: 768px)");
export const sidebarOverlayQuery = window.matchMedia("(max-width: 768px)");

export function initBrowserCompatibility() {
  const isSafariBrowser = /^((?!android|chrome|crios|fxios|edg|opr).)*safari/i.test(navigator.userAgent);
  htmlElement.classList.toggle("is-safari-browser", isSafariBrowser);
}
