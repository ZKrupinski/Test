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
assert "swallow_success_connected.png" in html
assert "Math.floor(progress*16)" in html
assert "140-208*bridgeScale" in html
assert "3+Math.floor(progress*13)" in html

# Confirm first displayed success frame is the exact last open frame.
# Confirm smiling frames 9-15 are unchanged illustrations in the new atlas.
from PIL import ImageChops
bridge=Image.open(root/"player/swallow_success_connected.png").convert("RGBA")
assert bridge.size==(1664,1664)
from importlib.util import spec_from_file_location,module_from_spec
spec=spec_from_file_location("bridge_builder",root.parent/"scripts/build_swallow_success_connected.py")
mod=module_from_spec(spec);spec.loader.exec_module(mod)
start=mod.tile(bridge,0)
assert ImageChops.difference(start,mod.place(mod.tile(im,15))).getbbox() is None, "Opening -> swallow handshake jumps"
original=Image.open(success).convert("RGBA")
for index in range(9,16):
    target=mod.place(mod.tile(original,index))
    actual=mod.tile(bridge,index)
    assert ImageChops.difference(target,actual).getbbox() is None,("Original smile changed",index)
assert mod.TAKE[:6]==[("open",15),("open",14),("open",12),("open",10),("open",7),("open",4)]
assert all(mod.TAKE[i]==("success",i) for i in range(9,16))
print("PASS: original clean 16-frame mouth; connected swallow closes the mouth before gulp; original smiling frames 9-15 preserved pixel-for-pixel")
