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
  img.src='./assets/humans/'+paths[state]+'?v='+(state==='hooked'?'20261110-hooked-v2':version);
  images[state]=img;
 });
}
// Keep geometry in the same coordinate frame as the approved 8-frame PNG.
 // The source pose looks right; negative vx mirrors it consistently.
var HUMAN_WORLD_RENDER_BOOST=1.295; // exactly 70% of the previous 1.85
function poseGeometry(actor){
 var size=Math.max(.7,Math.min(1.8,Number(actor&&actor.size)||1));
 var scale=.36*size*(actor&&actor.id>=20?1.05:1)*HUMAN_WORLD_RENDER_BOOST;
 var facing=Number(actor&&(actor.vx||actor.dir)||1)<0?-1:1;
 var x=Number(actor&&actor.x)||0,y=Number(actor&&actor.y)||0;
 var width=362*scale,height=543*scale;
 // Head/mouth is toward the right-hand leading edge in the approved frame.
 // Cropped transparent padding is intentionally excluded from collision size.
 return{width:width,height:height,scale:scale,facing:facing,
  mouth:{x:x+facing*width*.34,y:y+height*.09-8,
   rx:actor&&actor.id>=20?8:12,ry:actor&&actor.id>=20?6.5:9,
   facing:facing},
  body:{x:x,y:y+height*.02-8,rx:width*.43,ry:height*.30}};
}
function render(ctx,actor,now,action){
 if(!enabled||!actor)return false;
 var mood=paths[action]?action:'swim',img=images[mood];
 var sheet=mood==='hooked'?{w:1776,h:888,fw:444,fh:444}:{w:1448,h:1086,fw:362,fh:543};
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
 var scale=(mood==='hooked'?.33:.36)*size*(actor.id>=20?1.05:1)*HUMAN_WORLD_RENDER_BOOST;
 var facing=Number(actor.vx||actor.dir||1)<0?-1:1;
 ctx.save();
 ctx.translate(Number(actor.x)||0,Number(actor.y)||0);
 ctx.scale(facing,1);
 ctx.drawImage(img,col*fw,row*fh,fw,fh,-fw*scale*.5,-fh*scale*.5-8,fw*scale,fh*scale);
 ctx.restore();
 return true;
}
global.HumanFishingBabySprites={enabled:enabled,images:images,
 render:render,geometry:poseGeometry};
})(window);
