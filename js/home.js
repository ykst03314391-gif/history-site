// トップページ：新着記事・収録人物をピックアップ表示
(async function () {
  const artEl = document.getElementById("latest-articles");
  const topicsEl = document.getElementById("latest-topics");

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  // 新着記事（最大3件）
  try {
    const res = await fetch("data/articles/index.json");
    if (!res.ok) throw new Error(res.status);
    const articles = ((await res.json()).articles || [])
      .filter((a) => !a.draft)
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
      .slice(0, 3);
    artEl.innerHTML = articles.length
      ? articles
          .map(
            (a) => `
        <a class="card" href="article.html?id=${encodeURIComponent(a.id)}">
          <p class="article-cat">${esc(a.category || "記事")}</p>
          <h3>${esc(a.title)}</h3>
          <p class="years">${esc(a.date || "")}</p>
          <p class="card-summary">${esc(a.summary || "")}</p>
        </a>`
          )
          .join("")
      : `<p class="muted">まだ記事がありません。</p>`;
  } catch (err) {
    artEl.innerHTML = `<p class="error">記事の読み込みに失敗しました（README参照）。</p>`;
    console.error(err);
  }

  // 最新トピック（最大3件）
  if (topicsEl) {
    try {
      const res = await fetch("data/topics/index.json");
      if (!res.ok) throw new Error(res.status);
      const topics = ((await res.json()).topics || [])
        .filter((t) => !t.draft)
        .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
        .slice(0, 3);
      topicsEl.innerHTML = topics.length
        ? topics
            .map((t) => {
              const meta = [];
              if (t.period && (t.period.from || t.period.to))
                meta.push(`会期：${esc(t.period.from || "")}〜${esc(t.period.to || "")}`);
              if (t.place && (t.place.name || t.place.prefecture))
                meta.push(`会場：${esc([t.place.prefecture, t.place.name].filter(Boolean).join(" "))}`);
              if (t.platform) meta.push(`対応：${esc(t.platform)}`);
              return `
        <a class="topic-card topic-card--link" href="topic.html?id=${encodeURIComponent(t.id)}">
          <div class="topic-head">
            <span class="topic-stream stream-${esc(t.stream)}">${esc(t.stream || "情報")}</span>
            <span class="topic-date">${esc(t.date || "")}</span>
          </div>
          <h3 class="topic-title">${esc(t.title)}</h3>
          ${t.summary ? `<p class="topic-summary">${esc(t.summary)}</p>` : ""}
          ${meta.length ? `<p class="topic-meta">${meta.join("　／　")}</p>` : ""}
          ${t.take ? `<div class="topic-take"><span class="take-label">ひとこと</span>${esc(t.take)}</div>` : ""}
          <span class="topic-more">詳しく見る →</span>
        </a>`;
            })
            .join("")
        : `<p class="muted">まだトピックがありません。</p>`;
    } catch (err) {
      topicsEl.innerHTML = `<p class="error">トピックの読み込みに失敗しました。</p>`;
      console.error(err);
    }
  }
})();
