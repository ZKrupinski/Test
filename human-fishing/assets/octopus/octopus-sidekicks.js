/* HUMAN FISHING: small cheering companion octopuses.
 * Uses the ACTUAL approved transparent sprite-sheet frames, never artificial
 * wiggle/scale/rotation effects. Walking/swimming sheet is excluded.
 * Red source: 8 action rows x 12 columns (1254x1254).
 * Purple source: 7 atlases of 4x4 frames (640x640).
 */
(function(){
 'use strict';
 var BASE='./assets/octopus/';
 var ATLAS=BASE+'atlases/';
 var ACTIONS=['idle','bait','open','eat','chew','fail','celebrate'];
 var RED_ROWS={idle:0,bait:2,open:3,eat:4,chew:5,fail:6,celebrate:7};
 var friends=[
  {name:'보라 문어',kind:'purple',x:112,y:120,w:124,h:124,seed:17},
  {name:'빨간 문어',kind:'red',x:206,y:80,w:110,h:164,seed:71}
 ];
 var portraits={},purple={},red=null;
 function load(url,done){
  var img=new Image();
  img.decoding='async';
  img.onload=function(){img.ready=true;if(done)done(true)};
  img.onerror=function(){img.ready=false;if(done)done(false)};
  img.ready=false;img.src=url;
  return img;
 }
 ACTIONS.forEach(function(name){
  purple[name]=load(ATLAS+'purple_'+name+'.webp?v=1');
 });
 red=load(ATLAS+'red_all.webp?v=1');
 friends.forEach(function(f){
  portraits[f.kind]=load(BASE+f.kind+'_companion.webp');
  f.current=null;f.previous=null;f.idleStart=0;f.idleEnd=0;
  f.reactStart=-100;f.reactEnd=-100;f.reactType=null;
  f.rng=f.seed;
 });
 function rnd(f){
  f.rng=(Math.imul(f.rng,1664525)+1013904223)>>>0;
  return f.rng/4294967296;
 }
 // Use EVERY approved action except swimming as randomly selected idles.
 // Restrict eating/failure sheets to quiet frames while idle; their strongest
 // reaction frames play only during the matching game event.
 var RELAXED={
  idle:null,
  bait:null,
  open:[0,1,2,3,4,5,6,10,11,12,13,14,15],
  eat:[0,1,2,3,9,10,11,12,13,14,15],
  chew:[0,1,2,3,4,10,11,12,13,14,15],
  fail:[0,1,2,3,9,10,11,12,13,14,15],
  celebrate:[0,1,2,3,4,10,11,12,13,14,15]
 };
 function idleFrames(action,n){
  var list=RELAXED[action];if(!list)return null;
  return list.filter(function(i){return i<n});
 }
 function chooseIdle(f,now){
  var bag=['idle','idle','bait','open','eat','chew','fail','celebrate'];
  var choice=bag[Math.floor(rnd(f)*bag.length)];
  if(choice===f.previous)choice=bag[(bag.indexOf(choice)+1+Math.floor(rnd(f)*3))%bag.length];
  f.previous=choice;f.current=choice;f.idleStart=now;
  f.idleEnd=now+1.55+rnd(f)*1.25;
 }
 function reactionSegment(f,now){
  var age=now-f.reactStart;
  if(age<0 || age>=f.reactEnd-f.reactStart)return null;
  var segments=f.reactType==='eat'?
   [{key:'open',duration:.48},{key:'eat',duration:.70},
    {key:'chew',duration:.74},{key:'celebrate',duration:.56}]:
   [{key:'fail',duration:1.34}];
  for(var i=0;i<segments.length;i++){
   var s=segments[i];
   if(age<s.duration)return{key:s.key,progress:age/s.duration};
   age-=s.duration;
  }
  return null;
 }
 function frameFor(f,now,action,segment){
  var count=f.kind==='purple'?16:12;
  if(segment)return Math.min(count-1,Math.floor(Math.min(1,segment.progress)*count));
  var frames=idleFrames(action,count),rate=f.kind==='purple'?10.6:8.6;
  var k=Math.max(0,Math.floor((now-f.idleStart)*rate));
  return frames?frames[k%frames.length]:k%count;
 }
 function drawSprite(ctx,f,action,frame){
  var image=f.kind==='purple'?purple[action]:red;
  if(!image || !image.ready){
   image=f.kind==='purple'?purple.idle:red;
   action='idle';frame=0;
  }
  if(image && image.ready){
   ctx.save();
   if(f.kind==='purple'){
    var cw=image.naturalWidth/4,ch=image.naturalHeight/4;
    ctx.drawImage(image,(frame%4)*cw,Math.floor(frame/4)*ch,cw,ch,f.x,f.y,f.w,f.h);
   }else{
    var rw=image.naturalWidth/12,rh=image.naturalHeight/8;
    ctx.drawImage(image,frame*rw,RED_ROWS[action]*rh,rw,rh,f.x,f.y,f.w,f.h);
   }
   ctx.restore();
  }else{
   var portrait=portraits[f.kind];
   if(portrait && portrait.ready)ctx.drawImage(portrait,f.x,f.y,f.w,f.h);
  }
 }
 function draw(ctx,now){
  friends.forEach(function(f){
   var special=reactionSegment(f,now);
   if(!special && (!f.current || now>=f.idleEnd))chooseIdle(f,now);
   var action=special?special.key:f.current;
   var frame=frameFor(f,now,action,special);
   drawSprite(ctx,f,action,frame);
   f.debugAction=action;f.debugFrame=frame;f.debugSpecial=!!special;
  });
 }
 function react(type,now){
  if(!Number.isFinite(now))return;
  friends.forEach(function(f){
   f.reactType=type;
   f.reactStart=now;
   f.reactEnd=now+(type==='eat'?2.48:1.34);
   f.idleEnd=now;
  });
 }
 window.drawOctopusSidekicks=draw;
 window.octoSidekicksEat=function(now){react('eat',now)};
 window.octoSidekicksFail=function(now){react('fail',now)};
 window.octoSidekicksInfo=function(){return friends.map(function(f){
  return {name:f.name,kind:f.kind,x:f.x,y:f.y,w:f.w,h:f.h,
   action:f.debugAction||'idle',frame:f.debugFrame||0,
   reacting:!!f.debugSpecial,atlasReady:f.kind==='red'?
     !!(red&&red.ready):ACTIONS.filter(function(a){return purple[a]&&purple[a].ready}).length,
   atlasTotal:f.kind==='red'?1:7};
 })};
})();
