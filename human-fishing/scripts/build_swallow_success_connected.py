#!/usr/bin/env python3
"""Rebuild just the FIRST success-eating frames from user's accepted art.

Animation 0..5 : approved maximum gape -> mouth closes, reversing approved
                  mouth-open sprites, no new drawn elements or style changes.
Animation 6..8 : approved small-mouth -> throat gulp -> smiling pickup.
Animation 9..15: byte-identical RGBA contents of the EXISTING success smile
                  frames 9-15, with no repaint/reorder/alteration.

All frames have consistent center and *foot* placement. The old success source
purple_excited.webp remains entirely untouched for old emotes and companions.
"""
from PIL import Image, ImageChops
from pathlib import Path
import hashlib

ROOT=Path("human-fishing/assets/octopus")
OPEN=ROOT/"player/mouth_open_clean.png"
SUCCESS=ROOT/"atlases/purple_excited.webp"
DEST=ROOT/"player/swallow_success_connected.png"
CELL=384
FOOT=353
CENTER=192
# Six closing poses, followed by the previous original smiling animation.
TAKE=[("open",15),("open",14),("open",12),("open",10),
      ("open",7),("open",4),
      ("success",4),("success",6),("success",8),
      ("success",9),("success",10),("success",11),
      ("success",12),("success",13),("success",14),("success",15)]
assert len(TAKE)==16

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def tile(image,number):
    w,h=image.size
    col,row=number%4,number//4
    # JS Math.round, including odd cell sizes in the 1254px illustrated atlas.
    x0=int(col*w/4+.5);x1=int((col+1)*w/4+.5)
    y0=int(row*h/4+.5);y1=int((row+1)*h/4+.5)
    return image.crop((x0,y0,x1,y1))

def bounds(im):
    b=im.getchannel("A").point(lambda a:255 if a>=64 else 0).getbbox()
    if not b:raise ValueError("Empty illustrated frame")
    return b

def place(im,at_foot=FOOT):
    bbox=bounds(im)
    # Round exactly once and use the SAME origin for both painted sources.
    x=int(round(CENTER-(bbox[0]+bbox[2])*.5))
    y=int(round(at_foot-(bbox[3]-1)))
    frame=Image.new("RGBA",(CELL,CELL),(0,0,0,0))
    frame.paste(im,(x,y),im) if False else frame.alpha_composite(im,(x,y))
    return frame

def build():
    mouth=Image.open(OPEN).convert("RGBA")
    smile=Image.open(SUCCESS).convert("RGBA")
    assert mouth.size==(1536,1024),mouth.size
    assert smile.size==(1254,1254),smile.size
    assert sha(OPEN)=="8ea4ec0311a3ffc58c5b5a19677245465f0a7a13c6c0c4e837bec82348a3855a"
    assert sha(SUCCESS)=="5ad5ba5d5568be2d4360b2bbc70706c8904ee98bfd3d0fb2d1918d5172bdea7b"
    new=Image.new("RGBA",(CELL*4,CELL*4),(0,0,0,0))
    tiles=[]
    for i,(source,frame_index) in enumerate(TAKE):
        raw=tile(mouth if source=="open" else smile,frame_index)
        final=place(raw)
        # Frame 6: very slight, foot-anchored compression suggests a gulp.
        # Only modifies this newly inserted transition, never smiling 9..15.
        if i==6:
            alpha=final.getchannel("A").getbbox()
            top=alpha[1];bottom=alpha[3]
            if bottom-top>30:
                patch=final.crop((0,top,CELL,bottom))
                squeezed=patch.resize((CELL,int((bottom-top)*.955)),Image.Resampling.LANCZOS)
                final=Image.new("RGBA",(CELL,CELL),(0,0,0,0))
                final.alpha_composite(squeezed,(0,bottom-squeezed.height))
        assert bounds(final)
        new.alpha_composite(final,((i%4)*CELL,(i//4)*CELL))
        tiles.append(final)
    # Frame0 is the APPROVED last open-mouth pose; frame15 ends at the
    # existing successful smile. The last 7 frames have the same source pixels.
    assert ImageChops.difference(tiles[0],place(tile(mouth,15))).getbbox() is None
    for i in range(9,16):
        assert ImageChops.difference(tiles[i],place(tile(smile,i))).getbbox() is None
    DEST.parent.mkdir(exist_ok=True,parents=True)
    new.save(DEST,optimize=True)
    reopened=Image.open(DEST).convert("RGBA")
    assert reopened.size==(1536,1536)
    assert reopened.getchannel("A").getextrema()==(0,255)
    # Ensure all cells have exterior transparent margins and do not bleed.
    for i in range(16):
        f=tile(reopened,i)
        a=f.getchannel("A")
        assert a.getbbox(),i
        for edge in (a.crop((0,0,CELL,1)),a.crop((0,CELL-1,CELL,CELL)),
                     a.crop((0,0,1,CELL)),a.crop((CELL-1,0,CELL,CELL))):
            assert edge.getextrema()[1] == 0,(i,"cross-frame bleed")
    print("PASS: 16 rebuilt success frames, first pixel-identical to open final, "+
          "last 7 pixel-identical to the original happy frames, aligned foot.")
    print("SHA256",sha(DEST))

if __name__=="__main__":
    build()
