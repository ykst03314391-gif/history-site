# 記事（article）スキーマ設計 v0.1

考察・新説・コラム・旅記事など、**管理人の視点や意見を打ち出す読み物**を扱う。
これは Wikipedia との最大の差別化点（「主観・考察」）を担うコンテンツタイプ。

## 構成方針

記事は「メタデータ」と「本文」を分けて管理する。

- **本文**：`data/articles/<id>.md`（Markdown 1 記事 1 ファイル）
  - 執筆・編集のしやすさを優先し Markdown で書く
  - 表示時に `marked`（CDN）で HTML へ変換
- **メタデータ**：`data/articles/index.json` の配列に集約
  - 一覧表示・詳細ページの見出し・関連人物リンクに使う
  - 本文とは別に持つことで、一覧生成やパースが軽くなる

## メタデータ（index.json の各要素）

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | string | 一意なID（例：`tedorigawa-kenshin`）。`<id>.md` と対応 |
| `title` | string | 記事タイトル |
| `category` | string | 分類：`考察` / `新説` / `コラム` / `旅・史跡` / `ゲーム考察` など |
| `summary` | string | 一覧・SEO 用の要約 |
| `date` | string | 公開日（YYYY-MM-DD） |
| `updatedAt` | string | 更新日（YYYY-MM-DD、任意） |
| `author` | string | 執筆者（任意） |
| `relatedPeople` | string[] | 関連する人物の `person_id`（DB連携。詳細ページで相互リンク） |
| `relatedBattles` | string[] | 関連する合戦の `battle_id`（任意、将来用） |
| `tags` | string[] | タグ（任意） |
| `draft` | boolean | 下書き（true の記事は一覧に出さない、任意） |

## 本文（Markdown）の書き方の指針

差別化の観点から、記事には以下を意識して書く。

- **切り口・主張を明確に**：通説の紹介にとどめず、「私はこう考える」を書く
- **出典を示す**：主張の根拠となる史料・書籍を本文末の「参考文献」に列挙する
- **諸説を尊重**：断定を避けるべき箇所は「〜とも言われる」「近年は〜という見方もある」と明記
- **DBへ誘導**：登場人物は人物ページへリンクする
  例：`[上杉謙信](person.html?id=uesugi-kenshin)`

## 表示仕様

- 記事一覧：`articles.html` … `index.json` からカード表示（`draft` は除外）
- 記事詳細：`article.html?id=<id>` … メタを `index.json` から引き、本文 `<id>.md` を取得して表示
  - 冒頭にタイトル・カテゴリ・日付
  - 末尾に「関連人物」（`relatedPeople` を人物ページへリンク）

## 今後の拡張予定

- カテゴリ別の絞り込み・一覧
- 関連合戦（`relatedBattles`）ページとの相互リンク
- 記事から人物、（将来の）合戦・城・地域ページへの相互参照を強化
