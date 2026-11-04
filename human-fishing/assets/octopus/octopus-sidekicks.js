/* HUMAN FISHING • companion octopuses
 * Keep both approved bitmaps behind the original playable octopus.
 * Idle is a varied, non-celebratory sequence; only eating or escaping
 * triggers a special reaction. Existing game input / combat is unchanged.
 */
(function(){
 'use strict';
 var root='./assets/octopus/';
 var friends=[
  {name:'보라 문어',color:'purple',x:112,y:120,w:124,h:124,phase:.24,idleOffset:.2,
   filename:'purple_companion.webp',driveId:'1-ThcWc2vCWTLbZ8wUtCqkftpwlUEpUSt'},
  {name:'빨간 문어',color:'red',x:202,y:124,w:124,h:124,phase:1.73,idleOffset:2.68,
   filename:'red_companion.webp',driveId:'12gr3Y7QKqIRLz6d_EKWeQOTmV3z73RvE'}
 ];
 var reaction='idle',reactionStart=-100,reactionEnd=-100;
 friends.forEach(function(f){
  f.loaded=false;
  f.triedDrive=false;
  var image=f.image=new Image();
  image.decoding='async';
  image.onload=function(){f.loaded=true};
  image.onerror=function(){
   f.loaded=false;
   if(!f.triedDrive){
    f.triedDrive=true;
    image.src='https://drive.google.com/thumbnail?id='+f.driveId+'&sz=w512';
   }
  };
  image.src=root+f.filename+'?v=20261105-idle2';
 });
 function smooth(p){p=Math.max(0,Math.min(1,p));return p*p*(3-2*p)}
 function lerp(a,b,p){return a+(b-a)*p}
 function idlePose(f,now){
  // Different timing for each companion: no synchronized clone motion.
  var elapsed=now+f.idleOffset,slot=3.65;
  var mode=Math.floor(elapsed/slot)%7;
  var q=(elapsed%slot)/slot;
  var pulse=Math.sin(Math.PI*smooth(q));
  var wave=Math.sin(now*2.0+f.phase);
  var m={dx:0,dy:Math.sin(now*1.4+f.phase)*.9,angle:0,sx:1+wave*.009,sy:1-wave*.008};
  // Each idle phrase eases smoothly back into the same neutral pose.
  if(mode===0){ // relaxed breathing and gentle eye-level movement
   m.dy+=Math.sin(now*.8+f.phase)*.8*pulse;
  }else if(mode===1){ // look across at the other companion
   m.dx+=2.8*pulse;m.angle+=.040*pulse;
  }else if(mode===2){ // tentacle-weight shift to the opposite side
   m.dx-=2.2*pulse;m.angle-=.045*pulse;
   m.sx+=.013*pulse;m.sy-=.011*pulse;
  }else if(mode===3){ // quiet nod, no celebratory jump
   m.dy+=2.0*pulse;m.angle+=Math.sin(now*3.0+f.phase)*.025*pulse;
  }else if(mode===4){ // fidget: tiny alternating side steps
   m.dx+=Math.sin(now*4.2+f.phase)*1.5*pulse;
   m.angle+=Math.sin(now*3.3+f.phase)*.030*pulse;
  }else if(mode===5){ // sleepy pause and subtle squash
   m.dy+=1.8*pulse;m.sx+=.014*pulse;m.sy-=.021*pulse;
  }else{ // watch the main player, then settle
   m.dx+=1.6*pulse;m.angle+=.025*pulse;
  }
  return m;
 }
 function reactionPose(now,i){
  var age=now-reactionStart-i*.075;
  var span=reactionEnd-reactionStart;
  var p=Math.max(0,Math.min(1,age/(span-i*.075)));
  var m={dx:0,dy:0,angle:0,sx:1,sy:1};
  if(age<0)return m;
  if(reaction==='eat'){
   var impact=Math.sin(Math.PI*p);
   m.dy=-Math.abs(Math.sin(p*Math.PI*2.8+i*.35))*8*impact;
   m.angle=Math.sin(p*Math.PI*6.2+i*.6)*.095*impact;
   m.sx=1+.045*impact;m.sy=1-.030*impact;
  }else if(reaction==='fail'){
   var slump=Math.sin(Math.PI*smooth(p));
   m.dy=3.4*slump;
   m.angle=(-.068+(i===0?-.010:.010))*slump;
   m.sx=1-.017*slump;m.sy=1+.018*slump;
  }
  return m;
 }
 function draw(ctx,now,hero){
  var reacting=now<reactionEnd&&now>=reactionStart;
  friends.forEach(function(f,i){
   var m=reacting?reactionPose(now,i):idlePose(f,now);
   ctx.save();
   ctx.translate(f.x+f.w/2+m.dx,f.y+f.h+m.dy);
   ctx.rotate(m.angle);
   ctx.scale(m.sx,m.sy);
   if(f.loaded){
    ctx.drawImage(f.image,-f.w/2,-f.h,f.w,f.h);
   }else if(hero){
    // Offline fallback only; use the original approved files when available.
    ctx.save();
    if('filter' in ctx)ctx.filter=f.color==='purple'?
      'hue-rotate(74deg) saturate(1.3)':'hue-rotate(-26deg) saturate(1.3)';
    ctx.drawImage(hero,-f.w/2,-f.h,f.w,f.h);
    ctx.restore();
   }
   ctx.restore();
  });
 }
 function react(kind,now,duration){
  if(!Number.isFinite(now))return;
  reaction=kind;
  reactionStart=now;
  reactionEnd=now+duration;
 }
 window.drawOctopusSidekicks=draw;
 window.octoSidekicksEat=function(now){react('eat',now,1.13)};
 window.octoSidekicksFail=function(now){react('fail',now,1.45)};
 window.octoSidekicksInfo=function(now){return friends.map(function(f,i){
  return {name:f.name,loaded:f.loaded,source:f.loaded?(f.triedDrive?'drive':'github'):'fallback',
   x:f.x,y:f.y,width:f.w,height:f.h,
   animation:typeof now==='number'&&now<reactionEnd?reaction:'idle',
   idleVariation:Math.floor(((typeof now==='number'?now:0)+f.idleOffset)/3.65)%7};
 })};
})();
