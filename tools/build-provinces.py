"""令制国（旧国）の境界 GeoJSON を作る（編集者用・サイト非配信）。

元データ：Asukana/Ryoseikoku_20230626_TSV（CC0）
  https://github.com/Asukana/Ryoseikoku_20230626_TSV
  ズーム10の地図タイル（256×256マス）ごとに「国番号」を並べたラスター。1868年時点の国界。
  → 国ごとに輪郭をなぞってポリゴン化し、簡略化して assets/geo/provinces.geojson に書き出す。

使い方：
  python tools/build-provinces.py <タイル置き場>
  （タイル置き場が空なら GitHub から 665 枚・約100MB をダウンロードする。リポジトリには入れない）

必要：numpy / shapely / scikit-image
"""

import json
import math
import os
import re
import subprocess
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor

import numpy as np
from shapely.geometry import MultiPolygon, Polygon, mapping
from shapely import make_valid, set_precision
from shapely.ops import unary_union
from skimage.measure import find_contours

REPO = "Asukana/Ryoseikoku_20230626_TSV"
RAW = f"https://raw.githubusercontent.com/{REPO}/main/"
Z = 10
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "geo", "provinces.geojson")
SIMPLIFY = 0.003  # 度（約300m）。表示用なのでこの程度で十分
PRECISION = 0.001  # 座標の丸め（約100m）
HOLE_MIN = 0.005  # これより小さい穴（度²、約50km²）は埋める

# 国番号 → 国名。番号は元データに凡例が無いため、各国の代表地点（国府・城下町など）を引いて同定した。
# 67（陸奥の大部分）と 69（青森県域）は 1868 年の陸奥分割にかかわる区分なので、戦国期の「陸奥」として統合する。
# 89（伊豆諸島）は伊豆に含める。70（蝦夷地）・71（千島）・90（トカラ列島）は対象外。
PROVINCES = {
    36: "山城", 34: "大和", 35: "河内", 37: "和泉", 38: "摂津",
    48: "伊賀", 47: "伊勢", 46: "志摩", 49: "尾張", 50: "三河", 51: "遠江", 52: "駿河",
    54: "甲斐", 53: "伊豆", 55: "相模", 56: "武蔵", 59: "安房", 58: "上総", 57: "下総", 60: "常陸",
    61: "近江", 62: "美濃", 63: "飛騨", 64: "信濃", 65: "上野", 66: "下野", 67: "陸奥", 68: "出羽",
    39: "若狭", 40: "越前", 41: "加賀", 43: "能登", 42: "越中", 44: "越後", 45: "佐渡",
    27: "丹波", 26: "丹後", 25: "但馬", 24: "因幡", 22: "伯耆", 21: "出雲", 20: "石見", 23: "隠岐",
    19: "播磨", 17: "美作", 18: "備前", 16: "備中", 15: "備後", 14: "安芸", 13: "周防", 12: "長門",
    33: "紀伊", 32: "淡路", 30: "阿波", 31: "讃岐", 28: "伊予", 29: "土佐",
    8: "筑前", 6: "筑後", 9: "豊前", 5: "豊後", 7: "肥前", 4: "肥後", 3: "日向", 2: "大隅", 1: "薩摩",
    10: "壱岐", 11: "対馬",
}
MERGE = {69: 67, 89: 53}


def download(tile_dir):
    tree = json.loads(subprocess.check_output(
        ["gh", "api", f"repos/{REPO}/git/trees/main?recursive=1"], text=True))
    paths = [t["path"] for t in tree["tree"] if t["path"].endswith(".tsv")]

    def get(path):
        dest = os.path.join(tile_dir, os.path.basename(path))
        if not os.path.exists(dest):
            urllib.request.urlretrieve(RAW + path, dest)

    with ThreadPoolExecutor(12) as ex:
        list(ex.map(get, paths))


def load_mosaic(tile_dir):
    tiles = {}
    for name in os.listdir(tile_dir):
        m = re.match(rf"zxy_{Z}_(\d+)_(\d+)\.tsv$", name)
        if m:
            tiles[(int(m[1]), int(m[2]))] = os.path.join(tile_dir, name)
    x0 = min(x for x, _ in tiles)
    y0 = min(y for _, y in tiles)
    w = (max(x for x, _ in tiles) - x0 + 1) * 256
    h = (max(y for _, y in tiles) - y0 + 1) * 256
    grid = np.zeros((h, w), dtype=np.uint8)
    for (x, y), path in tiles.items():
        with open(path, encoding="utf-8") as f:
            a = np.array([line.rstrip("\n").split("\t") for line in f], dtype=np.uint8)
        grid[(y - y0) * 256:(y - y0 + 1) * 256, (x - x0) * 256:(x - x0 + 1) * 256] = a
    for src, dst in MERGE.items():
        grid[grid == src] = dst
    return grid, x0 * 256, y0 * 256


def to_lnglat(rows, cols, ox, oy):
    n = 256 * 2 ** Z
    # find_contours はマスの中心を整数座標とするので、+0.5 でマス中心の地理座標に合わせる
    X = ox + cols + 0.5
    Y = oy + rows + 0.5
    lng = X / n * 360 - 180
    lat = np.degrees(np.arctan(np.sinh(math.pi * (1 - 2 * Y / n))))
    return np.column_stack([lng, lat])


def province_geometry(grid, pid, ox, oy):
    ys, xs = np.nonzero(grid == pid)
    r0, c0 = ys.min(), xs.min()
    # 外周を1マス空けて、輪郭が必ず閉じるようにする
    mask = np.pad(grid[r0:ys.max() + 1, c0:xs.max() + 1] == pid, 1).astype(float)
    geom = Polygon()
    # 輪郭は互いに交わらないので、偶奇規則（対称差）で穴あき・飛び地を正しく組み立てられる
    for c in find_contours(mask, 0.5):
        if len(c) < 4:
            continue
        ring = to_lnglat(c[:, 0] + r0 - 1, c[:, 1] + c0 - 1, ox, oy)
        poly = Polygon(ring).buffer(0)
        if not poly.is_empty:
            geom = geom.symmetric_difference(poly)
    if isinstance(geom, Polygon):
        geom = MultiPolygon([geom])
    # ラスター由来の小さな穴（湖沼・河川・判定の揺れ）は埋める
    geom = MultiPolygon([
        Polygon(p.exterior, [r for r in p.interiors if Polygon(r).area > HOLE_MIN])
        for p in geom.geoms
    ])
    geom = geom.simplify(SIMPLIFY, preserve_topology=True)
    if isinstance(geom, Polygon):
        geom = MultiPolygon([geom])
    # 簡略化で潰れた小島は落とす
    geom = unary_union([g for g in geom.geoms if g.area > 1e-6])
    # 丸めても自己交差しないよう、精度を落とす処理は shapely に任せる
    geom = make_valid(set_precision(geom, PRECISION))
    geom = unary_union([g for g in getattr(geom, "geoms", [geom]) if g.geom_type in ("Polygon", "MultiPolygon")])
    if isinstance(geom, Polygon):
        geom = MultiPolygon([geom])
    return geom



def main():
    tile_dir = sys.argv[1] if len(sys.argv) > 1 else "ryoseikoku-tiles"
    os.makedirs(tile_dir, exist_ok=True)
    if not any(n.endswith(".tsv") for n in os.listdir(tile_dir)):
        download(tile_dir)
    grid, ox, oy = load_mosaic(tile_dir)
    features = []
    for pid, name in PROVINCES.items():
        geom = province_geometry(grid, pid, ox, oy)
        features.append({
            "type": "Feature",
            "properties": {"name": name + "国"},
            "geometry": mapping(geom),
        })
        print(name, file=sys.stderr)
    fc = {
        "type": "FeatureCollection",
        "attribution": f"令制国データ: {REPO} (CC0, 1868年時点の国界)",
        "features": features,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(fc, f, ensure_ascii=False, separators=(",", ":"))


if __name__ == "__main__":
    main()
