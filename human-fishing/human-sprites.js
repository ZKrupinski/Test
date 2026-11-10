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
if(enabled){
 Object.keys(paths).forEach(function(state){
  var img=new Image(); // Tracked by boot.js: decode all assets before gameplay.
  img.decoding='async';
  img.src='./assets/humans/'+paths[state]+'?v='+version;
  images[state]=img;
 });
}
function render(ctx,actor,now,action){
 if(!enabled||!actor)return false;
 var mood=paths[action]?action:'swim',img=images[mood];
 if(!img||!img.complete||!img.naturalWidth||img.naturalWidth!==1448||img.naturalHeight!==1086)return false;
 var fps=mood==='resist'?13:mood==='hooked'?12:mood==='taunt'?11:8;
 var phase=Number.isFinite(actor.phase)?actor.phase:0;
 var frame=(Math.floor(Math.max(0,now||0)*fps+phase*1.5)%8+8)%8;
 var col=frame%4,row=Math.floor(frame/4),fw=362,fh=543;
 var size=Math.max(.7,Math.min(1.8,Number(actor.size)||1));
 var scale=.36*size*(actor.id>=20?1.05:1);
 var facing=Number(actor.vx||actor.dir||1)<0?-1:1;
 ctx.save();
 ctx.translate(Number(actor.x)||0,Number(actor.y)||0);
 ctx.scale(facing,1);
 ctx.drawImage(img,col*fw,row*fh,fw,fh,-fw*scale*.5,-fh*scale*.5-8,fw*scale,fh*scale);
 ctx.restore();
 return true;
}
global.HumanFishingBabySprites={enabled:enabled,images:images,render:render};
})(window);
