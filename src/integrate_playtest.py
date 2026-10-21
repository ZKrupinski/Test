#!/usr/bin/env python3
"""Safely build v2.3 standalone playtest with the aim/motion overlay.
No site publishing is performed. Leaves source HTML untouched.
Usage: python integrate_playtest.py ORIGINAL_PLAYTEST.html
"""
from pathlib import Path
import sys

HERE=Path(__file__).resolve().parent
PATCH=HERE/'crimson_bow_motion_aim_patch_v2.js'
MARKER='CrimsonBowMotionV2'
REQUIRED=['const C=document.getElementById(\'game\')','function update(dt)','function arrowShot(','function touchXY(ev)','const origin=']

def build(src:Path):
    text=src.read_text(encoding='utf-8')
    bad=[part for part in REQUIRED if part not in text]
    if bad:
        raise ValueError('Unsupported source; refusing to modify: '+', '.join(bad))
    if MARKER in text:
        raise ValueError('Patch already present; refusing duplicate injection')
    patch=PATCH.read_text(encoding='utf-8')
    # Inline bundling avoids missing JS sidecar in offline/mobile preview.
    closing=text.lower().rfind('</body>')
    if closing < 0 or text.rfind('</script>', 0, closing)<0:
        raise ValueError('HTML closing script/body not found')
    text=text[:closing]+'<script>\n'+patch+'\n</script>\n'+text[closing:]
    out=src.with_name(src.stem+'_free_aim_motion_v2.html')
    out.write_text(text,encoding='utf-8')
    return out

if __name__=='__main__':
    if len(sys.argv)!=2:
        sys.exit('Usage: python integrate_playtest.py <original-playtest-v23.html>')
    target=build(Path(sys.argv[1]))
    print('Created:',target,'bytes:',target.stat().st_size)