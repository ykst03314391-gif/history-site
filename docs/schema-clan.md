# 大名家（clan）スキーマ設計 v0.1

「織田家」「上杉家」など、大名家を 1 家 1 ファイルで扱う。
`data/clans/<id>.json` に格納し、一覧は `data/clans/index.json` に持つ。

## 目的

- 「大名家から探す」機能の実体。家を選ぶ → その家の説明と所属人物を見る。
- 人物（person）と相互参照する（`members` の `person_id`）。
- 将来、記事の「大名家別の事例」（`relatedClan`）とも連携する。

## 一覧（index.json の各要素）

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | string | 一意なID（例：`oda`） |
| `name` | string | 家名（例：`織田家`） |
| `kana` | string | 読みがな |
| `summary` | string | 一覧カード用の一言紹介 |
| `kamon` | string | 家紋名 |
| `region` | string | 主な勢力圏（例：`尾張・美濃`） |

## 詳細（<id>.json）

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | string | 一覧と対応 |
| `name` | string | 家名 |
| `kana` | string | 読みがな |
| `summary` | string | 一言紹介 |
| `kamon` | string | 家紋名 |
| `base` | Place | 本拠・勢力圏（`name` / `prefecture`） |
| `description` | string[] | 説明本文（段落の配列。1要素＝1段落） |
| `members` | Member[] | 所属する人物（当主・後継・家臣など） |
| `tags` | string[] | タグ |
| `updatedAt` | string | 更新日 |

### Member（所属人物）
```
{ "person_id"?: string,   // 人物ページがあればリンク
  "name": string,         // 表示名（ページが無い場合も）
  "role"?: string }       // 家中での立場（例：当主 / 嫡男 / 家臣（のち離反））
```

## 表示仕様

- 一覧：`clans.html` … `index.json` からカード表示（家を選ぶ）
- 詳細：`clan.html?id=<id>` … 説明本文＋所属人物（人物ページへリンク）

## 今後の拡張予定

- 家系図（`members` の関係を可視化）
- 大名家の年表（家の興亡）
- 記事の「大名家別の事例」を `relatedClan` で紐付け、この家ページに一覧表示する
- 人物データ側にも `clan` を持たせ、人物ページから家ページへ誘導する
