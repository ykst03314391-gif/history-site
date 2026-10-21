# 城（castle）スキーマ設計 v0.1

城を一覧で扱う。現時点では `data/castles/index.json` のみ（詳細ページなし）。
一覧は `castles.html`（武将一覧 `people.html` と同じカード形式）。

## 一覧（index.json の各要素）

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | string | 一意なID（例：`azuchi`）。将来の詳細ページ `castle.html?id=` 用 |
| `name` | string | 城名 |
| `kana` | string | 読みがな |
| `alias` | string? | 別名（例：岐阜城 → `稲葉山城`） |
| `type` | string | 縄張りの分類（`山城` / `平山城` / `平城`） |
| `prefecture` / `city` | string | 現在の所在地 |
| `builtYear` | number \| null | 築城年（西暦）。不詳なら `null` |
| `builder` | string? | 築城者（`builtYear` があるときに併記） |
| `builtNote` | string? | `builtYear` が `null` のときに代わりに表示する補足 |
| `summary` | string | 一言紹介 |
| `relatedPeople` | string[] | ゆかりの人物の `person_id`。人物DBにある人だけリンク表示 |
| `relatedBattles` | string[] | 関連する合戦の `battle_id`。合戦DBにあるものだけリンク表示 |
| `tags` | string[] | タグ（大名家・旧国名・史跡指定など） |

## 表示仕様

- 一覧：`castles.html` … `index.json` の並び順（おおむね東→西）でカード表示
  - 2行目：分類 ／ 所在地 ／ 築城年（築城者）または `builtNote`
  - ゆかりの人物・合戦を人物ページ／合戦ページへのリンクで表示
  - 検索：城名・かな・別名・分類・所在地・築城者・紹介文・タグ・ゆかりの人物名

> ⚠️ 他のDBと同じく、現状のデータは仮置き（一般知識ベースの暫定値・出典未検証）。
