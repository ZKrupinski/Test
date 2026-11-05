#!/usr/bin/env python3
"""Fast first-entrance assets made directly from the approved original sprites.

Never redraw/alter the master sprites. The illustrated hero still has every
16 authored swim frame, and the red friend retains her original 12 swim frames.
Using only red's swim row avoids loading/packing the complete 96-frame atlas
before both octopuses appear together on slow mobile networks.
"""
from PIL import Image
from pathlib import Path
import hashlib

ATLAS=Path("human-fishing/assets/octopus/atlases")
hero_path=ATLAS/"purple_swim.webp"
red_path=ATLAS/"red_all.webp"
hero=Image.open(hero_path).convert("RGBA")
red=Image.open(red_path).convert("RGBA")
assert hero.size==(1254,1254),hero.size
assert red.size==(1254,1254),red.size

# 4 x 4 hero animation — full original pixel dimensions, only WebP encoding
# optimized; lossless transparent alpha, no visual redesign or frame removal.
hero_target=ATLAS/"purple_swim_intro.webp"
hero.save(hero_target,"WEBP",quality=90,method=6,exact=True)

# Extract only row 1 (SWIM) from the untouched 12 x 8 original red atlas.
red_y0=round(red.height/8)
red_y1=round(2*red.height/8)
red_swim=red.crop((0,red_y0,red.width,red_y1))
red_target=ATLAS/"red_intro_swim.webp"
red_swim.save(red_target,"WEBP",quality=90,method=6,exact=True)
assert Image.open(hero_target).size==hero.size
assert Image.open(red_target).size==(1254,157)
for p in (hero_target,red_target):
 assert p.stat().st_size>10000
 print(p, p.stat().st_size,"bytes",hashlib.sha256(p.read_bytes()).hexdigest())
print("PASS: prioritized hero (16 frames) and red cheerleader (12 frames) ready for fast shared entrance")
