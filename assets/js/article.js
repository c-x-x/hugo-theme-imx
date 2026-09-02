export function initArticleMarkdownLayout() {
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

  const calloutLabels = { NOTE: '说明', TIP: '技巧', IMPORTANT: '重要', WARNING: '警告', CAUTION: '注意' };
  articleContent.querySelectorAll('blockquote').forEach((blockquote) => {
    const firstParagraph = blockquote.querySelector(':scope > p:first-child');
    const match = firstParagraph?.textContent?.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i);
    if (!match || !firstParagraph) return;
    const kind = match[1].toUpperCase();
    const walker = document.createTreeWalker(firstParagraph, NodeFilter.SHOW_TEXT);
    let remaining = match[0].length;
    while (remaining > 0) {
      const text = walker.nextNode();
      if (!text) break;
      const consumed = Math.min(remaining, text.nodeValue?.length ?? 0);
      text.nodeValue = (text.nodeValue ?? '').slice(consumed);
      remaining -= consumed;
    }
    blockquote.classList.add('callout');
    blockquote.dataset.callout = kind.toLowerCase();
    const title = document.createElement('strong');
    title.className = 'callout-title';
    title.textContent = calloutLabels[kind];
    blockquote.prepend(title);
  });

  if (typeof window.renderMathInElement === 'function') {
    window.renderMathInElement(articleContent, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '\\[', right: '\\]', display: true },
        { left: '\\(', right: '\\)', display: false },
        { left: '$', right: '$', display: false },
      ],
      ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
      throwOnError: false,
      strict: 'warn',
      trust: false,
    });
  }

  const mermaidNodes = [];
  articleContent.querySelectorAll('pre code.language-mermaid').forEach((code) => {
    const source = code.textContent ?? '';
    const container = document.createElement('div');
    container.className = 'mermaid';
    container.textContent = source;
    (code.closest('.highlight') ?? code.closest('pre'))?.replaceWith(container);
    mermaidNodes.push(container);
  });
  if (mermaidNodes.length > 0 && window.mermaid) {
    window.mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      htmlLabels: false,
      suppressErrorRendering: true,
      theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'neutral',
    });
    window.mermaid.run({ nodes: mermaidNodes }).catch(() => {
      mermaidNodes.forEach((node) => {
        if (node.querySelector('svg')) return;
        node.textContent = 'Mermaid 语法有误，无法渲染图表。';
        node.dataset.mermaidState = 'error';
      });
    });
  }
}
