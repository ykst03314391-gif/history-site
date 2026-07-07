// 最新トピック（B＝最新情報）一覧：新着順フィード、ストリーム別フィルタ
(async function () {
  const listEl = document.getElementById("list");
  const filterEl = document.getElementById("filter");
  if (!listEl) return;

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  const byDateDesc = (a, b) =>
    String(b.date || "").localeCompare(String(a.date || ""));

  let topics = [];
  let peopleName = new Map();
  let articleTitle = new Map();
  let current = "すべて";

  function relLinks(t) {
    const parts = [];
    (t.relatedArticles || []).forEach((id) => {
      const title = articleTitle.get(id) || "深掘り考察";
      parts.push(
        `<a class="topic-to-article" href="article.html?id=${encodeURIComponent(id)}">→ 深掘りを読む：${esc(title)}</a>`
      );
    });
    (t.relatedPeople || []).forEach((id) => {
      const name = peopleName.get(id) || id;
      parts.push(
        `<a class="topic-to-person" href="person.html?id=${encodeURIComponent(id)}">${esc(name)}</a>`
      );
    });
    return parts.join("");
  }

  function metaLine(t) {
    const bits = [];
    if (t.period && (t.period.from || t.period.to)) {
      bits.push(`会期：${esc(t.period.from || "")}〜${esc(t.period.to || "")}`);
    }
    if (t.place && (t.place.name || t.place.prefecture)) {
      bits.push(`会場：${esc([t.place.prefecture, t.place.name].filter(Boolean).join(" "))}`);
    }
    if (t.platform) bits.push(`対応：${esc(t.platform)}`);
    return bits.length
      ? `<p class="topic-meta">${bits.join("　／　")}</p>`
      : "";
  }

  function sourceLine(t) {
    if (!t.source || !t.source.name) return "";
    const name = t.source.url
      ? `<a href="${esc(t.source.url)}" target="_blank" rel="noopener">${esc(t.source.name)}</a>`
      : esc(t.source.name);
    return `<p class="topic-source">出どころ：${name}</p>`;
  }

  function card(t) {
    return `
      <article class="topic-card">
        <div class="topic-head">
          <span class="topic-stream stream-${esc(t.stream)}">${esc(t.stream || "情報")}</span>
          <span class="topic-date">${esc(t.date || "")}</span>
        </div>
        <h3 class="topic-title">${esc(t.title)}</h3>
        ${t.summary ? `<p class="topic-summary">${esc(t.summary)}</p>` : ""}
        ${metaLine(t)}
        ${t.take ? `<div class="topic-take"><span class="take-label">見立て</span>${esc(t.take)}</div>` : ""}
        ${sourceLine(t)}
        <div class="topic-links">${relLinks(t)}</div>
      </article>`;
  }

  function render() {
    const items = topics
      .filter((t) => !t.draft)
      .filter((t) => current === "すべて" || t.stream === current)
      .sort(byDateDesc);
    listEl.innerHTML = items.length
      ? items.map(card).join("")
      : `<p class="muted">この分類のトピックはまだありません。</p>`;
  }

  function buildFilter() {
    if (!filterEl) return;
    const streams = ["すべて", "新説", "お出かけ", "ゲーム"];
    filterEl.innerHTML = streams
      .map(
        (s) =>
          `<button type="button" class="topic-filter-btn${s === current ? " is-active" : ""}" data-stream="${esc(s)}">${esc(s)}</button>`
      )
      .join("");
    filterEl.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-stream]");
      if (!btn) return;
      current = btn.dataset.stream;
      filterEl.querySelectorAll(".topic-filter-btn").forEach((b) =>
        b.classList.toggle("is-active", b.dataset.stream === current)
      );
      render();
    });
  }

  try {
    const [tRes, pRes, aRes] = await Promise.all([
      fetch("data/topics/index.json"),
      fetch("data/people/index.json").catch(() => null),
      fetch("data/articles/index.json").catch(() => null),
    ]);
    if (!tRes.ok) throw new Error(tRes.status);
    topics = (await tRes.json()).topics || [];
    if (pRes && pRes.ok) {
      for (const p of (await pRes.json()).people || []) peopleName.set(p.id, p.name);
    }
    if (aRes && aRes.ok) {
      for (const a of (await aRes.json()).articles || []) articleTitle.set(a.id, a.title);
    }
    buildFilter();
    render();
  } catch (err) {
    listEl.innerHTML = `<p class="error">トピックの読み込みに失敗しました（README参照）。</p>`;
    console.error(err);
  }
})();
