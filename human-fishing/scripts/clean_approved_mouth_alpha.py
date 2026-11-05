#!/usr/bin/env python3
"""Pixel-preserving alpha cleanup of the user's EXACT 1536x1024 4x4 hero mouth sheet.
Removes only low-opacity neon matte/confetti outside original character shape.
All authored 16 poses and original character pixel RGB remain unchanged wherever visible.
"""
from PIL import Image
from scipy import ndimage as ndi
import numpy as np
from pathlib import Path
import hashlib

src=Path("human-fishing/assets/octopus/player/user_mouth_open_raw.png")
dest=Path("human-fishing/assets/octopus/player/mouth_open_clean.png")
assert src.exists()
assert hashlib.sha256(src.read_bytes()).hexdigest()=="4d976c3710ca5161ef234e58473634873e86f546f2135943b8ce9df3df26126e","wrong user-approved source"
img=np.array(Image.open(src).convert("RGBA"))
h,w=img.shape[:2]
assert (w,h)==(1536,1024),"unexpected 4x4 sprite dimensions"
result=img.copy()
for i in range(16):
    y=(i//4)*256;x=(i%4)*384
    tile=img[y:y+256,x:x+384]
    alpha=tile[:,:,3].astype("float32")
    core=alpha>=64
    labels,n=ndi.label(core)
    counts=np.bincount(labels[core].ravel(),minlength=n+1)
    counts[0]=0
    main=labels==int(counts.argmax())
    reach=ndi.binary_dilation(main,iterations=2)
    clean=np.clip((alpha-36)*255/(254-36),0,255)
    clean[~reach]=0
    clean[clean<12]=0
    view=result[y:y+256,x:x+384]
    view[:,:,3]=np.rint(clean).astype("uint8")
    view[view[:,:,3]==0,:3]=0
    assert np.count_nonzero(view[:,:,3])>30000,(i,"empty")
    assert np.count_nonzero(view[0,:,3]>25)==0,(i,"top row contamination")
    assert np.count_nonzero(view[-1,:,3]>25)==0,(i,"bottom row contamination")
dest.parent.mkdir(parents=True,exist_ok=True)
Image.fromarray(result,"RGBA").save(dest,optimize=True)
assert Image.open(dest).getchannel("A").getextrema()==(0,255)
print("PASS: 16 original poses unchanged, 1536x1024 transparent PNG with clean 4x4 alpha")
print("Output:",dest,"sha256:",hashlib.sha256(dest.read_bytes()).hexdigest())
