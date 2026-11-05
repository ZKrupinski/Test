#!/usr/bin/env python3
"""Validate the exact, user-approved 4x4 mouth art after only alpha cleanup.
Approved success/failure 16-frame atlases must remain byte-for-byte unchanged.
"""
from PIL import Image
from pathlib import Path
import hashlib
root=Path("human-fishing/assets/octopus")
success=root/"atlases/purple_excited.webp"
failure=root/"player/swallow_failure_original_style.webp"
mouth=root/"player/mouth_open_clean.png"
def checksum(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()
assert checksum(success)=="5ad5ba5d5568be2d4360b2bbc70706c8904ee98bfd3d0fb2d1918d5172bdea7b"
assert checksum(failure)=="8e4628eb275df4498dfd2226b1db8f998092e17efd464b9f3cb05ba919fd16e7"
assert checksum(mouth)=="8ea4ec0311a3ffc58c5b5a19677245465f0a7a13c6c0c4e837bec82348a3855a", "source art was altered or uncleaned"
im=Image.open(mouth).convert("RGBA")
assert im.size==(1536,1024)
a=im.getchannel("A")
assert a.getextrema()==(0,255)
for frame in range(16):
    x=frame%4*384;y=frame//4*256
    cell=a.crop((x,y,x+384,y+256))
    assert cell.getbbox(),("empty",frame)
    assert max(cell.crop((0,0,384,1)).getdata())==0,("top border spill",frame)
    assert max(cell.crop((0,255,384,256)).getdata())==0,("bottom border spill",frame)
    assert max(cell.crop((0,0,1,256)).getdata())==0,("left border spill",frame)
    assert max(cell.crop((383,0,384,256)).getdata())==0,("right border spill",frame)
html=Path("human-fishing/index.html").read_text()
assert "player/mouth_open_clean.png" in html
assert "playerMouthCleanBounds" in html
assert "naturalScale=1.04" in html
assert "atlases/purple_excited.webp" in html
assert "player/swallow_failure_original_style.webp" in html
assert "11+Math.floor(progress*5)" in html
assert "3+Math.floor(progress*13)" in html
print("PASS: exact user-approved 16-frame mouth with clean alpha PNG and no distorted frame proportions")
