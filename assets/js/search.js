import { getSameOriginPath } from "./core/url.js";
export function initSearch() {
  if (!document.querySelector(".search-input")) return;

  // ============================================
  // Search Functionality - 搜索功能
  // ============================================
  const searchInput = document.querySelector('.search-input');
  const searchResults = document.querySelector('.search-results');

  if (searchInput && searchResults) {
    let searchIndex = [];
    const searchIndexURL = document.body.dataset.searchIndex || '/index.json';

    // 加载搜索索引
    fetch(searchIndexURL)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Search index request failed: ${response.status}`);
        }

        return response.json();
      })
      .then(data => {
        searchIndex = Array.isArray(data) ? data : [];
        performSearch(searchInput.value);
      })
      .catch(() => console.warn('IMX Theme: 未找到搜索索引，请确认首页启用了 JSON 输出。'));

    // 搜索函数
    function performSearch(query) {
      if (!query || query.length < 2) {
        searchResults.classList.remove('active');
        return;
      }

      const searchTerm = query.toLowerCase();
      const results = searchIndex.filter(item => {
        const title = String(item.title || '').toLowerCase();
        const content = String(item.content || '').toLowerCase();

        return title.includes(searchTerm) || content.includes(searchTerm);
      }).slice(0, 10);

      displayResults(results, query);
    }

    // 显示搜索结果
    function displayResults(results, query) {
      searchResults.textContent = '';

      if (results.length === 0) {
        const emptyResult = document.createElement('div');
        emptyResult.className = 'search-result-item';
        emptyResult.textContent = '未找到相关内容';
        searchResults.appendChild(emptyResult);
      } else {
        const fragment = document.createDocumentFragment();
        let visibleCount = 0;

        results.forEach(result => {
          const permalink = getSameOriginPath(result.permalink);

          if (!permalink) {
            return;
          }

          const link = document.createElement('a');
          const title = document.createElement('h3');
          const summary = document.createElement('p');

          link.href = permalink;
          link.className = 'search-result-item';
          title.innerHTML = highlightText(result.title, query);
          summary.innerHTML = highlightText(result.summary || '', query);

          link.append(title, summary);
          fragment.appendChild(link);
          visibleCount += 1;
        });

        if (visibleCount === 0) {
          const emptyResult = document.createElement('div');
          emptyResult.className = 'search-result-item';
          emptyResult.textContent = '未找到相关内容';
          searchResults.appendChild(emptyResult);
        } else {
          searchResults.appendChild(fragment);
        }
      }

      searchResults.classList.add('active');
    }

    // 高亮搜索词
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
      const regex = new RegExp(`(${escapedQuery})`, 'gi');

      return escapedText.replace(regex, '<mark>$1</mark>');
    }

    // 搜索输入事件
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        performSearch(e.target.value);
      }, 300);
    });

    // 点击外部关闭搜索结果
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-container')) {
        searchResults.classList.remove('active');
      }
    });
  }

}
