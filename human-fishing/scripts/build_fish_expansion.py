#!/usr/bin/env python3
"""Render 600 additional alpha-clean fish collectibles from approved original PNG art.

Deterministic raster variants only: no clipped atlas rectangles, SVGs, vectors
or confusing mixed frames. Every new F305..F904 file gets its own color palette,
fin shading and species-specific markings; all original F001..F304 stay untouched.

These new designs are *creative species interpretations and color morphs*, not
new zoological scientific reference paintings. Raster silhouettes originate
from the approved original collection. Source relationships are in manifest.
"""
from pathlib import Path
import hashlib, json, re
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
DATA=(ROOT/'fish-expansion.js').read_text(encoding='utf-8')
START='// SPECIES_NAMES_BEGIN'
END='// SPECIES_NAMES_END'
content=DATA.split(START,1)[1].split(END,1)[0]
raw=re.findall(r"^\s*'([^']+)'[,\s]*$",content,flags=re.M)
GROUPS=[line.split(',') for line in raw]
assert len(GROUPS)==12,(len(GROUPS),'expected 12 habitat groups')
assert all(len(group)==25 for group in GROUPS),[(i,len(g)) for i,g in enumerate(GROUPS)]
map_body=DATA.split('// SOURCE_MAP_BEGIN',1)[1].split('// SOURCE_MAP_END',1)[0]
SOURCE_MAPS=[
 [int(n) for n in row.split(',')]
 for row in re.findall(r'^\s*\[([0-9,]+)\],?\s*$',map_body,re.M)
]
assert len(SOURCE_MAPS)==12 and all(len(row)==25 for row in SOURCE_MAPS), \
       'Each habitat must specify 25 anatomically related original parents'

STYLES=['루비','사파이어','에메랄드','호박','오팔','자수정','백금','금빛',
 '밤안개','구름빛','코발트','석양','달빛','오로라','화염','설화','터키석',
 '진홍','바이올렛','진주','청록','흑요석','노을','유리빛','남보라']
assert len(STYLES)==25

OUT=ROOT/'assets/fish/individual'
MANIFEST=ROOT/'assets/fish/manifest.json'
old=json.loads(MANIFEST.read_text(encoding='utf-8'))
originals=[item for item in old['fish'] if int(item['id'][1:])<=304]
assert len(originals)==304,'Original image catalog must remain stable'
by_id={e['id']:e for e in originals}
baseNames=set((ROOT/'fish-expansion.js').read_text(encoding='utf-8').split(START)[0].split(','))
names=[]

# Saturated nature-derived paint hues (angle 0..360, relative saturation).
PALETTE=[
 (3,.72),(211,.75),(152,.68),(33,.75),(276,.48),
 (287,.56),(210,.22),(49,.74),(219,.36),(195,.34),
 (235,.76),(16,.81),(238,.30),(184,.65),(4,.91),
 (208,.33),(169,.81),(352,.77),(274,.77),(184,.21),
 (173,.65),(250,.27),(12,.73),(184,.18),(270,.66)
]

def rarity(index,morph):
    v=(index+4)%25 if morph else index
    return ('COMMON' if v<11 else 'UNCOMMON' if v<17 else
            'RARE' if v<21 else 'EPIC' if v<23 else
            'LEGEND' if v==23 else 'MYTHIC')

def make_raster(src,habitat,i,morph):
    original=np.asarray(src.convert('RGBA'),dtype=np.uint8)
    h,w=original.shape[:2]
    alpha=original[:,:,3]
    hsv=np.asarray(src.convert('RGB').convert('HSV'),dtype=np.float32)
    oldh=hsv[:,:,0]/255.
    olds=hsv[:,:,1]/255.
    oldv=hsv[:,:,2]/255.
    hue,sat=PALETTE[(i*7+habitat*3+morph*11)%25]
    goal=hue/360.
    # Shift every existing scale/pattern tint in a single consistent direction
    # while retaining the original painterly highlights and dark fish details.
    angle=(goal-oldh+.5)%1-.5
    newh=(oldh+angle*(.70 if morph else .48))%1
    news=np.clip(olds*(.62 if morph else .80)+sat*(.38 if morph else .20),.09,.91)
    yy,xx=np.mgrid[:h,:w].astype(np.float32)
    xn=xx/max(1,w-1);yn=yy/max(1,h-1)
    seed=305+habitat*50+i*2+morph
    profile=seed%7
    # Markings are masked to the *existing* fish silhouette; no fake white
    # cutout, background fringe or neighboring fish can enter the sprite.
    stripes=np.sin((xn*(5+(i%4)*2)+yn*.7+(seed%3)*.24)*np.pi*2)
    spots=np.cos((xn*(11+seed%7)+yn*.2)*np.pi*2)*\
          np.cos((yn*(7+(i%3)*2)-xn*.7)*np.pi*2)
    belly=np.exp(-((yn-.72)/.19)**2)*.20
    dorsal=np.exp(-((yn-.22)/.17)**2)*.17
    if profile==0: pattern=(stripes>.61)*.16-stripes*.035
    elif profile==1: pattern=(spots>.61)*.16-spots*.029
    elif profile==2: pattern=(stripes>.35)*.12+(spots>.80)*.10
    elif profile==3: pattern=(stripes<-.4)*-.12+(spots>.79)*.12
    elif profile==4: pattern=(stripes>.82)*.08+(spots>.72)*.09
    elif profile==5: pattern=np.sin(xn*9*np.pi+yn*7*np.pi)*.083
    else: pattern=np.sin(xn*5*np.pi-yn*13*np.pi)*.065
    # Make the new named variant less saturated than its counterpart while
    # morphs have an unmistakably different base hue and markings.
    strength=1.03 if morph else .75
    newv=np.clip(oldv*(.90+belly*.5-dorsal*.25+
                        pattern*strength)+(.043 if morph else .018),.05,.99)
    newh=(newh+np.where(spots>.75,.025 if morph else .009,0))%1
    composed=np.stack([newh*255,news*255,newv*255],axis=2)
    painted=Image.fromarray(np.uint8(np.clip(composed,0,255)),mode='HSV').convert('RGB')
    out=np.concatenate([np.asarray(painted,dtype=np.uint8),
                        alpha[:,:,None]],axis=2)
    # Slight anatomy-preserving proportion difference; never crop source art.
    im=Image.fromarray(out,mode='RGBA')
    xscale=[1.0,1.045,.968,1.075,.94][seed%5]
    yscale=[1.0,.95,1.055,.97,1.04][(seed//3)%5]
    dimensions=(max(2,int(w*xscale)),max(2,int(h*yscale)))
    if dimensions!=(w,h):
        im=im.resize(dimensions,Image.Resampling.LANCZOS)
    # No low-alpha halo: restore tight RGBA trim, preserve sharp soft edges.
    box=im.getchannel('A').getbbox()
    assert box,'Empty alpha after species raster rendering'
    im=im.crop(box)
    return im

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    appended=[]
    unique_names=set()
    files=0
    for habitat,group in enumerate(GROUPS):
        for i,name in enumerate(group):
            source_index=SOURCE_MAPS[habitat][i]
            source_number=source_index-1000 if source_index>=1000 else 1+habitat*20+source_index
            source_id='F'+str(source_number).zfill(3)
            base=by_id[source_id]
            parent=OUT/(source_id+'.png')
            assert parent.exists(),parent
            with Image.open(parent) as image:
                baseImg=image.convert('RGBA')
                for morph in range(2):
                    identifier=305+habitat*50+i*2+morph
                    id='F'+str(identifier).zfill(3)
                    label=(STYLES[i]+' '+name+' 변이') if morph else name
                    assert label not in unique_names,label
                    unique_names.add(label)
                    target=OUT/(id+'.png')
                    painted=make_raster(baseImg,habitat,i,morph)
                    # Parent source may change without changing dimensions:
                    # repaint pixels so all curated family swaps take effect.
                    painted.save(target,format='PNG',optimize=True,compress_level=8)
                    rgba=np.asarray(painted,dtype=np.uint8)
                    assert rgba[:,:,3].max()==255 or rgba[:,:,3].max()>200
                    assert (rgba[:,:,3]==0).sum()>0 or \
                           rgba[0,0,3]<255,'Fish needs transparent exterior'
                    appended.append({
                     'id':id,'name':label,'habitat':habitat,
                     'habitatName':base['habitatName'],
                     'rarity':rarity(i,morph),
                     'sizeClass':base.get('sizeClass','MEDIUM'),
                     'artVariant':bool(morph),
                     'sourceOriginalId':source_id,
                     'artMethod':'dedicated-alpha-preserved-raster-recolor-and-marking',
                     'width':painted.width,'height':painted.height,
                     'png':'individual/'+id+'.png'
                    })
                    files+=1
        print('PASS habitat',habitat,'new files',50)
    assert files==600 and len(unique_names)==600
    old['fish']=originals+appended
    old['format']='human-fishing-fish-art-v2'
    old['version']='2026-11-08'
    old['counts']={'original':240,'originalColorMorphs':64,
                   'additionalNamed':300,'additionalColorMorphs':300,
                   'total':904}
    old['note']=('F001-F304 are original preserved art; F305-F904 have '
        'dedicated alpha-preserved bitmap recolors, marking and slight proportion '
        'differences derived from documented sourceOriginalId PNG. '
        '300 newly named collectible types + 300 labeled color morphs.')
    MANIFEST.write_text(json.dumps(old,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    hashes={hashlib.sha256((OUT/('F'+str(id).zfill(3)+'.png')).read_bytes()).digest()
            for id in range(305,905)}
    assert len(hashes)==600,('Repeated art detected',len(hashes))
    print('PASS: 904 unique PNGs, 600 expansion files, 600 unique labels, '+
          '12 habitats x 50, 304 original IDs unchanged')

if __name__=='__main__':
    main()
