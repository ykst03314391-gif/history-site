// 人物一覧ページ（武将一覧 people.html／その他の人物 others.html で共用）
(async function () {
  const listEl = document.getElementById("list");
  const searchEl = document.getElementById("search");
  // data-category="other" なら武将ではない人物、無指定なら武将を一覧する
  const category = listEl.dataset.category || "";
  let people = [];
  let otherCount = 0;

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  // 和暦があれば西暦を括弧で併記（例：天文9年（1540） 〜 天正19年1月22日（1591））
  function fmtYear(era, year) {
    if (era) return year ? `${era}（${year}）` : era;
    return year ?? "?";
  }

  function years(p) {
    return `${fmtYear(p.birthEra, p.birthYear)} 〜 ${fmtYear(p.deathEra, p.deathYear)}`;
  }

  function cardHTML(p) {
    const tags = (p.tags || [])
      .map((t) => `<span class="tag">${esc(t)}</span>`)
      .join("");
    // カード右上にサムネイル（名前・生没年の横の空きに回り込ませる）。肖像画が無ければ「画像なし」の絵
    const thumb = `<img class="person-thumb" src="${esc(p.thumb || "assets/img/portraits/noimage.svg")}" alt="" loading="lazy">`;
    return `
      <a class="card person-card" href="person.html?id=${encodeURIComponent(p.id)}">
        ${thumb}
        <h3>${esc(p.name)}</h3>
        <p class="kana">${esc(p.kana || "")}</p>
        <p class="years">${esc(years(p))}</p>
        <p class="card-summary">${esc(p.summary || "")}</p>
        <div class="tags">${tags}</div>
      </a>`;
  }

  // 50音の行見出し。かなの先頭1文字から行を判定する（濁音・半濁音・小書きも同じ行）
  const ROWS = [
    ["あ行", "ぁあぃいぅうゔぇえぉお"],
    ["か行", "かがきぎくぐけげこご"],
    ["さ行", "さざしじすずせぜそぞ"],
    ["た行", "ただちぢっつづてでとど"],
    ["な行", "なにぬねの"],
    ["は行", "はばぱひびぴふぶぷへべぺほぼぽ"],
    ["ま行", "まみむめも"],
    ["や行", "ゃやゅゆょよ"],
    ["ら行", "らりるれろ"],
    ["わ行", "ゎわゐゑをん"],
  ];
  function rowOf(p) {
    const c = (p.kana || "").trim().charAt(0);
    const row = ROWS.find(([, chars]) => chars.includes(c));
    return row ? row[0] : "その他";
  }

  // 武将一覧の末尾に置く「その他の人物」への入口カード
  function otherCardHTML() {
    return `
      <h3 class="kana-row-heading">その他</h3>
      <a class="card person-card card-more" href="others.html">
        <h3>その他の人物</h3>
        <p class="card-summary">武将ではない人物（武将の家族など）の一覧です。${otherCount ? `現在${otherCount}人。` : ""}</p>
      </a>`;
  }

  function render(items, showOther) {
    const more = showOther && !category ? otherCardHTML() : "";
    if (!items.length) {
      listEl.innerHTML = `<p class="muted">該当する人物がいません。</p>` + more;
      return;
    }
    // items は50音順に並んでいる前提。行が変わるところに見出しを挟む
    let html = "";
    let current = null;
    for (const p of items) {
      const row = rowOf(p);
      if (row !== current) {
        html += `<h3 class="kana-row-heading">${esc(row)}</h3>`;
        current = row;
      }
      html += cardHTML(p);
    }
    listEl.innerHTML = html + more;
  }

  function filter(q) {
    q = q.trim().toLowerCase();
    if (!q) return render(people, true);
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
    const all = data.people || [];
    otherCount = all.filter((p) => p.category === "other").length;
    // このページのカテゴリの人物だけを、読み（kana）の50音順に並べる
    people = all
      .filter((p) => (category === "other") === (p.category === "other"))
      .sort((a, b) =>
        (a.kana || a.name || "").localeCompare(b.kana || b.name || "", "ja")
      );
    render(people, true);
    searchEl.addEventListener("input", (e) => filter(e.target.value));
  } catch (err) {
    listEl.innerHTML = `<p class="error">データの読み込みに失敗しました。ローカルで開いている場合は、簡易サーバー経由で表示してください（README参照）。</p>`;
    console.error(err);
  }
})();
