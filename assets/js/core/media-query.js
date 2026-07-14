export function onMediaQueryChange(query, callback) {
  if (query.addEventListener) {
    query.addEventListener('change', callback);
    return;
  }

  if (query.addListener) {
    query.addListener(callback);
  }
}

