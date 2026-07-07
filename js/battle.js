// 合戦詳細ページ
(async function () {
  const el = document.getElementById("content");

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  const id = new URLSearchParams(location.search).get("id");
  if (!id || !/^[a-z0-9-]+$/.test(id)) {
    el.innerHTML = `<p class="error">合戦IDが指定されていません。</p>`;
    return;
  }

  function historyHTML(o) {
    let hist = Array.isArray(o.history) ? o.history.slice() : [];
    if (!hist.length && (o.updatedAt || o.date)) {
      hist = [{ date: o.updatedAt || o.date, note: "" }];
    }
    if (!hist.length) return "";
    hist.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    const items = hist
      .map(
        (h) =>
          `<li><span class="hist-date">${esc(h.date || "")}</span>${esc(h.note || "")}</li>`
      )
      .join("");
    return `<section class="section"><h2>更新履歴</h2><ul class="history-list">${items}</ul></section>`;
  }

  function fmtDate(d) {
    if (!d) return "";
    if (d.era) return esc(d.era);
    const p = [];
    if (d.year) p.push(d.year + "年");
    if (d.month) p.push(d.month + "月");
    if (d.day) p.push(d.day + "日");
    return p.join("");
  }

  function commander(c) {
    const label = esc(c.name || c.person_id || "");
    return c.person_id
      ? `<a href="person.html?id=${encodeURIComponent(c.person_id)}">${label}</a>`
      : label;
  }

  function outcomeClass(o) {
    if (o === "勝利") return "win";
    if (o === "敗北") return "lose";
    return "draw";
  }

  try {
    const [bRes, aRes] = await Promise.all([
      fetch(`data/battles/${encodeURIComponent(id)}.json`),
      fetch("data/articles/index.json").then((r) => (r.ok ? r.json() : { articles: [] })).catch(() => ({ articles: [] })),
    ]);
    if (!bRes.ok) throw new Error("not found");
    const b = await bRes.json();
    const articles = (aRes && aRes.articles) || [];

    document.title = `${b.name} ｜ 戦国クロニクル`;
    const html = [];

    // ヘッダー
    const meta = [fmtDate(b.date), b.place && b.place.name ? esc(b.place.name) : ""]
      .filter(Boolean)
      .join("　／　");
    html.push(`
      <div class="person-head">
        <h1>${esc(b.name)}</h1>
        <p class="kana">${esc(b.kana || "")}</p>
        ${meta ? `<p class="years">${meta}</p>` : ""}
        ${b.summary ? `<p class="summary">${esc(b.summary)}</p>` : ""}
      </div>
    `);

    // 対戦した陣営
    if (b.sides && b.sides.length) {
      const cards = b.sides
        .map((s) => {
          const cmds = (s.commanders || []).map(commander).join("、");
          const parts = (s.participants || []).map(commander).join("、");
          return `<div class="side-card side-${outcomeClass(s.outcome)}">
              <div class="side-head">
                <span class="side-name">${esc(s.name)}</span>
                ${s.outcome ? `<span class="side-outcome">${esc(s.outcome)}</span>` : ""}
              </div>
              ${cmds ? `<div class="side-cmd"><span class="side-label">大将</span>${cmds}</div>` : ""}
              ${parts ? `<div class="side-cmd"><span class="side-label">従軍</span>${parts}</div>` : ""}
            </div>`;
        })
        .join(`<div class="side-vs">対</div>`);
      let inner = `<div class="sides">${cards}</div>`;
      if (b.result) inner += `<p class="battle-result">${esc(b.result)}</p>`;
      html.push(`<section class="section"><h2>対戦した陣営</h2>${inner}</section>`);
    }

    // 解説
    if (b.description && b.description.length) {
      const body = b.description.map((p) => `<p>${esc(p)}</p>`).join("");
      html.push(`<section class="section"><h2>解説</h2>${body}</section>`);
    }

    // 時系列（合戦の経過）
    if (b.timeline && b.timeline.length) {
      const items = b.timeline
        .map(
          (t) => `<li>
            <span class="bt-title">${esc(t.title)}</span>
            ${t.description ? `<br><span class="bt-desc">${esc(t.description)}</span>` : ""}
          </li>`
        )
        .join("");
      html.push(`<section class="section"><h2>時系列</h2><ul class="battle-timeline">${items}</ul></section>`);
    }

    // 逸話
    if (b.episodes && b.episodes.length) {
      const items = b.episodes
        .map(
          (e) => `<li><b>${esc(e.title)}</b>${
            e.uncertain ? ` <span class="uncertain-badge">諸説あり</span>` : ""
          }<br><span class="muted">${esc(e.body)}</span></li>`
        )
        .join("");
      html.push(`<section class="section"><h2>逸話</h2><ul class="list">${items}</ul></section>`);
    }

    // 関連する考察・記事
    const rel = articles
      .filter((a) => !a.draft && (a.relatedBattles || []).includes(id))
      .sort((a, b2) => String(b2.date || "").localeCompare(String(a.date || "")));
    if (rel.length) {
      const items = rel
        .map(
          (a) => `<div class="ref-item">
            <span class="article-cat">${esc(a.category || "記事")}</span>
            <a href="article.html?id=${encodeURIComponent(a.id)}">${esc(a.title)}</a>
            ${a.summary ? `<div class="muted">${esc(a.summary)}</div>` : ""}
          </div>`
        )
        .join("");
      html.push(`<section class="section"><h2>関連する考察・記事</h2>${items}</section>`);
    }

    // 出典
    if (b.sources && b.sources.length) {
      const items = b.sources
        .map((s) => {
          const m = [s.author, s.publisher, s.year, s.page].filter(Boolean).map(esc).join(" / ");
          const title = s.url
            ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>`
            : esc(s.title);
          const badges =
            (s.type ? `<span class="src-type">${esc(s.type)}</span>` : "") +
            (s.primary
              ? `<span class="src-primary src-${s.primary === "一次資料" ? "primary1" : "primary2"}">${esc(s.primary)}</span>`
              : "");
          return `<li>${badges ? badges + " " : ""}${title}${m ? ` <span class="muted">（${m}）</span>` : ""}</li>`;
        })
        .join("");
      html.push(`<section class="section"><h2>出典</h2><ul class="list src-list">${items}</ul></section>`);
    }

    if (b.updatedAt) html.push(`<p class="muted">最終更新：${esc(b.updatedAt)}</p>`);

    el.innerHTML = html.join("");
  } catch (err) {
    el.innerHTML = `<p class="error">合戦データを読み込めませんでした（ID: ${esc(id)}）。ローカルで開いている場合は簡易サーバー経由で表示してください（README参照）。</p>`;
    console.error(err);
  }
})();
