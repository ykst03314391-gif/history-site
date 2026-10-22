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
| `category` | string? | `"other"` で武将ではない人物（武将の家族など）。無指定は武将。`index.json` にも同じ値を書く |
| `summary` | string | 一言紹介（一覧カード・クイズ・SEO 用の短い要約） |
| `aliases` | Alias[] | 幼名・通称・法名などの別名 |
| `nameHistory` | NameEntry[] | 呼び名の変遷（史料での呼ばれ方を時系列で） |
| `kamon` | Kamon | 家紋 |
| `birth` | DateInfo | 生年（月日は不明可） |
| `death` | DateInfo | 没年 |
| `birthplace` | Place | 出生地 |
| `ranks` | Rank[] | 官位の変遷（時系列） |
| `family` | Relation[] | 親・子・親戚などの関係（家系図の元データ） |
| `lords` | Service[] | 仕えた人（主君） |
| `retainers` | Retainer[] | 家臣団（出仕期間・備考を持てる） |
| `yoriki` | Retainer[] | 与力（主君から付けられた大名。家臣ではないので家臣団と分ける）。形は Retainer と同じ |
| `yorikiNote` | { text: string, sourceId?: string } | 与力欄の補足（名前の分からない与力がいたことなど）。一覧の下に出す |
| `territories` | Territory[] | 領地変遷（時系列） |
| `timeline` | Event[] | 個人の年表 |
| `episodes` | Episode[] | 逸話・エピソード |
| `achievements` | Achievement[] | 成し遂げたこと |
| `reputation` | Reputation[] | 人物評価（存命時・死去後、または同時代・江戸・明治・昭和・現代の時代別） |
| `references` | Reference[] | 参考書籍（アフィリエイト対象） |
| `portrait` | Portrait? | 肖像画。見出しの右に表示（下記） |
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

### Portrait（肖像画）
```
Portrait = {
  "src": string,            // assets/img/portraits/<person_id>.jpg（幅480px程度のJPEG）
  "caption"?: string,       // 作品名（例：「豊臣秀長像」「伝 狩野光信筆」）
  "holder"?: string,        // 所蔵（寺社・博物館など。模写なら模写本の所蔵と原本の所蔵を併記）
  "note"?: string,          // 補足（「江戸時代の浮世絵（想像図）」「部分」など）
  "source": { "name": string, "url": string },   // 入手元（Wikimedia Commons のファイルページなど）
  "license": string         // 「パブリックドメイン」など
}
```
> 使うのは**著作権の切れた平面の作品（江戸時代以前の肖像画・浮世絵）**だけ。立体物の写真や近現代の作品は使わない。
> 同時代の肖像でないもの（後世の想像図）は `note` に必ず書く。
> 肖像画が見つからない人物は `portrait` を省く。人物ページと一覧には「画像なし」の絵（`assets/img/portraits/noimage.svg`）を自動で表示する。
> 一覧（`data/people/index.json`）には `thumb` に顔を切り出した正方形サムネイル（`assets/img/portraits/thumbs/<person_id>.jpg`、160×160）を書くと、武将一覧のカード右上に丸く表示する。

> 一覧（`data/people/index.json`）の `category` が `"other"` の人物は武将一覧（`people.html`）に出さず、「その他の人物」（`others.html`）に並べる。どちらも読み（`kana`）の50音順で、行ごとに見出しを付ける。

> 一覧（`data/people/index.json`）の生没年は `birthYear`/`deathYear`（西暦）に加え、`birthEra`/`deathEra` に個別JSONの `birth.era`/`death.era` と同じ和暦を書く。カードには「天文9年（1540） 〜 天正19年1月22日（1591）」の形で表示する（和暦が無ければ西暦のみ）。

### Place / Spot（場所）
```
Place = { "name": string, "prefecture"?: string, "city"?: string, "lat"?: number, "lng"?: number }

Spot = {
  "type": "城跡" | "銅像" | "刀剣" | "肖像画" | "博物館" | "資料館" | "名物" | "神社仏閣" | "その他",
  "name": string,
  "prefecture"?: string, "city"?: string,
  "lat"?: number, "lng"?: number,
  "description"?: string,   // 所蔵先の博物館名などもここに記す（例：「福岡市博物館蔵、国宝」）
  "sourceId"?: string,
  "castle_id"?: string      // 城DBに詳細ページがある城跡なら、名前を城ページへのリンクにする
}
```
> `Spot` に地域を持たせることで「地域から探す」「逆引き（この人物→行くべき場所）」の両方に使える。
> 刀剣・肖像画は所蔵する博物館の所在地を `prefecture` / `city` に入れると、その地域からも辿れる。
> **墓所は `graves` フィールドで別管理する**（不明・なしも明示するため）。

### NameEntry（呼び名の変遷）
```
{ "year"?: number, "era"?: string,   // era は和暦や「幼少期」など。year が無ければ era だけを出す
  "value": string, "note"?: string, "sourceId"?: string, "uncertain"?: boolean }
```
> `nameHistory` に時系列で並べ、「呼び名の変遷」としてヘッダー（基本情報を含む枠）の次に出す。史料がその時期に実際どう呼んでいるかを書く（`aliases` は一覧、こちらは移り変わり）。

### Rank（官位変遷）
```
{ "year"?: number, "title": string, "note"?: string, "sourceId"?: string }
```

### Relation（家系・関係）
```
{ "relation": "父" | "母" | "兄" | "弟" | "姉" | "妹" | "妻" | "子" | "養子" | "叔父" | "従兄弟" | "その他",
  "person_id"?: string,   // サイト内に人物ページがある場合
  "name": string,         // ページが無い場合の表示名
  "note"?: string,
  "article_id"?: string } // この関係を論じた考察記事の id。注記の横に「考察」リンクを出す。記事が下書き（draft）の間はリンクにせず「考察（執筆中）」と予告する
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
  "note"?: string,        // 例: 「本能寺の変で謀反」
  "sourceId"?: string }   // 家臣だったことの根拠（sources の id）
```
> 単なる ID 配列にせず期間・備考を持たせることで、離反（例：明智光秀）や出仕時期を記録できる。
> 与力（例：秀長に付けられた筒井定次・長宗我部元親）は `retainers` に入れず `yoriki` に分ける。付けられた側の人物では、`lords` にその主君を書く。

### Territory（領地変遷）
```
{ "year"?: number, "name": string, "prefecture"?: string | string[], "note"?: string, "sourceId"?: string,
  "province"?: string | string[],   // 地図で塗る国（例 "大和国"）。国全体を領したとき
  "district"?: string | string[],   // 地図で塗る郡（例 "但馬国朝来郡"）。国の一部だけのときは province より優先して郡だけを塗る
                                    // 郡と国全体が混じるときは国名も並べる（例 ["伊勢国安濃郡", "伊賀国"]）
  "until"?: number,                 // 手放した・移った年。地図では淡く点線で描き、一覧は「1580〜1585年」と出す（死去まで持っていたなら書かない）
  "untilNote"?: string,             // 手放した事情（国替え・改易など）と根拠
  "mapNote"?: string,               // 地図の補足（塗らなかった範囲とその理由など）。その時点の地図の説明に添える
  "place"?: string, "lat"?: number, "lng"?: number, "approx"?: boolean }   // ピンの地点
```
> 同じ時に一緒に与えられた国・郡は、項目を分けずに1つの項目にまとめる（地図で同じ番号・同じ色になる）。
> 国の一部しか領していない（城代・数郡の拝領など）のに province だけを入れると国全体が塗られてしまう。その場合は district で郡を指定する。郡名は `assets/geo/districts.geojson` の name（1920年の郡名）に合わせる。

### Event（年表項目）
```
{ "year": number, "month"?: number, "day"?: number,
  "title": string, "description"?: string,
  "battle_id"?: string,   // 合戦ページへのリンク
  "castle_id"?: string,   // 城ページへのリンク（城代・城主就任など。battle_id があればそちらを優先）
  "links"?: [ { "text": string, "person_id"?: string, "battle_id"?: string, "castle_id"?: string } ],
                          // description の中の語をサイト内ページへのリンクにする（各語の最初の1か所）
  "sourceId"?: string }
```
> 例：`"links": [{ "text": "浅井新八", "person_id": "asai-shinpachi" }]` で、説明文の「浅井新八」が人物ページへのリンクになる。

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

### Reputation（人物評価）
```
{ "era": "存命時" | "死去後" | "同時代" | "江戸" | "明治" | "昭和" | "現代" | string,
  "title"?: string,       // 項目の小見出し（例：「熊野の木の一件」）
  "body": string,         // その時代における評価・人物像
  "sourceId"?: string }
```
> 時代ごとに評価がどう変わってきたかを示す。戦国期の同時代評価から、江戸の軍記物、近代の再評価、現代の研究による見直しまで。
> 「存命時」「死去後」の2区分で書いてもよい（豊臣秀長など）。同じ era が続く項目はラベルを最初の1つだけ表示するので、出典ごとに項目を分けて並べる。

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
