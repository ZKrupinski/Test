#!/usr/bin/env python3
"""Build 100%-source-character-consistent gaze animations from purple_idle_v2.webp.

All hat, goggles, flower, scarf, body, tentacles, satchel and silhouette pixels
are sampled from the approved ORIGINAL player sprite. No new character redraw.
Only the original iris patches are translated in the unchanged eye sockets.
"""
from pathlib import Path
from PIL import Image
import math, colorsys
import numpy as np
import cv2

ROOT=Path(__file__).resolve().parents[1]
ORIG=ROOT/"assets/octopus/atlases/purple_idle_v2.webp"
OUT=ROOT/"assets/octopus/player"
OUT.mkdir(parents=True,exist_ok=True)
SHEET_W,SHEET_H=1600,1760
CELL_W,CELL_H=400,440
SRC_FRAME=2  # original row 0 column 2: BOTH eyes open, cheerful original face
FRAME_SRC=Image.open(ORIG).convert("RGBA")
iw,ih=FRAME_SRC.size
x0=round((SRC_FRAME%4)*iw/4);x1=round((SRC_FRAME%4+1)*iw/4)
y0=round((SRC_FRAME//4)*ih/4);y1=round((SRC_FRAME//4+1)*ih/4)
base=FRAME_SRC.crop((x0,y0,x1,y1))
sw,sh=base.size
arr=np.array(base)
# Neighbor-sheet red flecks are not part of the original character body.
alpha=arr[:,:,3]
_,labels,stats,_=cv2.connectedComponentsWithStats((alpha>=48).astype('uint8'),8)
largest=int(np.argmax(stats[1:,cv2.CC_STAT_AREA]))+1
solid=(labels==largest).astype('uint8')
expanded=cv2.dilate(solid,np.ones((5,5),np.uint8),iterations=1)
arr[expanded==0,3]=0
base=Image.fromarray(arr,"RGBA")

# Iris positions measured on approved original pixel data using cyan/teal
# saturation in the face area, separated into the two eye sockets.
pixels=np.asarray(base)
r=pixels[:,:,0].astype(np.int16);g=pixels[:,:,1].astype(np.int16);b=pixels[:,:,2].astype(np.int16)
xx,yy=np.meshgrid(np.arange(sw),np.arange(sh))
teal=(g>r*1.10)&(b>r*1.12)&(g>63)&(b>70)&(pixels[:,:,3]>200)
face_roi=(yy>=70)&(yy<=165)&(xx>=120)&(xx<=267)
candidates=teal&face_roi
centers=[]
for half in (xx<195, xx>=195):
  ys,xs=np.where(candidates&half)
  if len(xs)<30:
    raise ValueError(f"Could not locate original teal iris in half {len(centers)}; found {len(xs)} color pixels")
  # Median robust to tiny cyan highlights and isolated speckles.
  center=(int(round(float(np.median(xs)))),int(round(float(np.median(ys)))))
  centers.append(center)
print("Original iris centers:",centers,"crop:",(sw,sh))
if not (133<=centers[0][0]<=190 and 202<=centers[1][0]<=257):
  raise ValueError(f"Unreliable iris centers: {centers}")

# Preserve source irises, eye white, eyelashes and eyelids as one original
# raster. The former inpaint + overlay approach erased pupil interiors and
# created doubled/misaligned eyes. Instead: smooth subpixel displacement of
# ORIGINAL eye texture, with a Gaussian falloff that reaches zero outside
# the eye whites. There is no removal or reconstruction of pupil pixels.
source_rgba=np.asarray(base).copy()
ys,xs=np.mgrid[0:sh,0:sw]
eye_fields=[]
for cx,cy in centers:
    radius_x=15.0; radius_y=13.0
    field=np.exp(-.5*((xs-cx)/radius_x)**2-.5*((ys-cy)/radius_y)**2)
    # Compact support: the eyelids/brows/face must be exactly source pixels.
    field[field < .04]=0.
    eye_fields.append(field.astype(np.float32))
BASE_X=xs.astype(np.float32)
BASE_Y=ys.astype(np.float32)

def make_frame(dx,dy,bow=0):
    # Both irises get the same tiny displacement. No pupil extraction,
    # inpainting, arbitrary circles, Photoshop-like iris redraw or shadows.
    # A face remains entirely identical to the approved source elsewhere.
    shift_x=np.zeros((sh,sw),np.float32)
    shift_y=np.zeros((sh,sw),np.float32)
    for field in eye_fields:
        shift_x+=float(dx)*field
        shift_y+=float(dy)*field
    remap=cv2.remap(source_rgba,
                    BASE_X-shift_x,BASE_Y-shift_y,
                    interpolation=cv2.INTER_LINEAR,
                    borderMode=cv2.BORDER_REPLICATE)
    output=np.where(((shift_x!=0)|(shift_y!=0))[:,:,None],
                    remap,source_rgba).astype(np.uint8)
    canvas=Image.fromarray(output,"RGBA")
    frame=Image.new("RGBA",(CELL_W,CELL_H),(0,0,0,0))
    # Uniform scale: the original 313x313 illustration stays 1:1 in pixels
    # in every state, at a stable transparent frame center/foot line.
    scaled=canvas.resize((360,360),Image.Resampling.LANCZOS)
    left=round(200-156*360/sw)
    top=round(412-285*360/sh)
    frame.alpha_composite(scaled,(left,top))
    if bow>0:
        # Original pixels only: barely visible forward nod during bait sink.
        angle=.9*bow
        frame=frame.rotate(angle,Image.Resampling.BICUBIC,center=(200,412))
    return frame

# Idle stays friendly, no head tilt and NO uneven eyelid transitions.
# Move both existing pupils together by at most 2px horizontally and 2px
# downward in the ORIGINAL 313px source. Loop turns back smoothly.
IDLE=[(0,0),(0,1),(-1,1),(-2,2),(-2,2),(-1,1),(0,1),(0,0),
      (0,0),(1,1),(2,2),(2,2),(1,1),(0,1),(0,0),(0,0)]
# During bait descent the whole original character looks marginally lower;
# the head bend is <1 degree so face details and silhouette cannot pop.
SINK=[(0,0,0),(0,1,.06),(0,2,.14),(0,2,.25),
      (-1,2,.34),(-1,2,.45),(-1,2,.54),(-1,2,.64),
      (-1,2,.74),(0,2,.82),(0,2,.89),(0,2,.95),
      (0,2,1),(0,2,1),(0,2,1),(0,2,1)]
def export(name,sequence):
    sheet=Image.new("RGBA",(SHEET_W,SHEET_H),(0,0,0,0))
    for i,pose in enumerate(sequence):
      x=(i%4)*CELL_W;y=(i//4)*CELL_H
      frame=make_frame(*pose)
      sheet.alpha_composite(frame,(x,y))
    png=OUT/(name+".png")
    webp=OUT/(name+".webp")
    sheet.save(png,optimize=True)
    sheet.save(webp,format="WEBP",quality=94,method=6,exact=True)
    print(name,png.stat().st_size,webp.stat().st_size)
    return sheet
idle=export("purple_idle_original_pixel_16f",IDLE)
sink=export("purple_sinking_original_pixel_16f",SINK)
# Visual QA: actual original sample next to regenerated first/last poses.
preview=Image.new("RGBA",(400*4,440),(0,0,0,0))
orig=Image.new("RGBA",(400,440))
orig.alpha_composite(base.resize((360,360),Image.Resampling.LANCZOS),(21,round(412-285*360/sh)))
preview.alpha_composite(orig,(0,0))
preview.alpha_composite(idle.crop((0,0,400,440)),(400,0))
preview.alpha_composite(idle.crop((1200,1320,1600,1760)),(800,0))
preview.alpha_composite(sink.crop((800,880,1200,1320)),(1200,0))
preview.save(OUT/"_qa_original_vs_new_gazes.png",optimize=True)
