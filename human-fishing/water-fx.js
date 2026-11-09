/* Human Fishing | desaturated, bitmap-only shared water feedback.
 * Source: 2026-11-09 approved water sprite sheets, individual transparent bubble PNGs.
 * World physics, saved data, catch odds and fish animations remain untouched.
 */
(function(root){
 'use strict';
 var version='20261109-waterfx-a1',base='./assets/water-fx/';
 var specs={
  surface:['water_surface_8f.png',4,2],
  splash:['water_splash_8f.png',4,2],
  current:['water_current_8f.png',4,2],
  bubbles:['water_bubbles_individual_16.png',4,4]
 };
 var images=Object.create(null),preloadPromise=null,ready=false;
 var events=[],air=[],lastUnderwater=null,lastCrossAt=-100;
 var PI=Math.PI;
 function hash(seed){var t=Math.sin(seed*127.1+78.233)*43758.5453;return t-Math.floor(t)}
 function clamp01(v){return Math.max(0,Math.min(1,v))}
 function fade(t){t=clamp01(t);return t*t*(3-2*t)}
 function preload(){
  if(preloadPromise)return preloadPromise;
  preloadPromise=Promise.all(Object.keys(specs).map(function(name){
   return new Promise(function(resolve){
    if(typeof Image==='undefined'){resolve(false);return}
    var im=new Image();im.decoding='async';
    im.onload=function(){im.ready=true;images[name]=im;resolve(true)};
    im.onerror=function(){im.ready=false;resolve(false)};
    im.src=base+specs[name][0]+'?v='+version;
   });
  })).then(function(results){ready=true;return results.every(Boolean)});
  return preloadPromise;
 }
 function atlas(ctx,name,frame,x,y,w,h,opacity,rotation){
  var image=images[name];if(!image||!image.ready||opacity<=0)return false;
  var sp=specs[name],cols=sp[1],rows=sp[2],count=cols*rows;
  var index=((Math.floor(frame)%count)+count)%count;
  var sw=image.naturalWidth/cols,sh=image.naturalHeight/rows;
  ctx.save();ctx.globalAlpha*=clamp01(opacity);
  ctx.translate(x,y);if(rotation)ctx.rotate(rotation);
  ctx.drawImage(image,(index%cols)*sw,Math.floor(index/cols)*sh,sw,sh,-w*.5,-h*.5,w,h);
  ctx.restore();return true;
 }
 // Bubble seed is uniformly distributed on-screen, not a fixed column or school.
 for(var i=0;i<66;i++)air.push({
  x:((i+.5)/66+.035*(hash(i*13+5)-.5)),
  phase:hash(i*41+11),speed:.055+.12*hash(i*17+19),
  drift:4+15*hash(i*23+3),size:4+15*Math.pow(hash(i*29+9),2.1),
  alpha:.21+.30*hash(i*43+7),frame:i%16
 });
 function ambient(ctx,now,waterY,width,height){
  if(!images.bubbles||!images.bubbles.ready)return false;
  var span=height-waterY,upper=waterY+8;
  ctx.save();
  // Shape is solely a raster PNG. Geometry below only constrains its placement.
  ctx.beginPath();ctx.rect(0,upper,width,Math.max(1,height-upper));ctx.clip();
  for(var i=0;i<air.length;i++){
   var b=air[i],t=(b.phase+now*b.speed)%1;
   var x=(b.x*width+Math.sin(now*.85+b.phase*PI*2)*b.drift+width)%width;
   var y=height+24-t*(span+56);
   if(y<upper||y>height+18)continue;
   var size=b.size*(.82+.18*Math.sin(now*1.7+b.phase*13));
   var nearSurface=clamp01((y-upper)/31);
   var alpha=b.alpha*fade(nearSurface);
   atlas(ctx,'bubbles',b.frame,x,y,size,size,alpha,0);
  }
  ctx.restore();return true;
 }
 function emit(type,x,y,now,waterY){
  if(!Number.isFinite(x)||!Number.isFinite(y))return;
  var s={type:type,x:x,y:y,start:Number.isFinite(now)?now:0,waterY:waterY||293,seed:hash(events.length*19+x+y)};
  // Crossing event bursts remain distinct from normal release and misses.
  if((type==='entry'||type==='exit')&&s.start-lastCrossAt<.22)return;
  if(type==='entry'||type==='exit')lastCrossAt=s.start;
  events.push(s);if(events.length>26)events.splice(0,events.length-26);
 }
 function observeLure(now,x,y,waterY,active){
  if(!active||!Number.isFinite(y)){lastUnderwater=null;return}
  // Hysteresis prevents ripples repeatedly firing during a hanging bait wobble.
  var under=y>waterY+10,above=y<waterY-9;
  if(lastUnderwater===null){lastUnderwater=under;return}
  if(lastUnderwater===true&&above){emit('exit',x,waterY,now,waterY);lastUnderwater=false}
  else if(lastUnderwater===false&&under){emit('entry',x,waterY,now,waterY);lastUnderwater=true}
 }
 function drawEvents(ctx,now,waterY,width,height){
  if(!events.length)return;
  for(var i=events.length-1;i>=0;i--){
   var e=events[i],age=Math.max(0,now-e.start),kind=e.type;
   var duration=kind==='miss'?.68:kind==='current'?.8:kind==='release'?.42:kind==='bite'?.46:kind==='fever'?.72:.82;
   if(age>=duration){events.splice(i,1);continue}
   var p=clamp01(age/duration),alpha=(1-fade((p-.58)/.42));
   if(kind==='entry'||kind==='exit'||kind==='escape'){
    // Only splash/ripples cross the waterline. Never leak ambient bubbles above.
    var scale=kind==='escape'?1.22:kind==='exit'?.94:1;
    atlas(ctx,'splash',Math.min(7,Math.floor(p*8)),e.x,waterY-8,
     (162+22*p)*scale,(92+11*p)*scale,.70*alpha,0);
   }else{
    var d=kind==='fever'?245:kind==='miss'?140:kind==='bite'?114:103;
    var y=Math.max(waterY+21,e.y),f=Math.min(7,Math.floor(p*8));
    atlas(ctx,'current',f,e.x,y,d*(.82+.34*p),d*.48*(.82+.3*p),
     (kind==='miss'?.60:kind==='fever'?.49:.40)*alpha,0);
    if(kind==='miss'||kind==='release'||kind==='bite'||kind==='fever'){
     ctx.save();ctx.beginPath();ctx.rect(0,waterY+6,width,height-waterY-6);ctx.clip();
     var count=kind==='miss'?8:kind==='fever'?14:5;
     for(var j=0;j<count;j++){
      var seed=e.seed+j*1.31,angle=hash(seed*13)*PI*2;
      var radius=(12+30*hash(seed*3))*(.35+p*.9);
      var bx=e.x+Math.cos(angle)*radius+8*Math.sin(now*3+seed);
      var by=y+Math.sin(angle)*radius-p*(22+26*hash(seed*5));
      atlas(ctx,'bubbles',j%16,bx,Math.max(waterY+8,by),
       6+11*hash(seed*7),6+11*hash(seed*7),.38*alpha*(1-p*.38),0);
     }
     ctx.restore();
    }
   }
  }
 }
 function current(ctx,now,bobX,bobY,waterY,vx,vy,duration,started){
  if(!images.current||!images.current.ready)return;
  if(bobY<=waterY+8)return;
  var age=now-started,fadeIn=fade(age/.45),fadeOut=fade((duration-age)/.64);
  var opacity=Math.min(fadeIn,fadeOut);
  if(opacity<=0)return;
  ctx.save();ctx.beginPath();ctx.rect(0,waterY+6,1280,720-waterY-6);ctx.clip();
  var sign=vx<0?-1:1,frame=Math.floor(now*9)%8;
  atlas(ctx,'current',frame,bobX+sign*34,bobY,180,98,.54*opacity,(Math.atan2(vy,vx||1))*.16);
  // The drifting current has secondary vortices spread across the water.
  for(var i=0;i<3;i++){
   var x=(bobX+(i-1)*240+1280)%1280,y=Math.max(waterY+32,bobY+(i-1)*37);
   atlas(ctx,'current',frame+i*2,x,y,230,95,.17*opacity,0);
  }
  ctx.restore();
 }
 function fever(ctx,now,fx,waterY){
  if(!fx||!images.current||!images.current.ready)return;
  if(fx.y<waterY+12||fx.elapsed>fx.suctionEnd)return;
  var p=clamp01(fx.elapsed/Math.max(.1,fx.suctionEnd)),breath=.8+.2*Math.sin(now*10);
  atlas(ctx,'current',Math.floor(now*13),fx.x,fx.y,
   fx.radius*2.35,fx.radius*1.48,.30*breath*(1-fade((p-.83)/.17)),now*.04);
 }
 function surface(ctx,now,waterY,width){
  if(!images.surface||!images.surface.ready)return;
  // Last render pass, OVER the protagonist. The soft gradient is baked into
  // the transparent bitmap and fades DOWN into each independent 16:9 habitat.
  var frame=Math.floor(now*4.8)%8;
  atlas(ctx,'surface',frame,width*.5,waterY+31+Math.sin(now*1.3)*1.4,
   width+4,176,.61,0);
 }
 function clear(){events.length=0;lastUnderwater=null;lastCrossAt=-100}
 var api={version:version,preload:preload,atlas:atlas,ambient:ambient,
  emit:emit,observeLure:observeLure,drawEvents:drawEvents,
  current:current,fever:fever,surface:surface,clear:clear,
  get ready(){return ready},get loaded(){return Object.keys(images).length},
  get ambientBubbleCount(){return air.length},get pendingEvents(){return events.length}
 };
 root.HumanFishingWaterFX=api;
 preload();
})(typeof window!=='undefined'?window:{});