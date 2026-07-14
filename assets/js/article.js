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
}
