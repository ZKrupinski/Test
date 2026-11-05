#!/usr/bin/env python3
"""Inspect the existing, approved 16-frame player octopus sprites without editing source art."""
from PIL import Image
from pathlib import Path
import json, statistics
ROOT = Path("human-fishing/assets/octopus/atlases")
NAMES = ["purple_idle_v2.webp","purple_excited.webp","purple_toss.webp",
         "purple_gorge.webp","purple_snack.webp","purple_victory.webp",
         "purple_fail_v2.webp","purple_swim.webp"]
for name in NAMES:
    image = Image.open(ROOT / name).convert("RGBA")
    W,H = image.size
    # Odd-size sources (e.g. 1254px) require integer boundaries per cell.
    frames=[]
    for i in range(16):
        x0=int((i%4)*W/4+0.5);x1=int((i%4+1)*W/4+0.5)
        y0=int((i//4)*H/4+0.5);y1=int((i//4+1)*H/4+0.5)
        cw,ch=x1-x0,y1-y0
        f=image.crop((x0,y0,x1,y1))
        a=f.getchannel("A").point(lambda x: 255 if x>=48 else 0)
        box=a.getbbox()
        if not box: raise RuntimeError(f"{name} frame {i} is empty")
        pix=a.load()
        margin=(box[0], box[1], cw-box[2], ch-box[3])
        # Bottommost populated row, insensitive to isolated anti-aliased pixels.
        rows=[y for y in range(ch) if sum(1 for x in range(cw) if pix[x,y])>=max(3,int(cw*.025))]
        foot=max(rows) if rows else box[3]-1
        frames.append(dict(frame=i,box=box,margin=margin,foot=foot,
             width=box[2]-box[0],height=box[3]-box[1],
             edge=sum(1 for v in margin if v<3)))
    widths=[f["width"] for f in frames]
    heights=[f["height"] for f in frames]
    feet=[f["foot"] for f in frames]
    touch=[f["frame"] for f in frames if f["edge"]]
    stats=dict(name=name,source=[W,H],tile=[round(W/4,2),round(H/4,2)],
       width_range=[min(widths),max(widths)],
       height_range=[min(heights),max(heights)],
       foot_range=[min(feet),max(feet)],
       width_variance=round((max(widths)-min(widths))/statistics.median(widths),3),
       height_variance=round((max(heights)-min(heights))/statistics.median(heights),3),
       foot_variance=max(feet)-min(feet),edge_touching_frames=touch)
    print("SHEET",json.dumps(stats,ensure_ascii=False))
    print("FRAMES",json.dumps(frames,ensure_ascii=False,separators=(',',':')))
print("PASS: 8 original sheets, 128 populated frames audited; no source changes.")
