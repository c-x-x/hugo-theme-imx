const katexVersion = '0.16.47';
const katexBase = `https://cdn.jsdelivr.net/npm/katex@${katexVersion}/dist/`;
function script(src, integrity) {
  return new Promise((resolve, reject) => {
    const element = document.createElement('script');
    element.src = src;
    element.integrity = integrity;
    element.crossOrigin = 'anonymous';
    element.onload = resolve;
    element.onerror = reject;
    document.head.append(element);
  });
}

export async function loadArticleResources(content, hasMermaid) {
  const text = content.cloneNode(true);
  text.querySelectorAll('pre, code, script, style').forEach(node => node.remove());
  const hasMath = /\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$[^\n$]+\$/.test(text.textContent);
  const tasks = [];
  if (hasMath) {
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = `${katexBase}katex.min.css`;
    style.integrity = 'sha384-nH0MfJ44wi1dd7w6jinlyBgljjS8EJAh2JBoRad8a3VDw2K69vfaaqm4WnR+gXtA';
    style.crossOrigin = 'anonymous';
    const styled = new Promise(resolve => { style.onload = resolve; style.onerror = resolve; });
    document.head.append(style);
    tasks.push(Promise.all([styled, (async () => {
      await script(`${katexBase}katex.min.js`, 'sha384-CwjPRVHTvLiMBFjEoij+QZViMV5rhTOIp7CJzl24JEqpRDA1sJFHVXXLURktbYYp');
      await script(`${katexBase}contrib/auto-render.min.js`, 'sha384-bjyGPfbij8/NDKJhSGZNP/khQVgtHUE5exjm4Ydllo42FwIgYsdLO2lXGmRBf5Mz');
    })()]).catch(() => {}));
  }
  if (hasMermaid) tasks.push(script('https://cdn.jsdelivr.net/npm/mermaid@11.17.2/dist/mermaid.min.js',
    'sha384-EOXBFmc3gx5mb+vn0vPvvGqACToJD24hhacX5Yx+8NUUQrHIle/Qi5Bg9o3zKwW2').catch(() => {}));
  await Promise.all(tasks);
}
