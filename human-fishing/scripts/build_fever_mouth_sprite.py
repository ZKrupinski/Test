#!/usr/bin/env python3
"""Install the user-approved 16-frame red bait Octo Fever bitmap.

Copies *original pixels*, never scales down or repaints illustration.
Pads each 314x314 source cel into a 512x512 transparent cel, allowing the
enormous opening mouth and water droplets to stay inside its own frame.
The page renders the entire 16 frames as bitmap art; no drawn tentacles.
"""
from io import BytesIO
from pathlib import Path
from PIL import Image
from urllib.request import Request, urlopen
import hashlib

URL="https://d2ol7oe51mr4n9.cloudfront.net/user_3KlCHKRIJO34SPkOC5UMUPo7vEp/4c37a0fb-a489-4bcd-8dd7-05625bf7fcf2.png"
EXPECTED="046ec8e7f220ee3050f4c4047ba1db6ba1b8550e47296c6416c65cc1c86ea33c"
DEST=Path("human-fishing/assets/octopus/bait/red_lure_fever_mouth.webp")
COLS=ROWS=4
CELL=512

def cut(im,i):
    w,h=im.size
    col,row=i%COLS,i//COLS
    # Follow JS rounding semantics, avoiding any half-cell bleed.
    a=lambda x:int(x+.5)
    return im.crop((a(col*w/COLS),a(row*h/ROWS),
                    a((col+1)*w/COLS),a((row+1)*h/ROWS)))

def main():
    request=Request(URL,headers={"User-Agent":"HumanFishingGameAssetBuild/1.0"})
    data=urlopen(request,timeout=35).read()
    actual=hashlib.sha256(data).hexdigest()
    assert actual==EXPECTED,("Original generated artwork changed",actual)
    original=Image.open(BytesIO(data)).convert("RGBA")
    assert original.size==(1254,1254),original.size
    packed=Image.new("RGBA",(CELL*COLS,CELL*ROWS))
    for i in range(16):
        tile=cut(original,i)
        # No resampling: preserve the literal 1:1 16-frame painted artwork.
        x=(CELL-tile.width)//2
        y=(CELL-tile.height)//2
        assert x>=80 and y>=80,(i,x,y)
        packed.alpha_composite(tile,((i%COLS)*CELL+x,(i//COLS)*CELL+y))
    DEST.parent.mkdir(parents=True,exist_ok=True)
    packed.save(DEST,"WEBP",quality=92,method=6,exact=True)
    rebuilt=Image.open(DEST).convert("RGBA")
    assert rebuilt.size==(2048,2048)
    for i in range(16):
        tile=cut(rebuilt,i)
        bounds=tile.getchannel("A").point(lambda v:255 if v>80 else 0).getbbox()
        assert bounds,(i,"no sprite")
        assert bounds[0]>75 and bounds[1]>70 and bounds[2]<CELL-45 and bounds[3]<CELL-70, (i,bounds)
    print("PASS: new giant-mouth Fever atlas",DEST,"size",DEST.stat().st_size,
          "16 frames, each padded to 512x512 without resampling")

if __name__=="__main__":
    main()
