// 城一覧ページ
(async function () {
  const listEl = document.getElementById("list");
  const searchEl = document.getElementById("search");
  // 並べ方の切替。50音順／地域別／国別／種類別／国宝／日本100名城
  const orderEl = document.getElementById("order");
  const { kanaRow, REGIONS, isProvince, provinceRank, regionOf, regionRank, setupSwitch, by, diff } = window.ListOrder;
  let castles = [];
  let peopleById = {};
  let battlesById = {};

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  // 築城年（不明なら補足を出す）と所在地。項目の途中では折り返さず、収まらないときだけ「／」で折り返す
  function metaHTML(c) {
    const built = c.builtYear
      ? `${c.builtYear}年築城${c.builder ? `（${c.builder}）` : ""}`
      : c.builtNote || "築城年不詳";
    const place = `${c.prefecture || ""}${c.city || ""}`;
    return [c.type, place, built]
      .filter(Boolean)
      .map((s) => `<span class="meta-item">${esc(s)}</span>`)
      .join(" ／ ");
  }

  function relatedHTML(c) {
    const people = (c.relatedPeople || [])
      .filter((id) => peopleById[id])
      .map((id) => `<a class="tag tag-link" href="person.html?id=${encodeURIComponent(id)}">${esc(peopleById[id].name)}</a>`);
    const battles = (c.relatedBattles || [])
      .filter((id) => battlesById[id])
      .map((id) => `<a class="tag tag-link" href="battle.html?id=${encodeURIComponent(id)}">${esc(battlesById[id].name)}</a>`);
    if (!people.length && !battles.length) return "";
    return `
      <div class="castle-related">
        ${people.length ? `<p><span class="castle-related-label">人物</span>${people.join("")}</p>` : ""}
        ${battles.length ? `<p><span class="castle-related-label">合戦</span>${battles.join("")}</p>` : ""}
      </div>`;
  }

  // 写真のクレジット（作者・ライセンス・出典。CCの写真は縮小・トリミングしている）
  function creditHTML(ph) {
    const lic = ph.licenseUrl
      ? `<a href="${esc(ph.licenseUrl)}" target="_blank" rel="noopener">${esc(ph.license)}</a>`
      : esc(ph.license);
    const src = `<a href="${esc(ph.source.url)}" target="_blank" rel="noopener">${esc(ph.source.name)}</a>`;
    return [ph.author ? `撮影：${esc(ph.author)}` : "", lic, src, ph.licenseUrl ? "縮小・トリミングして使用" : ""]
      .filter(Boolean)
      .join(" ／ ");
  }

  function creditsHTML(items) {
    const rows = items
      .filter((c) => c.photo)
      .map((c) => `<li><span class="credit-name">${esc(c.name)}</span>${esc(c.photo.caption)}：${creditHTML(c.photo)}</li>`)
      .join("");
    return rows ? `<h2>写真の出典</h2><ul class="photo-credit-list">${rows}</ul>` : "";
  }

  function cardHTML(c) {
    const tags = (c.tags || [])
      .map((t) => `<span class="tag">${esc(t)}</span>`)
      .join("");
    const alias = c.alias ? `（別名：${esc(c.alias)}）` : "";
    // 詳細ページがある城だけ城名をリンクにする（カード内に人物・合戦リンクがあるのでカード全体はリンクにしない）
    const href = c.detail ? `castle.html?id=${encodeURIComponent(c.id)}` : "";
    const title = href ? `<a href="${href}">${esc(c.name)}</a>` : esc(c.name);
    return `
      <div class="card castle-card">
        ${c.photo ? `<img class="castle-thumb" src="${esc(c.photo.thumb)}" alt="${esc(c.photo.caption)}" loading="lazy">` : ""}
        <h3>${title}</h3>
        <p class="kana">${esc(c.kana || "")}${alias}</p>
        <p class="years">${metaHTML(c)}</p>
        <p class="card-summary">${esc(c.summary || "")}</p>
        ${relatedHTML(c)}
        <div class="tags">${tags}</div>
        ${href ? `<p class="castle-more"><a href="${href}">詳しく見る →</a></p>` : ""}
      </div>`;
  }

  // 北から（緯度の大きい順）。緯度のない城は後ろ
  const lat = (c) => (typeof c.lat === "number" ? c.lat : -Infinity);
  const byNorth = (a, b) => diff(lat(b), lat(a));
  const prov = (c) => (isProvince(c.province) ? c.province : null);
  const byProvince = (a, b) => diff(provinceRank(prov(a)), provinceRank(prov(b)));
  const byRegion = (a, b) => diff(regionRank(prov(a)), regionRank(prov(b)));
  const hasTag = (c, t) => (c.tags || []).includes(t);

  // labels の順に見出しを立て、その見出しに入る城を並べる。空の見出しは出さない（emptyNote があれば注記を出す）
  function grouped(items, labels, labelOf, emptyNote = {}) {
    return labels
      .map((label) => [label, items.filter((c) => labelOf(c) === label), emptyNote[label]])
      .filter(([, list, note]) => list.length || note);
  }

  const TYPES = ["山城", "平山城", "平城"];
  const MEIJO = ["日本100名城", "続日本100名城"];

  // 並べ方ごとに [見出し, 城の配列, 空のときの注記] の並びを作る。items は50音順に並んでいる前提
  function groupsFor(order, items) {
    if (order === "kana") {
      const rows = [...new Set(items.map((c) => kanaRow(c.kana)))];
      return grouped(items, rows, (c) => kanaRow(c.kana));
    }
    const north = [...items].sort(byNorth);
    if (order === "region") {
      const sorted = [...items].sort(by(byRegion, byProvince, byNorth));
      const label = (c) => (prov(c) ? regionOf(prov(c)) : "国不明");
      return grouped(sorted, [...REGIONS, "国不明"], label);
    }
    if (order === "province") {
      const sorted = [...items].sort(by(byProvince, byNorth));
      const label = (c) => (prov(c) ? `${prov(c)}（${regionOf(prov(c))}）` : "国不明");
      return grouped(sorted, [...new Set(sorted.map(label))], label);
    }
    if (order === "type") {
      const label = (c) => (TYPES.includes(c.type) ? c.type : "その他");
      return grouped(north, [...TYPES, "その他"], label);
    }
    // 国宝・100名城は、該当する城だけを出す
    if (order === "treasure") {
      const label = (c) => (hasTag(c, "国宝") ? "国宝" : null);
      const note = { 国宝: "掲載している城に、国宝の城はまだありません。" };
      return grouped(north, ["国宝"], label, note);
    }
    if (order === "meijo") {
      const label = (c) => MEIJO.find((t) => hasTag(c, t)) || null;
      const note = { 日本100名城: "該当する城がありません。" };
      return grouped(north, MEIJO, label, note);
    }
    return [["", items]];
  }

  function render(items) {
    if (!items.length) {
      listEl.innerHTML = `<p class="muted">該当する城がありません。</p>`;
      return;
    }
    listEl.innerHTML = groupsFor(currentOrder(), items)
      .map(([label, list, note]) =>
        (label ? `<h3 class="kana-row-heading">${esc(label)}</h3>` : "") +
        (list.length ? list.map(cardHTML).join("") : `<p class="muted list-note">${esc(note)}</p>`)
      )
      .join("");
  }

  function filter(q) {
    q = q.trim().toLowerCase();
    if (!q) return render(castles);
    render(
      castles.filter((c) => {
        const hay = [
          c.name, c.kana, c.alias, c.type, c.prefecture, c.province, c.city, c.builder, c.summary,
          ...(c.tags || []),
          ...(c.relatedPeople || []).map((id) => peopleById[id]?.name),
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
    );
  }

  const currentOrder = setupSwitch(
    orderEl,
    ["kana", "region", "province", "type", "treasure", "meijo"],
    () => filter(searchEl.value)
  );

  async function load(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: ${res.status}`);
    return res.json();
  }

  try {
    const [castleData, peopleData, battleData] = await Promise.all([
      load("data/castles/index.json"),
      load("data/people/index.json"),
      load("data/battles/index.json"),
    ]);
    // 読み（kana）の50音順に並べておく。ほかの並べ方でも同順位のあいだはこの順が残る
    castles = (castleData.castles || []).sort((a, b) =>
      (a.kana || a.name || "").localeCompare(b.kana || b.name || "", "ja")
    );
    for (const p of peopleData.people || []) peopleById[p.id] = p;
    for (const b of battleData.battles || []) battlesById[b.id] = b;
    filter(searchEl.value);
    const creditsEl = document.getElementById("photo-credits");
    if (creditsEl) creditsEl.innerHTML = creditsHTML(castles);
    searchEl.addEventListener("input", (e) => filter(e.target.value));
  } catch (err) {
    listEl.innerHTML = `<p class="error">データの読み込みに失敗しました。ローカルで開いている場合は、簡易サーバー経由で表示してください（README参照）。</p>`;
    console.error(err);
  }
})();
