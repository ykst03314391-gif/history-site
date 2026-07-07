// 大名家詳細ページ
(function () {
  const contentEl = document.getElementById("content");

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  const id = new URLSearchParams(location.search).get("id");
  if (!id || !/^[a-z0-9-]+$/.test(id)) {
    contentEl.innerHTML = `<p class="error">大名家IDが指定されていません。</p>`;
    return;
  }

  function memberLink(m) {
    const label = esc(m.name || m.person_id || "");
    if (m.person_id) {
      return `<a href="person.html?id=${encodeURIComponent(m.person_id)}">${label}</a>`;
    }
    return label;
  }

  function render(c) {
    document.title = `${c.name} ｜ 戦国クロニクル`;
    const html = [];

    // ヘッダー
    const facts = [];
    if (c.kamon) facts.push(`家紋：${esc(c.kamon)}`);
    if (c.base && c.base.name) facts.push(`本拠：${esc(c.base.name)}`);
    html.push(`
      <div class="person-head">
        <h1>${esc(c.name)}</h1>
        <p class="kana">${esc(c.kana || "")}</p>
        ${facts.length ? `<p class="years">${facts.join("　／　")}</p>` : ""}
        ${c.summary ? `<p class="summary">${esc(c.summary)}</p>` : ""}
      </div>
    `);

    // 説明本文（段落配列）
    if (c.description && c.description.length) {
      const body = c.description.map((p) => `<p>${esc(p)}</p>`).join("");
      html.push(`<section class="section"><h2>この家について</h2>${body}</section>`);
    }

    // 所属人物：一門 と ゆかりの人物（家臣／その他）に分ける
    const members = c.members || [];
    const memberItem = (m) => `<div class="spot-item">
        <b>${memberLink(m)}</b>
        ${m.role ? `<span class="muted">／ ${esc(m.role)}</span>` : ""}
      </div>`;
    const memberList = (list) => list.map(memberItem).join("");

    // type 未設定は「一門」扱い
    const ichimon = members.filter((m) => !m.type || m.type === "一門");
    const kashin = members.filter((m) => m.type === "家臣");
    const other = members.filter((m) => m.type === "その他");

    if (ichimon.length) {
      const headName = c.head && c.head.name ? esc(c.head.name) : "";
      const headLabel =
        c.head && c.head.person_id
          ? `<a href="person.html?id=${encodeURIComponent(c.head.person_id)}">${headName}</a>`
          : headName;
      const headNote = headName
        ? `<span class="head-note">主：${headLabel}（この人から見た続柄）</span>`
        : "";
      html.push(`<section class="section"><h2>一門${headNote}</h2>${memberList(ichimon)}</section>`);
    }
    if (kashin.length || other.length) {
      let inner = "";
      if (kashin.length) {
        inner += `<h3 class="series-group">家臣</h3>${memberList(kashin)}`;
      }
      if (other.length) {
        inner += `<h3 class="series-group">その他（親交のあった人物など）</h3>${memberList(other)}`;
      }
      html.push(`<section class="section"><h2>ゆかりの人物</h2>${inner}</section>`);
    }

    if (c.updatedAt) {
      html.push(`<p class="muted">最終更新：${esc(c.updatedAt)}</p>`);
    }

    contentEl.innerHTML = html.join("");
  }

  fetch(`data/clans/${encodeURIComponent(id)}.json`)
    .then((res) => {
      if (!res.ok) throw new Error(res.status);
      return res.json();
    })
    .then(render)
    .catch((err) => {
      contentEl.innerHTML = `<p class="error">大名家データを読み込めませんでした（ID: ${esc(id)}）。ローカルで開いている場合は簡易サーバー経由で表示してください（README参照）。</p>`;
      console.error(err);
    });
})();
