export function getSameOriginPath(url) {
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

