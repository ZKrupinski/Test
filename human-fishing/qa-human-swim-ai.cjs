/* Shared human movement: exhibit and in-game behavior variation regression. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const script=fs.readFileSync(__dirname+'/index.html','utf8').match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert(script,'Game JS absent');new vm.Script(script);
const start=script.indexOf('function humanSwimStep(');
const end=script.indexOf('function updateEcosystem(',start);
assert(start>0&&end>start,'Expected isolated shared human AI');
const ai=script.slice(start,end);
assert.match(script,/humanSwimStep\(person,dt,time,cast\.active/);
assert.match(script,/humanSwimStep\(h,humanDt,now,null,true\)/);
assert.match(script,/aquariumEnsureHumans\(\); \/\/ Reuse positions and motion state from exhibition/);
const sprite=fs.readFileSync(__dirname+'/human-sprites.js','utf8');
assert.match(sprite,/actor\.swimAnimationClock/,'Animation should adapt to actual pace');
const makeSim=(seed)=>({
 W:1280,Math:Object.assign(Object.create(Math),{random(){return seed()}}),
 clamp:(x,a,b)=>Math.min(b,Math.max(a,x)),
 rnd:(a,b)=>a+(b-a)*seed()
});
let n=0;const seeded=()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296;};
const ctx=makeSim(seeded);vm.createContext(ctx);vm.runInContext(ai,ctx);
const h={id:8,x:640,y:445,vx:34,vy:0,phase:0,size:1};
const history=[],modes=new Set(),speedValues=new Set(),turns=new Set();
for(let i=0;i<2600;i++){
 const t=i*.04;ctx.humanSwimStep(h,.04,t,null,false);
 if(i%25===0)history.push({x:h.x,y:h.y,vx:h.vx});
 modes.add(h.swimMode);
 speedValues.add(Math.round(Math.abs(h.vx)));
 turns.add(Math.sign(h.vx));
 assert(Number.isFinite(h.x)&&Number.isFinite(h.y));
 assert(h.y>=339.999&&h.y<=608.001,'Human must remain underwater');
 assert(h.x>=-185&&h.x<=1280+185,'No sudden screen exits');
}
assert(modes.has('cruise')&&modes.has('dash')&&modes.has('pause')&&modes.has('turn'),
 'Human must change behavior: cruise, sprint, pause, prepare turn');
assert(speedValues.size>15,'Human speed must not remain uniform');
assert(turns.has(-1)&&turns.has(1),'Human must actually change horizontal direction');
const depth=new Set(history.map(p=>Math.round(p.y/5)));
assert(depth.size>5,'Human should swim diagonally/up/down, not on one rail');
assert(h.swimAnimationClock>0,'Swimming cycle should advance');
const e={id:3,x:235,y:426,vx:30,vy:0,phase:1,size:1,
 swimLaneX:235,swimLaneY:426};
for(let i=0;i<900;i++){
 const t=i*.04;ctx.humanSwimStep(e,.04,t,null,true);
 assert(e.x>=95&&e.x<=375,'Exhibition human must stay near its display slot');
 assert(e.y>=335&&e.y<=470,'Exhibition human should remain in its lane');
}
const baited={id:9,x:600,y:445,vx:30,vy:0,phase:2,size:1};
ctx.humanSwimStep(baited,.04,0,null,false);
baited.swimNextReactionAt=.04;
ctx.humanSwimStep(baited,.04,.05,{x:620,y:445},false);
assert(['dash','turn'].includes(baited.swimMode),'Near bait human should react');
assert(baited.swimTargetY!==445,'Human reacts vertically as well as horizontally');
const face=fs.readFileSync(__dirname+'/human-sprites.js','utf8');
assert.match(face,/swimAnimationClock/);
console.log('PASS: human swim varies speed, altitude and turning, has pauses/dashes and bait dodge, exhibition patrols lanes');
