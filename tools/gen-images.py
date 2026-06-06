#!/usr/bin/env python3
"""モンスターボール風の画像を標準ライブラリだけで生成する。

外部依存(PIL / ImageMagick 等)を増やさないため、zlib で PNG を自作する。
- assets/ogp.png        : OGP/Twitter カード用 (1200x630)
- icons/icon-192.png     : PWA アイコン (192x192)
- icons/icon-512.png     : PWA アイコン (512x512)
PWA アイコンはマスク(maskable)で四隅が削られても欠けないよう、
ボールをセーフゾーン(中央約72%)に収めて描画する。
"""
import os
import struct
import zlib
import math

# 配色 (index.html のテーマと合わせる)
ACCENT = (31, 111, 235)   # #1f6feb
RED = (238, 58, 58)       # #ee3a3a
WHITE = (255, 255, 255)
INK = (28, 37, 48)        # #1c2530

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def pokeball_pixel(x, y, cx, cy, r, bg):
    """1ピクセルの色を返す。中心(cx,cy)・半径 r のモンスターボールを描く。"""
    dx, dy = x - cx, y - cy
    dist = math.hypot(dx, dy)
    outline = max(2.0, r * 0.05)
    band = r * 0.11
    center_r = r * 0.24
    ring = max(2.0, r * 0.05)
    if dist > r:
        return bg
    if dist >= r - outline:
        return INK
    if dist <= center_r:
        return INK if dist >= center_r - ring else WHITE
    if abs(dy) <= band:
        return INK
    return RED if dy < 0 else WHITE


def render(w, h, cx, cy, r, bg):
    rows = bytearray()
    for y in range(h):
        rows.append(0)  # filter type 0 (None)
        for x in range(w):
            rows.extend(pokeball_pixel(x, y, cx, cy, r, bg))
    return bytes(rows)


def write_png(path, w, h, raw_rgb):
    def chunk(tag, data):
        return (struct.pack(">I", len(data)) + tag + data
                + struct.pack(">I", zlib.crc32(tag + data) & 0xffffffff))
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)  # 8-bit truecolor RGB
    png = (b"\x89PNG\r\n\x1a\n"
           + chunk(b"IHDR", ihdr)
           + chunk(b"IDAT", zlib.compress(raw_rgb, 9))
           + chunk(b"IEND", b""))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(png)
    return len(png)


def main():
    # OGP: 1200x630 のアクセント背景にモンスターボールを中央配置
    w, h = 1200, 630
    raw = render(w, h, w // 2, h // 2, 235, ACCENT)
    size = write_png(os.path.join(ROOT, "assets", "ogp.png"), w, h, raw)
    print(f"assets/ogp.png 生成: {w}x{h}, {size} bytes")

    # PWA アイコン: 正方形。maskable のセーフゾーンに収めるため半径は辺の 0.36 倍
    for s in (192, 512):
        raw = render(s, s, s // 2, s // 2, int(s * 0.36), ACCENT)
        size = write_png(os.path.join(ROOT, "icons", f"icon-{s}.png"), s, s, raw)
        print(f"icons/icon-{s}.png 生成: {s}x{s}, {size} bytes")


if __name__ == "__main__":
    main()
