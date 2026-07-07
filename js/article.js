// 記事詳細ページ
(async function () {
  const el = document.getElementById("article");

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  const id = new URLSearchParams(location.search).get("id");
  if (!id || !/^[a-z0-9-]+$/.test(id)) {
    el.innerHTML = `<p class="error">記事IDが指定されていません。</p>`;
    return;
  }

  try {
    // メタデータ・本文・人物名の解決に必要なデータを取得
    const [artRes, mdRes, peopleRes] = await Promise.all([
      fetch("data/articles/index.json"),
      fetch(`data/articles/${encodeURIComponent(id)}.md`),
      fetch("data/people/index.json"),
    ]);
    if (!artRes.ok || !mdRes.ok) throw new Error("not found");

    const artData = await artRes.json();
    const meta = (artData.articles || []).find((a) => a.id === id);
    const series =
      meta && meta.series
        ? (artData.series || []).find((s) => s.id === meta.series)
        : null;
    const md = await mdRes.text();
    const people = peopleRes.ok ? (await peopleRes.json()).people || [] : [];
    const nameOf = (pid) => (people.find((p) => p.id === pid) || {}).name || pid;

    if (meta && meta.title) document.title = `${meta.title} ｜ 戦国クロニクル`;

    // ヘッダー（カテゴリ・日付）。タイトルは本文 Markdown の見出しに任せる
    const head = meta
      ? `<div class="article-head">
           ${series ? `<a class="series-badge" href="articles.html">特集：${esc(series.title)}</a>` : ""}
           <span class="article-cat">${esc(meta.category || "記事")}</span>
           <span class="article-date">${esc(meta.date || "")}</span>
           ${meta.author ? `<span class="article-author">${esc(meta.author)}</span>` : ""}
         </div>`
      : "";

    // 本文（Markdown → HTML）
    const bodyHTML =
      typeof marked !== "undefined"
        ? marked.parse(md)
        : `<pre>${esc(md)}</pre>`;

    // 関連人物（DB連携）
    let related = "";
    if (meta && meta.relatedPeople && meta.relatedPeople.length) {
      const links = meta.relatedPeople
        .map(
          (pid) =>
            `<a class="tag tag-link" href="person.html?id=${encodeURIComponent(pid)}">${esc(nameOf(pid))}</a>`
        )
        .join(" ");
      related = `<div class="related-people">
          <h3>関連人物</h3>
          <p>${links}</p>
        </div>`;
    }

    el.innerHTML = `${head}<div class="article-body">${bodyHTML}</div>${related}`;
  } catch (err) {
    el.innerHTML = `<p class="error">記事を読み込めませんでした（ID: ${esc(id)}）。ローカルで開いている場合は簡易サーバー経由で表示してください（README参照）。</p>`;
    console.error(err);
  }
})();
