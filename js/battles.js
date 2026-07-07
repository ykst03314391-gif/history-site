// 合戦一覧ページ（年代順）
(async function () {
  const listEl = document.getElementById("list");
  const searchEl = document.getElementById("search");
  let battles = [];

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  function cardHTML(b) {
    return `
      <a class="card" href="battle.html?id=${encodeURIComponent(b.id)}">
        <p class="years">${esc(b.year || "")}年${b.prefecture ? "　" + esc(b.prefecture) : ""}</p>
        <h3>${esc(b.name)}</h3>
        <p class="kana">${esc(b.kana || "")}</p>
        <p class="card-summary">${esc(b.summary || "")}</p>
      </a>`;
  }

  function render(items) {
    listEl.innerHTML = items.length
      ? items.map(cardHTML).join("")
      : `<p class="muted">該当する合戦がありません。</p>`;
  }

  function filter(q) {
    q = q.trim().toLowerCase();
    if (!q) return render(battles);
    render(
      battles.filter((b) =>
        [b.name, b.kana, b.summary, b.prefecture].join(" ").toLowerCase().includes(q)
      )
    );
  }

  try {
    const res = await fetch("data/battles/index.json");
    if (!res.ok) throw new Error(res.status);
    battles = ((await res.json()).battles || []).sort(
      (a, b) => (a.year || 0) - (b.year || 0)
    );
    render(battles);
    searchEl.addEventListener("input", (e) => filter(e.target.value));
  } catch (err) {
    listEl.innerHTML = `<p class="error">合戦データの読み込みに失敗しました。ローカルで開いている場合は簡易サーバー経由で表示してください（README参照）。</p>`;
    console.error(err);
  }
})();
