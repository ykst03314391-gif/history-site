# トピック（topic）スキーマ設計 v0.1 ― 最新情報（B）の軽量フォーマット

コンセプトの **B「仕入れる（最新情報）」** を担う軽量コンテンツ。
新説・お出かけ（展示/イベント）・ゲーム情報を「**速報＋ひとこと見立て**」で扱い、深掘りは考察記事（A）へ、詳細は DB（人物・史跡）へ流す。

> 位置づけ：B は**入口・フック**であって看板ではない（看板は常に A＝考察・視点）。
> 詳細は README「看板は『視点』、最新情報は『呼び込み』」を参照。

## 記事（article）との違い

| | article（考察・A） | topic（最新情報・B） |
|---|---|---|
| 目的 | 深掘り・視点（看板） | 速報・鮮度（呼び込み） |
| 本文 | `data/articles/<id>.md`（長文） | **本文ファイルなし**。`index.json` のフィールドだけで完結 |
| 必須の核 | 切り口・主張 | **`take`（見立て）＝管理人のひとこと** |
| 動線 | それ自体が目的地 | **A（考察）・DB へ誘導するのが役目** |

## 設計方針（＝差別化をスキーマで守る）

1. **`take`（見立て）は必須**。「単なる転載をしない」という原則をデータ構造で強制する。速報（`summary`）と見立て（`take`）を必ず分ける。
2. **一次情報源 `source` を必ず持つ**（公式サイト・ニュース等）。速報は出どころを示す。
3. **A への動線を推奨**：`relatedArticles`（深掘り）／`relatedPeople`（DB）で必ずどこかへ流す。
4. **軽い**：本文 md は作らない。定期・不定期の収集をすばやく記事化できるように。

## トップレベル構造（`data/topics/index.json` の `topics[]`）

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | string | 一意なID（例：`tedorigawa-reassessment`） |
| `title` | string | 速報の見出し |
| `stream` | string | `新説` / `お出かけ` / `ゲーム`（B の3ストリーム） |
| `date` | string | 掲載・収集日（YYYY-MM-DD） |
| `summary` | string | **速報**：何が起きた／何が新しいか（事実ベース） |
| `take` | string | **見立て（必須）**：管理人のひとこと。ここが差別化 |
| `source` | Source | 一次情報源 `{ "name": string, "url": string }` |
| `relatedArticles` | string[] | 深掘り考察記事の `id`（→ A への動線） |
| `relatedPeople` | string[] | 関連人物の `person_id`（→ DB への動線） |
| `relatedBattles` | string[] | 関連合戦の `battle_id`（任意） |
| `period` | Period | お出かけの会期 `{ "from": string, "to": string }`（任意） |
| `place` | Place | お出かけの場所 `{ "name", "prefecture", "city" }`（任意） |
| `platform` | string | ゲームのプラットフォーム（任意） |
| `tags` | string[] | タグ（任意） |
| `draft` | boolean | 下書き（true は一覧に出さない、任意） |

## ストリーム別の使い分け

- **新説**：話題の新説・新研究・新刊を追い、`take` で評価。`relatedArticles`/`relatedPeople` で深掘りへ。
- **お出かけ**：博物館の特別展・戦国イベント等の**会期もの**。`period`（会期）と `place`（場所）を入れ、`place.prefecture` で将来「地域から探す」と連携。`relatedPeople` でその人物の展示だと示す。
- **ゲーム**：信長の野望など新作・大型アップデート。`platform` を入れ、`take` は**実像に照らした見立て**（例：「この能力評価、実像とズレてない？」）で A の企画（"信長の野望、実は間違ってる？"）へ接続。

## 表示仕様

- 一覧：`topics.html` … 新着順フィード。stream 別に絞り込み。`draft` は除外。
- カード：stream バッジ・日付・タイトル・`summary`（速報）・**「見立て」欄（強調表示）**・`source` への外部リンク・`relatedArticles`/`relatedPeople` への「→ 深掘り／人物」リンク。会期ものは `period`・`place` を表示。
- トップ：`index.html` に「最新トピック」セクションを**考察の下（＝A が看板）**に置き、最新数件を表示。

## 今後の拡張

- お出かけの `place.prefecture` を「地域から探す」に統合（今そこで何が見られるか）。
- 収集の定期運用（スケジュール実行で候補を集め、`take` を付けて公開）。
