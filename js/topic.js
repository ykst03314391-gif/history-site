// トピック詳細ページ（B＝最新情報の詳細）。一覧のカードから遷移してくる。
(async function () {
  const el = document.getElementById("topic");
  if (!el) return;

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  const id = new URLSearchParams(location.search).get("id");
  if (!id || !/^[a-z0-9-]+$/.test(id)) {
    el.innerHTML = `<p class="error">トピックIDが指定されていません。</p>`;
    return;
  }

  function metaRows(t) {
    const rows = [];
    if (t.period && (t.period.from || t.period.to)) {
      rows.push(["会期", `${esc(t.period.from || "")} 〜 ${esc(t.period.to || "")}`]);
    }
    if (t.place && (t.place.name || t.place.prefecture)) {
      rows.push([
        "会場",
        esc([t.place.prefecture, t.place.city, t.place.name].filter(Boolean).join(" ")),
      ]);
    }
    if (t.platform) rows.push(["対応", esc(t.platform)]);
    if (!rows.length) return "";
    return `<dl class="facts">${rows
      .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`)
      .join("")}</dl>`;
  }

  function render(t, peopleName, articleTitle) {
    if (t.title) document.title = `${t.title} ｜ 戦国クロニクル`;

    const source =
      t.source && t.source.name
        ? t.source.url
          ? `<a href="${esc(t.source.url)}" target="_blank" rel="noopener">${esc(t.source.name)}</a>`
          : esc(t.source.name)
        : "";

    const relArticles = (t.relatedArticles || [])
      .map(
        (aid) =>
          `<a class="topic-to-article" href="article.html?id=${encodeURIComponent(aid)}">→ 深掘りを読む：${esc(articleTitle.get(aid) || "考察記事")}</a>`
      )
      .join("");
    const relPeople = (t.relatedPeople || [])
      .map(
        (pid) =>
          `<a class="topic-to-person" href="person.html?id=${encodeURIComponent(pid)}">${esc(peopleName.get(pid) || pid)}</a>`
      )
      .join("");

    const tags = (t.tags || [])
      .map((x) => `<span class="tag">${esc(x)}</span>`)
      .join("");

    el.innerHTML = `
      <article class="topic-detail">
        <div class="topic-head">
          <span class="topic-stream stream-${esc(t.stream)}">${esc(t.stream || "情報")}</span>
          <span class="topic-date">${esc(t.date || "")}</span>
        </div>
        <h1 class="topic-detail-title">${esc(t.title)}</h1>
        ${t.summary ? `<p class="topic-detail-summary">${esc(t.summary)}</p>` : ""}
        ${metaRows(t)}
        ${t.take ? `<div class="topic-take"><span class="take-label">ひとこと</span>${esc(t.take)}</div>` : ""}
        ${source ? `<p class="topic-source">出どころ：${source}</p>` : ""}
        ${
          relArticles || relPeople
            ? `<div class="topic-detail-links">
                 ${relArticles}
                 ${relPeople ? `<p class="topic-people">関連人物：${relPeople}</p>` : ""}
               </div>`
            : ""
        }
        ${tags ? `<div class="tags">${tags}</div>` : ""}
        <p class="topic-note muted">※ ここは「お知らせ」です。踏み込んだ考察は<a href="articles.html">考察・記事</a>で発信します。</p>
      </article>`;
  }

  try {
    const [tRes, pRes, aRes] = await Promise.all([
      fetch("data/topics/index.json"),
      fetch("data/people/index.json").catch(() => null),
      fetch("data/articles/index.json").catch(() => null),
    ]);
    if (!tRes.ok) throw new Error(tRes.status);
    const topic = ((await tRes.json()).topics || []).find((t) => t.id === id);
    if (!topic) {
      el.innerHTML = `<p class="error">トピックが見つかりませんでした（ID: ${esc(id)}）。</p>`;
      return;
    }
    const peopleName = new Map();
    const articleTitle = new Map();
    if (pRes && pRes.ok) for (const p of (await pRes.json()).people || []) peopleName.set(p.id, p.name);
    if (aRes && aRes.ok) for (const a of (await aRes.json()).articles || []) articleTitle.set(a.id, a.title);
    render(topic, peopleName, articleTitle);
  } catch (err) {
    el.innerHTML = `<p class="error">トピックの読み込みに失敗しました（README参照）。</p>`;
    console.error(err);
  }
})();
