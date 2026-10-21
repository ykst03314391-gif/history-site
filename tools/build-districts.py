"""郡の境界 GeoJSON を作る（編集者用・サイト非配信）。

領地が国の一部だけのとき（城代・数郡の拝領など）、国全体ではなく郡だけを塗るためのデータ。

元データ：国土数値情報 行政区域データ 1920年（大正9年）（国土交通省, CC BY 4.0）
  https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N03-2024.html
  市町村ごとのポリゴンに郡名が付いているので、郡ごとにまとめる。
  明治29〜30年ごろの郡の統合後の郡界なので、統合された郡（例：但馬の気多・美含→城崎）は戦国期の郡と一致しない。

使い方：
  python tools/build-districts.py <ダウンロード置き場>
  （置き場に zip が無ければ PREFS の府県分をダウンロードする。リポジトリには入れない）

必要：pyshp / shapely
"""

import json
import os
import sys
import urllib.request
import zipfile

import shapefile
from shapely.geometry import MultiPolygon, Polygon, mapping, shape
from shapely import make_valid, set_precision
from shapely.ops import unary_union

URL = "https://nlftp.mlit.go.jp/ksj/gml/data/N03/N03-1920/N03-200101_{code}_GML.zip"
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "geo", "districts.geojson")
SIMPLIFY = 0.002  # 度（約200m）。国より小さいので国（0.003）よりやや細かくする
PRECISION = 0.001  # 座標の丸め（約100m）

# 府県コード → { 1920年の郡名: 国名 }。府県をまたぐ国があるので、郡ごとに国を対応させる
PREFS = {
    "25": {g: "近江" for g in [
        "滋賀郡", "栗太郡", "野洲郡", "甲賀郡", "蒲生郡", "神崎郡",
        "愛知郡", "犬上郡", "坂田郡", "東浅井郡", "伊香郡", "高島郡",
    ]},
    "28": {
        **{g: "但馬" for g in ["朝来郡", "養父郡", "出石郡", "城崎郡", "美方郡"]},
        **{g: "丹波" for g in ["氷上郡", "多紀郡"]},
        **{g: "淡路" for g in ["津名郡", "三原郡"]},
        **{g: "摂津" for g in ["武庫郡", "川辺郡", "有馬郡"]},
        **{g: "播磨" for g in [
            "明石郡", "加古郡", "印南郡", "飾磨郡", "神崎郡", "揖保郡", "赤穂郡",
            "佐用郡", "宍粟郡", "多可郡", "加西郡", "加東郡", "美嚢郡",
        ]},
    },
    "24": {
        **{g: "伊勢" for g in [
            "桑名郡", "員弁郡", "三重郡", "鈴鹿郡", "河芸郡", "安濃郡",
            "一志郡", "飯南郡", "多気郡", "度会郡",
        ]},
        **{g: "伊賀" for g in ["阿山郡", "名賀郡"]},
        "志摩郡": "志摩",
        **{g: "紀伊" for g in ["北牟婁郡", "南牟婁郡"]},
    },
    "27": {
        **{g: "摂津" for g in ["西成郡", "東成郡", "三島郡", "豊能郡"]},
        **{g: "河内" for g in ["北河内郡", "中河内郡", "南河内郡"]},
        **{g: "和泉" for g in ["泉北郡", "泉南郡"]},
    },
    "29": {g: "大和" for g in [
        "添上郡", "山辺郡", "生駒郡", "磯城郡", "宇陀郡", "高市郡",
        "北葛城郡", "南葛城郡", "宇智郡", "吉野郡",
    ]},
    "30": {g: "紀伊" for g in [
        "海草郡", "那賀郡", "伊都郡", "有田郡", "日高郡", "西牟婁郡", "東牟婁郡",
    ]},
    "33": {
        **{g: "備前" for g in ["御津郡", "赤磐郡", "和気郡", "邑久郡", "上道郡", "児島郡"]},
        **{g: "備中" for g in [
            "都窪郡", "浅口郡", "小田郡", "後月郡", "吉備郡", "上房郡", "川上郡", "阿哲郡",
        ]},
        **{g: "美作" for g in ["真庭郡", "苫田郡", "勝田郡", "英田郡", "久米郡"]},
    },
    "38": {g: "伊予" for g in [
        "宇摩郡", "新居郡", "周桑郡", "越智郡", "温泉郡", "伊予郡",
        "喜多郡", "上浮穴郡", "西宇和郡", "東宇和郡", "北宇和郡", "南宇和郡",
    ]},
}

# 郡に属さない市は、もとの郡に戻す（八部郡は1896年に武庫郡へ統合）
CITIES = {
    "大津市": "滋賀郡", "姫路市": "飾磨郡", "神戸市": "武庫郡",
    "尼崎市": "川辺郡", "明石市": "明石郡", "奈良市": "添上郡",
    "津市": "安濃郡", "四日市市": "三重郡", "宇治山田市": "度会郡",
    "堺市": "泉北郡", "和歌山市": "海草郡", "岡山市": "御津郡", "松山市": "温泉郡",
}
# 大阪市は西成・東成の両郡（摂津）にまたがるので、どちらにも入れない
SKIP = {"所属未定", "大阪市"}


def fetch(code, zip_dir):
    dest = os.path.join(zip_dir, f"N03-200101_{code}_GML.zip")
    if not os.path.exists(dest):
        urllib.request.urlretrieve(URL.format(code=code), dest)
    return dest


def read_shapes(zip_path):
    with zipfile.ZipFile(zip_path) as z:
        base = next(n for n in z.namelist() if n.endswith(".shp"))[:-4]
        r = shapefile.Reader(
            shp=z.open(base + ".shp"), shx=z.open(base + ".shx"), dbf=z.open(base + ".dbf"),
            encoding="cp932",
        )
        for sr in r.iterShapeRecords():
            yield sr.record, shape(sr.shape.__geo_interface__)


def tidy(geom):
    geom = geom.simplify(SIMPLIFY, preserve_topology=True)
    geom = make_valid(set_precision(geom, PRECISION))
    geom = unary_union([g for g in getattr(geom, "geoms", [geom]) if g.geom_type in ("Polygon", "MultiPolygon")])
    if isinstance(geom, Polygon):
        geom = MultiPolygon([geom])
    return geom


def main():
    zip_dir = sys.argv[1] if len(sys.argv) > 1 else "n03-1920"
    os.makedirs(zip_dir, exist_ok=True)
    features = []
    for code, districts in PREFS.items():
        parts = {}
        for rec, geom in read_shapes(fetch(code, zip_dir)):
            gun = rec[2] or CITIES.get(rec[3])
            if gun not in districts:
                if rec[2] not in SKIP:
                    print("対応する国がない:", list(rec), file=sys.stderr)
                continue
            parts.setdefault(gun, []).append(geom)
        for gun, geoms in parts.items():
            name = districts[gun] + "国" + gun
            features.append({
                "type": "Feature",
                "properties": {"name": name},
                "geometry": mapping(tidy(unary_union(geoms))),
            })
            print(name, file=sys.stderr)
    fc = {
        "type": "FeatureCollection",
        "attribution": "国土数値情報 行政区域データ 1920年（国土交通省, CC BY 4.0）を郡ごとに統合・簡略化",
        "features": features,
    }
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(fc, f, ensure_ascii=False, separators=(",", ":"))


if __name__ == "__main__":
    main()
