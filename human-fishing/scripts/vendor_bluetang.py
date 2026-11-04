#!/usr/bin/env python3
"""Vendor already approved Blue Tang bitmap artwork for HUMAN FISHING.

This script only downloads existing art and resizes it; it never generates
images, calls a creation service, changes fish identity, or synthesizes frames.
Source sheets have exactly 2 columns x 4 rows, 8 frames each.
"""
from __future__ import annotations

from io import BytesIO
from pathlib import Path
from urllib.request import Request, urlopen
from PIL import Image
import json

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "bluetang"
OUT.mkdir(parents=True, exist_ok=True)
CDN = "https://d8j0ntlcm91z4.cloudfront.net/user_3KlCHKRIJO34SPkOC5UMUPo7vEp/"
SOURCES = {
    "idle": "hf_20261104_100641_3c527397-1343-4e2b-b02f-fb725b4ba0a1.png",
    "burst": "hf_20261104_100640_81173288-35ec-4a45-b315-8ab6d65b925d.png",
    "uturn": "hf_20261104_100640_c3aabcfa-9b29-4b5d-a631-d9b50a539448.png",
    "inspect": "hf_20261104_102226_494fe4f5-7b18-4bd8-9251-58f913f0bfcf.png",
    "bite": "hf_20261104_102155_2a21a582-2d75-40aa-8c31-dbf6479ad701.png",
    "hooked": "hf_20261104_102227_4da929b1-c5d7-4bd2-8f60-5e0f2917a075.png",
}
info = {"version": "2.4", "species": "블루탱", "layout": [2, 4],
        "atlases": {}, "asset_type": "raster bitmap", "frame_count_each": 8}
for name, filename in SOURCES.items():
    req = Request(CDN + filename, headers={"User-Agent": "HumanFishingAssetVendor/1.0"})
    with urlopen(req, timeout=90) as response:
        body = response.read()
    if len(body) < 100_000:
        raise RuntimeError(f"{name}: received unexpected payload {len(body)} bytes")
    original = Image.open(BytesIO(body)).convert("RGBA")
    w, h = original.size
    if w != h or w % 2 or h % 4:
        raise RuntimeError(f"{name}: invalid 2x4 atlas dimensions {original.size}")
    tw, th = w // 2, h // 4
    for i in range(8):
        tile = original.crop(((i % 2) * tw, (i // 2) * th,
                              ((i % 2) + 1) * tw, ((i // 2) + 1) * th))
        if tile.getchannel("A").getbbox() is None:
            raise RuntimeError(f"{name}: empty sprite frame {i + 1}")
    resized = original.resize((1024, 1024), Image.Resampling.LANCZOS)
    target = OUT / f"{name}.webp"
    resized.save(target, format="WEBP", quality=89, method=6, exact=True)
    info["atlases"][name] = {"width": 1024, "height": 1024,
                             "tileWidth": 512, "tileHeight": 256,
                             "bytes": target.stat().st_size,
                             "transparent": True}
    print(f"{name}: {original.size} -> 1024x1024 WebP ({target.stat().st_size:,} bytes)")
(OUT / "manifest.json").write_text(
    json.dumps(info, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8")
