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
assert.ok(drawCode.includes('var d=fx.radius*2*scale;'),
 'Vortex diameter must be 2x real catch radius, not overscaled');
assert.doesNotMatch(drawCode,/fx\.radius\*2\/\.55/,
 'The old 1.82x effect overdraw must never come back');
assert.match(source,/radius:\[100,132,170,215,265,320\]\[clamp\(tier,0,5\)\]\+lv\*3/,
 'Real catch radii must continue to depend on tier and level');

const calls=[],ctx={
 lastX:0,lastY:0,
 save(){},restore(){},
 translate(x,y){this.lastX=x;this.lastY=y},
 rotate(){},
 drawImage(image,...p){calls.push({
  image:image.id,x:this.lastX,y:this.lastY,w:p[6],h:p[7]
 })}
};
const img=(id)=>({id,ready:true,width:400,height:400,naturalWidth:400,naturalHeight:400});
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const scene={
 ctx,Math,console,clamp,
 castEasing(x){x=clamp(x,0,1);return x*x*(3-2*x)},
 feverVortexArt:img('vortex'),
 feverVortexOpaque:null,
 feverSuctionArt:{front:img('front'),back:img('back'),drops:img('drops')},
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
   surfaceAt:99,elapsed:.35,suctionEnd:1.05
  };
  calls.length=0;
  assert.equal(scene.drawFeverVortex(fx,{x:610,y:410,tilt:0}),true);
  assert.equal(calls.length,3,'Vortex base + two illustrated suction rings');
  for(const item of calls){
   assert.ok(item.w<=realRadius*2+1e-6&&item.h<=realRadius*2+1e-6,
    tier+'/'+level+': '+item.image+' grew beyond catch diameter');
  }
  assert.equal(calls.find(x=>x.image==='vortex').w,realRadius*2,
   'Outer vortex artwork must use the actual capture diameter');

  calls.length=0;
  fx.elapsed=.55;
  scene.drawFeverSuctionParticles(fx,.55);
  assert.equal(calls.length,22,'Expected 22 painted suction droplets');
  for(const item of calls){
   const centerDistance=Math.hypot(item.x-fx.x,item.y-fx.y);
   assert.ok(centerDistance+item.w*.5<=realRadius+1e-6,
    tier+'/'+level+': suction droplet exceeds capture boundary');
  }
 }
}
console.log('PASS: tier 0-5 and level 0/1/5/10 use exact catch-radius vortex and in-bound droplets.');
