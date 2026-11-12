/* Approved baby-human bitmap sprite renderer. Activated only after all four source PNGs install. */
(function(global){
'use strict';
var enabled=global.HumanFishingBabySpritesReady===true;
var version='20261110-baby-v1';
var paths={
 swim:'baby_swim_8f.png',
 resist:'baby_resist_8f.png',
 taunt:'baby_taunt_8f.png',
 hooked:'baby_hooked_8f.png'
};
var images=Object.create(null);
// Approved swim-only designs. Do not substitute base baby's other action art
// until matching resist/taunt/hooked sprite sheets exist for each character.
var swimVariantById={'1':'street','5':'explorer','8':'sporty','18':'vip','24':'sleepy','25':'explorer_new','26':'scientist','27':'pirate','28':'nurse','29':'athlete','30':'idol','31':'chef','32':'detective','33':'wizard','34':'angel'};
var maleSwimBoyById=global.HumanFishingMaleBoysReady===true?{
 '2':'cowboy',
 '3':'pirate',
 '4':'scientist',
 '6':'prince',
 '7':'winter',
 '9':'detective',
 '10':'aviator',
 '11':'fisherman',
 '12':'wizard',
 '13':'angel',
 '14':'scholar',
 '15':'samurai',
 '16':'ninja',
 '19':'tribal',
 '20':'engineer',
 '21':'astronaut',
 '23':'dragon_knight'
}:Object.create(null);
Object.keys(maleSwimBoyById).forEach(function(id){swimVariantById[id]='boy_'+maleSwimBoyById[id]});
var sisterSpritesEnabled=global.HumanFishingSisterSpritesReady===true;
// Asset-ready gate: never fetch absent sheets or show a different baby's art.
if(sisterSpritesEnabled){
 swimVariantById['35']='sister_rabbit'; // smaller older sister
 swimVariantById['36']='sister_shark';  // bigger older sister
 swimVariantById['37']='sister_cat';    // bigger older sister
}
var swimVariants=Object.create(null);
if(enabled){
 Object.keys(paths).forEach(function(state){
  var img=new Image(); // Tracked by boot.js: decode all assets before gameplay.
  img.decoding='async';
  img.src='./assets/humans/'+paths[state]+'?v='+(state==='hooked'?'20261110-hooked-v2':version);
  images[state]=img;
 });
 Object.keys(swimVariantById).forEach(function(id){
  var variant=swimVariantById[id],img=new Image(); // Boot preloads this resource.
  img.decoding='async';
  img.src=maleSwimBoyById[id]?
   './assets/humans/male-concepts/baby_swim_boy_'+maleSwimBoyById[id]+'_8f.png?v=20261112-male17-alpha-holes-v3':
   './assets/humans/baby_swim_'+variant+'_8f.png?v='+(Number(id)===36?'20261112-shark-original-v6':Number(id)>=35?'20261112-sisters-boundary-v4':Number(id)>=24?'20261111-human-swim11-alpha-v4':'20261111-human-swim4-v1');
  swimVariants[id]=img;
 });
}
function imageFor(id,action){
 var special=swimVariants[String(Number(id))];
 return special||images[paths[action]?action:'swim']||null;
}
// Athlete (human #29) sheet has some neighbor-frame fragments along cell edges.
// Prepare each of its 8 cells on an independent transparent canvas. Preserve
// the approved source PNG and every other character's atlas and animations.
var athleteFrameCache=new WeakMap();
function athleteFrameAt(frame){
 var img=swimVariants['29'];
 if(!img||!img.complete||!img.naturalWidth||!img.naturalHeight)return null;
 if(img.naturalWidth!==1774&&img.naturalWidth!==1776)return null;
 if(img.naturalHeight!==887&&img.naturalHeight!==888)return null;
 var cached=athleteFrameCache.get(img);
 if(!cached){cached=new Array(8);athleteFrameCache.set(img,cached)}
 frame=((Math.floor(frame)||0)%8+8)%8;
 if(cached[frame])return cached[frame];
 if(typeof document==='undefined'||!document.createElement)return null;
 var col=frame%4,row=Math.floor(frame/4);
 var sx=Math.round(col*img.naturalWidth/4),sy=Math.round(row*img.naturalHeight/2);
 var sw=Math.round((col+1)*img.naturalWidth/4)-sx;
 var sh=Math.round((row+1)*img.naturalHeight/2)-sy;
 var tile=document.createElement('canvas');tile.width=sw;tile.height=sh;
 var g=tile.getContext('2d',{willReadFrequently:true});
 if(!g)return null;
 // 1px guard prevents linear sampling of the neighboring atlas cell.
 g.drawImage(img,sx+1,sy+1,sw-2,sh-2,1,1,sw-2,sh-2);
 var pixel;
 try{pixel=g.getImageData(0,0,sw,sh)}catch(_){cached[frame]=tile;return tile}
 var d=pixel.data,n=sw*sh,labels=new Int32Array(n),queue=new Int32Array(n);
 var comps=[null],next=0;
 // Eight-connected opaque silhouettes: a detached neighbor-cell fragment
 // touches a cell edge, while the central athlete is the largest component.
 for(var i=0;i<n;i++){
  if(labels[i]||d[i*4+3]<36)continue;
  var component=++next,head=0,tail=1,size=0,edge=false;
  queue[0]=i;labels[i]=component;
  while(head<tail){
   var p=queue[head++],x=p%sw,y=(p/sw)|0;
   size++;
   if(x<3||y<3||x>=sw-3||y>=sh-3)edge=true;
   for(var dy=-1;dy<=1;dy++)for(var dx=-1;dx<=1;dx++){
    if(!dx&&!dy)continue;
    var nx=x+dx,ny=y+dy;
    if(nx<0||ny<0||nx>=sw||ny>=sh)continue;
    var k=ny*sw+nx;
    if(!labels[k]&&d[k*4+3]>=36){labels[k]=component;queue[tail++]=k}
   }
  }
  comps[component]={size:size,edge:edge};
 }
 var primary=0;
 for(var c=1;c<comps.length;c++)
  if(!primary||comps[c].size>comps[primary].size)primary=c;
 // Remove only secondary, BORDER-CONNECTED islands. Interior accessories
 // and detached painted details are deliberately retained.
 var discard=new Uint8Array(n);
 for(var j=0;j<n;j++){
  var label=labels[j];
  if(label&&label!==primary&&comps[label].edge)discard[j]=1;
 }
 // Include 2px antialias fringe of excluded islands in the cleanup mask.
 var expanded=new Uint8Array(n);
 for(var j=0;j<n;j++)if(discard[j]){
  var px=j%sw,py=(j/sw)|0;
  for(var yy=Math.max(0,py-2);yy<=Math.min(sh-1,py+2);yy++)
   for(var xx=Math.max(0,px-2);xx<=Math.min(sw-1,px+2);xx++)
    expanded[yy*sw+xx]=1;
 }
 for(var j=0;j<n;j++)if(expanded[j]||d[j*4+3]<10){
  d[j*4]=d[j*4+1]=d[j*4+2]=d[j*4+3]=0;
 }
 g.putImageData(pixel,0,0);
 cached[frame]=tile;
 return tile;
}
// ID 8 (잠수부): remove the white, semi-transparent matte/fog outside the
// approved silhouette. This is a display-only RGBA correction: do not touch
// the source PNG, character design, animation order or collision geometry.
var diverFrameCache=new WeakMap();
function diverFrameAt(frame){
 var img=swimVariants['8'];
 if(!img||!img.complete||img.naturalWidth!==1448||img.naturalHeight!==1086)return null;
 if(typeof document==='undefined'||!document.createElement)return null;
 var saved=diverFrameCache.get(img);
 if(!saved){saved=new Array(8);diverFrameCache.set(img,saved)}
 frame=((Math.floor(frame)||0)%8+8)%8;
 if(saved[frame])return saved[frame];
 var col=frame%4,row=Math.floor(frame/4),w=362,h=543;
 var canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
 var g=canvas.getContext('2d',{willReadFrequently:true});
 if(!g)return null;
 g.drawImage(img,col*w,row*h,w,h,0,0,w,h);
 var pixels;
 try{pixels=g.getImageData(0,0,w,h)}catch(_){saved[frame]=canvas;return canvas}
 var rgba=pixels.data,total=w*h,dist=new Uint8Array(total);
 // The solid, colored subject is the reference for deciding whether an
 // almost-white translucent pixel is a real highlight or exterior fog.
 for(var i=0;i<total;i++){
  var off=i*4,a=rgba[off+3],r=rgba[off],green=rgba[off+1],b=rgba[off+2];
  var nearWhite=r>=205&&green>=205&&b>=205&&
   Math.max(r,green,b)-Math.min(r,green,b)<44;
  dist[i]=a>=215&&!nearWhite?0:15;
 }
 // Two-pass Chebyshev-distance transform; bounded cost and no blur on art.
 for(var y=0;y<h;y++)for(var x=0;x<w;x++){
  var p=y*w+x,d=dist[p];
  if(x)d=Math.min(d,dist[p-1]+1);
  if(y){d=Math.min(d,dist[p-w]+1);
   if(x)d=Math.min(d,dist[p-w-1]+1);
   if(x+1<w)d=Math.min(d,dist[p-w+1]+1)}
  dist[p]=d;
 }
 for(var y=h-1;y>=0;y--)for(var x=w-1;x>=0;x--){
  var p=y*w+x,d=dist[p];
  if(x+1<w)d=Math.min(d,dist[p+1]+1);
  if(y+1<h){d=Math.min(d,dist[p+w]+1);
   if(x)d=Math.min(d,dist[p+w-1]+1);
   if(x+1<w)d=Math.min(d,dist[p+w+1]+1)}
  dist[p]=d;
 }
 for(var i=0;i<total;i++){
  var off=i*4,a=rgba[off+3];if(!a)continue;
  var r=rgba[off],green=rgba[off+1],b=rgba[off+2];
  var light=Math.min(r,green,b)>=184 &&
   Math.max(r,green,b)-Math.min(r,green,b)<=58;
  var d=dist[i];
  if(a<=9){rgba[off+3]=0;continue}
  if(!light||a>=252)continue;
  // Remove detached/cloudy background; soften only the very thin white
  // premultiplied matte near the actual silhouette.
  if(d>=5)rgba[off+3]=0;
  else if(d>=3)rgba[off+3]=Math.round(a*.16);
  else if(d<=2&&a<210){
   // A near-white RGB matte can remain visible even after alpha trimming.
   // Replace only this soft boundary fringe with the nearest solid costume
   // color; do not recolor opaque white equipment/highlights.
   var cx=i%w,cy=(i/w)|0,found=false;
   for(var rad=1;rad<=2&&!found;rad++){
    for(var oy=-rad;oy<=rad&&!found;oy++)
     for(var ox=-rad;ox<=rad;ox++){
      if(Math.max(Math.abs(ox),Math.abs(oy))!==rad)continue;
      var nx=cx+ox,ny=cy+oy;
      if(nx<0||ny<0||nx>=w||ny>=h)continue;
      var z=(ny*w+nx)*4,pr=rgba[z],pg=rgba[z+1],pb=rgba[z+2];
      if(rgba[z+3]<215||pr>=205&&pg>=205&&pb>=205)continue;
      rgba[off]=pr;rgba[off+1]=pg;rgba[off+2]=pb;found=true;break;
     }
   }
   rgba[off+3]=Math.round(a*(d===1?.68:.42));
  }
 }
 g.putImageData(pixels,0,0);
 saved[frame]=canvas;
 return canvas;
}
// Keep geometry in the same coordinate frame as the approved 8-frame PNG.
 // The source pose looks right; negative vx mirrors it consistently.
var HUMAN_WORLD_RENDER_BOOST=1.295; // shared approved base scale
// Original human designs (IDs 0-23) contain larger bitmap silhouettes
// than the new swim designs (24-34). Normalize ONLY live-world scale.
// Codex/catch portraits are unaffected; no PNG bytes are changed.
var ORIGINAL_HUMAN_WORLD_SCALE=.72;
// Restore the baby's face readability after the 0.70 reduction.
// ID 0-23: original baby-boy design; ID 24-34: newer baby-girl designs.
// Sister IDs 35-37 keep their current world scale and approved PNGs.
var BABY_BOY_WORLD_SCALE=.90;  // 28.6% larger than the previous .70
var BABY_GIRL_WORLD_SCALE=.84; // 20% larger than the previous .70
var SLEEPY_GIRL_WORLD_SCALE=.96; // ID 24 only: reduce apparent size by 4%
function humanDesignWorldScale(id){
 var n=Number(id);
 if(!Number.isInteger(n)||n<0)return 1;
 if(n<24)return ORIGINAL_HUMAN_WORLD_SCALE*BABY_BOY_WORLD_SCALE;
 if(n===24)return BABY_GIRL_WORLD_SCALE*SLEEPY_GIRL_WORLD_SCALE;
 if(n<35)return BABY_GIRL_WORLD_SCALE;
 return 1; // sister sizes stay unchanged
}
function sisterWorldScale(id){
 return Number(id)===35?1.60:Number(id)===36?1.58:Number(id)===37?1.40:1;
}
// Only the 17 newly installed male swimming designs receive this world-space
// readability adjustment. Preserve their original PNG bytes and 8-frame atlas.
// IDs 0, 1, 5, 8, 17, 18, 22 and all girls/sisters remain unchanged.
var NEW_MALE_SWIM_WORLD_SCALE=1.25;
var NEW_MALE_FIXED_WORLD_SCALE=1.12;
function maleBabyNewScale(id){
 var concept=maleSwimBoyById[String(Number(id))];
 if(!concept)return 1;
 // The engineer and astronaut already match the older baby's face scale.
 return concept==='engineer'||concept==='astronaut'?NEW_MALE_FIXED_WORLD_SCALE:NEW_MALE_SWIM_WORLD_SCALE;
}
function poseGeometry(actor){
 var id=Number(actor&&actor.id),size=Math.max(.7,Math.min(1.8,Number(actor&&actor.size)||1));
 var sister=id>=35&&id<=37;
 var scale=.36*size*(id>=20&&id<24?1.05:1)*HUMAN_WORLD_RENDER_BOOST*
  humanDesignWorldScale(id)*sisterWorldScale(id)*maleBabyNewScale(id);
 var facing=Number(actor&&(actor.vx||actor.dir)||1)<0?-1:1;
 var x=Number(actor&&actor.x)||0,y=Number(actor&&actor.y)||0;
 var width=362*scale,height=maleSwimBoyById[String(id)]?width:sister?width*(id===35?362/543:1):543*scale;
 // Each sister has a separate bitmap aspect ratio. The head leads left
 // in the approved sprites and mirrors to the right when vx is positive.
 // Fishing weakspot/contact geometry follows the actual displayed artwork.
 var mouthY=id===35?y-20*size:id===36||id===37?y-10*size:y+height*.09-8;
 var mouthRX=sister?(id===35?9:8):id>=20&&id<24?8:12;
 var mouthRY=sister?(id===35?7:6):id>=20&&id<24?6.5:9;
 return{width:width,height:height,scale:scale,facing:facing,
  mouth:{x:x+facing*width*.34,y:mouthY,rx:mouthRX,ry:mouthRY,facing:facing},
  body:{x:x,y:y+(sister?-3:height*.02-8),rx:width*(sister?.40:.43),ry:height*(sister?.39:.30)}};
}
function render(ctx,actor,now,action){
 if(!enabled||!actor)return false;
 // These four new variants ONLY have swim art. Keep their appearance
 // consistent in capture, resistance, escape and other animation states.
 var newSwim=swimVariants[String(Number(actor.id))]||null;
 var maleBoy=!!maleSwimBoyById[String(Number(actor.id))];
 var mood=newSwim?'swim':paths[action]?action:'swim',img=newSwim||images[mood];
 var sheet=mood==='hooked'?{w:1776,h:888,fw:444,fh:444}:{w:1448,h:1086,fw:362,fh:543};
 if(newSwim&&actor.id>=25)sheet={w:1776,h:888,fw:444,fh:444};
 if(maleBoy)sheet={w:1774,h:887,fw:443.5,fh:443.5};
 if(newSwim&&Number(actor.id)===35)sheet={w:2172,h:724,fw:543,fh:362};
 // Preserve user-provided source PNG bytes; original grids may be 1774x887.
 if(newSwim&&actor.id>=25&&img&&img.naturalWidth===1774&&img.naturalHeight===887)
  sheet={w:1774,h:887,fw:443.5,fh:443.5};
 if(!img||!img.complete||img.naturalWidth!==sheet.w||img.naturalHeight!==sheet.h)return false;
 // Human motion reads slightly slower without changing travel speed or catch physics.
 var HUMAN_ANIMATION_SPEED=.85;
 var fps=(mood==='resist'?13:mood==='hooked'?12:mood==='taunt'?11:8)*HUMAN_ANIMATION_SPEED;
 var phase=Number.isFinite(actor.phase)?actor.phase:0;
 var motionTime=mood==='swim'&&Number.isFinite(actor.swimAnimationClock)?
  actor.swimAnimationClock:Math.max(0,now||0);
 var frame=(Math.floor(motionTime*fps+phase*1.5)%8+8)%8;
 var col=frame%4,row=Math.floor(frame/4),fw=sheet.fw,fh=sheet.fh;
 var size=Math.max(.7,Math.min(1.8,Number(actor.size)||1));
 // Display-only scale: humans are more prominent than even large fish.
 // Never change actor.size or fishing hitbox/weakspot physics.
 var scale=(mood==='hooked'?.33:.36)*size*(actor.id>=20&&actor.id<24?1.05:1)*HUMAN_WORLD_RENDER_BOOST*
  humanDesignWorldScale(actor.id)*maleBabyNewScale(actor.id);
 if(newSwim&&actor.id>=25)scale*=362/fw;
 if(maleBoy)scale*=362/fw; // match live image cell width, including updated rabbit
 if(newSwim&&actor.id>=35)scale*=sisterWorldScale(actor.id);
 // Shark source was repacked to add a 3.5% transparent guard on all sides.
 // Counter-scale that guard only in rendering, preserving its prior visible
 // size and the existing capture hitboxes/weakspots.
 if(newSwim&&Number(actor.id)===36)scale*=1/.93;
 var facing=Number(actor.vx||actor.dir||1)<0?-1:1;
 ctx.save();
 ctx.translate(Number(actor.x)||0,Number(actor.y)||0);
 ctx.scale(newSwim&&(actor.id>=24||maleBoy)?-facing:facing,1);
 var sx=Math.round(col*sheet.w/4),sy=Math.round(row*sheet.h/2);
 var sourceW=Math.round((col+1)*sheet.w/4)-sx,sourceH=Math.round((row+1)*sheet.h/2)-sy;
 var actorId=Number(actor.id);
 var cleanFrame=newSwim&&(actorId===29?athleteFrameAt(frame):
  actorId===8?diverFrameAt(frame):null);
 if(cleanFrame)
  ctx.drawImage(cleanFrame,0,0,cleanFrame.width,cleanFrame.height,-fw*scale*.5,-fh*scale*.5-8,fw*scale,fh*scale);
 else
  ctx.drawImage(img,sx,sy,sourceW,sourceH,-fw*scale*.5,-fh*scale*.5-8,fw*scale,fh*scale);
 ctx.restore();
 return true;
}
global.HumanFishingBabySprites={enabled:enabled,images:images,
 swimVariants:swimVariants,swimVariantById:swimVariantById,imageFor:imageFor,
 sisterSpritesReady:sisterSpritesEnabled,sisterWorldScale:sisterWorldScale,
 frameFor:function(id,frame){return Number(id)===29?athleteFrameAt(frame):
  Number(id)===8?diverFrameAt(frame):null},
 render:render,geometry:poseGeometry};
})(window);
