#!/usr/bin/env python3
"""Install the user's approved normal-sized Fever octopus and ultra-soft whirlpool.

Original 16-frame RGBA illustrations are padded into isolated transparent
512x512 bitmap cells; artwork is never enlarged or distorted during building.
Vortex has additional alpha reduction to remain subtle even when composited.
"""
from pathlib import Path
from io import BytesIO
from urllib.request import urlopen,Request
from PIL import Image
import hashlib

ROOT=Path('human-fishing/assets/octopus/bait')
SOURCES=[
 ('red_lure_fever_natural_v2.webp',
  'https://d2ol7oe51mr4n9.cloudfront.net/user_3KlCHKRIJO34SPkOC5UMUPo7vEp/58a176ed-ec6f-4194-933a-f6f36e56d78a.png',
  '3ede8f14d2fc8d60cbc94292707bd42faf98ff1096c45e54295b9a61cf490ea3',False),
 ('octofever_vortex_soft_v2.webp',
  'https://d2ol7oe51mr4n9.cloudfront.net/user_3KlCHKRIJO34SPkOC5UMUPo7vEp/edffa486-7534-453c-921e-0a32e0f9ce0f.png',
  'c4f4bdfb57c80226a3215b13aecce24f47dc12c18d698522af1f5a2506d7d506',True)
]
CELL=512

def frame_rect(img,n):
    w,h=img.size
    col,row=n%4,n//4
    rnd=lambda v:int(v+.5)
    return(rnd(col*w/4),rnd(row*h/4),rnd((col+1)*w/4),rnd((row+1)*h/4))

def build(filename,url,expected,is_vortex):
    request=Request(url,headers={'User-Agent':'HumanFishing-FeverAsset/1.0'})
    data=urlopen(request,timeout=45).read()
    digest=hashlib.sha256(data).hexdigest()
    assert digest==expected,(filename,'source checksum mismatch',digest)
    src=Image.open(BytesIO(data)).convert('RGBA')
    assert src.size==(1254,1254),src.size
    sheet=Image.new('RGBA',(2048,2048),(0,0,0,0))
    for n in range(16):
        tile=src.crop(frame_rect(src,n))
        # The user's effect is already transparent. Reduce it a little more
        # to guarantee white water never hides the mouth or eyes in gameplay.
        if is_vortex:
            alpha=tile.getchannel('A')
            alpha=alpha.point(lambda v:round(v*.72))
            tile.putalpha(alpha)
        x=(CELL-tile.width)//2
        y=(CELL-tile.height)//2
        assert x>=98 and y>=98
        sheet.alpha_composite(tile,((n%4)*CELL+x,(n//4)*CELL+y))
    ROOT.mkdir(parents=True,exist_ok=True)
    dest=ROOT/filename
    sheet.save(dest,'WEBP',quality=92,method=6,exact=True)
    verify=Image.open(dest).convert('RGBA')
    assert verify.size==(2048,2048)
    for n in range(16):
        b=verify.crop(frame_rect(verify,n)).getchannel('A').getbbox()
        assert b and b[0]>=90 and b[1]>=90 and b[2]<=423 and b[3]<=423,(n,b)
    if is_vortex:assert verify.getchannel('A').getextrema()[1]<=100
    print('PASS',filename,'bytes=',dest.stat().st_size,'soft-vortex=',is_vortex)

for entry in SOURCES:build(*entry)
