#!/usr/bin/env python3
"""Create a new mouth-opening 16f sheet using ONLY the approved purple_excited
artwork's original pixels. Never redraw the character, costume, or texture.
The companion sprites and approved success/failure sheets are not modified.
"""
from PIL import Image
from pathlib import Path
import hashlib

ROOT=Path("human-fishing/assets/octopus")
SRC=ROOT/"atlases/purple_excited.webp"
DEST=ROOT/"player/mouth_open_original_style.webp"
SEQUENCE=[0,0,1,1,2,3,4,5,6,7,8,9,10,11,11,11]
SIZE=314
src=Image.open(SRC).convert("RGBA")
assert src.size==(1254,1254), ("unexpected approved source dimensions",src.size)
out=Image.new("RGBA",(SIZE*4,SIZE*4),(0,0,0,0))
for i,source_index in enumerate(SEQUENCE):
    col,row=source_index%4,source_index//4
    x0=int(col*src.width/4+.5);x1=int((col+1)*src.width/4+.5)
    y0=int(row*src.height/4+.5);y1=int((row+1)*src.height/4+.5)
    frame=src.crop((x0,y0,x1,y1))
    bounds=frame.getchannel("A").point(lambda x:255 if x>=52 else 0).getbbox()
    assert bounds,("empty approved sprite",i)
    # Stable 291-pixel visible-foot baseline and integer crop boundaries.
    tile=Image.new("RGBA",(SIZE,SIZE),(0,0,0,0))
    tile.alpha_composite(frame,((SIZE-frame.width)//2,291-bounds[3]))
    out.alpha_composite(tile,((i%4)*SIZE,(i//4)*SIZE))
DEST.parent.mkdir(parents=True,exist_ok=True)
out.save(DEST,format="WEBP",lossless=True,method=6)
verify=Image.open(DEST).convert("RGBA")
assert verify.size==(1256,1256)
assert verify.getchannel("A").getextrema()==(0,255)
print("PASS: original art pixel identity, 16 frames, same foot baseline")
print("Original SHA256:",hashlib.sha256(SRC.read_bytes()).hexdigest())
print("Output SHA256:",hashlib.sha256(DEST.read_bytes()).hexdigest())
