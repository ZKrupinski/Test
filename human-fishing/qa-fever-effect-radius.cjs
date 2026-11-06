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
  calls.length=0;
  fx.elapsed=.55;
  scene.drawFeverSuctionParticles(fx,.55);
  const expected=realRadius>=180?18:14;
  assert.equal(calls.length,expected,'Expected clear glass bubble sprites');
  for(const item of calls){
   const centerDistance=Math.hypot(item.x-fx.x,item.y-fx.y);
   assert.ok(centerDistance+item.w*.55<=realRadius*.5+1e-6,
    tier+'/'+level+': water bubble exceeds shrunken vortex boundary');
   assert.equal(item.image,'glass-bubble','Foamy source was used instead of glass bubbles');
   assert.ok(item.alpha>=.75&&item.alpha<=1,
    'Every bubble must be clearly visible on the topmost layer');
   assert.ok(item.w>=36,'Glass bubble bitmap too small for mobile display');
  }
  for(const at of [.14,.30,.70,1.12,1.60]){
   fx.elapsed=at;calls.length=0;
   scene.drawFeverSuctionParticles(fx,at);
   assert.equal(calls.length,expected,
    'Water bubbles should remain on screen through early bait retrieval');
   assert.ok(calls.some(x=>x.alpha>.20&&x.w>=36),
    'Water bubble visibility collapsed during the suction or reel animation');
  }
  fx.elapsed=fx.reelStart+.69;calls.length=0;
  scene.drawFeverSuctionParticles(fx,fx.elapsed);
  assert.equal(calls.length,0,'Water bubbles must vanish before the fish toss');
  calls.length=0;
  fx.elapsed=.31;
  scene.drawFeverVortex(fx,{x:610,y:410,tilt:0});
  assert.ok(calls.some(x=>x.image==='softened-white'),
   'Opaque white vortex source must use the softened bitmap instead');
 }
}
console.log('PASS: all Fever tiers show softened pulsating white vortex and 14-18 large glass bubbles through reel.');
