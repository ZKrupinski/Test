/* Human oral weakspot and collision panic regression. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const game=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert(game,'Game script missing');
new vm.Script(game);
const sprite=fs.readFileSync(__dirname+'/human-sprites.js','utf8');
const env={window:{HumanFishingBabySpritesReady:false}};
vm.runInNewContext(sprite,env);
const sprites=env.window.HumanFishingBabySprites;
assert(sprites.geometry,'Shared sprite geometry missing');
const mouthBlock=game.slice(game.indexOf('function humanPoseGeometry('),
 game.indexOf('// Unlike the former',game.indexOf('function humanPoseGeometry(')));
const fishHit=game.slice(game.indexOf('function ordinaryFishingTarget()'),
 game.indexOf('function nearest()',game.indexOf('function ordinaryFishingTarget()')));
assert.match(fishHit,/humanMouthWeakspot\(a,time\)/);
assert.doesNotMatch(fishHit,/107\+save\.up\[1\]/,'Human cannot be caught by large center-radius');
assert.match(fishHit,/d2<=1&&d2<lowest/);
const state={window:env.window,baitCenterRadius:()=>8};
vm.createContext(state);
vm.runInContext(mouthBlock,state);
const person={id:3,x:500,y:430,vx:31,size:1,phase:0};
const mouth=state.humanMouthWeakspot(person,0);
const center={x:500,y:430};
assert(state.humanMouthOverlapsLure(person,{x:mouth.x,y:mouth.y},0),
 'Exact mouth overlap must catch');
assert(!state.humanMouthOverlapsLure(person,center,0),
 'Lure at human torso may not count as mouth');
assert(state.humanBodyContact(person,center),'Torso contact should still be detected');
person.vx=-31;
const reverse=state.humanMouthWeakspot(person,0);
assert.equal(reverse.x-500,500-mouth.x,'Human mouth must follow mirrored swimming direction');
const boss=state.humanMouthWeakspot({id:21,x:500,y:430,vx:31,size:1},0);
assert(boss.rx<mouth.rx&&boss.ry<mouth.ry,'Boss mouth must be a harder weakspot');

const ecoStart=game.indexOf('function ecoBodyRadius(');
const ecoEnd=game.indexOf('// ALPHA 1.2 — Failed fish fall',ecoStart);
assert(ecoStart>0&&ecoEnd>ecoStart);
const physics=game.slice(ecoStart,ecoEnd);
assert.match(physics,/function ecoResolveHumanFishSpacing\(dt\)/);
assert.match(physics,/ecoResolveHumanFishSpacing\(dt\);/);
assert.match(physics,/f\.humanImpactCooldownUntil=eco\.t\+1\.9/);
const human={id:3,x:650,y:440,vx:26,size:1,phase:0};
const near={ecoId:1,x:650,y:440,vx:-24,vy:0,dir:-1,
 size:1,sizeClass:'MEDIUM',sp:{id:'F004',rarity:'COMMON'},
 panicUntil:0,fleeBurstUntil:0,missScareStayVisible:false};
const fish=[near],hum=[human],eco={t:10,next:50};
const sim={
 W:1280,fish,hum,eco,hook:null,view:'fish',time:10,
 clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),
 ecoSafeDepth:(f,y)=>Math.max(300,Math.min(620,y)),
 fishVisualProfile:()=>({category:'MEDIUM'}),
 humanPoseGeometry:state.humanPoseGeometry,
 missScareScreenLimits:()=>({left:80,right:1200}),
};
vm.createContext(sim);
// Isolate only physics helpers without the rest of the full ecosystem.
const physicsStart=physics.indexOf('function ecoBodyRadius(');
const collisionEnd=physics.indexOf('function updateEcosystem(');
vm.runInContext(physics.slice(physicsStart,collisionEnd),sim);
const steering=sim.ecoCrowd(near,.016);
assert(Math.hypot(steering.sepX,steering.sepY)>20,'Fish avoid a nearby human BEFORE touching');
sim.ecoResolveHumanFishSpacing(.016);
assert(near.panicUntil>10.5,'Human contact must trigger escape behavior');
assert(near.fleeBurstUntil>10.2,'Contact must create an immediate dart');
assert(near.humanImpactCooldownUntil>11.5,'Repeated contact must be rate-limited');
assert(near.x>=80&&near.x<=1200,'Fish must not be scattered outside the screen');
const last=near.humanImpactCooldownUntil;
sim.ecoResolveHumanFishSpacing(.016);
assert.equal(near.humanImpactCooldownUntil,last,'Repeated frames must not restart a panic');
fish[0].x=1030;fish[0].y=500;fish[0].panicUntil=0;
const far=sim.ecoCrowd(fish[0],.016);
assert.equal(far.sepX,0);assert.equal(far.sepY,0);
sim.ecoResolveHumanFishSpacing(.016);
assert.equal(fish[0].panicUntil,0,'No panic when far away');
human.feverCaptured=true;
fish[0].x=650;fish[0].y=440;
assert.equal(sim.ecoCrowd(fish[0],.016).sepX,0,'Captured humans cause no obstacle');
console.log('PASS: human mouth-only fishing (mirrored and boss), fish anticipation, bounded collision escape and cooldown');