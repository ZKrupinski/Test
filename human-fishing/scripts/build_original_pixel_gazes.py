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

def make_frame(dx,dy,bow=0,phase=0):
    # Start from exact approved source RGBA for every frame.
    # The 2D remap displaces existing pixels only; never paint new shapes.
    # Eye movement has become clearly readable at gameplay size, while both
    # eyes share one direction and the fixed original eyelids stay intact.
    motion_x=np.zeros((sh,sw),np.float32)
    motion_y=np.zeros((sh,sw),np.float32)
    for field in eye_fields:
        motion_x+=float(dx)*field
        motion_y+=float(dy)*field

    # Original-art secondary idle movement:
    # tiny natural head/body breath, plus opposing elastic tentacle sways.
    # These localized Gaussian fields vanish before the planted foot line.
    breathe=math.sin(phase*math.tau)
    head_field=np.exp(-.5*(((BASE_X-162)/119)**2+((BASE_Y-119)/94)**2)).astype(np.float32)
    motion_y+=(-2.6*breathe)*head_field
    left_field=np.exp(-.5*(((BASE_X-56)/47)**2+((BASE_Y-228)/39)**2)).astype(np.float32)
    right_field=np.exp(-.5*(((BASE_X-266)/40)**2+((BASE_Y-220)/42)**2)).astype(np.float32)
    front_field=np.exp(-.5*(((BASE_X-152)/78)**2+((BASE_Y-263)/25)**2)).astype(np.float32)
    motion_x+=(5.3*math.sin(phase*math.tau+.25))*left_field
    motion_x+=(5.8*math.sin(phase*math.tau+2.05))*right_field
    motion_y+=(2.5*math.sin(phase*math.tau*2-.6))*front_field

    # Small expressive movement of the ORIGINAL eyes, never black circles,
    # recoloring, pupil extraction or misplaced white highlights.
    remap=cv2.remap(source_rgba,
                    BASE_X-motion_x,BASE_Y-motion_y,
                    interpolation=cv2.INTER_LINEAR,
                    borderMode=cv2.BORDER_REPLICATE)
    output=remap.astype(np.uint8)
    # Unmoved pixels retain their exact RGBA values.
    unchanged=(np.abs(motion_x)<1e-5)&(np.abs(motion_y)<1e-5)
    output[unchanged]=source_rgba[unchanged]
    canvas=Image.fromarray(output,"RGBA")
    frame=Image.new("RGBA",(CELL_W,CELL_H),(0,0,0,0))
    scaled=canvas.resize((360,360),Image.Resampling.LANCZOS)
    left=round(200-156*360/sw)
    top=round(412-285*360/sh)
    frame.alpha_composite(scaled,(left,top))
    if bow>0:
        # Only the bait-descending pose bends 1.6 degrees maximum.
        frame=frame.rotate(1.6*bow,Image.Resampling.BICUBIC,center=(200,412))
    return frame

# Smile stays friendly. Head does NOT bow during Idle; eyes clearly search
# down-left, then down-right. Pupil travel peaks at ~5 px on the GAME canvas.
# The body breathes and tentacles sway in counterphase across all 16 frames.
IDLE=[(0,1,0),(-2,2,0),(-4,3,0),(-6,4,0),
      (-6,4,0),(-4,3,0),(-2,2,0),(0,1,0),
      (0,1,0),(2,2,0),(4,3,0),(6,4,0),
      (6,4,0),(4,3,0),(2,2,0),(0,1,0)]
# Cast sinking: watch the lure move downward and gently bend toward the water.
SINK=[(0,1,0),(0,2,.06),(0,3,.14),(0,4,.22),
      (-1,5,.31),(-1,6,.42),(-1,7,.53),(-1,7,.63),
      (0,7,.73),(0,7,.82),(0,7,.90),(0,7,.96),
      (0,7,1),(0,7,1),(0,7,1),(0,7,1)]
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
# Visual QA: actual original sample next to regenerated first/last poses.
preview=Image.new("RGBA",(400*4,440),(0,0,0,0))
orig=Image.new("RGBA",(400,440))
orig.alpha_composite(base.resize((360,360),Image.Resampling.LANCZOS),(21,round(412-285*360/sh)))
preview.alpha_composite(orig,(0,0))
preview.alpha_composite(idle.crop((0,0,400,440)),(400,0))
preview.alpha_composite(idle.crop((1200,1320,1600,1760)),(800,0))
preview.alpha_composite(sink.crop((800,880,1200,1320)),(1200,0))
preview.save(OUT/"_qa_original_vs_new_gazes.png",optimize=True)
