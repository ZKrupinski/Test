'use strict';
// Every bitmap effect, including the separate suction droplets, must remain
// within the actual OCTO FEVER catch radius, at all octopus tiers/levels.
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync('human-fishing/index.html','utf8');
const source=html.match(/<script>([\s\S]*?)<\/script>/i)?.[1];
assert.ok(source,'Missing game JavaScript');
const first=source.indexOf('function feverSuctionAtlasFrame(');
const last=source.indexOf('// A softly damped pendulum',first);
assert.ok(first>=0&&last>first,'Missing Fever bitmap render functions');
const drawCode=source.slice(first,last);
assert.ok(drawCode.includes('var d=fx.radius*2*scale*feverSnapScale(fx);'),
 'Vortex must first match real radius, then visually collapse to half');
assert.doesNotMatch(drawCode,/fx\.radius\*2\/\.55/,
 'The old 1.82x effect overdraw must never come back');
assert.match(source,/radius:\[100,132,170,215,265,320\]\[clamp\(tier,0,5\)\]\+lv\*3/,
 'Real catch radii must continue to depend on tier and level');

const calls=[],ctx={
 lastX:0,lastY:0,globalAlpha:1,
 save(){},restore(){},
 translate(x,y){this.lastX=x;this.lastY=y},
 rotate(){},
 drawImage(image,...p){calls.push({
  image:image.id,x:this.lastX,y:this.lastY,w:p[6],h:p[7],
  alpha:this.globalAlpha
 })}
};
const img=(id)=>({id,ready:true,width:400,height:400,naturalWidth:400,naturalHeight:400});
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const scene={
 ctx,Math,console,clamp,
 castEasing(x){x=clamp(x,0,1);return x*x*(3-2*x)},
 feverVortexArt:img('vortex'),
 feverVortexOpaque:null,
 feverSuctionArt:{front:img('front'),back:img('back'),drops:img('drops'),
  bubbles:img('glass-bubble'),backSoft:img('softened-white')},
 feverReelState(fx){return{x:fx.x,y:fx.y}},
 lureRecovery:{active:false},
 time:0,rodTip(){return{x:490,y:100}},
 mouthPos(){return{x:300,y:200}},
 swallowPoint(x,y,p){return{x,y}}
};
vm.createContext(scene);
vm.runInContext(drawCode,scene,{filename:'fever-effect.js'});
const base=[100,132,170,215,265,320];
for(let tier=0;tier<=5;tier++){
 for(const level of [0,1,5,10]){
  const realRadius=base[tier]+level*3;
  const fx={
   x:610,y:410,radius:realRadius,reelStart:1.37,
   surfaceAt:99,elapsed:.05,suctionEnd:1.05
  };
  const measure=(at)=>{
   fx.elapsed=at;calls.length=0;
   assert.equal(scene.drawFeverVortex(fx,{x:610,y:410,tilt:0}),true);
   assert.equal(calls.length,3,'Vortex base + two suction rings');
   for(const item of calls){
    assert.ok(item.w<=realRadius*2+1e-6&&item.h<=realRadius*2+1e-6,
     tier+'/'+level+': '+item.image+' grew beyond catch diameter');
   }
   return calls.find(x=>x.image==='vortex').w;
  };
  const full=measure(.05),middle=measure(.24),half=measure(.50);
  assert.ok(Math.abs(full-realRadius*2)<1e-6,
   'Fever must first show the full gameplay capture radius');
  assert.ok(middle<full&&middle>half,
   'Fever ring must contract during the capture snap');
  assert.ok(Math.abs(half-realRadius)<1e-6,
   'Fever ring must finish at exactly HALF the starting diameter');
  // Each active frame draws a changing subset of staggered, independently
  // spawned glass bubbles. They may legitimately be OUTSIDE the VFX ring.
  const expected=realRadius>=180?20:16;
  for(const at of [.14,.30,.55,.70,1.12,1.60]){
   fx.elapsed=at;calls.length=0;
   scene.drawFeverSuctionParticles(fx,at);
   assert.ok(calls.length>=3&&calls.length<=expected,
    'Fever bubbles must scatter asynchronously, not appear as a solid crowd');
   assert.ok(calls.every(x=>x.image==='glass-bubble'),
    'Must render distinct glass bubbles, not white foam');
   assert.ok(calls.every(x=>x.w>=24&&x.w<=77&&x.alpha>0&&x.alpha<=1),
    'Bubble sprites need varied mobile-legible size and fade');
  }
  fx.elapsed=.55;calls.length=0;
  scene.drawFeverSuctionParticles(fx,.55);
  const sizes=new Set(calls.map(x=>Math.round(x.w)));
  assert.ok(sizes.size>=3,'Water bubble sizes cannot all be the same');
  const activePoses=Array.from({length:expected},(_,i)=>
   scene.feverBubblePose(fx,.55,i));
  assert.ok(activePoses.some(p=>p.radius>p.visualRadius*1.02),
   'Fresh water bubbles must originate OUTSIDE the visible vortex');
  assert.ok(activePoses.some(p=>p.radius<p.visualRadius*.65),
   'Older bubbles must already be winding toward the vortex center');

  // A single bubble's repeated life cycle: translucent birth, bright
  // middle, transparent death. Use a long stationary reel window to
  // isolate its phase-dependent motion from scene-wide release fade.
  const probe={...fx,reelStart:10};
  const seed=scene.feverBubblePose({...probe,elapsed:0},0,0);
  function cyclePose(life){
   const time=(1+life-seed.shift)/seed.speed;
   return scene.feverBubblePose({...probe,elapsed:time},time,0);
  }
  const born=cyclePose(.06),mid=cyclePose(.52),lost=cyclePose(.96);
  assert.ok(born.outer>born.visualRadius*1.075,
   'Bubble birth point must sit beyond the outer vortex circle');
  assert.ok(born.radius>born.visualRadius,
   'New water bubble needs to start outside the visible effect');
  assert.ok(mid.radius/mid.outer<born.radius/born.outer&&
   lost.radius/lost.outer<mid.radius/mid.outer,
   'Bubble must spiral progressively toward the center');
  assert.ok(mid.alpha>born.alpha*4&&mid.alpha>lost.alpha*4,
   'Water bubble must grow opaque inward then vanish near center');
  assert.ok(Math.abs(mid.angle-born.angle)>1,
   'Bubble must rotate around the lure during inward travel');
  fx.elapsed=fx.reelStart+.69;calls.length=0;
  scene.drawFeverSuctionParticles(fx,fx.elapsed);
  assert.equal(calls.length,0,'Water bubbles must stop before fish toss');
  calls.length=0;
  fx.elapsed=.31;
  scene.drawFeverVortex(fx,{x:610,y:410,tilt:0});
  assert.ok(calls.some(x=>x.image==='softened-white'),
   'Opaque white vortex source must use the softened bitmap instead');
 }
}
console.log('PASS: all Fever tiers keep full-to-half vortex, and distinct bubbles spawn outside, spiral inward, brighten and fade before respawning.');
