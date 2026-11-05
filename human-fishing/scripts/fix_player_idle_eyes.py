from pathlib import Path
from PIL import Image
import cv2, numpy as np, hashlib
SRC=Path('human-fishing/assets/octopus/atlases/purple_idle_v2.webp')
OUT=Path('human-fishing/assets/octopus/atlases/purple_idle_eyes_synced.webp')
assert SRC.exists(),SRC
im=np.array(Image.open(SRC).convert('RGBA'))
H,W=im.shape[:2]
original=im.copy()
metrics=[]
for i in range(16):
 x0=int((i%4)*W/4+.5);x1=int(((i%4)+1)*W/4+.5)
 y0=int((i//4)*H/4+.5);y1=int(((i//4)+1)*H/4+.5)
 fr=im[y0:y1,x0:x1];orig=original[y0:y1,x0:x1]
 hsv=cv2.cvtColor(orig[:,:,:3],cv2.COLOR_RGB2HSV)
 irises=[]; whites=[]
 for (xlo,xhi,ylo,yhi) in [(128,201,90,158),(204,249,82,144)]:
  cyan=((hsv[:,:,0]>73)&(hsv[:,:,0]<100)&(hsv[:,:,1]>65)&
        (hsv[:,:,2]>40)&(orig[:,:,3]>120)).astype(np.uint8)
  region=np.zeros(cyan.shape,dtype=np.uint8)
  region[ylo:yhi,xlo:xhi]=cyan[ylo:yhi,xlo:xhi]
  n,labels,stats,centers=cv2.connectedComponentsWithStats(region,8)
  comps=sorted([j for j in range(1,n) if stats[j,cv2.CC_STAT_AREA]>8],
               key=lambda j:stats[j,cv2.CC_STAT_AREA],reverse=True)
  irises.append(centers[comps[0]] if comps else None)
  white=((hsv[:,:,1]<100)&(hsv[:,:,2]>139)&(orig[:,:,3]>110)).astype(np.uint8)
  region[:]=0;region[ylo:yhi,xlo:xhi]=white[ylo:yhi,xlo:xhi]
  n,labels,stats,centers=cv2.connectedComponentsWithStats(region,8)
  comps=sorted([j for j in range(1,n) if stats[j,cv2.CC_STAT_AREA]>30],
               key=lambda j:stats[j,cv2.CC_STAT_AREA],reverse=True)
  whites.append(centers[comps[0]] if comps else None)
 if any(v is None for v in irises+whites):
  metrics.append((i,'blink/no iris'));continue
 l,r=irises;wl,wr=whites
 normL=((l[0]-wl[0])/25,(l[1]-wl[1])/15)
 normR=((r[0]-wr[0])/16,(r[1]-wr[1])/14)
 deltaX=abs(normL[0]-normR[0])
 deltaY=abs(normL[1]-normR[1])
 if deltaX<.17 and deltaY<.18:
  metrics.append((i,'aligned',round(deltaX,2),round(deltaY,2)));continue
 # Shift BOTH irises halfway toward the same normalized gaze.
 desired=((normL[0]+normR[0])*.5,(normL[1]+normR[1])*.5)
 displacements=[]
 for eye,center,norm,radii in [(0,l,normL,(17,13)),(1,r,normR,(10,13))]:
  scaleX=25 if eye==0 else 16
  scaleY=15 if eye==0 else 14
  dx=int(round(np.clip((desired[0]-norm[0])*scaleX,-7,7)))
  dy=int(round(np.clip((desired[1]-norm[1])*scaleY,-4,4)))
  displacements.append((dx,dy))
  if dx==0 and dy==0:continue
  x,y=center;rx,ry=radii
  yy,xx=np.ogrid[:fr.shape[0],:fr.shape[1]]
  dist=((xx-x)/rx)**2+((yy-y)/ry)**2
  # soft source mask, no hard new outlines
  feather=np.clip((1.10-dist)/.27,0,1).astype('float32')
  core=(feather>.60).astype(np.uint8)*255
  # Heal only original iris area, leaving all head/hat/tentacle pixels intact.
  healed=cv2.inpaint(fr[:,:,:3],core,4,cv2.INPAINT_TELEA)
  blend=feather[:,:,None]
  fr[:,:,:3]=np.rint(fr[:,:,:3]*(1-blend)+healed*blend).astype('uint8')
  # Place original iris artwork slightly repositioned, keeping RGB exact inside.
  matrix=np.float32([[1,0,dx],[0,1,dy]])
  shifted_mask=cv2.warpAffine(feather,matrix,(fr.shape[1],fr.shape[0]),
        flags=cv2.INTER_LINEAR,borderMode=cv2.BORDER_CONSTANT,borderValue=0)
  shifted_rgb=cv2.warpAffine(orig[:,:,:3],matrix,(fr.shape[1],fr.shape[0]),
        flags=cv2.INTER_LINEAR,borderMode=cv2.BORDER_CONSTANT,borderValue=(0,0,0))
  b=shifted_mask[:,:,None]
  fr[:,:,:3]=np.rint(fr[:,:,:3]*(1-b)+shifted_rgb*b).astype('uint8')
 metrics.append((i,'adjusted',round(deltaX,2),round(deltaY,2),displacements))
OUT.parent.mkdir(parents=True,exist_ok=True)
Image.fromarray(im,'RGBA').save(OUT,'WEBP',lossless=True,method=5)
assert Image.open(OUT).size==(1254,1254)
assert np.array_equal(im[:,:,3],original[:,:,3])
print('source_sha256',hashlib.sha256(SRC.read_bytes()).hexdigest())
print('output_sha256',hashlib.sha256(OUT.read_bytes()).hexdigest())
print('frames',metrics)
print('RGB changed outside pupil zones:',np.count_nonzero(np.any(original[:,:,:3]!=im[:,:,:3],axis=-1)))
