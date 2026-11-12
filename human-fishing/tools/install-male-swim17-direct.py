#!/usr/bin/env python3
"""Install the exact approved RGBA pixel content from verified source PNGs.
The 17 uploaded originals remain immutable in Git. Only approved isolated
alpha artifacts are removed using a separately verified pixel mask.
"""
from pathlib import Path
from io import BytesIO
import base64
import hashlib
import json
import re
import zlib
from PIL import Image

root = Path(__file__).resolve().parent.parent
staging = root / 'assets' / 'humans' / 'male-staging'
maskfile = root / 'male-swim17-pixel-mask.jsonl'
assert maskfile.is_file(), 'No certified pixel mask manifest'
records = maskfile.read_text(encoding='utf-8').splitlines()
meta = json.loads(records[0])
rows = [json.loads(line) for line in records[1:]]
assert meta['schema'] == 'human-swim17-pixel-match-v1'
assert meta['version'] == '20261112-male17-swim-v1'
assert (meta['width'], meta['height']) == (1774, 887)
assert meta['protectedIds'] == [0, 1, 5, 8, 17, 18, 22]
expected_ids = [2, 3, 4, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16, 19, 20, 21, 23]
assert [e['id'] for e in rows] == expected_ids
assert len({e['key'] for e in rows}) == 17
assert {p.name for p in staging.glob('*.png')} == {e['key'] + '.png' for e in rows}

def sha256(data):
    return hashlib.sha256(data).hexdigest()

def gitsha(data):
    return hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()

approved = []
for e in rows:
    src = staging / (e['key'] + '.png')
    src_bytes = src.read_bytes()
    assert sha256(src_bytes) == e['sourceSha256'], 'Altered original: ' + e['key']
    assert gitsha(src_bytes) == e['sourceGitBlob'], 'Git original changed: ' + e['key']
    original = Image.open(BytesIO(src_bytes))
    assert original.mode == 'RGBA' and original.size == (1774, 887), 'Wrong PNG geometry'
    pixels = bytearray(original.tobytes())
    mask = zlib.decompress(base64.b64decode(e['maskPackbitsZlibB64'], validate=True))
    assert len(mask) == (1774 * 887 + 7) // 8, 'Mask dimensions mismatch'
    cleared = 0
    zero = b'\x00\x00\x00\x00'
    for byte_index, flags in enumerate(mask):
        if not flags:
            continue
        for bit in range(8):
            if flags & (128 >> bit):
                pixel = byte_index * 8 + bit
                if pixel < 1774 * 887:
                    offset = pixel * 4
                    pixels[offset:offset+4] = zero
                    cleared += 1
    assert cleared == e['clearedPixels'], 'Mask changed: ' + e['key']
    assert sha256(pixels) == e['targetDecodedRgbaSha256'], 'Approved visual pixels differ: ' + e['key']
    result = BytesIO()
    Image.frombytes('RGBA', (1774, 887), bytes(pixels)).save(result, format='PNG', optimize=True)
    output = result.getvalue()
    dest = root / 'assets' / 'humans' / e['destFile']
    assert dest.parent.name == 'male-concepts'
    assert not dest.exists(), 'Do not overwrite existing character sprites'
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(output)
    approved.append({
        'id': e['id'], 'name': e['name'], 'key': e['key'], 'file': e['destFile'],
        'size': [1774, 887], 'frames': 8, 'grid': [4, 2],
        'sourceSha256': e['sourceSha256'],
        'sha256': sha256(output),
        'pixelSha256': e['targetDecodedRgbaSha256'],
        'gitBlob': gitsha(output),
    })

html_path = root / 'index.html'
sprite_path = root / 'human-sprites.js'
qa_path = root / 'qa-human-sprites.cjs'
html = html_path.read_text(encoding='utf8')
sprite = sprite_path.read_text(encoding='utf8')
qa = qa_path.read_text(encoding='utf8')

def patch_once(text, old, new, label):
    n = text.count(old)
    assert n == 1, f'Source changed at {label}: count {n}'
    return text.replace(old, new, 1)

match = re.search(r'var humans=\[([^\]]*)\];', html)
assert match, 'Human catalog missing'
names = re.findall(r"'([^']+)'", match.group(1))
assert len(names) == 35, 'Human ID table changed'
old_names = names[:]
for e in rows:
    names[e['id']] = e['name']
names[0] = '기저귀 아기'
for i in [1, 5, 8, 17, 18, 22]:
    assert names[i] == old_names[i], 'Approved artwork registry affected'
assert names[24:] == old_names[24:], 'Female registry affected'
html = patch_once(html, match.group(0), 'var humans=[' + ','.join("'" + n + "'" for n in names) + '];', 'human registry')
version = '20261112-male17-swim-v1'
html = patch_once(html,
    '<script src="./human-sprites.js?v=20261112-rabbit160-cat140-v11"></script>',
    '<script src="./assets/humans/male-concepts/ready.js?v='+version+'"></script>\n' +
    '<script src="./human-sprites.js?v='+version+'"></script>', 'preload order')
boy_map = ',\n '.join("'" + str(e['id']) + "':'" + e['key'] + "'" for e in rows)
pre = ("var maleSwimBoyById=global.HumanFishingMaleBoysReady===true?{\n " + boy_map +
       "\n}:Object.create(null);\n" +
       "Object.keys(maleSwimBoyById).forEach(function(id){swimVariantById[id]='boy_'+maleSwimBoyById[id]});\n")
sprite = patch_once(sprite, 'var sisterSpritesEnabled=global.HumanFishingSisterSpritesReady===true;',
    pre + 'var sisterSpritesEnabled=global.HumanFishingSisterSpritesReady===true;', 'male-only registration')
old_source = ("img.src='./assets/humans/baby_swim_'+variant+'_8f.png?v='+(Number(id)===36?"
   "'20261112-shark-original-v6':Number(id)>=35?'20261112-sisters-boundary-v4':Number(id)>=24?"
   "'20261111-human-swim11-alpha-v4':'20261111-human-swim4-v1');")
new_source = ("img.src=maleSwimBoyById[id]?\n"
   "   './assets/humans/male-concepts/baby_swim_boy_'+maleSwimBoyById[id]+'_8f.png?v="+version+"':\n"
   "   './assets/humans/baby_swim_'+variant+'_8f.png?v='+(Number(id)===36?"
   "'20261112-shark-original-v6':Number(id)>=35?'20261112-sisters-boundary-v4':Number(id)>=24?"
   "'20261111-human-swim11-alpha-v4':'20261111-human-swim4-v1');")
sprite = patch_once(sprite, old_source, new_source, 'boy bitmap load')
sprite = patch_once(sprite,
    'var width=362*scale,height=sister?width*(id===35?362/543:1):543*scale;',
    'var width=362*scale,height=maleSwimBoyById[String(id)]?width:sister?width*(id===35?362/543:1):543*scale;', 'male geometry')
sprite = patch_once(sprite, 'var newSwim=swimVariants[String(Number(actor.id))]||null;',
    'var newSwim=swimVariants[String(Number(actor.id))]||null;\n var maleBoy=!!maleSwimBoyById[String(Number(actor.id))];',
    'boy actor detection')
sprite = patch_once(sprite, 'if(newSwim&&actor.id>=25)sheet={w:1776,h:888,fw:444,fh:444};',
    'if(newSwim&&actor.id>=25)sheet={w:1776,h:888,fw:444,fh:444};\n if(maleBoy)sheet={w:1774,h:887,fw:443.5,fh:443.5};',
    'native atlas resolution')
sprite = patch_once(sprite, 'if(newSwim&&actor.id>=25)scale*=362/fw;',
    'if(newSwim&&actor.id>=25)scale*=362/fw;\n if(maleBoy)scale*=362/fw;', 'matching world size')
sprite = patch_once(sprite, 'ctx.scale(newSwim&&actor.id>=24?-facing:facing,1);',
    'ctx.scale(newSwim&&(actor.id>=24||maleBoy)?-facing:facing,1);', 'character direction')
html = patch_once(html, 'var newer=Number(id)>=24;',
    'var newer=Number(id)>=24;\n var maleBoy=Number(id)<24&&img.naturalWidth===1774&&img.naturalHeight===887;',
    'portrait boy identification')
html = patch_once(html,
    'var sourceIsOriginal=newer&&Number(id)!==24&&img.naturalWidth===1774&&img.naturalHeight===887;',
    'var sourceIsOriginal=(newer&&Number(id)!==24||maleBoy)&&img.naturalWidth===1774&&img.naturalHeight===887;',
    'original frame shape')
html = patch_once(html, 'var fw=sisterRabbit?543:newer&&Number(id)!==24?444:362;',
    'var fw=maleBoy?444:sisterRabbit?543:newer&&Number(id)!==24?444:362;', 'portrait crop width')
html = patch_once(html, 'var fh=sisterRabbit?362:newer&&Number(id)!==24?444:543;',
    'var fh=maleBoy?444:sisterRabbit?362:newer&&Number(id)!==24?444:543;', 'portrait crop height')
html = patch_once(html, 'mirror:!newer};',
    'mirror:!newer&&!maleBoy};', 'UI head direction')
qa = qa.replace('20261112-rabbit160-cat140-v11',version)
qa = patch_once(qa,
    "art.imageFor(2,'hooked').src.includes('baby_hooked_8f.png')",
    "art.imageFor(0,'hooked').src.includes('baby_hooked_8f.png')",
    'original base baby action validation')
html_path.write_text(html,encoding='utf8')
sprite_path.write_text(sprite,encoding='utf8')
qa_path.write_text(qa,encoding='utf8')
installed = root / 'assets' / 'humans' / 'male-concepts' / 'installed-manifest.json'
installed.write_text(json.dumps({
    'schema':'human-swim17-direct-installed-v1',
    'version':version, 'maleOnly':True, 'count':17, 'grid':[4,2],
    'actors':approved, 'protectedIds':meta['protectedIds'],
    'notes':'All 17 8-frame PNGs match approved decoded RGBA SHA-256 byte-for-byte; source images preserved until installation commit.'
},ensure_ascii=False,indent=2)+'\n',encoding='utf8')
ready = root / 'assets' / 'humans' / 'male-concepts' / 'ready.js'
ready.write_text('window.HumanFishingMaleBoysReady=true;\n',encoding='utf8')
print('PASS: installed 17 sprites, 136 RGBA frames, original pixels; human IDs and female art preserved')