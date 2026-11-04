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

# Eight additional 8-frame atlases are reconstructed with raster-image
# cropping, rotation, centering and squash from the six approved originals.
# These are deliberately marked as derived, not claimed as newly drawn frames.
DERIVED = {
    "swim": ("idle", [0, 1, 2, 0, -1, -2, -1, 0]),
    "notice": ("idle", [0, 0, 2, 5, 7, 6, 3, 0]),
    "graze": ("burst", [0, -5, -19, -29, -11, 9, 3, 0]),
    "lift": ("hooked", [0, 10, 17, 28, 40, 52, 63, 70]),
    "last_resist": ("hooked", [-20, 10, 22, -24, 15, -9, -28, 10]),
    "slip": ("burst", [19, 28, 7, -21, -29, -10, 9, 0]),
    "reentry": ("burst", [-60, -53, -47, -37, -29, -17, -8, 0]),
    "flee": ("burst", [3, 0, -6, 0, 5, 0, -3, 0]),
}
for action, (parent, angles) in DERIVED.items():
    src = Image.open(OUT / f"{parent}.webp").convert("RGBA")
    atlas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    for i in range(8):
        # Hooked source has damaged top/bottom borders in some original
        # frames. Use its two intact key poses as the retargeting base.
        source_i = (1 if i % 2 == 0 else 3) if parent == "hooked" else i
        left = (source_i % 2) * 512
        top = (source_i // 2) * 256
        tile = src.crop((left, top, left + 512, top + 256))
        alpha_bbox = tile.getchannel("A").getbbox()
        if alpha_bbox is None:
            raise RuntimeError(f"{action}: missing source frame {i + 1}")
        pad = 3
        x0,y0,x1,y1 = alpha_bbox
        body = tile.crop((max(0,x0-pad),max(0,y0-pad),
                          min(512,x1+pad),min(256,y1+pad)))
        angle = angles[i]
        if angle:
            body = body.rotate(angle, Image.Resampling.BICUBIC, expand=True)
        # Every frame must fit the longer rectangular game sprite cell
        # with clear transparent gutters on all four edges.
        limit_w, limit_h = 408, 199
        ratio = min(limit_w / body.width, limit_h / body.height)
        target_w = max(1,round(body.width*ratio))
        target_h = max(1,round(body.height*ratio))
        body = body.resize((target_w,target_h), Image.Resampling.LANCZOS)
        frame = Image.new("RGBA", (512,256), (0,0,0,0))
        dx = [0,2,4,6,5,3,1,0][i] if action == "slip" else 0
        dy = [0,-3,-4,2,5,4,2,0][i] if action == "graze" else 0
        frame.alpha_composite(body,((512-target_w)//2+dx,(256-target_h)//2+dy))
        bb = frame.getchannel("A").getbbox()
        if bb is None or min(bb[0],bb[1],512-bb[2],256-bb[3]) < 20:
            raise RuntimeError(f"{action}: output frame {i+1} has unsafe cropping")
        atlas.alpha_composite(frame,((i%2)*512,(i//2)*256))
    file = OUT / f"{action}.webp"
    atlas.save(file,format="WEBP",quality=89,method=6,exact=True)
    info["atlases"][action] = {"width":1024,"height":1024,
        "tileWidth":512,"tileHeight":256,"bytes":file.stat().st_size,
        "transparent":True,"derivedFrom":parent,
        "method":"bitmap pose retargeting; 8 individual frames"}
    print(f"{action}: derived {parent} -> 1024x1024 WebP ({file.stat().st_size:,} bytes)")
info["actions_total"] = len(info["atlases"])
info["frames_total"] = 8 * len(info["atlases"])
(OUT / "README_KO.txt").write_text(
    "블루탱 카툰 비트맵: 14동작 x 8프레임 = 112프레임\n"
    "각 동작별 2열 x 4행 / 1024x1024 WebP / 개별 셀 512x256 / 투명 배경\n"
    "원본 원화 6종: idle, burst, uturn, inspect, bite, hooked\n"
    "기존 힉스필드 원화에 기반한 비트맵 재구성 8종: "
    "swim, notice, graze, lift, last_resist, slip, reentry, flee\n"
    "새로운 외부 이미지 생성 작업 없이 기존 원화를 리타게팅했습니다.\n",
    encoding="utf-8")

(OUT / "manifest.json").write_text(
    json.dumps(info, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8")
