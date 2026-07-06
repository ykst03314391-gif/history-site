// 記事一覧ページ
(async function () {
  const listEl = document.getElementById("list");
  const searchEl = document.getElementById("search");
  let articles = [];

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  function cardHTML(a) {
    const tags = (a.tags || [])
      .map((t) => `<span class="tag">${esc(t)}</span>`)
      .join("");
    return `
      <a class="card" href="article.html?id=${encodeURIComponent(a.id)}">
        <p class="article-cat">${esc(a.category || "記事")}</p>
        <h3>${esc(a.title)}</h3>
        <p class="years">${esc(a.date || "")}</p>
        <p class="card-summary">${esc(a.summary || "")}</p>
        <div class="tags">${tags}</div>
      </a>`;
  }

  function render(items) {
    if (!items.length) {
      listEl.innerHTML = `<p class="muted">該当する記事がありません。</p>`;
      return;
    }
    listEl.innerHTML = items.map(cardHTML).join("");
  }

  function filter(q) {
    q = q.trim().toLowerCase();
    if (!q) return render(articles);
    render(
      articles.filter((a) => {
        const hay = [a.title, a.summary, a.category, ...(a.tags || [])]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
    );
  }

  try {
    const res = await fetch("data/articles/index.json");
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    articles = (data.articles || [])
      .filter((a) => !a.draft)
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    render(articles);
    searchEl.addEventListener("input", (e) => filter(e.target.value));
  } catch (err) {
    listEl.innerHTML = `<p class="error">記事の読み込みに失敗しました。ローカルで開いている場合は簡易サーバー経由で表示してください（README参照）。</p>`;
    console.error(err);
  }
})();
