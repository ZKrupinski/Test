#!/usr/bin/env python3
"""Build 100%-source-character-consistent gaze animations from purple_idle_v2.webp.

All hat, goggles, flower, scarf, body, tentacles, satchel and silhouette pixels
are sampled from the approved ORIGINAL player sprite. No new character redraw.
Only existing original pixels move: eyes scan, body breathes, tentacles sway.
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
SRC_FRAME=0  # ACTUAL FIRST FRAME of the approved purple_idle_v2 original; NEVER use the rejected intermediate generation
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

def make_frame(dx,dy,bow=0,phase=0):
    # FULL BODY frame animation regenerated from the approved atlas's REAL
    # FIRST FRAME (not the rejected intermediate eye-down sheet).
    # All features stay composed of pixels from that exact original image.
    t=phase*math.tau
    motion_x=np.zeros((sh,sw),np.float32)
    motion_y=np.zeros((sh,sw),np.float32)

    # The WHOLE octopus is now animated, not merely re-painted pupils.
    # Body breathing: 3.7 source px in the upper head/chest, tapering to
    # zero around planted lower suction cups to prevent the feet jumping.
    head=np.exp(-.5*(((BASE_X-161)/115)**2+((BASE_Y-120)/86)**2)).astype(np.float32)
    chest=np.exp(-.5*(((BASE_X-154)/100)**2+((BASE_Y-208)/74)**2)).astype(np.float32)
    motion_y+=(-4.2*math.sin(t))*head
    motion_y+=(1.8*math.sin(t+.55))*chest
    motion_x+=(2.4*math.sin(t+.65))*head

    # Three distinct tentacle clusters sway and curl on offset cycles.
    # This gives a visible waving motion across the full sprite silhouette
    # while the original satchel and hat markings remain recognizable.
    left=np.exp(-.5*(((BASE_X-57)/50)**2+((BASE_Y-229)/53)**2)).astype(np.float32)
    right=np.exp(-.5*(((BASE_X-267)/46)**2+((BASE_Y-218)/55)**2)).astype(np.float32)
    front=np.exp(-.5*(((BASE_X-155)/68)**2+((BASE_Y-266)/31)**2)).astype(np.float32)
    motion_x+=(9.4*math.sin(t+.10))*left
    motion_y+=(3.7*math.cos(t+.25))*left
    motion_x+=(8.3*math.sin(t+2.20))*right
    motion_y+=(4.1*math.sin(t+1.60))*right
    motion_x+=(3.9*math.cos(t*2-.30))*front
    motion_y+=(2.4*math.sin(t*2-.50))*front

    # Fixed EARLY body/face design. Both pupils track together below center;
    # no independent eyelid animation, no eyebrow deformation or redrawing.
    for field in eye_fields:
        motion_x+=float(dx)*field
        motion_y+=float(dy)*field

    # During the separate water descent only, the upper body leans and
    # looks down as the lure drops. Existing body art is not redesigned.
    if bow>0:
        motion_y+=(4.5*bow)*head
        motion_x+=(1.9*bow)*chest

    warped=cv2.remap(source_rgba,
                     BASE_X-motion_x,BASE_Y-motion_y,
                     interpolation=cv2.INTER_LINEAR,
                     borderMode=cv2.BORDER_CONSTANT,
                     borderValue=(0,0,0,0))
    image=Image.fromarray(warped.astype(np.uint8),"RGBA")
    frame=Image.new("RGBA",(CELL_W,CELL_H),(0,0,0,0))
    # Uniform scale and identical foot anchor, never separate X/Y scales.
    scaled=image.resize((360,360),Image.Resampling.LANCZOS)
    left_px=round(200-156*360/sw)
    top_px=round(412-285*360/sh)
    frame.alpha_composite(scaled,(left_px,top_px))
    if bow>0:
        frame=frame.rotate(1.25*bow,Image.Resampling.BICUBIC,center=(200,412))
    return frame

# Reconstructed 16-frame full-body ORIGINAL idle: gentle bounce, breathing,
# alternating tentacle sways and downward left/right eye scan.
IDLE=[(0,0,0),(-1,1,0),(-2,2,0),(-3,3,0),
      (-3,3,0),(-2,2,0),(-1,1,0),(0,0,0),
      (0,0,0),(1,1,0),(2,2,0),(3,3,0),
      (3,3,0),(2,2,0),(1,1,0),(0,0,0)]
# Separate 16-frame full-body sinking action from the same original
# FIRST frame. Progressively tracks the lure downward without adding props.
SINK=[(0,0,0),(0,1,.06),(0,2,.12),(0,2,.24),
      (-1,3,.34),(-2,3,.46),(-2,4,.58),(-1,4,.70),
      (0,4,.80),(1,4,.88),(1,4,.94),(0,4,1),
      (0,4,1),(0,4,1),(0,4,1),(0,4,1)]
def export(name,sequence):
    sheet=Image.new("RGBA",(SHEET_W,SHEET_H),(0,0,0,0))
    for i,pose in enumerate(sequence):
      x=(i%4)*CELL_W;y=(i//4)*CELL_H
      frame=make_frame(*pose,phase=i/16)
      sheet.alpha_composite(frame,(x,y))
    png=OUT/(name+".png")
    webp=OUT/(name+".webp")
    sheet.save(png,optimize=True)
    sheet.save(webp,format="WEBP",quality=94,method=6,exact=True)
    print(name,png.stat().st_size,webp.stat().st_size)
    return sheet
idle=export("purple_idle_original_pixel_16f",IDLE)
sink=export("purple_sinking_original_pixel_16f",SINK)
# Visual QA: true approved frame-0 source versus newly animated whole-body frames.
# Visual QA: actual original sample next to regenerated first/last poses.
preview=Image.new("RGBA",(400*4,440),(0,0,0,0))
orig=Image.new("RGBA",(400,440))
orig.alpha_composite(base.resize((360,360),Image.Resampling.LANCZOS),(21,round(412-285*360/sh)))
preview.alpha_composite(orig,(0,0))
preview.alpha_composite(idle.crop((0,0,400,440)),(400,0))
preview.alpha_composite(idle.crop((1200,1320,1600,1760)),(800,0))
preview.alpha_composite(sink.crop((800,880,1200,1320)),(1200,0))
preview.save(OUT/"_qa_original_vs_new_gazes.png",optimize=True)
