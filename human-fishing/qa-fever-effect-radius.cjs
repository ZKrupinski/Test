'use strict';
// The vortex remains tied to the REAL capture radius. The GLASS BUBBLES
// alone have half the previous orbit radius and 55% previous bitmap size,
// consistently across every octopus tier and level.
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
assert.match(drawCode,/function feverSnapProgress\(fx\)\{\s*return feverCatchGatherProgress\(fx\);\s*\}/,
 'Vortex collapse must use the same progress as the caught fish, without a delayed start');
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
const mix=(a,b,t)=>a+(b-a)*t;
const scene={
 ctx,Math,console,clamp,mix,
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
  // Real 60fps samples: impact on frame 1, visible shrink on frames 2/3,
  // and complete half-size by 90ms (same instant as the captured fish).
  const full=measure(1/60),middle=measure(2/60),late=measure(3/60),half=measure(.095);
  assert.ok(Math.abs(full-realRadius*2)<1e-6,
   'Fever must initially show the full gameplay capture radius');
  assert.ok(middle<full&&middle>late&&late>half,
   'Fever ring must visibly collapse on frames 2 and 3, together with fish');
  assert.ok(Math.abs(half-realRadius)<1e-6,
   'Fever ring must finish at HALF the initial diameter by 90ms');
  // Each active frame draws a changing subset of staggered, independently
  // spawned glass bubbles. They may legitimately be OUTSIDE the VFX ring.
  const expected=realRadius>=180?28:22;
  for(const at of [.14,.30,.55,.70,1.12,1.60]){
   fx.elapsed=at;calls.length=0;
   scene.drawFeverSuctionParticles(fx,at);
   assert.ok(calls.length>=3&&calls.length<=expected,
    'Fever bubbles must scatter asynchronously, not appear as a solid crowd');
   assert.ok(calls.every(x=>x.image==='glass-bubble'),
    'Must render distinct glass bubbles, not white foam');
   // Only bubble sprites shrink: render diameter is 55% of the former
   // tier-relative size, independently of unchanged vortex/capture radius.
   const currentScale=scene.feverBubblePose(fx,at,0).visualRadius/100;
   assert.ok(calls.every(x=>x.w>0&&
     x.w<=78*currentScale*.55+1e-6&&x.alpha>0&&x.alpha<=1),
    'Glass bubbles must render smaller and still scale by octopus tier');
  }
  fx.elapsed=.55;calls.length=0;
  scene.drawFeverSuctionParticles(fx,.55);
  const sizes=new Set(calls.map(x=>Math.round(x.w)));
  assert.ok(sizes.size>=3,'Water bubble sizes cannot all be the same');
  // At an identical effect phase, tier/level radius must translate 1:1
  // into bubble diameter, while their individual seeds and transparency
  // stay untouched. Mid-tier radius 200 is the original visual baseline.
  const reference={...fx,radius:200};
  for(const i of [0,3,11]){
   const actual=scene.feverBubblePose(fx,.55,i);
   const baseline=scene.feverBubblePose(reference,.55,i);
   assert.ok(Math.abs(actual.size/baseline.size-realRadius/200)<1e-8,
    'Bubble size must follow actual Fever tier and level radius');
  }
  // Size shrinks in sync with the same 24-90ms snap as caught fish.
  const start={...fx,elapsed:.024},end={...fx,elapsed:.095};
  let checked=0;
  for(let i=0;i<expected;i++){
   const early=scene.feverBubblePose(start,.024,i);
   const late=scene.feverBubblePose(end,.095,i);
   if(early.cycle!==late.cycle)continue;
   assert.ok(Math.abs(late.startSize/early.startSize-.5)<1e-8,
    'Each bubble must shrink to half during the Fever vortex snap');
   checked++;
  }
  assert.ok(checked>=12,'Need stable bubble samples across the snap');
  const activePoses=Array.from({length:expected},(_,i)=>
   scene.feverBubblePose(fx,.55,i));
  assert.ok(activePoses.some(p=>p.radius>p.visualRadius*.60),
   'Fresh half-radius bubbles should still travel inward visibly');
  assert.ok(activePoses.some(p=>p.radius<p.visualRadius*.225),
   'Older bubbles must spiral deeply into the reduced field');
  // Exact regression: each particle orbits at HALF the old radius
  // (including the final inner radius) and its bitmap is 55% as wide.
  for(const i of [0,3,11,21]){
   const p=scene.feverBubblePose(fx,.55,i);
   const hash=scene.feverBubbleHash;
   const oldOuter=p.visualRadius*(1.35+.60*hash(i*17+p.cycle*23+2));
   const oldInner=3+9*hash(i*19+p.cycle*13+3);
   const oldRadius=mix(oldOuter,oldInner,p.pull);
   const oldStart=(34+hash(i*31+p.cycle*7+9)*44)*p.visualRadius/100;
   assert.ok(Math.abs(p.outer/oldOuter-.5)<1e-8,
    'Bubble orbit outer radius must be exactly 50% for each tier/level');
   assert.ok(Math.abs(p.inner/oldInner-.5)<1e-8,
    'Bubble orbit endpoint must be exactly 50% for each tier/level');
   assert.ok(Math.abs(p.radius/oldRadius-.5)<1e-8,
    'Bubble travel radius must be exactly 50% at every particle phase');
   assert.ok(Math.abs(p.startSize/oldStart-.55)<1e-8,
    'Individual droplet bitmap must be 55% of the former size');
  }

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
  assert.ok(born.outer>born.visualRadius*.67&&
   born.outer<born.visualRadius*.976,
   'Bubble birth radius must be 0.675x to 0.975x visual vortex radius');
  assert.ok(born.radius>born.visualRadius*.625,
   'New water bubbles spawn at half their former distance');
  assert.ok(mid.radius/mid.outer<born.radius/born.outer&&
   lost.radius/lost.outer<mid.radius/mid.outer,
   'Bubble must spiral progressively toward the center');
  assert.ok(mid.alpha>born.alpha*4&&mid.alpha>lost.alpha*4,
   'Water bubble must grow opaque inward then vanish near center');
  assert.ok(Math.abs(mid.angle-born.angle)>1,
   'Bubble must rotate around the lure during inward travel');
  assert.ok(born.size>mid.size&&mid.size>lost.size,
   'Individual bubble must visibly shrink while approaching the center');
  assert.ok(lost.radius<born.radius*.12&&lost.inner<=12,
   'Old bubbles should reach nearly the exact center before fading');
  // The second cycle must contain fresh bubbles, not merely a single
  // one-shot suction burst reused until the cast ends.
  function secondCyclePose(life){
   const time=(2+life-seed.shift)/seed.speed;
   return scene.feverBubblePose({...probe,elapsed:time},time,0);
  }
  const secondBorn=secondCyclePose(.06),secondMid=secondCyclePose(.52);
  assert.equal(secondBorn.cycle,born.cycle+1,
   'Water bubble did not respawn for a second visible cycle');
  assert.ok(secondMid.alpha>secondBorn.alpha*4&&
   secondBorn.outer>secondBorn.visualRadius*.67,
   'Second cycle needs another half-radius spawn and inward brightening');
  assert.ok(Math.abs(secondBorn.outer-born.outer)>1e-3||
   Math.abs(secondBorn.angle-born.angle)>1e-3,
   'Every new bubble cycle should have a distinct organic starting point');
  // The fade must not blanket-out the whole effect during late suction.
  fx.elapsed=fx.reelStart+.35;calls.length=0;
  scene.drawFeverSuctionParticles(fx,fx.elapsed);
  assert.ok(calls.some(p=>p.alpha>.40),
   'Continuous suction bubbles disappeared before bait retrieval');
  fx.elapsed=fx.reelStart+.73;calls.length=0;
  scene.drawFeverSuctionParticles(fx,fx.elapsed);
  assert.equal(calls.length,0,'Bubbles must end before the fish toss');
  calls.length=0;
  fx.elapsed=.31;
  scene.drawFeverVortex(fx,{x:610,y:410,tilt:0});
  assert.ok(calls.some(x=>x.image==='softened-white'),
   'Opaque white vortex source must use the softened bitmap instead');
 }
}
console.log('PASS: all Fever octopus tiers keep original capture/vortex radius, bubbles orbit at exact 50% radius and render at 55% size, looping, spiraling and fading.');
