/* Tank/menu/Play navigation regression: never reuse offscreen or NaN exhibit actors. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const game=fs.readFileSync(__dirname+'/index.html','utf8')
 .match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert(game,'Inline fishing script absent');
new vm.Script(game,{filename:'human-fishing.js'});
function take(first,last){
 const a=game.indexOf(first),b=game.indexOf(last,a+first.length);
 assert(a>=0&&b>a,'Missing game code: '+first);
 return game.slice(a,b);
}
let seed=1337;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const math=Object.assign(Object.create(Math),{random});
const clamp=(x,a,b)=>Math.max(a,Math.min(x,b)),rnd=(a,b)=>a+(b-a)*random();
const species=Array.from({length:12},(_,i)=>({id:'F'+String(i+1).padStart(3,'0')}));
const c={
 Math:math,W:1280,WATER_SURFACE_Y:293,clamp,rnd,time:12,
 view:'tank',zone:0,save:{humanPlaced:['8','21','3','24'],owned:Object.fromEntries(species.map(sp=>[sp.id,1]))},
 humans:Array.from({length:38},(_,i)=>'Human '+i),fish:[],hum:[],
 isActiveHumanId(id){return typeof c.humans[Number(id)]==='string';},
 species,hook:null,feverFx:null,cast:{active:false},introEntrance:{active:true},
 aquariumFishActors:[],aquariumFishSignature:'',aquariumLastTime:0,
 aquariumHumanActors:[],aquariumHumanLastTime:0,aquariumExhibitTarget:10,
 aquariumFishingActive:false,aquariumPreserveReturn:false,
 aquariumPanelOpen:false,aquariumSpawnTimer:0,aquariumHumanSpawnTimer:0,
 eco:{t:12,zone:-1,humanZone:-1,next:40,fishTimer:0,humanTimer:0},
 aquariumKnownSpecies(){return species;},
 humanExhibitIds(){return c.save.humanPlaced;},
 fishVisualProfile(){return {minScale:.9,maxScale:1.15};},
 aquariumCloseSaleReceipt(){},
 aquariumRefreshControls(){},
 aquariumReplenishHumans(inView){
  const slots=c.humanExhibitIds();
  slots.forEach((id,slot)=>{
   if(c.hum.some(h=>h.aquariumSlot===slot))return;
   c.hum.push(c.aquariumMakePlayHuman(id,slot,inView));
  });
 },
 makeWildFish:(sp,x,y,dir)=>({sp,x,y,dir,phase:0,vx:40*dir,size:1,speed:40}),
 hideVirtualJoystick(){},
 startCast(){},
 announce(){throw Error('Unexpected empty aquarium')},
 setMode(mode){c.view=mode;},
 $:()=>({classList:{remove(){},add(){}}})
};
vm.createContext(c);
// Load real production functions with their original update paths.
vm.runInContext(take('function aquariumResetExhibit(){','function aquariumStartTurn(a,now){'),c);
vm.runInContext(take('function humanSwimStep(person,dt,now,bait,exhibit){','// End shared human AI.'),c);
vm.runInContext(take('var aquariumPreviousSetMode=setMode;',"// The aquarium's humans are currently rendered"),c);
vm.runInContext(take('function aquariumEnsureHumans(){',"$('aquaPlay').onclick=function(){"),c);
function checkInBounds(){
 assert(c.aquariumFishActors.length>=8,'Aquarium must contain displayed fish');
 for(const f of c.aquariumFishActors){
  assert(Number.isFinite(f.x)&&f.x>=90&&f.x<=1190,'Fish restored offscreen: '+f.x);
  assert(Number.isFinite(f.y)&&f.y>=350&&f.y<=635,'Fish restored at bad depth: '+f.y);
  assert(Number.isFinite(f.speed)&&f.speed<=57,'Fish retained runaway Play speed');
 }
 assert(c.aquariumHumanActors.length===4,'Four display slots must survive');
 for(const h of c.aquariumHumanActors){
  assert(Number.isFinite(h.x)&&h.x>=95&&h.x<=1185,'Human restored offscreen: '+h.x);
  assert(Number.isFinite(h.y)&&h.y>=330&&h.y<=615,'Human restored at invalid depth');
 }
}
c.aquariumEnsureFish(c.time);
c.aquariumEnsureHumans();
checkInBounds();
// A completely depleted population, but unchanged owned-species signature,
// must repopulate INSIDE the exhibit rather than as an offscreen pile.
c.aquariumFishActors=[];c.aquariumLastTime=c.time-15;
c.aquariumEnsureFish(c.time);
checkInBounds();
// Valid humans must never inherit NaN swim bounds when Play clears lanes.
const stranded=c.aquariumHumanActors[0];
c.humanSwimStep(stranded,.04,c.time,null,true); // initialize full AI first
stranded.swimLaneX=undefined;stranded.swimLaneY=undefined;
stranded.swimAnimationClock=undefined;
for(let i=0;i<70;i++)c.humanSwimStep(stranded,.04,c.time+i*.04,null,true);
assert(Number.isFinite(stranded.x)&&Number.isFinite(stranded.y));
assert(Number.isFinite(stranded.swimAnimationClock),'Exhibit anim clock became NaN');
assert(Number.isFinite(stranded.swimLaneX)&&Number.isFinite(stranded.swimLaneY),
 'Exhibit swim lane anchors remained invalid');
// Force a transition back from actual Play actors moving beyond both edges.
c.fish=[
 {aquariumResident:true,sp:species[0],x:-180,y:330,vx:190,size:1,phase:1},
 {aquariumResident:true,sp:species[1],x:1400,y:595,vx:-240,size:1,phase:2},
 {aquariumResident:true,sp:species[2],x:680,y:430,vx:50,size:1,phase:3}
];
c.hum=[
 {aquariumResident:true,id:8,aquariumSlot:0,x:-170,y:440,vx:230,size:1,phase:0,
  swimLaneX:undefined,swimLaneY:undefined,swimMode:'dash'},
 {aquariumResident:true,id:21,aquariumSlot:1,x:1450,y:605,vx:-180,size:1,phase:1,
  swimLaneX:undefined,swimLaneY:undefined,swimMode:'turn'},
 {aquariumResident:true,id:3,aquariumSlot:2,x:720,y:420,vx:80,size:1,phase:2},
 {aquariumResident:true,id:24,aquariumSlot:3,x:975,y:450,vx:50,size:1,phase:3}
];
c.aquariumFishingActive=true;c.view='fish';
// Simulate a resource-gated scene switch that executes AFTER this function returns.
const setModeNow=c.setMode;
c.setMode=function(mode){c.queuedMode=mode;c.runSceneSwitch=()=>setModeNow(mode);};
c.aquariumReturnToExhibit();
assert.equal(c.queuedMode,'tank');
assert.equal(c.aquariumPreserveReturn,true,
 'Return flag must survive until the delayed resource gate completes');
assert(c.aquariumFishActors.every(a=>a.x>=90&&a.x<=1190),
 'Returning Play fish must be redistributed away from screen edges');
assert(c.aquariumFishActors.every(a=>a.speed<=57));
assert(c.aquariumHumanActors.every(h=>Number.isFinite(h.swimLaneX)&&
 Number.isFinite(h.swimLaneY)&&h.x>=95&&h.x<=1185));
assert(c.aquariumHumanActors.every(h=>h.swimMode==='cruise'),
 'Transient dash/turn AI must be reset after return');
c.runSceneSwitch();c.setMode=setModeNow;
assert.equal(c.aquariumPreserveReturn,false,'Actual completed mode switch clears flag');
assert.equal(c.view,'tank');
assert(c.aquariumFishActors.length===3,'Preserved return keeps surviving fish');
assert(c.aquariumHumanActors.length===4,'Preserved return keeps surviving humans');
// Returning from an unrelated menu must start fresh and not reuse stale actors.
c.setMode('book');
c.aquariumFishActors[0].x=-500;
c.aquariumHumanActors[0].x=NaN;
c.setMode('tank');
assert.equal(c.aquariumFishActors.length,0,'Menu reentry must discard bad fish actors');
assert.equal(c.aquariumHumanActors.length,0,'Menu reentry must discard bad human actors');
c.aquariumEnsureFish(c.time);
c.aquariumEnsureHumans();
checkInBounds();
for(let frame=0;frame<90;frame++){
 c.time+=.04;
 c.aquariumHumanActors.forEach(h=>c.humanSwimStep(h,.04,c.time,null,true));
}
checkInBounds();
for(const h of c.aquariumHumanActors)
 assert(Number.isFinite(h.swimAnimationClock),'Animation clock corrupt after menu roundtrip');
// Leaving aquarium fishing DIRECTLY for an unrelated menu must also reset.
// Do not keep aquarium live actors around behind the codex/shop/gear scene.
c.aquariumFishingActive=true;c.view='fish';
c.setMode('gear');
assert.equal(c.aquariumFishingActive,false);
assert.equal(c.aquariumFishActors.length,0);
assert.equal(c.aquariumHumanActors.length,0);
console.log('PASS: exhibition positions and human animations stay finite and distributed across Play return, delayed scene guard, Book/Gear navigation, and reentry');
