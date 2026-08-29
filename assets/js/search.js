import { getSameOriginPath } from "./core/url.js";

const CJK_PATTERN = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u;

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function isEligibleQuery(query) {
  const characters = Array.from(query);

  return CJK_PATTERN.test(query) ? characters.length >= 1 : characters.length >= 2;
}

function prepareSearchEntry(item) {
  const categories = Array.isArray(item.categories) ? item.categories.map(String) : [];
  const tags = Array.isArray(item.tags) ? item.tags.map(String) : [];
  const title = String(item.title || '');
  const summary = String(item.summary || '');
  const content = String(item.content || '');

  return {
    ...item,
    title,
    summary,
    categories,
    tags,
    search: {
      title: normalizeSearchText(title),
      summary: normalizeSearchText(summary),
      content: normalizeSearchText(content),
      categories: categories.map(normalizeSearchText),
      tags: tags.map(normalizeSearchText)
    }
  };
}

function scoreSearchEntry(entry, query) {
  const tokens = query.split(' ').filter(Boolean);
  const { title, summary, content, categories, tags } = entry.search;
  const combined = [title, summary, content, ...categories, ...tags].join(' ');

  if (!tokens.every(token => combined.includes(token))) {
    return -1;
  }

  let score = 0;

  if (title === query) {
    score += 320;
  } else if (title.startsWith(query)) {
    score += 220;
  } else if (title.includes(query)) {
    score += 160;
  }

  tokens.forEach(token => {
    if (title.includes(token)) score += 90;
    if (tags.some(tag => tag === token)) score += 80;
    if (categories.some(category => category === token)) score += 70;
    if (tags.some(tag => tag.includes(token))) score += 48;
    if (categories.some(category => category.includes(token))) score += 42;
    if (summary.includes(token)) score += 24;
    if (content.includes(token)) score += 10;
  });

  return score;
}

function compareSearchResults(left, right) {
  if (right.score !== left.score) {
    return right.score - left.score;
  }

  const rightDate = Date.parse(right.entry.date || '') || 0;
  const leftDate = Date.parse(left.entry.date || '') || 0;

  if (rightDate !== leftDate) {
    return rightDate - leftDate;
  }

  return left.entry.title.localeCompare(right.entry.title, 'zh-CN');
}

function highlightText(text, query) {
  const characterEntities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  const escapedText = String(text || '')
    .replace(/[&<>"']/g, character => characterEntities[character]);
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  if (!escapedQuery) {
    return escapedText;
  }

  return escapedText.replace(new RegExp(`(${escapedQuery})`, 'gi'), '<mark>$1</mark>');
}

export function initSearch() {
  const searchPage = document.querySelector('[data-search-page]');
  const searchInput = searchPage ? searchPage.querySelector('.search-input') : null;
  const searchResults = searchPage ? searchPage.querySelector('.search-results') : null;
  const searchClear = searchPage ? searchPage.querySelector('.search-clear') : null;

  if (!searchPage || !searchInput || !searchResults || !searchClear) {
    return;
  }

  let searchIndex = [];
  let searchReady = false;
  let searchFailed = false;
  let searchTimeout = 0;
  const searchIndexURL = document.body.dataset.searchIndex || '/index.json';

  function setSearchState(active) {
    searchPage.classList.toggle('is-searching', active);
    searchClear.classList.toggle('active', active);
    searchInput.setAttribute('aria-expanded', active ? 'true' : 'false');
    searchResults.classList.toggle('active', active);

    if (!active) {
      searchResults.textContent = '';
    }
  }

  function createMessage(message) {
    const element = document.createElement('div');

    element.className = 'search-message';
    element.textContent = message;
    searchResults.replaceChildren(element);
  }

  function createResultMeta(entry) {
    const values = [];

    if (entry.date) {
      const parsedDate = new Date(entry.date);

      if (!Number.isNaN(parsedDate.getTime())) {
        values.push(parsedDate.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }));
      }
    }

    values.push(...entry.categories.slice(0, 1), ...entry.tags.slice(0, 2));

    if (values.length === 0) {
      return null;
    }

    const meta = document.createElement('div');
    meta.className = 'search-result-meta';

    values.forEach(value => {
      const item = document.createElement('span');
      item.textContent = value;
      meta.appendChild(item);
    });

    return meta;
  }

  function displayResults(results, query) {
    const fragment = document.createDocumentFragment();
    const header = document.createElement('div');

    searchResults.textContent = '';
    header.className = 'search-results-header';
    header.textContent = results.length > 0
      ? `找到 ${results.length} 篇相关文章`
      : '没有找到相关文章';
    fragment.appendChild(header);

    results.forEach(({ entry }) => {
      const permalink = getSameOriginPath(entry.permalink);

      if (!permalink) {
        return;
      }

      const link = document.createElement('a');
      const title = document.createElement('h2');
      const summary = document.createElement('p');
      const meta = createResultMeta(entry);

      link.href = permalink;
      link.className = 'search-result-item';
      title.innerHTML = highlightText(entry.title, query);
      summary.innerHTML = highlightText(entry.summary, query);
      link.appendChild(title);
      if (meta) link.appendChild(meta);
      if (entry.summary) link.appendChild(summary);
      fragment.appendChild(link);
    });

    searchResults.appendChild(fragment);
  }

  function performSearch(rawQuery) {
    const query = normalizeSearchText(rawQuery);

    if (!query) {
      setSearchState(false);
      return;
    }

    setSearchState(true);

    if (!isEligibleQuery(query)) {
      createMessage('请至少输入一个中文字符，或两个英文、数字字符');
      return;
    }

    if (searchFailed) {
      createMessage('搜索索引暂时不可用，请稍后重试');
      return;
    }

    if (!searchReady) {
      createMessage('正在加载搜索索引…');
      return;
    }

    const results = searchIndex
      .map(entry => ({ entry, score: scoreSearchEntry(entry, query) }))
      .filter(result => result.score >= 0)
      .sort(compareSearchResults)
      .slice(0, 10);

    displayResults(results, query);
  }

  function clearSearch() {
    window.clearTimeout(searchTimeout);
    searchInput.value = '';
    setSearchState(false);
    searchInput.focus();
  }

  fetch(searchIndexURL)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Search index request failed: ${response.status}`);
      }

      return response.json();
    })
    .then(data => {
      searchIndex = Array.isArray(data) ? data.map(prepareSearchEntry) : [];
      searchReady = true;
      searchResults.setAttribute('aria-busy', 'false');
      performSearch(searchInput.value);
    })
    .catch(() => {
      searchFailed = true;
      searchResults.setAttribute('aria-busy', 'false');
      performSearch(searchInput.value);
      console.warn('IMX Theme: 未找到搜索索引，请确认首页启用了 JSON 输出。');
    });

  searchInput.addEventListener('input', event => {
    window.clearTimeout(searchTimeout);
    searchTimeout = window.setTimeout(() => performSearch(event.target.value), 180);
  });

  searchInput.addEventListener('search', () => performSearch(searchInput.value));
  searchInput.addEventListener('keydown', event => {
    if (event.key === 'Escape' && searchInput.value) {
      clearSearch();
    }
  });
  searchClear.addEventListener('click', clearSearch);
}
