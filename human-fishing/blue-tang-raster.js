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
var queue=['idle','burst','inspect','bite','hooked','uturn'];
var SIZE=1024,CW=512,CH=256;
function makeCanvas(w,h){
 var c=document.createElement('canvas');c.width=w;c.height=h;return c;
}
function clamp(x,min,max){return Math.max(min,Math.min(max,x))}
function midpointBox(box){
 return {x:(box.x0+box.x1)*.5,y:(box.y0+box.y1)*.5,
   w:box.x1-box.x0,h:box.y1-box.y0};
}
function clampBox(b){
 return {x0:clamp(b.x0,0,CW),y0:clamp(b.y0,0,CH),
         x1:clamp(b.x1,0,CW),y1:clamp(b.y1,0,CH)};
}
function alphaBounds(data,i){
 var gx=(i%2)*CW,gy=Math.floor(i/2)*CH;
 var x0=CW,y0=CH,x1=0,y1=0;
 // Sampling every second pixel avoids expensive full-image scans.
 for(var y=0;y<CH;y+=2){
  for(var x=0;x<CW;x+=2){
   if(data[(((gy+y)*SIZE+gx+x)*4)+3]>42){
    if(x<x0)x0=x;if(x>x1)x1=x;
    if(y<y0)y0=y;if(y>y1)y1=y;
   }
  }
 }
 if(x1<=x0||y1<=y0)return null;
 return clampBox({x0:x0-2,y0:y0-2,x1:x1+4,y1:y1+4});
}
function makeNormalized(raw,kind){
 var g=raw.getContext('2d',{willReadFrequently:true}),data;
 try{data=g.getImageData(0,0,SIZE,SIZE).data}
 catch(e){return raw} // Cross-origin fallback: preserve sprites rather than fail.
 var boxes=[];
 for(var i=0;i<8;i++)boxes.push(alphaBounds(data,i));
 var safe=[];
 boxes.forEach(function(b,i){
  if(b&&b.x0>9&&b.y0>9&&b.x1<CW-9&&b.y1<CH-9)safe.push(i);
 });
 if(!safe.length)safe=[0];
 var widths=safe.map(function(i){return boxes[i]?boxes[i].x1-boxes[i].x0:0}).sort(function(a,b){return a-b});
 var refW=widths[Math.floor(widths.length/2)]||280;
 var dst=makeCanvas(SIZE,SIZE),d=dst.getContext('2d');
 d.imageSmoothingEnabled=true;d.imageSmoothingQuality='high';
 for(var f=0;f<8;f++){
  var chosen=f,b=boxes[f];
  if(!b||b.x0<=3||b.y0<=3||b.x1>=CW-3||b.y1>=CH-3){
   chosen=safe.reduce(function(best,v){return Math.abs(v-f)<Math.abs(best-f)?v:best},safe[0]);
   b=boxes[chosen];
  }
  if(!b)continue;
  var bb=midpointBox(b),scale=kind==='uturn'?1:clamp(refW/bb.w,.87,1.13);
  var drawW=bb.w*scale,drawH=bb.h*scale;
  var fit=Math.min(1,(CW-84)/drawW,(CH-54)/drawH);
  drawW*=fit;drawH*=fit;
  // All frames land at the same torso pivot; source cell x-offset is removed.
  var dx=(f%2)*CW+(CW-drawW)*.5,dy=Math.floor(f/2)*CH+(CH-drawH)*.5;
  d.drawImage(raw,(chosen%2)*CW+b.x0,Math.floor(chosen/2)*CH+b.y0,
    bb.w,bb.h,dx,dy,drawW,drawH);
 }
 return dst;
}
/* Build 8 smoothly continuous raster swim poses from ONE locked body frame.
   Vertical pixel-strip deformation is strong at the tail, vanishes at the
   head. The body never slides horizontally or snaps to a new pose. */
function tailCycle(sheet,sourceFrame,amplitude){
 var cycle=makeCanvas(SIZE,SIZE),out=cycle.getContext('2d');
 var srcX=(sourceFrame%2)*CW,srcY=Math.floor(sourceFrame/2)*CH;
 out.imageSmoothingEnabled=true;out.imageSmoothingQuality='high';
 for(var i=0;i<8;i++){
  var phase=i*Math.PI/4,cellX=(i%2)*CW,cellY=Math.floor(i/2)*CH;
  // Copy in narrow slightly overlapping bitmap strips, with no white seams.
  for(var x=0;x<CW;x+=4){
   var spine=clamp((397-x)/305,0,1);
   var influence=Math.pow(spine,1.95);
   var offset=amplitude*influence*Math.sin(phase+2.0*(1-spine));
   var dw=Math.min(5,CW-x),sw=Math.min(5,CW-x);
   out.drawImage(sheet,srcX+x,srcY,sw,CH,cellX+x,cellY+offset,dw,CH);
  }
 }
 return cycle;
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
    atlas.idle=tailCycle(aligned,0,4.5);
    atlas.swim=tailCycle(aligned,0,12);
   }else if(kind==='burst'){
    atlas.burst=tailCycle(aligned,0,20);
    atlas.flee=tailCycle(aligned,0,26);
   }else if(kind==='hooked'){
    // One consistent safe key pose, no alternating cropped/misaligned bodies.
    atlas.hooked=tailCycle(aligned,1,17);
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
function draw(ctx,a,now,alpha,near){
 if(!a||!a.sp||a.sp.name!=='블루탱')return false;
 if(!atlas.idle)return false;
 var action=targetAction(a,now,near||0);
 var speed=a.vx||0;
 var direction=Math.abs(speed)<7?(a._btFacing||1):(speed<0?-1:1);
 if(a._btFacing===undefined)a._btFacing=direction;
 if(direction!==a._btFacing&&!a.spriteAction){
  // Prevent sub-pixel velocity reversals from restarting U-turn every frame.
  if(a._btPendingDir!==direction){a._btPendingDir=direction;a._btPendingAt=now}
  if(now-(a._btPendingAt||now)>.12&&now-(a._btLastTurn||-10)>.85){
   a._btTurnFrom=a._btFacing;a._btFacing=direction;
   a._btTurnStart=now;a._btLastTurn=now;
   a._btPendingDir=0;
  }
 }else a._btPendingDir=0;
 if(!a.spriteAction&&Number.isFinite(a._btTurnStart)&&now-a._btTurnStart<.64)
  action='uturn';
 var sheet=atlas[sourceOf[action]];
 if(!sheet){action='swim';sheet=atlas.swim||atlas.idle}
 if(!sheet)return false;
 var p=poseProgress(a,now,action),i=p.index,pose=transform(action,i);
 var sx=(i%2)*CW,sy=Math.floor(i/2)*CH;
 var sz=.5*(a.size||1),drawW=240*sz,drawH=120*sz;
 ctx.save();
 if(alpha!==undefined)ctx.globalAlpha*=clamp(alpha,0,1);
 var floatY=Math.sin(now*1.5+(a.phase||0))*Math.min(1.1,.65+sz*.25);
 ctx.translate(a.x,a.y+floatY);
 if(a.shakeUntil>now){
  var fade=clamp((a.shakeUntil-now)/.14,0,1);
  var power=(a.shakePower||1.4)*fade*.30;
  ctx.translate(Math.sin(now*54+(a.phase||0))*power,Math.cos(now*68+(a.phase||0))*power*.45);
 }
 var facing=a._btFacing;
 if(action==='uturn')facing=a._btTurnFrom===-1?-1:1;
 ctx.scale(facing,1);
 ctx.translate(pose.x,pose.y);ctx.rotate(pose.r);ctx.scale(pose.sx,pose.sy);
 ctx.drawImage(sheet,sx,sy,CW,CH,-drawW*.5,-drawH*.5,drawW,drawH);
 ctx.restore();
 return true;
}
window.BlueTangSprites={
 draw:draw,
 ready:function(){return !!atlas.idle},
 status:function(){return Object.assign({},status)},
 actions:actions.slice(),
 loadedSources:function(){return Object.keys(atlas)},
 setPreviewAction:function(action){previewAction=sourceOf[action]?action:null;return previewAction},
 getPreviewAction:function(){return previewAction},
 version:'stable-pivot-2.5'
};
})();