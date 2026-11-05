#!/usr/bin/env python3
"""Verify that the THREE ACTUAL player responses use the exact approved pixels.
The opening sheet may re-time frames but never repaint the explorer octopus.
The two supplied finished sheets are used byte-for-byte.
"""
from PIL import Image, ImageChops
from pathlib import Path
import hashlib

root=Path("human-fishing/assets/octopus")
source=root/"atlases/purple_excited.webp"
failure=root/"player/swallow_failure_original_style.webp"
mouth=root/"player/mouth_open_original_style.webp"
def checksum(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()
assert checksum(source)=="5ad5ba5d5568be2d4360b2bbc70706c8904ee98bfd3d0fb2d1918d5172bdea7b", "approved success painting was changed"
assert checksum(failure)=="8e4628eb275df4498dfd2226b1db8f998092e17efd464b9f3cb05ba919fd16e7", "user-approved failure upload was changed"
raw=Image.open(source).convert("RGBA")
made=Image.open(mouth).convert("RGBA")
assert raw.size==(1254,1254)
assert made.size==(1256,1256)
sequence=[0,0,1,1,2,3,4,5,6,7,8,9,10,11,11,11]
def flatten(im):
    bg=Image.new("RGBA",im.size,(35,40,51,255))
    bg.alpha_composite(im)
    return bg.convert("RGB")
for n,i in enumerate(sequence):
    x0=int((i%4)*raw.width/4+.5);x1=int(((i%4)+1)*raw.width/4+.5)
    y0=int((i//4)*raw.height/4+.5);y1=int(((i//4)+1)*raw.height/4+.5)
    f=raw.crop((x0,y0,x1,y1))
    box=f.getchannel("A").point(lambda x:255 if x>=52 else 0).getbbox()
    assert box
    expected=Image.new("RGBA",(314,314),(0,0,0,0))
    expected.alpha_composite(f,((314-f.width)//2,291-box[3]))
    actual=made.crop(((n%4)*314,(n//4)*314,
                      (n%4+1)*314,(n//4+1)*314))
    assert actual.getchannel("A").getbbox(),("empty",n)
    assert ImageChops.difference(expected.getchannel("A"),actual.getchannel("A")).getbbox() is None,("alpha changed",n)
    assert ImageChops.difference(flatten(expected),flatten(actual)).getbbox() is None,("style/pixels changed",n)
html=Path("human-fishing/index.html").read_text()
assert "player/mouth_open_original_style.webp" in html
assert "atlases/purple_excited.webp" in html
assert "player/swallow_failure_original_style.webp" in html
assert "11+Math.floor(progress*5)" in html,"success must enter at shared open frame"
assert "3+Math.floor(progress*13)" in html,"failure should start from startled pose"
print("PASS: opening is original-art pixels throughout all 16 frames; exact approved success/failure images and source continuity")
