/* HUMAN FISHING sidekick pair: two small characters BEHIND the playable octopus.
   Approved originals live in the user's Google Drive; local copies take precedence.
   A tinted bitmap of the existing hero is used if private Drive URLs cannot load.
   No game stats, fishing, swallowing or protagonist artwork is modified. */
(function(){
 'use strict';
 var friends=[
   {name:'보라 문어',color:'purple',x:91,y:100,w:126,h:126,phase:.2,
     filename:'purple_companion.webp',driveId:'1-ThcWc2vCWTLbZ8wUtCqkftpwlUEpUSt'},
   {name:'빨간 문어',color:'red',x:214,y:105,w:126,h:126,phase:1.65,
     filename:'red_companion.webp',driveId:'12gr3Y7QKqIRLz6d_EKWeQOTmV3z73RvE'}
 ];
 var cheerUntil=-100,sadUntil=-100,ready=0;
 friends.forEach(function(f){
   f.loaded=false;
   var image=new Image();
   f.image=image;
   image.onload=function(){f.loaded=true;ready++};
   image.onerror=function(){
     if(!f.triedDrive){
       f.triedDrive=true;
       // Drive fallback is optional: user may be signed into Google.
       image.src='https://drive.google.com/thumbnail?id='+f.driveId+'&sz=w512';
     }
   };
   image.decoding='async';
   image.src='./assets/octopus/'+f.filename;
 });
 function draw(ctx,now,hero){
   friends.forEach(function(f,i){
     var celebrating=now<cheerUntil,disappointed=now<sadUntil;
     var hop=celebrating?Math.abs(Math.sin((cheerUntil-now)*11+i*.7))*7:0;
     var tilt=celebrating?Math.sin(now*13+i*2)*.06:
       disappointed?-.055:Math.sin(now*.9+f.phase)*.012;
     var breath=Math.sin(now*1.6+f.phase)*.006;
     ctx.save();
     ctx.translate(f.x+f.w/2,f.y+f.h-hop);
     ctx.rotate(tilt);
     ctx.scale(1+breath,1-breath);
     if(f.loaded)ctx.drawImage(f.image,-f.w/2,-f.h,f.w,f.h);
     else if(hero){
       // Visible raster fallback until GitHub-hosted portraits are present.
       // This is NOT presented as the final approved companion character art.
       ctx.save();
       if('filter' in ctx)ctx.filter=f.color==='purple'?
         'hue-rotate(74deg) saturate(1.3)':'hue-rotate(-26deg) saturate(1.3)';
       ctx.drawImage(hero,-f.w/2,-f.h,f.w,f.h);
       ctx.restore();
     }
     ctx.restore();
   });
 }
 window.drawOctopusSidekicks=draw;
 window.octoSidekicksCheer=function(now){cheerUntil=now+1.1;sadUntil=-100};
 window.octoSidekicksSad=function(now){sadUntil=now+1.35;cheerUntil=-100};
 window.octoSidekicksInfo=function(){return friends.map(function(f){
   return {name:f.name,loaded:f.loaded,source:f.loaded?(f.triedDrive?'drive':'github'):'hero-fallback',x:f.x,y:f.y,width:f.w,height:f.h};
 })};
})();
