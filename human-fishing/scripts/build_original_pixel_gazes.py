#!/usr/bin/env python3
"""Build 100%-source-character-consistent gaze animations from purple_idle_v2.webp.

All hat, goggles, flower, scarf, body, tentacles, satchel and silhouette pixels
are sampled from the approved ORIGINAL player sprite. No new character redraw.
Only the original iris patches are translated in the unchanged eye sockets.
"""
from pathlib import Path
from PIL import Image, ImageFilter
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

raw=np.asarray(base)
no_iris=np.asarray(base.convert("RGB")).copy()
paint_mask=np.zeros((sh,sw),dtype=np.uint8)
iris_masks=[]
for cx,cy in centers:
  # Keep pupil ring + glint, avoid touching fixed eyelid/eyebrow artwork.
  radius=16
  soft=np.zeros((sh,sw),dtype=np.uint8)
  cv2.ellipse(soft,(cx,cy),(radius,radius+1),0,0,360,255,-1)
  inner=np.zeros((sh,sw),dtype=np.uint8)
  cv2.ellipse(inner,(cx,cy),(radius-2,radius-1),0,0,360,255,-1)
  paint_mask=cv2.bitwise_or(paint_mask,inner)
  soft=cv2.GaussianBlur(soft,(5,5),1.2)
  iris_masks.append(soft)
cleaned=cv2.inpaint(no_iris,paint_mask,4,cv2.INPAINT_TELEA)
# Put back the untouched original alpha; eye whites stay in the same eye sockets.
base_rgb=Image.fromarray(cleaned,"RGB").convert("RGBA")
base_rgb.putalpha(base.getchannel("A"))

def make_frame(dx,dy,bow=0):
    # Dynamic eyes are copied from the SAME source artwork. Both irises share
    # identical x/y movement; their outlines and original eye glints remain.
    canvas=base_rgb.copy()
    for (cx,cy),mask in zip(centers,iris_masks):
        px0=max(0,cx-21);px1=min(sw,cx+22)
        py0=max(0,cy-21);py1=min(sh,cy+22)
        piece=base.crop((px0,py0,px1,py1))
        selection=Image.fromarray(mask[py0:py1,px0:px1],"L")
        piece.putalpha(Image.fromarray(
            (np.array(piece.getchannel("A"),dtype=np.uint16)*
             np.array(selection,dtype=np.uint16)//255).astype("uint8"),"L"))
        canvas.alpha_composite(piece,(px0+int(dx),py0+int(dy)))
    frame=Image.new("RGBA",(CELL_W,CELL_H),(0,0,0,0))
    # Keep real approved art's visual proportions and base foot position.
    scaled=canvas.resize((360,360),Image.Resampling.LANCZOS)
    left=round(200-((centers[0][0]+centers[1][0])*.5-44)*360/sw)
    # Align original center measured from source art, not iris placement.
    left=round(200-156*360/sw)
    top=round(412-285*360/sh)
    frame.alpha_composite(scaled,(left,top))
    if bow>0:
        # Very gentle full-body lean (<=2.3°) around the planted feet.
        # Uses ONLY the same source pixels, no invented costume/shapes.
        angle=2.3*bow
        frame=frame.rotate(angle,Image.Resampling.BICUBIC,center=(200,412))
        # Subtle nod downwards without deforming the approved octopus.
        moved=Image.new("RGBA",(CELL_W,CELL_H))
        moved.alpha_composite(frame,(0,round(3*bow)))
        frame=moved
    return frame

# Calm scan: head fixed, friendly symmetrical eyelids, pupils subtly look
# downward, to bottom-left, back center, then bottom-right (ping-pong).
IDLE=[(0,1),(0,2),(-1,3),(-2,4),(-3,4),(-2,4),(-1,3),(0,2),
      (0,2),(1,3),(2,4),(3,4),(2,4),(1,3),(0,2),(0,1)]
# Bait sinks: both eyes follow downward; upper body bows gently toward water.
SINK=[(0,1,0),(0,2,.05),(0,3,.12),(0,3,.20),
      (-1,4,.34),(-1,5,.48),(-1,5,.62),(-1,6,.74),
      (-1,6,.86),(0,6,.95),(0,6,1.00),(0,6,1.00),
      (0,6,1.00),(0,6,1.00),(0,6,1.00),(0,6,1.00)]
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
