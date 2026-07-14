export function initCodeBlocks() {
  if (!document.querySelector(".highlight")) return;

  // ============================================
  // Code Copy Button - 代码复制按钮
  // ============================================
  const CODE_LANGUAGE_ALIASES = {
    sh: 'bash',
    shell: 'bash',
    zsh: 'bash',
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    rb: 'ruby',
    yml: 'yaml',
    md: 'markdown',
    html: 'html',
    xml: 'html'
  };
  const CODE_LANGUAGE_LABELS = {
    bash: 'Bash',
    c: 'C',
    cpp: 'C++',
    css: 'CSS',
    go: 'Go',
    html: 'HTML',
    java: 'Java',
    javascript: 'JavaScript',
    json: 'JSON',
    markdown: 'Markdown',
    php: 'PHP',
    python: 'Python',
    ruby: 'Ruby',
    rust: 'Rust',
    text: 'Text',
    typescript: 'TypeScript',
    yaml: 'YAML'
  };
  const CODE_LANGUAGE_TAB_SIZES = {
    bash: 2,
    css: 2,
    html: 2,
    javascript: 2,
    json: 2,
    markdown: 2,
    typescript: 2,
    yaml: 2,
    c: 4,
    cpp: 4,
    go: 4,
    java: 4,
    php: 4,
    python: 4,
    ruby: 2,
    rust: 4
  };

  function normalizeCodeLanguage(language) {
    const normalized = String(language || '')
      .trim()
      .toLowerCase()
      .replace(/^language-/, '')
      .replace(/^lang-/, '');

    return CODE_LANGUAGE_ALIASES[normalized] || normalized || 'text';
  }

  function detectCodeLanguage(block, codeElement) {
    const preElement = codeElement.closest('pre');
    const candidates = [
      codeElement.dataset.lang,
      preElement && preElement.dataset.lang,
      block.dataset.lang
    ];
    const classSources = [
      codeElement.className,
      preElement && preElement.className,
      block.className
    ];

    classSources.forEach(className => {
      const match = String(className || '').match(/\b(?:language|lang)-([a-z0-9_+-]+)/i);

      if (match) {
        candidates.push(match[1]);
      }
    });

    return normalizeCodeLanguage(candidates.find(Boolean));
  }

  document.querySelectorAll('.highlight').forEach((block, index) => {
    const codeElement = block.querySelector('code');

    if (!codeElement) {
      return;
    }

    const language = detectCodeLanguage(block, codeElement);
    const languageLabel = CODE_LANGUAGE_LABELS[language] || language.toUpperCase();
    const tabSize = CODE_LANGUAGE_TAB_SIZES[language] || 2;
    const header = document.createElement('div');
    const windowControls = document.createElement('span');
    const langLabel = document.createElement('span');

    block.dataset.codeLang = language;
    block.style.setProperty('--code-tab-size', String(tabSize));
    codeElement.style.tabSize = tabSize;
    header.className = 'code-block-header';
    windowControls.className = 'code-window-controls';
    windowControls.setAttribute('aria-hidden', 'true');
    windowControls.innerHTML = '<span></span><span></span><span></span>';
    langLabel.className = 'code-lang-label';
    langLabel.textContent = languageLabel;

    // 添加复制按钮
    const button = document.createElement('button');
    button.className = 'copy-code-button';
    button.type = 'button';
    button.textContent = '复制';

    button.addEventListener('click', () => {
      copyText(codeElement.textContent || '').then(() => {
        button.textContent = '已复制';
        setTimeout(() => {
          button.textContent = '复制';
        }, 2000);
      }).catch(() => {
        button.textContent = '复制失败';
        setTimeout(() => {
          button.textContent = '复制';
        }, 2000);
      });
    });

    header.append(windowControls, langLabel, button);
    block.insertBefore(header, block.firstChild);
  });

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }

    return new Promise((resolve, reject) => {
      const textarea = document.createElement('textarea');

      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.top = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();

      try {
        if (document.execCommand('copy')) {
          resolve();
        } else {
          reject(new Error('Copy command failed'));
        }
      } catch (error) {
        reject(error);
      } finally {
        textarea.remove();
      }
    });
  }

}
