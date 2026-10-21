// 城一覧ページ
(async function () {
  const listEl = document.getElementById("list");
  const searchEl = document.getElementById("search");
  let castles = [];
  let peopleById = {};
  let battlesById = {};

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  // 築城年（不明なら補足を出す）と所在地
  function meta(c) {
    const built = c.builtYear
      ? `${c.builtYear}年築城${c.builder ? `（${c.builder}）` : ""}`
      : c.builtNote || "築城年不詳";
    const place = `${c.prefecture || ""}${c.city || ""}`;
    return [c.type, place, built].filter(Boolean).join(" ／ ");
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
        <p class="years">${esc(meta(c))}</p>
        <p class="card-summary">${esc(c.summary || "")}</p>
        ${relatedHTML(c)}
        <div class="tags">${tags}</div>
        ${href ? `<p class="castle-more"><a href="${href}">詳しく見る →</a></p>` : ""}
      </div>`;
  }

  function render(items) {
    if (!items.length) {
      listEl.innerHTML = `<p class="muted">該当する城がありません。</p>`;
      return;
    }
    listEl.innerHTML = items.map(cardHTML).join("");
  }

  function filter(q) {
    q = q.trim().toLowerCase();
    if (!q) return render(castles);
    render(
      castles.filter((c) => {
        const hay = [
          c.name, c.kana, c.alias, c.type, c.prefecture, c.city, c.builder, c.summary,
          ...(c.tags || []),
          ...(c.relatedPeople || []).map((id) => peopleById[id]?.name),
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
    );
  }

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
    castles = castleData.castles || [];
    for (const p of peopleData.people || []) peopleById[p.id] = p;
    for (const b of battleData.battles || []) battlesById[b.id] = b;
    render(castles);
    const creditsEl = document.getElementById("photo-credits");
    if (creditsEl) creditsEl.innerHTML = creditsHTML(castles);
    searchEl.addEventListener("input", (e) => filter(e.target.value));
  } catch (err) {
    listEl.innerHTML = `<p class="error">データの読み込みに失敗しました。ローカルで開いている場合は、簡易サーバー経由で表示してください（README参照）。</p>`;
    console.error(err);
  }
})();
