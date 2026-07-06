// 地域から探す：全人物データを集約し、都道府県ごとに逆引き表示
(async function () {
  const btnEl = document.getElementById("pref-buttons");
  const resultEl = document.getElementById("result");

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  // 都道府県コード順（データのある県のみボタン表示）
  const PREF_ORDER = [
    "北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県",
    "茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県",
    "新潟県","富山県","石川県","福井県","山梨県","長野県","岐阜県",
    "静岡県","愛知県","三重県","滋賀県","京都府","大阪府","兵庫県",
    "奈良県","和歌山県","鳥取県","島根県","岡山県","広島県","山口県",
    "徳島県","香川県","愛媛県","高知県","福岡県","佐賀県","長崎県",
    "熊本県","大分県","宮崎県","鹿児島県","沖縄県"
  ];

  // regions[pref] = { people: Map<id,{name,reasons:Set}>, spots: [] }
  const regions = {};
  function bucket(pref) {
    if (!regions[pref]) regions[pref] = { people: new Map(), spots: [] };
    return regions[pref];
  }
  function addPerson(pref, id, name, reason) {
    if (!pref) return;
    const b = bucket(pref);
    if (!b.people.has(id)) b.people.set(id, { name, reasons: new Set() });
    b.people.get(id).reasons.add(reason);
  }

  try {
    const idxRes = await fetch("data/people/index.json");
    if (!idxRes.ok) throw new Error(idxRes.status);
    const ids = ((await idxRes.json()).people || []).map((p) => p.id);

    // 各人物データを取得して集約（件数が増えたら事前集約に切替予定）
    const people = await Promise.all(
      ids.map((id) =>
        fetch(`data/people/${encodeURIComponent(id)}.json`).then((r) =>
          r.ok ? r.json() : null
        )
      )
    );

    for (const p of people) {
      if (!p) continue;
      // 出身地
      if (p.birthplace && p.birthplace.prefecture) {
        addPerson(p.birthplace.prefecture, p.id, p.name, "出身");
      }
      // 領地
      for (const t of p.territories || []) {
        if (t.prefecture) addPerson(t.prefecture, p.id, p.name, "領地：" + (t.name || ""));
      }
      // 史跡・スポット
      for (const s of p.spots || []) {
        if (!s.prefecture) continue;
        bucket(s.prefecture).spots.push({
          type: s.type || "その他",
          name: s.name || "",
          city: s.city || "",
          description: s.description || "",
          personId: p.id,
          personName: p.name,
        });
      }
    }

    const activePrefs = PREF_ORDER.filter((pf) => regions[pf]);
    if (!activePrefs.length) {
      resultEl.innerHTML = `<p class="muted">まだ地域データがありません。</p>`;
      btnEl.innerHTML = "";
      return;
    }

    // ボタン生成
    btnEl.innerHTML = activePrefs
      .map((pf) => {
        const r = regions[pf];
        const count = r.people.size + r.spots.length;
        return `<button class="pref-btn" data-pref="${esc(pf)}">${esc(pf)}<span class="pref-count">${count}</span></button>`;
      })
      .join("");

    function renderPref(pf) {
      const r = regions[pf];
      // 人物
      let peopleHTML = "";
      if (r.people.size) {
        const items = [...r.people.entries()]
          .map(([id, v]) => {
            const reasons = [...v.reasons].filter(Boolean).map(esc).join("・");
            return `<a class="mini-card" href="person.html?id=${encodeURIComponent(id)}">
                <b>${esc(v.name)}</b>
                <span class="mini-reason">${reasons}</span>
              </a>`;
          })
          .join("");
        peopleHTML = `<section class="section"><h2>ゆかりの人物</h2><div class="mini-grid">${items}</div></section>`;
      }
      // スポット
      let spotHTML = "";
      if (r.spots.length) {
        const items = r.spots
          .map((s) => {
            const place = s.city ? `<span class="spot-place">／ ${esc(s.city)}</span>` : "";
            return `<div class="spot-item">
                <span class="spot-type">${esc(s.type)}</span>
                <b>${esc(s.name)}</b>${place}
                <a class="spot-person" href="person.html?id=${encodeURIComponent(s.personId)}">＃${esc(s.personName)}</a>
                ${s.description ? `<div class="muted">${esc(s.description)}</div>` : ""}
              </div>`;
          })
          .join("");
        spotHTML = `<section class="section"><h2>史跡・スポット</h2>${items}</section>`;
      }
      resultEl.innerHTML = `<h3 class="region-title">${esc(pf)}</h3>${peopleHTML}${spotHTML}`;

      // ボタンの選択状態
      btnEl.querySelectorAll(".pref-btn").forEach((b) =>
        b.classList.toggle("is-active", b.dataset.pref === pf)
      );
    }

    btnEl.addEventListener("click", (e) => {
      const b = e.target.closest(".pref-btn");
      if (b) renderPref(b.dataset.pref);
    });

    // 初期表示：最初の県
    renderPref(activePrefs[0]);
  } catch (err) {
    resultEl.innerHTML = `<p class="error">地域データの読み込みに失敗しました。ローカルで開いている場合は簡易サーバー経由で表示してください（README参照）。</p>`;
    console.error(err);
  }
})();
