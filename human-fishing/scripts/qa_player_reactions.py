#!/usr/bin/env python3
"""Validate the three new 4x4 octopus player action sheets and transition pose."""
from PIL import Image, ImageChops, ImageStat
from pathlib import Path
root=Path("human-fishing/assets/octopus/player")
names=("mouth_open","swallow_success","swallow_failure")
images={}
for name in names:
    im=Image.open(root/(name+".webp")).convert("RGBA")
    assert im.size==(1536,1536),(name,im.size)
    assert im.getchannel("A").getextrema()==(0,255),(name,"missing transparent margins")
    for frame in range(16):
        tile=im.crop(((frame%4)*384,(frame//4)*384,
                      (frame%4+1)*384,(frame//4+1)*384))
        assert tile.getchannel("A").getbbox(),(name,frame,"empty")
    images[name]=im
last=images["mouth_open"].crop((1152,1152,1536,1536))
for name in names[1:]:
    first=images[name].crop((0,0,384,384))
    diff=ImageChops.difference(last,first)
    mean=ImageStat.Stat(diff).mean
    assert max(mean[:3])<3.0,(name,"open->response pose mismatch",mean)
    assert mean[3]<.01,(name,"transition alpha mismatch",mean[3])
print("PASS: three 16-frame purple octopus sprites, transparent margins and matching shared handoff poses")
