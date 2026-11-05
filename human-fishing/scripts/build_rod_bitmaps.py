#!/usr/bin/env python3
"""Six transparent high-resolution bitmap fishing rods (no runtime vector rod geometry)."""
from pathlib import Path
from PIL import Image, ImageDraw
import argparse,math,random

S=5
OX,OY,W,H=484,106,210,160
STYLES={
 'cork': ('#916743','#f0c78b','#422a31','#ce8754','#7b4e46','#e9c7a0','#ba9165','classic'),
 'bamboo':('#7d9a56','#d4e6a0','#344a32','#c4a55d','#416a59','#e4d79d','#a27d45','leaf'),
 'marine':('#407f96','#b7e4e9','#173d57','#36b9c6','#1b596b','#d3edf4','#234c6c','fin'),
 'carbon':('#3c414c','#b6b9c4','#101720','#cd5358','#292b36','#dadce0','#283440','mesh'),
 'titan': ('#9da9a7','#faf3cc','#42535b','#ecc777','#49656c','#fff2cf','#748583','wings'),
 'abyss': ('#412858','#bd8df2','#17152b','#57e0e0','#281a43','#e3b4ff','#35214a','rune'),
}
def rgba(value,alpha=255):
 if not isinstance(value,str):return value
 s=value.lstrip('#')
 return tuple(int(s[i:i+2],16) for i in (0,2,4))+(alpha,)
def pt(x,y):return ((x-OX)*S,(y-OY)*S)
def bez(a,b,c,d,t):
 v=1-t
 return (v*v*v*a[0]+3*v*v*t*b[0]+3*v*t*t*c[0]+t*t*t*d[0],v*v*v*a[1]+3*v*v*t*b[1]+3*v*t*t*c[1]+t*t*t*d[1])
def line(draw,points,color,width):
 coords=[pt(*p) for p in points];ink=rgba(color)
 draw.line(coords,fill=ink,width=max(1,round(width*S)),joint='curve')
 for x,y in (coords[0],coords[-1]):
  r=width*S/2;draw.ellipse((x-r,y-r,x+r,y+r),fill=ink)
def disc(draw,x,y,r,fill,outline=None):
 cx,cy=pt(x,y);r*=S
 draw.ellipse((cx-r,cy-r,cx+r,cy+r),fill=rgba(fill),outline=rgba(outline) if outline else None,width=S if outline else 1)
def polygon(draw,points,fill,outline=None):
 coords=[pt(*p) for p in points]
 draw.polygon(coords,fill=rgba(fill))
 if outline:draw.line(coords+[coords[0]],fill=rgba(outline),width=max(1,S//2),joint='curve')
def render(name,config,path):
 body,inlay,edge,accent,reel,metal,grip,motif=config
 rng=random.Random('human-fishing/'+name)
 image=Image.new('RGBA',(W*S,H*S),(0,0,0,0));d=ImageDraw.Draw(image,'RGBA')
 # Resting upper shaft ends precisely at the rope physics anchor 640,141.
 A,B,C,D=(538,193),(558,187),(609,150),(640,141)
 curve=[bez(A,B,C,D,i/90) for i in range(91)]
 line(d,curve,edge,7)
 for i in range(90):
  t=(i+.5)/90
  line(d,[curve[i],curve[i+1]],body,5.1*(1-t)+1.45*t)
 line(d,[(x,y-1.7*(1-i/90)) for i,(x,y) in enumerate(curve)],rgba(inlay,190),1.1)
 for _ in range(86):
  t=rng.random()*.88;q=bez(A,B,C,D,t)
  if rng.random()<.7:disc(d,q[0]+rng.uniform(-1.7,1.7),q[1]+rng.uniform(-2,2),rng.uniform(.12,.4),rgba(inlay,rng.randrange(65,185)))
 for t in (.14,.34,.57,.79):
  q=bez(A,B,C,D,t);q2=bez(A,B,C,D,t+.01)
  a=math.atan2(q2[1]-q[1],q2[0]-q[0]);nx=-math.sin(a);ny=math.cos(a)
  bar=[(q[0]+nx*k,q[1]+ny*k) for k in (-4,4)]
  line(d,bar,edge,3.2);line(d,bar,metal,1.45)
  if t>.14:polygon(d,[(q[0]-3,q[1]-3),(q[0],q[1]-8),(q[0]+4,q[1]-4),(q[0]+1,q[1]-1)],metal,edge)
 disc(d,640,141,2.1,metal,edge);disc(d,640,141,.75,'#fff3e2')
 # Solid butt, wrapped grip and reel, distinct from the slender upper shaft.
 gripcurve=[(508,212),(521,206),(542,191),(557,182)]
 line(d,gripcurve,edge,17);line(d,gripcurve,grip,12)
 line(d,[(508,210.2),(521,203.7),(542,188.8),(555,180.8)],rgba(inlay,170),2.2)
 for u in range(8):
  t=u/9;x=508+(543-508)*t;y=212+(191-212)*t
  polygon(d,[(x-1.5,y-3),(x+.5,y-6),(x+5,y-3),(x+3,y+.1)],edge)
 for x,y,r,ink in [(560,204,18.4,edge),(560,204,15.4,metal),(560,204,12.7,reel),(560,204,9.9,body),(560,204,4.2,metal)]:
  disc(d,x,y,r,ink)
 for k in range(6):
  a=math.tau*k/6+.18
  disc(d,560+8*math.cos(a),204+8*math.sin(a),1.65,metal)
 line(d,[(568,208),(578,216)],edge,5.5);line(d,[(568,208),(578,216)],metal,3.2)
 disc(d,579,217,5.1,edge);disc(d,579,217,3.7,grip)
 if motif=='classic':
  polygon(d,[(519,197),(525,191),(529,194),(524,200)],'#f3d7ac',edge)
  for x,y in [(535,191),(549,181)]:disc(d,x,y,1.3,'#ffe7bd')
 elif motif=='leaf':
  polygon(d,[(546,186),(560,172),(559,182)],'#b9d88a',edge)
  polygon(d,[(550,192),(569,188),(561,198)],'#718f57',metal)
  for t in (.25,.48,.69):
   q=bez(A,B,C,D,t);disc(d,*q,1.8,'#c5e69b')
 elif motif=='fin':
  polygon(d,[(542,182),(555,161),(562,181),(556,186)],'#5cbace',edge)
  polygon(d,[(547,189),(566,182),(571,196),(553,197)],'#2c677f',metal)
  disc(d,560,204,2.3,'#68dbe1')
 elif motif=='mesh':
  for i in range(14):
   x=511+i*2.5;y=211-i*1.42
   line(d,[(x,y-3),(x+2,y+1)],rgba(inlay,100),.55)
  polygon(d,[(544,181),(554,169),(563,178),(556,185)],'#8c424e',edge)
 elif motif=='wings':
  polygon(d,[(538,188),(551,165),(563,176),(556,185)],'#e4d4a3',edge)
  polygon(d,[(550,186),(569,177),(573,189),(557,193)],'#a6c9c6',metal)
  disc(d,558,179,2.4,'#fce8b0')
 elif motif=='rune':
  polygon(d,[(535,190),(547,163),(554,181),(561,175),(565,188),(551,193)],'#513d75',metal)
  polygon(d,[(559,177),(564,185),(559,191),(554,185)],'#69f0e6',edge)
  for i in range(3):
   q=bez(A,B,C,D,.33+i*.24);disc(d,*q,1.65,'#ad8ff5')
 path.parent.mkdir(parents=True,exist_ok=True)
 image.save(path,optimize=True)
 print(name,path,image.size)
if __name__=='__main__':
 cli=argparse.ArgumentParser();cli.add_argument('--output',default='human-fishing/assets/rods');args=cli.parse_args()
 for key,style in STYLES.items():render(key,style,Path(args.output)/(key+'.png'))
