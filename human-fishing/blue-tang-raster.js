/* HUMAN FISHING — Blue Tang stable-pivot bitmap animator.
   All 14 actions keep the fish's torso on one anchor.
   Cyclic swimming deforms the original raster tail instead of alternating
   AI-generated whole-body positions. No image-generation services used.
*/
(function(){
'use strict';
var prefix='https://d8j0ntlcm91z4.cloudfront.net/user_3KlCHKRIJO34SPkOC5UMUPo7vEp/';
var filenames={
 idle:'hf_20261104_100641_3c527397-1343-4e2b-b02f-fb725b4ba0a1.png',
 burst:'hf_20261104_100640_81173288-35ec-4a45-b315-8ab6d65b925d.png',
 uturn:'hf_20261104_100640_c3aabcfa-9b29-4b5d-a631-d9b50a539448.png',
 inspect:'hf_20261104_102226_494fe4f5-7b18-4bd8-9251-58f913f0bfcf.png',
 bite:'hf_20261104_102155_2a21a582-2d75-40aa-8c31-dbf6479ad701.png',
 hooked:'hf_20261104_102227_4da929b1-c5d7-4bd2-8f60-5e0f2917a075.png'
};
var actions=['idle','swim','burst','uturn','notice','inspect','graze','bite',
 'hooked','lift','last_resist','slip','reentry','flee'];
var sourceOf={idle:'idle',swim:'swim',burst:'burst',uturn:'uturn',
 notice:'idle',inspect:'inspect',graze:'burst',bite:'bite',
 hooked:'hooked',lift:'hooked',last_resist:'hooked',slip:'burst',
 reentry:'burst',flee:'flee'};
var ms={idle:132,swim:95,burst:69,uturn:80,notice:115,inspect:125,
 graze:55,bite:70,hooked:73,lift:82,last_resist:64,slip:67,reentry:70,flee:58};
var oneShot={uturn:1,notice:1,graze:1,bite:1,lift:1,slip:1,reentry:1};
var atlas={},status={},previewAction=null,loading=false;
var queue=['idle','uturn','hooked','burst','inspect','bite'];
var SIZE=1024,CW=512,CH=256;
function makeCanvas(w,h){
 var c=document.createElement('canvas');c.width=w;c.height=h;return c;
}
function clamp(x,min,max){return Math.max(min,Math.min(max,x))}
function clampBox(b){
 return {x0:clamp(b.x0,0,CW),y0:clamp(b.y0,0,CH),
 x1:clamp(b.x1,0,CW),y1:clamp(b.y1,0,CH)};
}
function alphaBounds(data,i){
 var x0=CW,y0=CH,x1=0,y1=0,gx=(i%2)*CW,gy=(i>>1)*CH;
 for(var y=0;y<CH;y+=2)for(var x=0;x<CW;x+=2){
  if(data[((gy+y)*SIZE+gx+x)*4+3]>42){
   if(x<x0)x0=x;if(y<y0)y0=y;if(x>x1)x1=x;if(y>y1)y1=y;
  }
 }
 return x1<=x0||y1<=y0?null:
  clampBox({x0:x0-2,y0:y0-2,x1:x1+4,y1:y1+4});
}
// Keep the cobalt-blue torso still while fins and the yellow tail change.
function torsoAnchor(data,f,b){
 var sx=0,sy=0,n=0,gx=f%2*CW,gy=(f>>1)*CH;
 for(var y=Math.ceil(b.y0/2)*2;y<b.y1;y+=2)
  for(var x=Math.ceil(b.x0/2)*2;x<b.x1;x+=2){
   var p=((gy+y)*SIZE+gx+x)*4,a=data[p+3],r=data[p],g=data[p+1],blue=data[p+2];
   if(a<55||blue<68||blue<r*1.2||blue<g*1.05)continue;
   var w=a*(.7+Math.min(2,(blue-r)/110));
   sx+=x*w;sy+=y*w;n+=w;
  }
 return n>1500?{x:sx/n,y:sy/n}:
  {x:b.x0+.6*(b.x1-b.x0),y:(b.y0+b.y1)*.5};
}
function makeNormalized(raw,kind){
 var data;
 try{data=raw.getContext('2d',{willReadFrequently:true}).getImageData(0,0,SIZE,SIZE).data}
 catch(e){return raw}
 var bounds=[],safe=[];
 for(var i=0;i<8;i++){
  var b=alphaBounds(data,i);bounds[i]=b;
  if(b&&b.x0>9&&b.y0>9&&b.x1<CW-9&&b.y1<CH-9)safe.push(i);
 }
 if(!safe.length)return raw;
 var widths=safe.map(function(i){return bounds[i].x1-bounds[i].x0})
  .sort(function(a,b){return a-b});
 var fixedScale=clamp(318/(widths[Math.floor(widths.length/2)]||305),.72,1.28);
 var poses=[],left=0,right=0,top=0,bottom=0;
 for(var f=0;f<8;f++){
  var selected=f,b=bounds[f];
  if(!b||b.x0<=9||b.y0<=9||b.x1>=CW-9||b.y1>=CH-9){
   selected=safe.reduce(function(best,v){
    return Math.abs(v-f)<Math.abs(best-f)?v:best;
   },safe[0]);b=bounds[selected];
  }
  var torso=torsoAnchor(data,selected,b);
  poses.push({f:selected,b:b,torso:torso});
  left=Math.max(left,torso.x-b.x0);right=Math.max(right,b.x1-torso.x);
  top=Math.max(top,torso.y-b.y0);bottom=Math.max(bottom,b.y1-torso.y);
 }
 // The same exact scale applies to all eight frames; no zoom pumping.
 var pivotX=CW*.51,pivotY=CH*.52;
 fixedScale=Math.min(fixedScale,(pivotX-27)/Math.max(1,left),
  (CW-pivotX-27)/Math.max(1,right),(pivotY-23)/Math.max(1,top),
  (CH-pivotY-23)/Math.max(1,bottom));
 var result=makeCanvas(SIZE,SIZE),g=result.getContext('2d');
 g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
 for(var j=0;j<8;j++){
  var q=poses[j],b=q.b,p=q.torso;
  g.drawImage(raw,(q.f%2)*CW+b.x0,(q.f>>1)*CH+b.y0,
   b.x1-b.x0,b.y1-b.y0,
   (j%2)*CW+pivotX+(b.x0-p.x)*fixedScale,
   (j>>1)*CH+pivotY+(b.y0-p.y)*fixedScale,
   (b.x1-b.x0)*fixedScale,(b.y1-b.y0)*fixedScale);
 }
 return result;
}
/* Build 8 smoothly continuous raster swim poses from ONE locked body frame.
   Vertical pixel-strip deformation is strong at the tail, vanishes at the
   head. The body never slides horizontally or snaps to a new pose. */
function tailCycle(sheet,sourceFrame,amplitude){
 var result=makeCanvas(SIZE,SIZE),g=result.getContext('2d');
 var sx=(sourceFrame%2)*CW,sy=(sourceFrame>>1)*CH,bounds=null;
 try{bounds=alphaBounds(sheet.getContext('2d',{willReadFrequently:true})
  .getImageData(0,0,SIZE,SIZE).data,sourceFrame)}catch(e){}
 var tailX=bounds?bounds.x0:76;
 var stopX=bounds?bounds.x0+(bounds.x1-bounds.x0)*.56:278;
 g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
 for(var i=0;i<8;i++){
  var phase=i*Math.PI/4,dx=(i%2)*CW,dy=(i>>1)*CH;
  for(var x=0;x<CW;x+=4){
   var rear=clamp((stopX-x)/Math.max(1,stopX-tailX),0,1);
   // The blue torso is never translated. Only the rear body swishes.
   var shift=amplitude*rear*rear*Math.sin(phase+2*(1-rear));
   var width=Math.min(5,CW-x);
   g.drawImage(sheet,sx+x,sy,width,CH,dx+x,dy+shift,width,CH);
  }
 }
 return result;
}
function loadNext(){
 if(loading||!queue.length)return;
 var kind=queue.shift(),image=new Image();
 loading=true;status[kind]='loading';
 image.onload=function(){
  try{
   var raw=makeCanvas(SIZE,SIZE),g=raw.getContext('2d',{alpha:true});
   g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
   g.drawImage(image,0,0,SIZE,SIZE);
   var aligned=makeNormalized(raw,kind);
   // Keep readable artwork for single actions, synthesize stable loop cycles.
   atlas[kind]=aligned;
   if(kind==='idle'){
    atlas.idle=tailCycle(aligned,0,2.4);
    atlas.swim=tailCycle(aligned,0,8.5);
   }else if(kind==='burst'){
    atlas.burst=tailCycle(aligned,0,14);
    atlas.flee=tailCycle(aligned,0,18);
   }else if(kind==='hooked'){
    // One consistent safe key pose, no alternating cropped/misaligned bodies.
    atlas.hooked=tailCycle(aligned,1,11);
   }
   status[kind]='ready';
  }catch(e){status[kind]='error';status[kind+'_reason']=String(e)}
  image.onload=null;image.onerror=null;image.src='';
  loading=false;loadNext();
 };
 image.onerror=function(){
  if(!image._btFallback){
   image._btFallback=true;
   image.crossOrigin='anonymous';
   image.src=prefix+filenames[kind];return;
  }
  status[kind]='error';loading=false;loadNext();
 };
 image.decoding='async';
 image.crossOrigin='anonymous';
 image.src='./assets/bluetang/'+kind+'.webp';
}
loadNext();
function targetAction(a,now,near){
 if(a._btDemo&&previewAction)return previewAction;
 if(a.spriteAction&&sourceOf[a.spriteAction])return a.spriteAction;
 if(a.shakeUntil>now)return 'graze';
 if((a.panicUntil||0)>now||a.behavior==='flee')return 'flee';
 if(a.behavior==='hunt'||a.behavior==='fight'||a.swimMode==='dart')return 'burst';
 if(near>0&&near<76)return 'inspect';
 if(near>=76&&near<144)return 'notice';
 if(a.behavior==='hover'||a.swimMode==='hover')return 'idle';
 return 'swim';
}
function poseProgress(a,now,action){
 if(Number.isFinite(a.spriteFrame))return {index:clamp(a.spriteFrame|0,0,7),frac:0};
 if(!Number.isFinite(a._btStart)||a._btAction!==action){
  a._btAction=action;a._btStart=now;
 }
 var t=Math.max(0,(now-a._btStart)*1000/ms[action]);
 var index=oneShot[action]?Math.min(7,Math.floor(t)):Math.floor(t)%8;
 return {index:index,frac:t-Math.floor(t)};
}
function transform(action,index){
 var s=Math.sin(index*Math.PI/4);
 switch(action){
  // Cyclic actions are animated inside their bitmap. Never translate/rotate
  // their entire bodies again; swimming direction comes from the game AI.
  case 'idle':case 'swim':case 'burst':case 'flee':
   return {r:0,x:0,y:0,sx:1,sy:1};
  case 'notice':return {r:[0,0,.014,.025,.035,.025,.012,0][index],x:0,y:0,sx:1,sy:1};
  case 'graze':return {r:[0,-.04,-.18,-.24,-.13,.06,.03,0][index],x:0,y:0,sx:1,sy:1};
  case 'hooked':return {r:s*.085,x:0,y:0,sx:1,sy:1};
  case 'lift':return {r:[0,.13,.27,.40,.55,.72,.88,1.0][index],x:0,y:0,sx:1,sy:1};
  case 'last_resist':return {r:[-.18,.12,.25,-.23,.17,-.08,-.25,.11][index],x:0,y:0,sx:1,sy:1};
  case 'slip':return {r:[.23,.39,.12,-.27,-.36,-.12,.12,0][index],x:0,y:0,sx:1,sy:1};
  case 'reentry':return {r:[-.90,-.78,-.64,-.52,-.39,-.25,-.12,0][index],x:0,y:0,sx:1,sy:1};
  default:return {r:0,x:0,y:0,sx:1,sy:1};
 }
}
// Both natural AI reversals and the debug 'uturn' preview use a true
// left-to-right 180-degree yaw. Merely showing eight sprites facing the
// same way was why the previous turn could not be seen.
var TURN_DURATION=.78,PREVIEW_PERIOD=2.15,previewRevision=0;
function turnYaw(progress){
 progress=clamp(progress,0,1);
 var smooth=progress*progress*(3-2*progress);
 var cosine=Math.cos(Math.PI*smooth);
 // Do not make the bitmap disappear at the precise side-to-side midpoint.
 return Math.abs(cosine)<.045?(cosine<0?-.045:.045):cosine;
}
function draw(ctx,a,now,alpha,near){
 if(!a||!a.sp||a.sp.name!=='블루탱')return false;
 if(!atlas.idle)return false;
 var action=targetAction(a,now,near||0);
 var speed=a.vx||0;
 var direction=Math.abs(speed)<7?(a._btFacing||1):(speed<0?-1:1);
 if(a._btFacing===undefined)a._btFacing=direction;
 var forced=!!a.spriteAction;
 var showcase=!!a._btDemo&&previewAction==='uturn';
 var aquarium=!!a.spriteAquarium;
 var aquariumDuration=Math.max(.15,Number(a.spriteTurnDuration)||TURN_DURATION);
 var aquariumElapsed=now-Number(a.spriteTurnStart);
 var aquariumTurn=aquarium&&Number.isFinite(a.spriteTurnStart)&&
  aquariumElapsed>=0&&aquariumElapsed<aquariumDuration;
 var turning=false,turnProgress=1,turnFrom=1;
 if(aquariumTurn){
  // The aquarium chooses when a turn starts; the animation player owns
  // every frame and the actual 180-degree sprite orientation.
  turning=true;
  turnFrom=a.spriteTurnFrom===-1?-1:1;
  turnProgress=clamp(aquariumElapsed/aquariumDuration,0,1);
  a._btFacing=turnFrom;
  action='uturn';
 }else if(aquarium){
  // Do not keep the cached heading from the previous aquarium turn.
  // All non-turn actions use the aquarium fish's real swim direction.
  a._btFacing=direction;
 }else if(showcase){
  // A repeatable full turn is always visible from the QA dropdown,
  // even if this particular fish's AI never reverses direction.
  if(a._btPreviewRevision!==previewRevision){
   a._btPreviewRevision=previewRevision;
   a._btPreviewStart=now;
   a._btPreviewInitialFacing=a._btFacing||direction||1;
   a._btAction=null;
  }
  var elapsed=Math.max(0,now-a._btPreviewStart);
  var pass=Math.floor(elapsed/PREVIEW_PERIOD);
  var phase=elapsed%PREVIEW_PERIOD;
  turnFrom=pass%2===0?a._btPreviewInitialFacing:-a._btPreviewInitialFacing;
  turning=phase<TURN_DURATION;
  turnProgress=clamp(phase/TURN_DURATION,0,1);
  a._btFacing=turning?turnFrom:-turnFrom;
  action=turning?'uturn':'swim';
 }else if(!forced){
  var activeTurn=Number.isFinite(a._btTurnStart)&&now-a._btTurnStart<TURN_DURATION;
  if(!activeTurn&&direction!==a._btFacing){
   // Demand a sustained directional reversal to avoid jitter at low speed.
   if(a._btPendingDir!==direction){
    a._btPendingDir=direction;a._btPendingAt=now;
   }
   if(now-a._btPendingAt>=.13&&now-(a._btLastTurn||-10)>.96){
    a._btTurnFrom=a._btFacing;
    a._btFacing=direction;
    a._btTurnStart=now;
    a._btLastTurn=now;
    a._btPendingDir=0;
    activeTurn=true;
   }
  }else if(!activeTurn)a._btPendingDir=0;
  if(activeTurn){
   turning=true;
   turnFrom=a._btTurnFrom||1;
   turnProgress=clamp((now-a._btTurnStart)/TURN_DURATION,0,1);
   action='uturn';
  }
 }else a._btPendingDir=0;
 var sheet=atlas[sourceOf[action]];
 if(turning){
  // Play the actual official U-turn sprite sequence, not an artificial
  // aquarium-only animation. The torso-space yaw only orients its frames.
  sheet=atlas.uturn||atlas.swim||atlas.idle||sheet;
 }
 if(!sheet){action='swim';sheet=atlas.swim||atlas.idle}
 if(!sheet)return false;
 var p=poseProgress(a,now,action),i=p.index,pose=transform(action,i);
 // Aquariums may have a different turn duration from live fishing.
 // Sample the official eight U-turn frames across that exact interval.
 if(aquariumTurn)i=clamp(Math.floor(turnProgress*8),0,7);
 var sx=(i%2)*CW,sy=Math.floor(i/2)*CH;
 var sz=.5*(a.size||1),drawW=240*sz,drawH=120*sz;
 ctx.save();
 if(alpha!==undefined)ctx.globalAlpha*=clamp(alpha,0,1);
 var hover=action==='idle'?.30:action==='swim'?.12:0;
 var floatY=Math.sin(now*1.15+(a.phase||0))*hover;
 ctx.translate(a.x,a.y+floatY);
 if(a.shakeUntil>now){
  var fade=clamp((a.shakeUntil-now)/.14,0,1);
  var power=(a.shakePower||1.4)*fade*.12;
  ctx.translate(Math.sin(now*54+(a.phase||0))*power,
    Math.cos(now*68+(a.phase||0))*power*.45);
 }
 if(turning){
  // Actual visual inversion: full width -> slim frontal pose ->
  // mirrored full width. Rotate around the stable torso pivot.
  ctx.scale(turnFrom*turnYaw(turnProgress),1);
  ctx.rotate(Math.sin(Math.PI*turnProgress)*.018*turnFrom);
 }else{
  ctx.scale(a._btFacing,1);
  ctx.translate(pose.x,pose.y);
  ctx.rotate(pose.r);
  ctx.scale(pose.sx,pose.sy);
 }
 ctx.drawImage(sheet,sx,sy,CW,CH,-drawW*.5,-drawH*.5,drawW,drawH);
 ctx.restore();
 return true;
}

window.BlueTangSprites={
 draw:draw,
 supports:function(sp){return !!sp&&sp.name==='블루탱'},
 ready:function(){return !!atlas.idle},
 status:function(){return Object.assign({},status)},
 actions:actions.slice(),
 loadedSources:function(){return Object.keys(atlas)},
 setPreviewAction:function(action){
  previewAction=sourceOf[action]?action:null;
  previewRevision++;
  return previewAction;
 },
 getPreviewAction:function(){return previewAction},
 version:'aquarium-official-2.10'
};
// Other species can register their own sprite players here when their
// action sheets exist. The aquarium then picks the proper player by species.
window.FishSpritePlayers=window.FishSpritePlayers||[];
if(window.FishSpritePlayers.indexOf(window.BlueTangSprites)<0)
 window.FishSpritePlayers.push(window.BlueTangSprites);
})();