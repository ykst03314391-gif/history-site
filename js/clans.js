// 大名家一覧ページ
(async function () {
  const listEl = document.getElementById("list");
  const searchEl = document.getElementById("search");
  let clans = [];

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  function cardHTML(c) {
    return `
      <a class="card" href="clan.html?id=${encodeURIComponent(c.id)}">
        <h3>${esc(c.name)}</h3>
        <p class="kana">${esc(c.kana || "")}</p>
        ${c.region ? `<p class="years">${esc(c.region)}</p>` : ""}
        <p class="card-summary">${esc(c.summary || "")}</p>
        ${c.kamon ? `<div class="tags"><span class="tag">家紋：${esc(c.kamon)}</span></div>` : ""}
      </a>`;
  }

  function render(items) {
    listEl.innerHTML = items.length
      ? items.map(cardHTML).join("")
      : `<p class="muted">該当する大名家がありません。</p>`;
  }

  function filter(q) {
    q = q.trim().toLowerCase();
    if (!q) return render(clans);
    render(
      clans.filter((c) =>
        [c.name, c.kana, c.summary, c.region].join(" ").toLowerCase().includes(q)
      )
    );
  }

  try {
    const res = await fetch("data/clans/index.json");
    if (!res.ok) throw new Error(res.status);
    clans = (await res.json()).clans || [];
    render(clans);
    searchEl.addEventListener("input", (e) => filter(e.target.value));
  } catch (err) {
    listEl.innerHTML = `<p class="error">大名家データの読み込みに失敗しました。ローカルで開いている場合は簡易サーバー経由で表示してください（README参照）。</p>`;
    console.error(err);
  }
})();
