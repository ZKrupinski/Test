#!/usr/bin/env python3
"""Reconstruct the adjusted, translucent OCTO FEVER swirl as a real bitmap.

The approved 4x4 artist-edited sprite was uploaded as a compact 40px/cell,
24-level-alpha source mask to avoid storing megabytes of redundant transparent
pixels. The *original swirl silhouettes per frame* are retained. This script
only restores pale turquoise pixels and softly upscales them for game display.
The runtime never synthesizes vector whirlpools.
"""
from pathlib import Path
from PIL import Image, ImageFilter
import base64
import zlib
import hashlib

SRC=Path("human-fishing/assets/octopus/bait/octofever_vortex_mask.b64")
OUT=Path("human-fishing/assets/octopus/bait/octofever_vortex_transparent.webp")
SRC_CELL=40
DST_CELL=160
ART_CELL=132
text=SRC.read_text().strip()
assert len(text)==5375, len(text)
assert hashlib.md5(text.encode()).hexdigest()=="4b1ce79f19cb67fa320534baceeb84e8"
raw=zlib.decompress(base64.urlsafe_b64decode(text+"="*((-len(text))%4)))
assert len(raw)==SRC_CELL*SRC_CELL*16,len(raw)
atlas=Image.new("RGBA",(DST_CELL*4,DST_CELL*4),(0,0,0,0))
for i in range(16):
    a=Image.frombytes("L",(SRC_CELL,SRC_CELL),raw[i*SRC_CELL*SRC_CELL:(i+1)*SRC_CELL*SRC_CELL])
    a=a.resize((ART_CELL,ART_CELL),Image.Resampling.LANCZOS)
    a=a.filter(ImageFilter.GaussianBlur(.65))
    # Pale cyan rather than opaque white. The original artist-adjusted alpha
    # field survives the upload; runtime caps additional opacity to 0.50.
    color=Image.new("RGBA",(ART_CELL,ART_CELL),(179,226,239,255))
    color.putalpha(a)
    frame=Image.new("RGBA",(DST_CELL,DST_CELL),(0,0,0,0))
    pad=(DST_CELL-ART_CELL)//2
    frame.alpha_composite(color,(pad,pad))
    atlas.alpha_composite(frame,((i%4)*DST_CELL,(i//4)*DST_CELL))
OUT.parent.mkdir(parents=True,exist_ok=True)
atlas.save(OUT,"WEBP",quality=93,method=5,exact=True)
built=Image.open(OUT).convert("RGBA")
assert built.size==(640,640)
assert all(built.crop((i%4*DST_CELL,i//4*DST_CELL,(i%4+1)*DST_CELL,(i//4+1)*DST_CELL)).getchannel("A").getbbox() for i in range(16))
print("PASS: 16 real bitmap frames, transparent cyan water vortex based on approved edited alpha",OUT.stat().st_size)
