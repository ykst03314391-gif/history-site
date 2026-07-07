// 人物詳細ページ
(function () {
  const contentEl = document.getElementById("content");

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  // 更新履歴セクション（history 優先、無ければ updatedAt/date を1件表示）
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

  const id = new URLSearchParams(location.search).get("id");
  if (!id || !/^[a-z0-9-]+$/.test(id)) {
    contentEl.innerHTML = `<p class="error">人物IDが指定されていません。</p>`;
    return;
  }

  // 年月日を表示用文字列に
  function fmtDate(d) {
    if (!d) return "不明";
    if (d.era) return esc(d.era);
    const parts = [];
    if (d.year) parts.push(d.year + "年");
    if (d.month) parts.push(d.month + "月");
    if (d.day) parts.push(d.day + "日");
    return parts.length ? parts.join("") : "不明";
  }

  function uncertain(flag) {
    return flag ? `<span class="uncertain-badge">諸説あり</span>` : "";
  }

  // 人物リンク（サイト内にページがあれば a、無ければテキスト）
  function personLink(rel) {
    const label = esc(rel.name || rel.person_id || "");
    if (rel.person_id) {
      return `<a href="person.html?id=${encodeURIComponent(rel.person_id)}">${label}</a>`;
    }
    return label;
  }

  // 目次（TOC）用にセクション見出しを収集
  const toc = [];
  function section(title, inner) {
    if (!inner) return "";
    const secId = "sec-" + (toc.length + 1);
    toc.push({ id: secId, title });
    return `<section class="section" id="${secId}"><h2>${esc(title)}</h2>${inner}</section>`;
  }

  function tocHTML() {
    if (toc.length < 2) return "";
    const items = toc
      .map((t) => `<li><a href="#${t.id}">${esc(t.title)}</a></li>`)
      .join("");
    return `<nav class="toc" aria-label="目次">
      <p class="toc-title">目次</p>
      <ol class="toc-list">${items}</ol>
    </nav>`;
  }

  function render(p, articles) {
    document.title = `${p.name} ｜ 戦国クロニクル`;
    const html = [];

    // 出典マーカー：項目の sourceId を、末尾「出典」欄の該当典拠に対応づけて小さく表示
    const srcMap = new Map((p.sources || []).map((s) => [s.id, s]));
    function srcMark(sourceId) {
      if (!sourceId) return "";
      const s = srcMap.get(sourceId);
      const label = s ? s.title || sourceId : sourceId;
      const prim = s && s.primary ? `（${s.primary}）` : "";
      return ` <span class="src-mark" title="出典${prim}：${esc(label)}">出典: ${esc(label)}</span>`;
    }

    // ヘッダー
    const birth = fmtDate(p.birth);
    const death = fmtDate(p.death);
    html.push(`
      <div class="person-head">
        <h1>${esc(p.name)}${uncertain(p.birth && p.birth.uncertain)}</h1>
        <p class="kana">${esc(p.kana || "")}</p>
        <p><span class="years">${birth} 〜 ${death}</span></p>
        ${p.summary ? `<p class="summary">${esc(p.summary)}</p>` : ""}
      </div>
    `);

    // 基本情報
    const facts = [];
    if (p.aliases && p.aliases.length) {
      facts.push([
        "別名",
        p.aliases.map((a) => `${esc(a.value)}<span class="muted">（${esc(a.type)}）</span>`).join("、"),
      ]);
    }
    if (p.kamon) facts.push(["家紋", esc(p.kamon.name)]);
    if (p.birthplace) {
      const bp = p.birthplace;
      const place = [bp.name, bp.prefecture].filter(Boolean).map(esc).join(" / ");
      facts.push(["出生地", place]);
    }
    if (p.tags && p.tags.length) {
      facts.push(["分類", p.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join(" ")]);
    }
    if (facts.length) {
      const dl = `<dl class="facts">${facts
        .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`)
        .join("")}</dl>`;
      html.push(section("基本情報", dl));
    }

    // 官位変遷
    if (p.ranks && p.ranks.length) {
      const items = p.ranks
        .map((r) => `<li><b>${r.year ? esc(r.year) + "年 " : ""}</b>${esc(r.title)}${r.note ? ` <span class="muted">${esc(r.note)}</span>` : ""}${srcMark(r.sourceId)}</li>`)
        .join("");
      html.push(section("官位", `<ul class="list">${items}</ul>`));
    }

    // 家系
    if (p.family && p.family.length) {
      const items = p.family
        .map((r) => `<li><b>${esc(r.relation)}</b>：${personLink(r)}${r.note ? ` <span class="muted">${esc(r.note)}</span>` : ""}</li>`)
        .join("");
      html.push(section("家系・親族", `<ul class="list">${items}</ul>`));
    }

    // 仕えた主君
    if (p.lords && p.lords.length) {
      const items = p.lords
        .map((s) => `<li>${personLink(s)}${s.note ? ` <span class="muted">${esc(s.note)}</span>` : ""}</li>`)
        .join("");
      html.push(section("仕えた人", `<ul class="list">${items}</ul>`));
    }

    // 家臣団
    if (p.retainers && p.retainers.length) {
      const items = p.retainers
        .map((r) => {
          const period = r.from || r.to ? ` <span class="muted">（${r.from || ""}〜${r.to || ""}）</span>` : "";
          return `<li>${personLink(r)}${period}${r.note ? ` <span class="muted">${esc(r.note)}</span>` : ""}</li>`;
        })
        .join("");
      html.push(section("家臣団", `<ul class="list">${items}</ul>`));
    }

    // 領地変遷
    if (p.territories && p.territories.length) {
      const items = p.territories
        .map((t) => `<li><b>${t.year ? esc(t.year) + "年 " : ""}</b>${esc(t.name)}${t.prefecture ? `<span class="muted">（${esc(t.prefecture)}）</span>` : ""}${t.note ? ` — <span class="muted">${esc(t.note)}</span>` : ""}${srcMark(t.sourceId)}</li>`)
        .join("");
      html.push(section("領地の変遷", `<ul class="list">${items}</ul>`));
    }

    // 年表イベントに紐付けて表示した記事は、末尾の関連記事から除外する
    const usedArticleIds = new Set();

    // 指定の合戦に関連する記事（この人物に関連するもの）を探す
    function articlesForBattle(battleId) {
      if (!battleId) return [];
      return (articles || []).filter(
        (a) =>
          !a.draft &&
          (a.relatedPeople || []).includes(p.id) &&
          (a.relatedBattles || []).includes(battleId)
      );
    }
    function inlineArticleHTML(list) {
      if (!list.length) return "";
      return list
        .map((a) => {
          usedArticleIds.add(a.id);
          return `<a class="inline-article" href="article.html?id=${encodeURIComponent(a.id)}">
              <span class="inline-article-label">考察</span>${esc(a.title)}
            </a>`;
        })
        .join("");
    }

    // 年表
    if (p.timeline && p.timeline.length) {
      const items = p.timeline
        .slice()
        .sort((a, b) => (a.year - b.year) || ((a.month || 0) - (b.month || 0)))
        .map((e) => {
          const related = inlineArticleHTML(articlesForBattle(e.battle_id));
          // battle_id があれば見出しを合戦ページへのリンクにする
          const title = e.battle_id
            ? `<a class="t-battle-link" href="battle.html?id=${encodeURIComponent(e.battle_id)}">${esc(e.title)}</a>`
            : esc(e.title);
          return `<li>
            <span class="t-year">${esc(e.year)}${e.month ? "." + e.month : ""}</span>
            <span>
              <span class="t-title">${title}</span>
              ${e.description ? `<br><span class="t-desc">${esc(e.description)}</span>` : ""}
              ${e.sourceId ? `<br>${srcMark(e.sourceId)}` : ""}
              ${related ? `<br>${related}` : ""}
            </span>
          </li>`;
        })
        .join("");
      html.push(section("年表", `<ul class="timeline">${items}</ul>`));
    }

    // 成し遂げたこと
    if (p.achievements && p.achievements.length) {
      const items = p.achievements
        .map((a) => `<li><b>${esc(a.title)}</b>${a.description ? `<br><span class="muted">${esc(a.description)}</span>` : ""}${srcMark(a.sourceId)}</li>`)
        .join("");
      html.push(section("成し遂げたこと", `<ul class="list">${items}</ul>`));
    }

    // 後世の評価（時代別）
    if (p.reputation && p.reputation.length) {
      const items = p.reputation
        .map(
          (r) => `<div class="rep-item">
            <span class="rep-era">${esc(r.era)}</span>
            <div class="rep-body">${esc(r.body)}${srcMark(r.sourceId)}</div>
          </div>`
        )
        .join("");
      html.push(section("後世の評価", `<div class="rep-list">${items}</div>`));
    }

    // 逸話
    if (p.episodes && p.episodes.length) {
      const items = p.episodes
        .map((e) => `<li><b>${esc(e.title)}</b>${uncertain(e.uncertain)}<br><span class="muted">${esc(e.body)}</span>${srcMark(e.sourceId)}</li>`)
        .join("");
      html.push(section("逸話・エピソード", `<ul class="list">${items}</ul>`));
    }

    // ゆかりの地
    if (p.spots && p.spots.length) {
      const items = p.spots
        .map((s) => {
          const place = [s.prefecture, s.city].filter(Boolean).map(esc).join(" ");
          return `<div class="spot-item">
            <span class="spot-type">${esc(s.type)}</span>
            <b>${esc(s.name)}</b>
            ${place ? `<span class="spot-place">／ ${place}</span>` : ""}
            ${s.description ? `<div class="muted">${esc(s.description)}</div>` : ""}
          </div>`;
        })
        .join("");
      html.push(section("ゆかりの地・史跡", items));
    }

    // 墓所（状態は不明・なしも必ず明示）
    if (p.graves) {
      const g = p.graves;
      const places = (g.places || [])
        .map((pl) => {
          const place = [pl.prefecture, pl.city].filter(Boolean).map(esc).join(" ");
          return `<div class="spot-item">
              <span class="spot-type">墓所</span>
              <b>${esc(pl.name)}</b>
              ${place ? `<span class="spot-place">／ ${place}</span>` : ""}
              ${pl.description ? `<div class="muted">${esc(pl.description)}</div>` : ""}
            </div>`;
        })
        .join("");
      const status = `<p class="grave-status">状態：<b>${esc(g.status || "不明")}</b>${
        g.note ? ` <span class="muted">${esc(g.note)}</span>` : ""
      }</p>`;
      html.push(section("墓所", status + places));
    }

    // 関連する考察・記事（年表イベントに紐付け済みのものは除外）
    const relArticles = (articles || [])
      .filter(
        (a) =>
          !a.draft &&
          (a.relatedPeople || []).includes(p.id) &&
          !usedArticleIds.has(a.id)
      )
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    if (relArticles.length) {
      const items = relArticles
        .map(
          (a) => `<div class="ref-item">
            <span class="article-cat">${esc(a.category || "記事")}</span>
            <a href="article.html?id=${encodeURIComponent(a.id)}">${esc(a.title)}</a>
            ${a.summary ? `<div class="muted">${esc(a.summary)}</div>` : ""}
          </div>`
        )
        .join("");
      html.push(section("関連する考察・記事", items));
    }

    // 参考書籍
    if (p.references && p.references.length) {
      const items = p.references
        .map((r) => {
          const title = r.affiliateUrl
            ? `<a href="${esc(r.affiliateUrl)}" target="_blank" rel="noopener">${esc(r.title)}</a>`
            : esc(r.title);
          const meta = [r.author, r.publisher, r.year].filter(Boolean).map(esc).join(" / ");
          return `<div class="ref-item">${title}${meta ? ` <span class="muted">（${meta}）</span>` : ""}${r.note ? `<div class="muted">${esc(r.note)}</div>` : ""}</div>`;
        })
        .join("");
      html.push(section("参考書籍", items));
    }

    // 出典（種別・一次/二次を明示）
    if (p.sources && p.sources.length) {
      const items = p.sources
        .map((s) => {
          const meta = [s.author, s.publisher, s.year, s.page].filter(Boolean).map(esc).join(" / ");
          const title = s.url
            ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>`
            : esc(s.title);
          const badges =
            (s.type ? `<span class="src-type">${esc(s.type)}</span>` : "") +
            (s.primary
              ? `<span class="src-primary src-${s.primary === "一次資料" ? "primary1" : "primary2"}">${esc(s.primary)}</span>`
              : "");
          return `<li>${badges ? badges + " " : ""}${title}${
            meta ? ` <span class="muted">（${meta}）</span>` : ""
          }</li>`;
        })
        .join("");
      html.push(section("出典", `<ul class="list src-list">${items}</ul>`));
    }

    const histSection = historyHTML(p);
    if (histSection) html.push(histSection);

    // 目次をヘッダー（html[0]）の直後に挿入
    html.splice(1, 0, tocHTML());

    contentEl.innerHTML = html.join("");
  }

  Promise.all([
    fetch(`data/people/${encodeURIComponent(id)}.json`).then((res) => {
      if (!res.ok) throw new Error(res.status);
      return res.json();
    }),
    // 記事一覧は補助情報。取得できなくても人物ページは表示する
    fetch("data/articles/index.json")
      .then((res) => (res.ok ? res.json() : { articles: [] }))
      .catch(() => ({ articles: [] })),
  ])
    .then(([p, adata]) => render(p, (adata && adata.articles) || []))
    .catch((err) => {
      contentEl.innerHTML = `<p class="error">人物データを読み込めませんでした（ID: ${esc(id)}）。ローカルで開いている場合は簡易サーバー経由で表示してください（README参照）。</p>`;
      console.error(err);
    });
})();
