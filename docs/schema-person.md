# 人物データ スキーマ設計 v0.1

戦国武将など「人物」1人分のデータ構造を定義する。
`data/people/<id>.json` に 1 人 1 ファイルで格納する想定。

## 設計方針

- **相互参照は ID で行う**：人物・城・合戦などは文字列 ID で相互リンクする（例：家臣団は名前ではなく `person_id` の配列）。これにより「逆引き検索」「家臣団からの逆リンク」を機械的に生成できる。
- **出典を紐付けられる**：諸説ある情報も扱うため、主要な記述に出典（`sources`）を関連付けられる構造にする。
- **地域情報を持たせる**：史跡・博物館などに `prefecture` / `city` を付け、「地域から探す」機能に使う。
- **時系列は配列**：官位・領地などの「変遷」は、年つきの配列で持つ。
- **未確定・諸説あり**を表現できる：`uncertain: true` や `note` で補足する。

## トップレベル構造

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | string | 一意なID（例：`oda-nobunaga`） |
| `name` | string | 正式・代表的な氏名 |
| `kana` | string | 読みがな |
| `summary` | string | 一言紹介（一覧カード・クイズ・SEO 用の短い要約） |
| `aliases` | Alias[] | 幼名・通称・法名などの別名 |
| `kamon` | Kamon | 家紋 |
| `birth` | DateInfo | 生年（月日は不明可） |
| `death` | DateInfo | 没年 |
| `birthplace` | Place | 出生地 |
| `ranks` | Rank[] | 官位の変遷（時系列） |
| `family` | Relation[] | 親・子・親戚などの関係（家系図の元データ） |
| `lords` | Service[] | 仕えた人（主君） |
| `retainers` | Retainer[] | 家臣団（出仕期間・備考を持てる） |
| `territories` | Territory[] | 領地変遷（時系列） |
| `timeline` | Event[] | 個人の年表 |
| `episodes` | Episode[] | 逸話・エピソード |
| `achievements` | Achievement[] | 成し遂げたこと |
| `reputation` | Reputation[] | 後世の評価（同時代・江戸・明治・昭和・現代の時代別） |
| `references` | Reference[] | 参考書籍（アフィリエイト対象） |
| `spots` | Spot[] | ゆかりの地（城跡・銅像・刀剣・肖像画・博物館・名物など） |
| `graves` | Graves | 墓所（現存・諸説あり・不明・なしを必ず明示する） |
| `images` | Image[] | 人物画像 |
| `sources` | Source[] | 出典の一覧（本文から `sourceId` で参照） |
| `tags` | string[] | 分類タグ（例：`織田家`, `三英傑`） |
| `updatedAt` | string | 最終更新日（ISO 8601） |

## サブ構造の定義

### Alias（別名）
```
{ "type": "幼名" | "通称" | "法名" | "戒名" | "その他", "value": string, "note"?: string }
```

### Kamon（家紋）
```
{ "name": string, "image"?: string }   // 例: 織田木瓜
```

### DateInfo（年月日 / 月日は不明可）
```
{ "year"?: number, "month"?: number, "day"?: number,
  "era"?: string,        // 和暦（例: 天文3年）
  "uncertain"?: boolean, // 諸説あり
  "note"?: string,
  "sourceId"?: string }
```

### Place / Spot（場所）
```
Place = { "name": string, "prefecture"?: string, "city"?: string, "lat"?: number, "lng"?: number }

Spot = {
  "type": "城跡" | "銅像" | "刀剣" | "肖像画" | "博物館" | "資料館" | "名物" | "神社仏閣" | "その他",
  "name": string,
  "prefecture"?: string, "city"?: string,
  "lat"?: number, "lng"?: number,
  "description"?: string,   // 所蔵先の博物館名などもここに記す（例：「福岡市博物館蔵、国宝」）
  "sourceId"?: string
}
```
> `Spot` に地域を持たせることで「地域から探す」「逆引き（この人物→行くべき場所）」の両方に使える。
> 刀剣・肖像画は所蔵する博物館の所在地を `prefecture` / `city` に入れると、その地域からも辿れる。
> **墓所は `graves` フィールドで別管理する**（不明・なしも明示するため）。

### Rank（官位変遷）
```
{ "year"?: number, "title": string, "note"?: string, "sourceId"?: string }
```

### Relation（家系・関係）
```
{ "relation": "父" | "母" | "兄" | "弟" | "姉" | "妹" | "妻" | "子" | "養子" | "叔父" | "従兄弟" | "その他",
  "person_id"?: string,   // サイト内に人物ページがある場合
  "name": string,         // ページが無い場合の表示名
  "note"?: string }
```

### Service（仕えた主君）
```
{ "person_id"?: string, "name": string, "from"?: number, "to"?: number, "note"?: string }
```

### Retainer（家臣）
```
{ "person_id"?: string,   // サイト内に人物ページがある場合
  "name": string,         // ページが無い場合の表示名
  "from"?: number, "to"?: number,   // 出仕〜離反/死去などの期間
  "note"?: string }       // 例: 「本能寺の変で謀反」
```
> 単なる ID 配列にせず期間・備考を持たせることで、離反（例：明智光秀）や出仕時期を記録できる。

### Territory（領地変遷）
```
{ "year"?: number, "name": string, "prefecture"?: string, "note"?: string, "sourceId"?: string }
```

### Event（年表項目）
```
{ "year": number, "month"?: number, "day"?: number,
  "title": string, "description"?: string,
  "battle_id"?: string,   // 合戦ページへのリンク
  "sourceId"?: string }
```

### Episode（逸話）
```
{ "title": string, "body": string, "uncertain"?: boolean, "sourceId"?: string }
```

### Achievement（成し遂げたこと）
```
{ "title": string, "description"?: string, "sourceId"?: string }
```

### Reference（参考書籍・アフィリエイト）
```
{ "title": string, "author"?: string, "publisher"?: string, "year"?: number,
  "isbn"?: string, "affiliateUrl"?: string, "note"?: string }
```

### Image（画像）
```
{ "src": string, "caption"?: string, "credit"?: string, "license"?: string }
```

### Reputation（後世の評価）
```
{ "era": "同時代" | "江戸" | "明治" | "昭和" | "現代" | string,
  "body": string,         // その時代における評価・人物像
  "sourceId"?: string }
```
> 時代ごとに評価がどう変わってきたかを示す。戦国期の同時代評価から、江戸の軍記物、近代の再評価、現代の研究による見直しまで。

### Graves（墓所）
```
{ "status": "現存" | "諸説あり" | "不明" | "なし",   // 必ず記す
  "note"?: string,
  "places"?: [
    { "name": string, "prefecture"?: string, "city"?: string,
      "description"?: string, "sourceId"?: string }
  ] }
```
> 墓所は「わからない」ことも情報。遺骸が見つかっていない・供養塔が各地にある等を `status` と `note` で明示する。

### Source（出典）
```
{ "id": string,          // 本文から sourceId で参照
  "title": string,
  "author"?: string,
  "publisher"?: string,
  "year"?: number,
  "page"?: string,
  "url"?: string,
  "type"?: "史料" | "書籍" | "論文" | "ネット記事" | "その他",  // 出典の種別
  "primary"?: "一次資料" | "二次資料" }   // 史料・書籍の場合に明記
```
> **一次資料**：当事者・同時代に近い立場が残した記録（例：『信長公記』）。
> **二次資料**：後世に編纂・研究された著作（軍記物、研究書など）。
> 論文・ネット記事は `type` で分類し、`primary` は付けなくてよい。

## 今後の拡張予定

- 合戦（battle）・城（castle）・大名家（clan）のスキーマを別途定義し、`*_id` で相互参照する
- 「世代別比較」用に、生没年から自動でグルーピングできるようにする（当面は `birth.year` から算出）
- 「官位変遷」を横断表示して比較する（位階を構造化して高低を比較可能にする案）
- **グループ（group）エンティティ**：武田十六将・徳川四天王など、順序やメンバーが確定した集団を表現する（当面は `tags` で代用）
- **「信長の野望、実は間違ってる？」等の考察**：人物データではなく記事（article）側で管理する方針
