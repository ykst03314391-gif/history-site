// 人物一覧ページ
(async function () {
  const listEl = document.getElementById("list");
  const searchEl = document.getElementById("search");
  let people = [];

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  function years(p) {
    const b = p.birthYear ?? "?";
    const d = p.deathYear ?? "?";
    return `${b} 〜 ${d}`;
  }

  function cardHTML(p) {
    const tags = (p.tags || [])
      .map((t) => `<span class="tag">${esc(t)}</span>`)
      .join("");
    return `
      <a class="card" href="person.html?id=${encodeURIComponent(p.id)}">
        <h3>${esc(p.name)}</h3>
        <p class="kana">${esc(p.kana || "")}</p>
        <p class="years">${esc(years(p))}</p>
        <p class="card-summary">${esc(p.summary || "")}</p>
        <div class="tags">${tags}</div>
      </a>`;
  }

  function render(items) {
    if (!items.length) {
      listEl.innerHTML = `<p class="muted">該当する人物がいません。</p>`;
      return;
    }
    listEl.innerHTML = items.map(cardHTML).join("");
  }

  function filter(q) {
    q = q.trim().toLowerCase();
    if (!q) return render(people);
    render(
      people.filter((p) => {
        const hay = [p.name, p.kana, p.summary, ...(p.tags || [])]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
    );
  }

  try {
    const res = await fetch("data/people/index.json");
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    people = data.people || [];
    render(people);
    searchEl.addEventListener("input", (e) => filter(e.target.value));
  } catch (err) {
    listEl.innerHTML = `<p class="error">データの読み込みに失敗しました。ローカルで開いている場合は、簡易サーバー経由で表示してください（README参照）。</p>`;
    console.error(err);
  }
})();
