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

  // 本文中の語をサイト内ページへのリンクにする。links: [{ text, person_id | battle_id | castle_id }]
  // 各語は最初に出てきた1か所だけをリンクにする
  function linkText(text, links) {
    const s = String(text ?? "");
    if (!links || !links.length) return esc(s);
    const hrefOf = (l) =>
      l.person_id ? `person.html?id=${encodeURIComponent(l.person_id)}`
      : l.battle_id ? `battle.html?id=${encodeURIComponent(l.battle_id)}`
      : l.castle_id ? `castle.html?id=${encodeURIComponent(l.castle_id)}`
      : "";
    const hits = links
      .filter((l) => l.text && hrefOf(l))
      .map((l) => ({ l, at: s.indexOf(l.text) }))
      .filter((h) => h.at >= 0)
      .sort((a, b) => a.at - b.at);
    let out = "";
    let pos = 0;
    for (const { l, at } of hits) {
      if (at < pos) continue;
      out += esc(s.slice(pos, at)) + `<a href="${hrefOf(l)}">${esc(l.text)}</a>`;
      pos = at + l.text.length;
    }
    return out + esc(s.slice(pos));
  }

  const id = new URLSearchParams(location.search).get("id");
  if (!id || !/^[a-z0-9-]+$/.test(id)) {
    contentEl.innerHTML = `<p class="error">人物IDが指定されていません。</p>`;
    return;
  }

  // 年月日を表示用文字列に。西暦を先に書き、和暦があれば括弧で併記（例：1591年2月15日（天正19年1月22日））
  function fmtDate(d) {
    if (!d) return "不明";
    const parts = [];
    if (d.year) parts.push(d.year + "年");
    if (d.year && d.month) parts.push(d.month + "月");
    if (d.year && d.month && d.day) parts.push(d.day + "日");
    if (!parts.length) return d.era ? esc(d.era) : "不明";
    return parts.join("") + (d.era ? `（${esc(d.era)}）` : "");
  }

  // 一時点の年の見出し（例：1585年（天正13年10月） ）。年が無ければ和暦や「幼少期」などをそのまま
  function whenLabel(year, era) {
    if (year) return `${esc(year)}年${era ? `（${esc(era)}）` : ""} `;
    return era ? `${esc(era)} ` : "";
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
    return `<nav class="side-toc" aria-label="目次">
      <p class="toc-title">目次</p>
      <ol>${items}</ol>
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
    // 肖像画（パブリックドメインの画像のみ。所蔵と出典を必ず添える）
    let portrait = "";
    if (p.portrait && p.portrait.src) {
      const pt = p.portrait;
      const src = pt.source && pt.source.url
        ? `<a href="${esc(pt.source.url)}" target="_blank" rel="noopener">${esc(pt.source.name || "出典")}</a>`
        : esc((pt.source && pt.source.name) || "");
      const credit = [
        pt.holder ? `所蔵：${esc(pt.holder)}` : "",
        src ? `出典：${src}${pt.license ? `（${esc(pt.license)}）` : ""}` : "",
      ].filter(Boolean).join("<br>");
      portrait = `<figure class="person-portrait">
          <img src="${esc(pt.src)}" alt="${esc(pt.caption || p.name + "の肖像")}" loading="lazy">
          <figcaption>
            ${pt.caption ? `<span class="portrait-title">${esc(pt.caption)}</span>` : ""}
            ${pt.note ? `<span class="portrait-note">${esc(pt.note)}</span>` : ""}
            ${credit ? `<span class="img-credit">${credit}</span>` : ""}
          </figcaption>
        </figure>`;
    } else {
      // 肖像画が見つかっていない人物は「画像なし」の絵を置く（レイアウトを揃えるため）
      portrait = `<figure class="person-portrait person-portrait--none">
          <img src="assets/img/portraits/noimage.svg" alt="肖像画なし">
          <figcaption><span class="portrait-note">肖像画は未発見</span></figcaption>
        </figure>`;
    }
    // 基本情報（別名・家紋など。見出しは立てず、ヘッダー枠内に置く）
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
    const factsHTML = facts.length
      ? `<dl class="facts head-facts">${facts
          .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`)
          .join("")}</dl>`
      : "";
    html.push(`
      <div class="person-head${portrait ? " has-portrait" : ""}">
        ${portrait}
        <div class="person-head-main">
          <h1>${esc(p.name)}${uncertain(p.birth && p.birth.uncertain)}</h1>
          <p class="kana">${esc(p.kana || "")}</p>
          <p><span class="years">${birth} 〜 ${death}</span></p>
          ${p.summary ? `<p class="summary">${esc(p.summary)}</p>` : ""}
          ${factsHTML}
        </div>
      </div>
    `);

    // 呼び名の変遷
    if (p.nameHistory && p.nameHistory.length) {
      const items = p.nameHistory
        .map((n) => {
          return `<li><b>${whenLabel(n.year, n.era)}</b>${esc(n.value)}${uncertain(n.uncertain)}${n.note ? ` <span class="muted">${esc(n.note)}</span>` : ""}${srcMark(n.sourceId)}</li>`;
        })
        .join("");
      html.push(section("呼び名の変遷", `<ul class="list">${items}</ul>`));
    }

    // 官位変遷
    if (p.ranks && p.ranks.length) {
      const items = p.ranks
        .map((r) => `<li><b>${whenLabel(r.year, r.era)}</b>${esc(r.title)}${r.note ? ` <span class="muted">${esc(r.note)}</span>` : ""}${srcMark(r.sourceId)}</li>`)
        .join("");
      html.push(section("官位", `<ul class="list">${items}</ul>`));
    }

    // 年表イベント・家系に紐付けて表示した記事は、末尾の関連記事から除外する
    const usedArticleIds = new Set();

    // 家系（article_id があれば注記の横に考察リンクを出す。下書きの記事はリンクにせず「執筆中」と予告する）
    const articleLink = (id) => {
      const a = id && (articles || []).find((x) => x.id === id);
      if (!a) return "";
      if (a.draft) {
        return ` <span class="inline-article is-pending">
          <span class="inline-article-label">考察（執筆中）</span>${esc(a.title)}
        </span>`;
      }
      usedArticleIds.add(a.id);
      return ` <a class="inline-article" href="article.html?id=${encodeURIComponent(a.id)}">
          <span class="inline-article-label">考察</span>${esc(a.title)}
        </a>`;
    };
    if (p.family && p.family.length) {
      const items = p.family
        .map((r) => `<li><b>${esc(r.relation)}</b>：${personLink(r)}${r.note ? ` <span class="muted">${esc(r.note)}</span>` : ""}${articleLink(r.article_id)}</li>`)
        .join("");
      html.push(section("家系・親族", `<ul class="list">${items}</ul>`));
    }

    // 仕えた・仕えられた期間（例：（1573〜1591年）（〜1591年）（1576年〜））
    const period = (r) => {
      if (!r.from && !r.to) return "";
      const text = r.from && r.to ? `${esc(r.from)}〜${esc(r.to)}年` : r.from ? `${esc(r.from)}年〜` : `〜${esc(r.to)}年`;
      return ` <span class="muted">（${text}）</span>`;
    };

    // 仕えた主君
    if (p.lords && p.lords.length) {
      const items = p.lords
        .map((s) => `<li>${personLink(s)}${period(s)}${s.note ? ` <span class="muted">${esc(s.note)}</span>` : ""}</li>`)
        .join("");
      html.push(section("仕えた人", `<ul class="list">${items}</ul>`));
    }

    // 家臣団
    if (p.retainers && p.retainers.length) {
      const items = p.retainers
        .map((r) => {
          return `<li>${personLink(r)}${period(r)}${r.note ? ` <span class="muted">${esc(r.note)}</span>` : ""}${srcMark(r.sourceId)}</li>`;
        })
        .join("");
      html.push(section("家臣団", `<ul class="list">${items}</ul>`));
    }

    // 領地変遷
    if (p.territories && p.territories.length) {
      // 座標（lat/lng）か令制国名（province）のある領地は地図にも番号付きで示す
      const hasMap = p.territories.some(onMap);
      const items = p.territories
        .map((t, i) => `<li>${hasMap && onMap(t) ? `<span class="terr-num" style="background:${terrColor(i)}">${i + 1}</span>` : ""}<b>${terrYears(t)}</b>${esc(t.name)}${t.prefecture ? `<span class="muted">（${[].concat(t.prefecture).map(esc).join("・")}）</span>` : ""}${t.note ? ` — <span class="muted">${esc(t.note)}</span>` : ""}${t.untilNote ? `<span class="muted terr-until">→ ${t.until ? esc(t.until) + "年 " : ""}${esc(t.untilNote)}</span>` : ""}${srcMark(t.sourceId)}${hasMap && onMap(t) ? `<div class="terr-snap" data-i="${i}" role="img" aria-label="${esc(terrYears(t) + t.name)}の時点の領地"></div><p class="terr-snap-caption muted" data-i="${i}"></p>` : ""}</li>`)
        .join("");
      const mapHTML = hasMap
        ? `<div id="territory-map" class="territory-map" role="img" aria-label="領地の変遷の地図"></div>
           <div id="territory-legend" class="territory-legend"></div>
           <p class="territory-map-note muted">色は領地の範囲で、国の一部だけを領したときは郡の範囲を塗っています。色と番号は下の一覧と対応し、淡く点線で囲んだ範囲はのちに手放した領地です。一覧の各項目の下の地図は、その時点で持っていた領地だけを示します。線は年代順につないだもの、ピンは城など代表地点です。国界は1868年時点、郡界は1920年時点の境界による近似で、戦国期の境界とは細部で違います。</p>`
        : "";
      html.push(section("領地の変遷", `${mapHTML}<ul class="list terr-list">${items}</ul>`));
    }

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
          // battle_id があれば合戦ページへ、castle_id があれば城ページへ、見出しをリンクにする
          const title = e.battle_id
            ? `<a class="t-battle-link" href="battle.html?id=${encodeURIComponent(e.battle_id)}">${esc(e.title)}</a>`
            : e.castle_id
            ? `<a class="t-battle-link" href="castle.html?id=${encodeURIComponent(e.castle_id)}">${esc(e.title)}</a>`
            : esc(e.title);
          return `<li>
            <span class="t-year"><span>${esc(e.year)}年</span>${e.month ? `<span>${esc(e.month)}月</span>` : ""}</span>
            <span>
              <span class="t-title">${title}</span>
              ${e.description ? `<br><span class="t-desc">${linkText(e.description, e.links)}</span>` : ""}
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

    // 人物評価（時代別。同じ era が続くときはラベルを最初の1つだけ出す）
    if (p.reputation && p.reputation.length) {
      const items = p.reputation
        .map(
          (r, i) => `<div class="rep-item">
            ${i > 0 && p.reputation[i - 1].era === r.era ? "<span></span>" : `<span class="rep-era">${esc(r.era)}</span>`}
            <div class="rep-body">${r.title ? `<b>${esc(r.title)}</b><br>` : ""}${esc(r.body)}${srcMark(r.sourceId)}</div>
          </div>`
        )
        .join("");
      html.push(section("人物評価", `<div class="rep-list">${items}</div>`));
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
          // castle_id があれば城ページへのリンクにする
          const name = s.castle_id
            ? `<a href="castle.html?id=${encodeURIComponent(s.castle_id)}">${esc(s.name)}</a>`
            : esc(s.name);
          return `<div class="spot-item">
            <span class="spot-type">${esc(s.type)}</span>
            <b>${name}</b>
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
    if (document.getElementById("territory-map")) initTerritoryMap(p.territories);
  }

  function hasCoords(t) {
    return t && isFinite(Number(t.lat)) && isFinite(Number(t.lng)) && t.lat != null && t.lng != null;
  }

  // Leaflet は地図がある人物ページでだけ読み込む
  const LEAFLET = "https://unpkg.com/leaflet@1.9.4/dist/";
  function loadLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    return new Promise((resolve, reject) => {
      // CSS が効く前に地図を作ると大きさを読み違えるので、CSS と JS の両方を待つ
      let pending = 2;
      const done = () => --pending === 0 && resolve(window.L);
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = LEAFLET + "leaflet.css";
      css.onload = done;
      css.onerror = reject;
      document.head.appendChild(css);
      const js = document.createElement("script");
      js.src = LEAFLET + "leaflet.js";
      js.onload = done;
      js.onerror = reject;
      document.head.appendChild(js);
    });
  }

  function onMap(t) {
    return hasCoords(t) || areasOf(t).length > 0;
  }

  const asList = (v) => (!v ? [] : Array.isArray(v) ? v : [v]);

  // 塗る範囲。国の一部だけなら district（"但馬国朝来郡" か配列）で郡を、国全体なら province（"大和国" か配列）で国を塗る。
  // 郡と国全体が混じるときは district に国名も並べる（例 ["伊勢国安濃郡", "伊賀国"]）
  function areasOf(t) {
    if (!t) return [];
    const d = asList(t.district);
    return d.length ? d : asList(t.province);
  }
  const isDistrict = (name) => /郡$/.test(name);

  // 国界（tools/build-provinces.py）と郡界（tools/build-districts.py）。塗る範囲がある人物ページでだけ、要る方を読み込む
  function loadAreas(territories) {
    const names = territories.flatMap(areasOf);
    const get = (url) =>
      fetch(url)
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null);
    return Promise.all([
      names.some((n) => !isDistrict(n)) ? get("assets/geo/provinces.geojson") : null,
      names.some(isDistrict) ? get("assets/geo/districts.geojson") : null,
    ]).then(([prov, dist]) => ({
      features: [...(prov ? prov.features : []), ...(dist ? dist.features : [])],
      prov: !!prov,
      dist: !!dist,
    }));
  }

  // 領地の項目ごとに色を変える（一覧の番号・ピン・塗りを同じ色にして対応を分かりやすくする）
  const TERR_COLORS = ["#d64545", "#2f7fc1", "#e38b1d", "#3a9a4f", "#8a52b0", "#0f9a9a", "#c2477f", "#7a5a3a"];
  const terrColor = (i) => TERR_COLORS[i % TERR_COLORS.length];

  // 「1580〜1585年 」。until（手放した・移った年）が無ければ「1585年 」
  function terrYears(t) {
    if (!t.year) return t.until ? `〜${esc(t.until)}年 ` : "";
    return t.until ? `${esc(t.year)}〜${esc(t.until)}年 ` : `${esc(t.year)}年 `;
  }

  // その項目の年に持っていた領地の項目番号。年より前に得て、まだ手放していない（until がその年より後）もの
  function heldAt(territories, i) {
    const y = territories[i].year;
    if (!y) return [i];
    return territories
      .map((t, j) => j)
      .filter((j) => {
        const t = territories[j];
        return j === i || (onMap(t) && t.year && t.year <= y && (!t.until || t.until > y));
      });
  }

  const SNAP_MAX_ZOOM = 8;

  // 一覧の各項目の下に置く、その時点の領地だけの地図。その項目の範囲は濃く、同時に持っていた他の領地は淡く塗る
  function initSnapshotMap(L, geo, territories, i, el) {
    const held = heldAt(territories, i);
    const map = L.map(el, { scrollWheelZoom: false, dragging: !L.Browser.mobile, zoomControl: false }).setView([35, 136], 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    // 国・郡ごとに、塗る色を決める項目（この項目を優先、無ければ最初に挙げた項目）
    const areas = new Map();
    for (const j of held) {
      for (const name of areasOf(territories[j])) {
        if (!areas.has(name) || j === i) areas.set(name, j);
      }
    }
    const layers = [];
    const order = [...areas].sort(([a], [b]) => isDistrict(a) - isDistrict(b));
    for (const [name, j] of order) {
      const f = geo.features.find((x) => x.properties.name === name);
      if (!f) continue;
      const color = terrColor(j);
      const style = j === i
        ? { color, weight: 2, opacity: 1, fillColor: color, fillOpacity: 0.45 }
        : { color, weight: 1, opacity: 0.7, fillColor: color, fillOpacity: 0.18 };
      layers.push(L.geoJSON(f, { style }).bindPopup(`<div class="terr-popup"><b>${esc(name)}</b></div>`).addTo(map));
    }

    const pts = [];
    for (const j of held) {
      const t = territories[j];
      if (!hasCoords(t)) continue;
      const ll = [Number(t.lat), Number(t.lng)];
      if (pts.some((p) => p[0] === ll[0] && p[1] === ll[1])) continue;
      pts.push(ll);
      const icon = L.divIcon({
        className: "terr-marker" + (j === i ? "" : " is-sub"),
        html: `<span style="background:${terrColor(j)}">${j + 1}</span>`,
        iconSize: null,
      });
      L.marker(ll, { icon, title: t.place || t.name }).addTo(map);
    }

    const caption = document.querySelector(`.terr-snap-caption[data-i="${i}"]`);
    if (caption) {
      const names = [...areas.keys()].filter((n) => !isDistrict(n) || ![...areas.keys()].some((m) => !isDistrict(m) && n.startsWith(m)));
      caption.textContent = `${territories[i].year ? territories[i].year + "年の時点の領地" : "この時点の領地"}：${names.join("・") || territories[i].name}${territories[i].mapNote ? `（${territories[i].mapNote}）` : ""}`;
    }

    map.invalidateSize();
    const bounds = L.latLngBounds(pts);
    for (const layer of layers) bounds.extend(layer.getBounds());
    return { map, bounds };
  }

  // その時点の地図を並べたとき、続く項目の範囲が重なるあいだは同じ表示範囲にして、移り変わりを見比べやすくする
  function fitSnapshotMaps(snaps) {
    const groups = [];
    for (const snap of snaps) {
      if (!snap.bounds.isValid()) continue;
      const last = groups[groups.length - 1];
      if (last && last.bounds.intersects(snap.bounds)) {
        last.bounds.extend(snap.bounds);
        last.snaps.push(snap);
      } else {
        groups.push({ bounds: L.latLngBounds(snap.bounds.getSouthWest(), snap.bounds.getNorthEast()), snaps: [snap] });
      }
    }
    // 郡ひとつなどの小さな範囲でも、どの地方かが分かる程度より寄せない
    for (const g of groups) {
      for (const { map } of g.snaps) map.fitBounds(g.bounds, { padding: [24, 24], maxZoom: SNAP_MAX_ZOOM });
    }
  }

  // 領地の変遷の地図：国の塗りつぶし＋番号付きピン＋年代順の線
  function initTerritoryMap(territories) {
    const el = document.getElementById("territory-map");
    Promise.all([loadLeaflet(), loadAreas(territories)])
      .then(([L, geo]) => {
        // ベクター図形を足す前に表示範囲を決めておく（未設定だと描画で落ちる）。最後に fitBounds で合わせ直す
        const map = L.map(el, { scrollWheelZoom: false }).setView([35, 136], 6);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 18,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' +
            (geo.prov ? ' | 国界: <a href="https://github.com/Asukana/Ryoseikoku_20230626_TSV">令制国データ</a> (CC0)' : "") +
            (geo.dist ? ' | 郡界: <a href="https://nlftp.mlit.go.jp/ksj/">国土数値情報 行政区域 1920年</a> (国土交通省, CC BY 4.0)' : ""),
        }).addTo(map);

        // 国・郡ごとに、最初に領地として出てくる年と該当する項目をまとめる
        const provs = new Map();
        territories.forEach((t, i) => {
          for (const name of areasOf(t)) {
            if (!provs.has(name)) provs.set(name, { first: i, items: [] });
            provs.get(name).items.push({ t, n: i + 1 });
          }
        });

        const provLayers = new Map();
        // 国を先に、郡を後に描いて、国の中の郡が隠れないようにする
        const order = [...provs].sort(([a], [b]) => isDistrict(a) - isDistrict(b));
        for (const [name, info] of order) {
          const f = geo.features.find((x) => x.properties.name === name);
          if (!f) continue;
          const color = terrColor(info.first);
          // その国・郡を挙げた項目がすべて until 付きなら、のちに手放した領地として淡く点線で描く
          const lost = info.items.every(({ t }) => t.until);
          const popup = `<div class="terr-popup"><b>${esc(name)}</b>${info.items
            .map(({ t, n }) => `<div>${n}. ${terrYears(t)}${esc(t.name)}</div>`)
            .join("")}</div>`;
          const layer = L.geoJSON(f, {
            style: lost
              ? { color, weight: 1.5, opacity: 0.9, dashArray: "5 4", fillColor: color, fillOpacity: 0.14 }
              : { color, weight: 1.5, opacity: 0.9, fillColor: color, fillOpacity: 0.38 },
          })
            .bindPopup(popup)
            .addTo(map);
          provLayers.set(name, layer);
        }

        // 凡例：項目ごとに、その項目で初めて塗った国・郡をまとめる
        const legendEl = document.getElementById("territory-legend");
        if (legendEl && provLayers.size) {
          legendEl.innerHTML = territories
            .map((t, i) => {
              const names = [...provs].filter(([n, v]) => v.first === i && provLayers.has(n)).map(([n]) => n);
              if (!names.length) return "";
              const lost = names.every((n) => provs.get(n).items.every(({ t }) => t.until));
              return `<span class="terr-legend-item${lost ? " is-lost" : ""}"><i style="background:${terrColor(i)}"></i>${i + 1}. ${t.year && !t.until ? esc(t.year) + "年〜 " : terrYears(t)}${names.map(esc).join("・")}</span>`;
            })
            .join("");
        }

        // ピンの位置：座標があればそこ、無ければ国の範囲の中心
        const pts = territories
          .map((t, i) => {
            if (hasCoords(t)) return { t, n: i + 1, ll: [Number(t.lat), Number(t.lng)] };
            const layer = provLayers.get(areasOf(t)[0]);
            if (!layer) return null;
            const c = layer.getBounds().getCenter();
            return { t, n: i + 1, ll: [c.lat, c.lng] };
          })
          .filter(Boolean);

        L.polyline(pts.map((x) => x.ll), { color: "#9b2d20", weight: 2, opacity: 0.7, dashArray: "6 6" }).addTo(map);

        // 同じ地点の領地は 1 本のピンにまとめる（例：「1・2」）
        const groups = new Map();
        for (const x of pts) {
          const key = x.ll.join(",");
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(x);
        }
        for (const list of groups.values()) {
          const label = list.map((x) => x.n).join("・");
          const icon = L.divIcon({
            className: "terr-marker",
            html: `<span style="background:${terrColor(list[0].n - 1)}">${esc(label)}</span>`,
            iconSize: null,
          });
          const popup = list
            .map(({ t, n }) => {
              const where = t.place ? `地図の位置：${esc(t.place)}${t.approx ? "（おおよそ）" : ""}` : t.approx ? "位置はおおよそ" : "";
              return `<div class="terr-popup"><b>${n}. ${terrYears(t)}${esc(t.name)}</b>${t.note ? `<div>${esc(t.note)}</div>` : ""}${where ? `<div class="muted">${where}</div>` : ""}</div>`;
            })
            .join("");
          L.marker(list[0].ll, { icon, title: label }).bindPopup(popup).addTo(map);
        }

        map.invalidateSize();
        const bounds = L.latLngBounds(pts.map((x) => x.ll));
        for (const layer of provLayers.values()) bounds.extend(layer.getBounds());
        if (pts.length === 1 && !provLayers.size) map.setView(pts[0].ll, 10);
        else if (bounds.isValid()) map.fitBounds(bounds, { padding: [16, 16] });

        fitSnapshotMaps(
          [...document.querySelectorAll(".terr-snap")].map((snapEl) => initSnapshotMap(L, geo, territories, Number(snapEl.dataset.i), snapEl))
        );
      })
      .catch((err) => {
        console.error(err);
        el.outerHTML = `<p class="muted">地図を読み込めませんでした。</p>`;
      });
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
