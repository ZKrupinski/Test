/* Aquarium human regression: entering Play must retain displayed residents. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const body=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert(body,'Game inline script missing');
new vm.Script(body,{filename:'human-fishing.js'});
assert.match(body,/function aquariumReplenishHumans\(inView\)/);
assert.match(body,/aquariumReplenishHumans\(true\);/);
assert.match(body,/if\(person\.aquariumResident&&aquariumFishingActive\)/);
assert.match(body,/if\(!hook&&!feverFx&&!catchFx\)aquariumReplenishHumans\(false\)/);
assert.doesNotMatch(body,/fish=displayed;hum=\[\];hook=null;eco\.fishTimer=0;eco\.humanTimer=0;/,
 'Fish-to-play transition must not permanently clear all humans without rebuilding them');
// Execute the real aquarium conversion functions in a controlled scene
// rather than checking text only.
const start=body.indexOf('function aquariumMakePlayHuman(');
const end=body.indexOf('function aquariumReturnToExhibit(',start);
assert(start>0&&end>start,'Aquarium game transition functions not found');
const fx=body.slice(start,end);
const elements={};
const $=id=>elements[id]??={classList:{add(){},remove(){},toggle(){}}};
const c={
 save:{humanPlaced:['8','21','3'],owned:{F001:1}},humans:Array.from({length:24},(_,i)=>'H'+i),
 species:[{id:'F001'}],hum:[],fish:[],aquariumFishActors:[],
 aquariumFishingActive:false,aquariumPanelOpen:true,aquariumSpawnTimer:3,
 aquariumHumanSpawnTimer:3,aquariumKnownSpecies:()=>[{id:'F001'}],
 aquariumCloseSaleReceipt(){},aquariumEnsureFish(){},
 makeWildFish:(sp,x,y,dir)=>({sp,x,y,dir}),
 eco:{next:50,t:100,fishTimer:5,humanTimer:5,zone:-1,humanZone:-1},
 aquariumExhibitTarget:10,zone:0,view:'tank',hook:{kind:'fish'},
 time:12,W:1280,WATER_SURFACE_Y:293,
 clamp:(n,lo,hi)=>Math.min(hi,Math.max(lo,n)),rnd:(lo,hi)=>(lo+hi)/2,
 setMode(mode){this.view=mode;},introEntrance:{active:true},cast:{active:true},
 startCast(){throw Error('Should not cast during intro fixture')},
 announce(){throw Error('Should not fail when aquarium has display humans')},
 $: $,Math,
};
vm.createContext(c);
vm.runInContext(fx,c,{filename:'aquarium-transition.js'});
c.aquariumBeginPlay();
assert.equal(c.aquariumFishingActive,true);
assert.equal(c.hum.length,3,'All three placed humans must remain in Play');
assert.deepEqual(Array.from(c.hum,x=>x.id),[8,21,3],'Same displayed IDs required');
assert.deepEqual(Array.from(c.hum,x=>x.aquariumSlot),[0,1,2],'Display slots remain stable');
assert(c.hum.every(x=>x.aquariumResident),'Resident flag is required');
assert(c.hum.every(x=>x.x>140&&x.x<1160),'Initial humans must already be visible');
assert.equal(c.hum[0].phase,0);
assert.equal(c.hum[1].phase,1);
assert.equal(c.aquariumHumanSpawnTimer,0);
assert.equal(c.fish.length,0,'The test has no fish exhibit actors to inherit');
c.hum.splice(0,1);c.aquariumReplenishHumans(false);
assert.equal(c.hum.length,3,'Missing human must be replenished');
const reentered=c.hum.find(x=>x.aquariumSlot===0);
assert.equal(reentered.id,8,'Replenished human uses the existing placement');
assert(reentered.x<0||reentered.x>1280,'Replenishment enters naturally from the edge');
c.aquariumReplenishHumans(false);
assert.equal(c.hum.length,3,'No duplicate residents on repeated checks');
// Human-only aquariums are playable too.
c.save.humanPlaced=['21'];c.save.owned={};c.hum=[];c.fish=[];
c.aquariumKnownSpecies=()=>[];
c.view='tank';c.aquariumBeginPlay();
assert.equal(c.hum.length,1,'Human-only aquariums must not be blocked');
assert.equal(c.hum[0].id,21);
console.log('PASS: aquarium displays all placed humans in fishing scene, preserves IDs, replenishes missing residents, supports human-only exhibits');
