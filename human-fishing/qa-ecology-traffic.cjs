
'use strict';
// Dense groups must clear without rigid body-push deadlocks. The actual game
// simulation runs with 10 big midwater fish trying to swim through each other.
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const script=fs.readFileSync('human-fishing/index.html','utf8').match(/<script>([\s\S]*?)<\/script>/i)?.[1];
assert.ok(script,'Missing game script');
const start=script.indexOf('function ecoBodyRadius(');
const end=script.indexOf('// ALPHA 1.2 — Failed fish fall',start);
assert.ok(start>=0&&end>start,'Missing collision/traffic logic');
const code=script.slice(start,end);
assert.match(code,/function ecoTrafficGuide\(f,wantX\)/);
assert.match(code,/var traffic=state==='flee'/);
assert.match(code,/var passing=\(\(f.trafficPassUntil/);
let now=0,id=0;
const W=1280,fish=[],hum=[];
const env={
 console,Math,W,fish,hum,hook:null,view:'fish',aquariumFishingActive:true,
 aquariumSpawnTimer:0,aquariumExhibitTarget:0,cast:{active:true},
 feverFx:null,escapeFx:null,catchFx:null,bob:{x:640,y:450},time:0,
 eco:{t:0,fishTimer:0,humanTimer:0,next:100,school:0,contests:0},
 clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),
 mix:(a,b,t)=>a+(b-a)*t,
 rnd:(a,b)=>(a+b)/2,
 fishRarityMovement:()=>({cruise:1,minimum:0,cap:90,steer:3.6,
  turnMin:40,turnMax:50,turnChance:0,
  dashMin:30,dashMax:50,dashLength:.3,dashPower:1,
  lureSense:0,lureAvoid:0,prep:0}),
 fishVisualProfile:()=>({category:'LARGE'}),
 ecoDepthMin:()=>300,ecoDepthMax:()=>630,
 ecoSafeDepth:(f,y)=>Math.max(300,Math.min(630,y)),
 updateEcosystem:null,
 baitTrait:()=>({type:'none'}),danglingBaitPosition:()=>({x:640,y:460}),
 isFishFleeing:()=>false,
 spawnWildFish:()=>0,spawnWildHuman:()=>0,
 aquariumSpawnCodexFish:()=>0,
 spawnParticles:()=>{},vibrationPulse:()=>{}
};
vm.createContext(env);
// Isolate the collision/steering engine without unrelated camera rendering.
vm.runInContext(code,env,{filename:'eco-traffic.js'});
const make=(x,y,dir,n)=>({
 ecoId:++id,sp:{rarity:'COMMON',index:0,name:'참다랑어'},
 x,y,dir,vx:dir*23,vy:0,speed:30,agility:1,
 size:1.8,sizeClass:'LARGE',phase:n*.23,hunter:false,small:false,
 schoolId:0,behavior:'cruise',swimMode:'cruise',swimFreq:.31,
 swimAmp:2,homeY:y,nextTurn:200,panicUntil:0,fightUntil:0,
 fleeBurstUntil:0,nextDart:200,dartUntil:0,dartPrepUntil:0
});
// Alternating bidirectional traffic crossing a very narrow water corridor.
for(let i=0;i<10;i++){
 const dir=i%2===0?1:-1;
 fish.push(make(dir===1?535+i*12:765-i*12,
  430+(i%3-1)*12,dir,i));
}
const before=fish.map(f=>({x:f.x,y:f.y}));
let maxLane=0;
for(let step=0;step<325;step++){
 env.time+=.04;
 env.updateEcosystem(.04);
 for(const f of fish){
  assert.ok(Number.isFinite(f.x)&&Number.isFinite(f.y));
  assert.ok(f.y>=300-1e-7&&f.y<=630+1e-7);
  assert.ok(Math.abs(f.vx)<110&&Math.abs(f.vy)<110);
  maxLane=Math.max(maxLane,f.trafficAvoidCount||0);
 }
}
assert.ok(maxLane>0,'Blocked fish never selected a side lane');
const moved=fish.filter((f,i)=>Math.abs(f.x-before[i].x)>86).length;
assert.ok(moved>=6,'Bottleneck stayed jammed; only '+moved+' out of 10 fish crossed >86px');
const verticallySpread=fish.filter((f,i)=>Math.abs(f.y-before[i].y)>20).length;
assert.ok(verticallySpread>=3,'Traffic fish never dispersed to different depths');
// Missed-catch escape and hooked fish should not be lane-steered at all.
const locked=make(650,470,1,12);locked.panicUntil=env.eco.t+1;
env.fish.splice(0,env.fish.length,locked);
env.updateEcosystem(.04);
assert.ok(!locked.trafficAvoidCount,'Panic must override traffic lane logic');
console.log('PASS: opposing crowded fish choose distinct lanes, pass with limited overlap and disperse safely');
