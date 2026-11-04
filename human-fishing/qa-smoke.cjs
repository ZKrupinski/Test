// Dependency-free runtime smoke test. Run: node human-fishing/qa-smoke.cjs
'use strict';
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync(require('node:path').join(__dirname,'index.html'),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/i)?.[1];
assert.ok(script,'Inline game script is missing');
assert.doesNotMatch(html,/id="hintTitle"/,'Bottom situation label must be removed');
assert.doesNotMatch(html,/id="action"/,'Fishing release button must be removed');
assert.doesNotMatch(html,/<footer>/i,'Bottom instructions footer must be removed');
new vm.Script(script,{filename:'human-fishing.js'});
const finalSuccess=script.slice(script.lastIndexOf('function success(){'),script.indexOf('function startCast()',script.lastIndexOf('function success(){')));
assert.match(finalSuccess,/playCatchFx\(/,'Success must trigger in-world capture visual');
assert.doesNotMatch(finalSuccess,/announce\(/,'Successful catch must not display old center banner');
assert.match(script,/function drawCatchFx\(dt\)/,'In-world capture VFX must be implemented');
const listeners={};
const elements=new Map();
const memory=new Map();
const style=()=>({});
const gradient=()=>({addColorStop(){}});
let lastTranslate=null;
const ctx=new Proxy({createLinearGradient:gradient,createRadialGradient:gradient,translate(x,y){lastTranslate={x,y}}}, {
  get(obj,k){return Object.hasOwn(obj,k)?obj[k]:function(){}},
  set(obj,k,v){obj[k]=v;return true;}
});
function element(id){
  if(elements.has(id))return elements.get(id);
  const classes=new Set();
  const obj={id,style:style(),dataset:{},value:'',textContent:'',innerHTML:'',
    classList:{
      add(k){classes.add(k)},remove(k){classes.delete(k)},
      toggle(k,v){if(v===undefined)v=!classes.has(k);v?classes.add(k):classes.delete(k);return v},
      contains(k){return classes.has(k)}
    },onclick:null,onchange:null,oninput:null,
    addEventListener(k,cb){listeners[k]=cb},
    appendChild(){},getContext(){return ctx},
    setPointerCapture(){},getBoundingClientRect(){return{left:0,top:0,width:1280,height:720}},
    querySelectorAll(){return[]}
  };
  obj.parentElement=obj;
  elements.set(id,obj);
  return obj;
}
const document={
  getElementById:element,
  createElement:element,
  querySelectorAll(selector){
    // Return mock controls for catalog category tabs so that handlers get wired.
    if(selector==='[data-shop-tab]'){
      return [...element('panelBody').innerHTML.matchAll(/data-shop-tab="([^"]+)"/g)].map(m=>({dataset:{shopTab:m[1]},onclick:null}));
    }
    if(selector==='[data-gear-action]'){
      return [...element('panelBody').innerHTML.matchAll(/data-gear-action="([^"]+)" data-gear-id="([^"]+)"/g)]
        .map(m=>({dataset:{gearAction:m[1],gearId:m[2]},onclick:null}));
    }
    return [];
  }
};
let clock=300, frame=null;
const mock={document,window:{addEventListener(){}},navigator:{vibrate(){}},console,Math,performance:{now(){return clock}},
 localStorage:{getItem(k){return memory.get(k)||null},setItem(k,v){memory.set(k,v)}},
 requestAnimationFrame(cb){frame=cb}
};
const instrumented=script.replace(/\}\)\(\);\s*$/,String.raw`
window.__hfTest={
 species:species,
 getFish:function(){return fish},
 getEco:function(){return eco},
 buildFish:buildFish,
 buildHum:buildHum,
 ecoTick:updateEcosystem,
 depthMin:ecoDepthMin,
 depthMax:ecoDepthMax,
 pickSpecies:chooseWildSpecies,
 canSchool:ecoCanSchool,
 spawnWild:spawnWildFish,
 makeFish:makeWildFish,
 spawnVisitor:spawnWildHuman,
 nextZone:function(z){zone=z;buildFish();buildHum()},
 setFish:function(items){fish=items},
 setHum:function(items){hum=items},
 getHum:function(){return hum},
 switchView:function(v){view=v},
 getBob:function(){return bob},
 getBaitBounds:baitHorizontalBounds,
 moveBait:updateJoystick,
 getJoystick:function(){return joystick},
 getSave:function(){return save},
 chance:catchProbability,
 record:recordFeverCapture,
 activate:activateOctoFever,
 getFeverFx:function(){return feverFx},
 reel:feverReelState,
 surfaceTime:feverSurfaceTime,
 gripSlot:feverGripSlot,
 toss:feverTossPoint,
 flingSprite:feverFlingStreakSprite,
 getReelSprites:function(){return feverSprites},
 rodTip:rodTip,
 getCatchFx:function(){return catchFx},
 path:swallowPoint,
 mouthOpen:mouthGape,
 mouthFrames:function(){return mouthFrames},
 swallow:playCatchFx,
 getCast:function(){return cast},
 getHook:function(){return hook},
 catchNow:success,
 setHook:function(h){hook=h},
 triggerEscape:escapeHook,
 getEscape:function(){return escapeFx},
 getGroggy:function(){return octoGroggy},
 getPendingEscape:function(){return pendingEscapeRestart},
 escapePose:escapePose,
 fishHeading:escapeFishHeading,
 selectGear:selectedGear,
 octoStats:octoStats,
 renderShop:renderShop,
 switchCategory:function(k){shopCategory=k;renderShop()},
 shopModels:gearCatalog
};
})();`);
vm.runInNewContext(instrumented,mock,{filename:'human-fishing.js',timeout:4000});
const game=mock.window.__hfTest;
assert.ok(game,'Test bridge missing');
assert.equal(game.species.length,240);
for(const label of ['COMMON','UNCOMMON','RARE','EPIC','LEGEND','MYTHIC'])assert.ok(game.species.some(f=>f.rarity===label),'Missing rarity '+label);
assert.ok(game.species.every(f=>f.level>=1),'Each fish must have a level');
const baseFish=game.species.slice(0,20);
assert.ok(game.chance(baseFish[0],false,false)>game.chance(baseFish[15],false,false),'Common catches should be easier than rare');
assert.ok(game.chance(baseFish[15],false,false)>game.chance(baseFish[18],false,false),'Rare catches should be easier than legendary');
assert.ok(game.chance({id:21},true,false)<game.chance(baseFish[19],false,false),'Human bosses must be harder than mythic fish');
const priorRareChance=game.chance(baseFish[15],false,false);
const state=game.getSave();
state.gearEquipped.rod='abyss';state.gearLevels.rod.abyss=10;state.gearEquipped.bait='void';state.gearLevels.bait.void=10;
assert.ok(game.chance(baseFish[15],false,false)>priorRareChance,'Advanced gear must improve rare fish capture odds');
state.gearEquipped.rod='cork';state.gearLevels.rod.cork=0;state.gearEquipped.bait='worm';state.gearLevels.bait.worm=0;
assert.equal(typeof frame,'function','Animation must start');
assert.ok(typeof element('navShop').onclick==='function','Shop navigation is missing');
assert.ok(typeof listeners.pointerdown==='function','Pointer input is missing');
function step(n){for(let i=0;i<n;i++){clock+=16.7;const current=frame;current(clock);}}
function pointer(type,x,y){
 const e={pointerId:1,pointerType:'touch',clientX:x,clientY:y,preventDefault(){}};
 listeners[type](e);
}
const stick=element('virtualJoystick');
// Air phase: a touch must NOT summon a joystick before splashdown.
step(57); // 0.95 seconds, still airborne
pointer('pointerdown',1060,350);
assert.equal(stick.classList.contains('visible'),false,'Joystick should be locked in air');
pointer('pointerup',1060,350);
// After water entry (at ~1.4s), allow input well before the full 3.25s descent.
step(46); // 1.72 seconds total
const before={...lastTranslate};
pointer('pointerdown',1070,360); // far away from lure (~640, 295), should still work
assert.equal(stick.classList.contains('visible'),true,'Any underwater touch should open the joystick');
assert.equal(element('virtualKnob').style.left,'50%','Knob should start centered');
step(2);
assert.ok(lastTranslate.x<750,'Touching distant water must not teleport the lure');
// Releasing an unmoved stick should not catch.
pointer('pointerup',1070,360);
assert.equal(stick.classList.contains('visible'),false,'Joystick should close on touch release');
const still={...lastTranslate};
step(2);
assert.ok(Math.abs(lastTranslate.x-still.x)<25,'Tap-only gesture should leave bait in place');
// Control from arbitrary screen position and move bait while held.
pointer('pointerdown',1120,360);
pointer('pointermove',1190,360);
step(18);
assert.ok(lastTranslate.x>before.x+24,'Rightward joystick tilt must move the lure');
assert.ok(lastTranslate.x<900,'Joystick must move relative to bait, never teleport to touch position');
assert.equal(stick.classList.contains('visible'),true,'Joystick must remain visible during drag');
pointer('pointerup',1190,360);
assert.equal(stick.classList.contains('visible'),false,'Joystick must hide on release');
step(10);
assert.equal(typeof frame,'function');
// Shop catalog must render all 4 tabs and allow changing the sort field.
element('navShop').onclick();
const catalog=element('panelBody').innerHTML;
for(const name of ['낚싯대','미끼','어망','조력자','피버 문어'])assert.ok(catalog.includes(name),name+' missing');
assert.ok(catalog.includes('data-shop-tab="rod"'),'Rod tab missing');
assert.ok(catalog.includes('data-shop-tab="bait"'),'Bait tab missing');
assert.ok(catalog.includes('data-shop-tab="net"'),'Net tab missing');
assert.ok(catalog.includes('data-shop-tab="helper"'),'Helper tab missing');
assert.ok(catalog.includes('data-shop-tab="octopus"'),'Octopus fever tab missing');
assert.equal(game.shopModels.octopus.length,6,'Six octopus models required');
game.switchCategory('octopus');
assert.ok(element('panelBody').innerHTML.includes('발동'),'Shop must display fever proc stats');
assert.ok(element('panelBody').innerHTML.includes('광역 반경'),'Shop must display radial range');
assert.ok(catalog.includes('가격 낮은순'),'Sort control missing');
const sort=element('shopSort');assert.equal(typeof sort.onchange,'function');
sort.value='level';sort.onchange();step(12);
assert.ok(element('panelBody').innerHTML.includes('shop-card'),'Shop should remain rendered');
// Fever must trigger at or before the guarantee threshold and activate 8-tentacle AOE.
state.fever.count=15;state.fever.ready=false;
game.record(1);
assert.equal(state.fever.ready,true,'Fever should be guaranteed by 16 fish captures');
assert.equal(element('feverNum').textContent,'READY','Fever gauge must show ready');
const bob=game.getBob();
const caughtFish=game.species[0];
game.setFish([{sp:caughtFish,x:bob.x+10,y:bob.y+10,vx:.2,size:1,phase:0}]);
game.setHum([{id:3,x:bob.x+24,y:bob.y+24,vx:.12,size:1,phase:0}]);
const riggedMath=Object.create(Math);riggedMath.random=()=>0;mock.Math=riggedMath;
game.switchView('fish');game.activate();
assert.equal(game.getFeverFx().caught.length,2,'Fever must capture multiple fish and elite humans when rolls succeed');
assert.equal(state.fever.ready,false,'Activation must consume stored fever');
assert.equal(state.fever.count,0,'Fever gauge must reset');
assert.ok(game.getFeverFx(),'Octopus arm burst must start');
const lureStart={x:bob.x,y:bob.y};
const fxStart=game.getFeverFx();
const startingFish=fxStart.caught[0];
const startingHuman=fxStart.caught[1];
const earlyToss=game.toss(startingFish,fxStart,0,clock/1000);
assert.equal(earlyToss.phase,'gather','Before the flick, captured fish must be drawn into the tentacles');
assert.equal(earlyToss.attached,true,'Gathered fish must render behind the tentacles');
// Waterline-grip regression: every fish must remain in a tentacle slot while
// the half-closed lure climbs underwater. The throw begins only after surfacing.
const deepFx=Object.assign({},fxStart,{x:650,y:520,elapsed:0});
deepFx.surfaceAt=game.surfaceTime(deepFx,clock/1000);
assert.ok(deepFx.surfaceAt>.52,'Deep-water capture must have a sustained submerged ascent');
const midDeep=Object.assign({},deepFx,{elapsed:(.42+deepFx.surfaceAt)*.5});
const underReel=game.reel(midDeep,clock/1000);
assert.ok(underReel.y>271,'Lure must still be submerged before the release moment');
assert.equal(underReel.frame,6,'Tentacles must stay approximately half-curled underwater');
for(const [idx,entity] of deepFx.caught.entries()){
 const grip=game.toss(entity,midDeep,idx,clock/1000);
 assert.equal(grip.phase,'held','All captured creatures must be held by tentacles underwater');
 assert.equal(grip.attached,true,'Every creature stays attached to the rising lure');
 assert.ok(Math.hypot(grip.x-underReel.x,grip.y-underReel.y)<160,
  'Captured creature must follow the moving lure, not float separately');
}
const airFx=Object.assign({},deepFx,{elapsed:deepFx.surfaceAt+.05});
const throwStart=game.toss(deepFx.caught[0],airFx,0,clock/1000);
assert.equal(throwStart.phase,'throw','Only above the waterline can the lure throw a creature');
assert.equal(throwStart.attached,false,'Throwing must release the tentacle grip');
assert.match(script,/drawFeverTossCreature\(entity,fx,i,time,'attached'\)/,
 'Attached creatures must render before the tentacle artwork');
assert.match(script,/drawFeverTossCreature\(entity,fx,i,time,'released'\)/,
 'Released creatures must render above the tentacles');

assert.ok(game.reel({...fxStart,elapsed:1.48},clock/1000).progress>=.99,
 'Fever reeling must be noticeably faster than the prior long retrieval');
step(48); // Initial eight-arm burst has finished and rod retrieval is underway
assert.ok(game.getFeverFx().reeling,'Fever lure should begin reeling shortly after tentacle spread');
assert.ok(game.getFeverFx().reelFrame<11,'Tentacles should begin closing as reel winds');
assert.ok(game.getFeverFx().reelFrame>0,'Tentacles should not instantly snap shut');
assert.ok(bob.y<lureStart.y,'Fever lure must move upward as line is retrieved');
assert.ok(bob.x<lureStart.x-25,'Fever lure must swing toward left side while curling its tentacles');
const fishToss=game.toss(startingFish,game.getFeverFx(),0,clock/1000);
assert.ok(['held','throw'].includes(fishToss.phase),'Fish must remain gripped underwater or be thrown after surfacing');
const humanToss=game.toss(startingHuman,game.getFeverFx(),1,clock/1000);
assert.ok(['held','throw'].includes(humanToss.phase),'Human must follow the same delayed-grip release sequence');
if(game.reel(game.getFeverFx(),clock/1000).underwater){
 assert.equal(fishToss.attached,true,'Fish cannot leave the tentacles before the lure breaks water');
 assert.equal(humanToss.attached,true,'Human cannot leave the tentacles before the lure breaks water');
}
assert.ok(game.reel(game.getFeverFx(),clock/1000).tilt<0,'The lure should twist left in the recovery swing');
assert.ok(game.mouthOpen()>.5,'Main octopus must open its mouth during multi-capture');
assert.ok(Object.keys(game.mouthFrames()).length>0,'Mouth must use prerendered bitmap animation frames');
const midFrame=game.getFeverFx().reelFrame,midY=bob.y;
step(45); // Continue reel, show gradual closing and upward movement
assert.ok(game.getFeverFx().reelFrame<midFrame,'Reeling must reduce tentacle spread over time');
assert.ok(bob.y<midY,'Reeling must continuously pull the bait toward rod tip');
assert.ok(Object.keys(game.getReelSprites()).some(k=>k.startsWith('fold-')),'Curling tentacle bitmap frames must render');
assert.ok(game.flingSprite(),'Leftward throwing motion streak must be cached as bitmap art');
const lastToss=game.toss(startingFish,game.getFeverFx(),0,clock/1000);
assert.ok(['throw','held'].includes(lastToss.phase),'Fish should be in the staged throw/last grip near the surface');
const tip=game.rodTip(clock/1000);
assert.ok(Math.hypot(bob.x-tip.x,bob.y-tip.y)<Math.hypot(lureStart.x-tip.x,lureStart.y-tip.y),'Bait must close distance to rod tip');
step(110); // Finish retraction and all staggered creature swallows
assert.equal(game.getFeverFx(),null,'Fever burst must finish only after retracting and swallowing');
assert.ok(game.getCast().active,'Next cast should start automatically after full swallow');
mock.Math=Math;
const currentCatchCount=state.catches,currentCoins=state.coins;
const ordinary=game.species[0];
// The source fish artwork faces LEFT. Normal fish and escaping fish must face the
// direction their sprites actually move, not swim backward.
assert.match(script,/if\(a\.vx>0\)ctx\.scale\(-1,1\)/,
 'Rightward fish must flip the left-facing sprite; leftward fish must not');
for(const dir of [-1,1]){
 const diver={x:483,y:191,dir:dir,human:false,size:1};
 const p1=game.escapePose(diver,.79),p2=game.escapePose(diver,.81);
 assert.ok((p2.x-p1.x)*dir>0,'Diving fish must travel in its signed horizontal escape direction');
 assert.ok(p2.y>p1.y,'Diving fish must pitch downward into the water');
 const diveAngle=game.fishHeading(diver,.80);
 assert.ok(diveAngle*dir>.12,'Fish head must pitch down with its diagonal diving direction');
 const fleeing=game.fishHeading(diver,1.40);
 assert.ok(Math.abs(fleeing)<.18,'Fish must level its body for high-speed horizontal swimming');
}
// Failed fish must almost reach the mouth, then thrash, slip back, dive and flee.
game.switchView('fish');game.getCast().active=false;
game.setHook({obj:{sp:ordinary,x:480,y:187,vx:.2,size:1,phase:0},kind:'fish',elapsed:.6,startX:660,startY:470,willEscape:true,escapeAt:.88});
game.triggerEscape();
assert.equal(game.getHook(),null,'Resistant hooked fish must escape and clear the hook');
assert.equal(game.getEscape().kind,'fish','Fish failure must use a visible escape animation');
step(23);
assert.ok(['slip','struggle'].includes(game.getEscape().stage),'Fish should thrash near the octopus mouth');
step(34);
assert.equal(game.getEscape().stage,'dive','Fish must slip down and dive back into the water');
assert.ok(game.getEscape().splash,'Water splash should occur as the fish re-enters the water');
step(100);
assert.equal(game.getEscape(),null,'Escaping fish must swim completely offscreen before removal');
assert.equal(game.getGroggy(),0,'Fish must not stun the octopus');
assert.equal(state.catches,currentCatchCount,'Escaped fish cannot increment catches');
assert.equal(state.coins,currentCoins,'Escaped fish cannot give pearls');

// Human elites use a separate air counterattack sequence that stuns the octopus.
game.getCast().active=false;
game.setHook({obj:{id:3,x:489,y:189,vx:.22,size:1,phase:0},kind:'human',
 elapsed:.8,startX:830,startY:490,willEscape:true,escapeAt:.89});
game.triggerEscape();
assert.equal(game.getEscape().kind,'human');
step(39);
assert.equal(game.getEscape().stage,'strike','Human must attack midair after slipping free');
step(10);
assert.equal(game.getEscape().impact,true,'Air attack must strike the octopus');
assert.ok(game.getGroggy()>0,'Air attack must give octopus temporary groggy');
step(48);
assert.ok(['dive','flee'].includes(game.getEscape().stage),'Human must dive back to the water after strike');
assert.equal(game.getEscape().splash,true,'Diving human must splash on reentry');
step(100);
assert.equal(game.getEscape(),null,'Human must swim rapidly offscreen, not fade at the surface');
assert.equal(game.getGroggy(),0,'Octopus groggy must end');
assert.ok(game.getCast().active,'Next cast must resume after the octopus recovers');
assert.equal(state.catches,currentCatchCount,'Human escape must not grant catches');
assert.equal(state.coins,currentCoins,'Human escape must not grant pearls');
// The entire hook travels along one upward Bézier arc directly into the mouth.
const mouth={x:452,y:191},origin={x:830,y:510};
const first=game.path(origin.x,origin.y,mouth,.26);
const middle=game.path(origin.x,origin.y,mouth,.54);
const near=game.path(origin.x,origin.y,mouth,.88);
const finish=game.path(origin.x,origin.y,mouth,1);
assert.ok(first.y<origin.y,'Fish should immediately rise after hooking');
assert.ok(middle.y<first.y,'Hook trajectory must continue rising with no surface pause');
assert.ok(near.y<269,'Approaching fish must pass the waterline without stopping');
assert.ok(Math.abs(finish.x-mouth.x)<.001&&Math.abs(finish.y-mouth.y)<.001,'Path must end in the octopus mouth');
assert.match(script,/if\(!fx\.swallowed\)drawSwallowCreature/,'Reward animation must not replay a second flight');
game.switchView('fish');game.getCast().active=false;
const actual={sp:ordinary,x:origin.x,y:origin.y,vx:.3,size:1,phase:0};
game.setFish([actual]);
game.setHook({obj:actual,kind:'fish',elapsed:0,startX:origin.x,startY:origin.y,willEscape:false});
step(45);
assert.ok(game.getHook(),'Live hooked creature must be flying before arriving at mouth');
assert.ok(actual.y<269,'Live hook should have crossed waterline on a direct arc');
assert.ok(game.mouthOpen()>.75,'Octopus should open wide before the creature arrives');
step(35);
assert.equal(game.getHook(),null,'Hook must finish at the mouth and release the live creature');
assert.ok(game.getCatchFx()?.swallowed,'Reward state must mark creature as already swallowed');
step(35);
assert.equal(game.getCatchFx(),null,'Brief glint must finish without a replayed swallow');
assert.ok(game.getCast().active,'Next cast must resume after swallowing');
// The ecosystem never destroys/re-rolls surviving fish on a catch, failed
// catch, wave completion, gear refresh, or successive cast.
game.switchView('fish');
// Earlier tests intentionally replaced the simulated fish array with fixtures.
// Restore a full real habitat before testing the long-running ecosystem.
game.nextZone((game.getEco().zone+1)%12);
const ecoStart=game.getFish().slice();
assert.ok(ecoStart.length>4,'Habitat should begin with an inhabiting population');
game.buildFish();game.buildHum();
assert.equal(game.getFish().length,ecoStart.length,'Rebuild on same habitat must be a no-op');
assert.ok(ecoStart.every((f,i)=>game.getFish()[i]===f),'Fish identities and coordinates must persist');
const initialGroups=ecoStart.filter(f=>f.schoolId);
assert.ok(initialGroups.every(f=>f.small),'Only small fish may join a school');
// Reserve room for one natural immigrant if the initial schools filled the habitat.
game.setFish(ecoStart.slice(0,Math.min(15,ecoStart.length)));
const preSpawnCount=game.getFish().length,idBefore=game.getFish().map(f=>f.ecoId);
const offscreenCount=game.spawnWild(false);
assert.ok(offscreenCount>=1,'Fish should periodically enter the ecosystem');
const spawned=game.getFish().filter(f=>!idBefore.includes(f.ecoId));
assert.ok(spawned.some(f=>f.x<0||f.x>1280),'New fish must enter from outside the screen');
const spareFish=game.getFish().find(f=>f.ecoId!==spawned[0].ecoId);
const removed=spawned[0];
game.setHook({obj:removed,kind:'fish',elapsed:0,startX:removed.x,startY:removed.y,willEscape:false});
const beforeEcoCatch=state.catches;
game.catchNow();
assert.equal(state.catches,beforeEcoCatch+1,'A successful catch should still be recorded');
assert.ok(!game.getFish().includes(removed),'Only hooked fish should be removed');
assert.ok(game.getFish().includes(spareFish),'All other fish must survive the cast unchanged');
assert.ok(game.getFish().length>=preSpawnCount-1,'A catch must not wipe the entire population');

// Schooling, predator chasing, fleeing and fighting are distinct live behaviors.
const spSmall=game.species[0],spHunter=game.species[28];
const smallSchoolId=933;
const a=game.makeFish(spSmall,630,470,1,true,smallSchoolId);
const b=game.makeFish(spSmall,654,477,1,true,smallSchoolId);
const predator=game.makeFish(spHunter,680,480,-1,false,0);
predator.hunter=true;predator.size=1.6;
game.setFish([a,b,predator]);game.getCast().active=true;
game.ecoTick(.07);game.ecoTick(.07);
assert.equal(a.behavior,'flee','Prey must flee a nearby predator');
assert.equal(b.behavior,'flee','School companions must scatter from an attack');
assert.equal(predator.behavior,'hunt','Predators must actively chase smaller fish');
const farSchool1=game.makeFish(spSmall,700,400,1,true,431);
const farSchool2=game.makeFish(spSmall,745,415,1,true,431);
game.setFish([farSchool1,farSchool2]);
game.ecoTick(.08);
assert.equal(farSchool1.behavior,'school','Small fish must flock when safe');
assert.equal(farSchool2.behavior,'school','Small fish must share a school identity');
const rival=game.makeFish(spHunter,710,455,-1,false,0);
const fighter=game.makeFish(spHunter,628,449,1,false,0);
fighter.hunter=true;rival.hunter=true;
fighter.fightTarget=rival.ecoId;rival.fightTarget=fighter.ecoId;
fighter.fightUntil=game.getEco().t+1.1;rival.fightUntil=game.getEco().t+1.1;
game.setFish([fighter,rival]);game.ecoTick(.12);
assert.equal(fighter.behavior,'fight','Rival predators must visibly engage in territorial conflict');
assert.equal(rival.behavior,'fight','Rival must fight rather than simply cruise');
const exit=game.makeFish(spSmall,1480,425,1,false,0);
game.setFish([exit]);game.ecoTick(.04);
assert.ok(!game.getFish().includes(exit),'A fish must leave naturally after swimming entirely offscreen');
game.nextZone((game.getEco().zone+1)%12);
assert.ok(game.getFish().every(f=>f.sp.habitat===game.getEco().zone),'Only habitat changes may replace the ecosystem');
assert.ok(game.getFish().length>0,'New habitat must initialize with swimming residents');
// Population quality: spread, diversity, safety, and low-speed independent movement.
const residents=game.getFish().filter(f=>f.x>=0&&f.x<=1280);
const names=new Set(residents.map(f=>f.sp.id));
assert.ok(residents.length>=9,'A new habitat should begin with a visible, spread-out population');
assert.ok(names.size>=7,'Initial scene must contain many different species, not repeated shoals');
assert.ok(residents.filter(f=>f.schoolId).length===0,'Initial population should not spawn as a giant school');
assert.ok(residents.some(f=>f.x<500)&&residents.some(f=>f.x>770),
 'Fish need to inhabit both sides of the underwater scene');
assert.ok(residents.every(f=>f.speed<=31),'Ambient fish should swim calmly, not race constantly');
assert.ok(new Set(residents.map(f=>f.swimMode)).size>=2,
 'Individuals should have distinct drifting, hovering and roaming rhythms');
assert.ok(residents.every(f=>f.y>=game.depthMin(f)&&f.y<=game.depthMax(f)),
 'Each complete fish sprite must stay below the waterline and above the seabed');
assert.match(script,/type==='ray'/,'Rays need a distinct bitmap silhouette');
assert.match(script,/type==='horse'/,'Seahorses need a distinct bitmap silhouette');
assert.match(script,/type==='eel'/,'Eels need a distinct bitmap silhouette');
assert.match(script,/type==='puffer'/,'Puffers need a distinct bitmap silhouette');
assert.match(script,/type==='shark'/,'Large pelagic species need a distinctive body shape');
const startIds=new Set(residents.map(f=>f.ecoId));
game.getCast().active=true;
for(let i=0;i<2200;i++){
 game.ecoTick(.04);
 const live=game.getFish();
 assert.ok(live.length<=18,'Ambient ecosystem must not overcrowd the screen');
 for(const f of live){
  assert.ok(f.y>=game.depthMin(f)-.01&&f.y<=game.depthMax(f)+.01,
   'Fish body has left its permitted underwater depth range');
  assert.ok(Math.abs(f.vx)<=85.01,'Wild fish is moving faster than the controlled maximum');
 }
}
assert.ok(game.getFish().some(f=>!startIds.has(f.ecoId)),
 'New arrivals must enter gradually instead of an identical mass-wave');
// Joystick bait must reach both screen edges symmetrically without clipping.
// Historically the left limit was 240px while the right was 1215px.
game.switchView('fish');game.getCast().active=false;game.setHook(null);
const savedFeverReady=state.fever.ready;
const joy=game.getJoystick(),bait=game.getBob();
joy.active=true;joy.dy=0;joy.dx=-1;
const normalBounds=game.getBaitBounds();
assert.equal(normalBounds.min+normalBounds.max,1280,'Left/right limits must be centered on the canvas');
assert.ok(normalBounds.min<100,'Bait must be able to travel left of the old 240px limit');
bait.x=640;game.moveBait(10);
assert.equal(bait.x,normalBounds.min,'Holding left should reach the full safe left edge');
joy.dx=1;game.moveBait(10);
assert.equal(bait.x,normalBounds.max,'Holding right should reach the matching safe right edge');
assert.ok(Math.abs((640-normalBounds.min)-(normalBounds.max-640))<.01,
 'Maximum joystick travel distance must be identical in each direction');
state.fever.ready=true;
const feverBounds=game.getBaitBounds();
assert.equal(feverBounds.min+feverBounds.max,1280,'Large octopus lure must also have symmetric limits');
assert.ok(feverBounds.min>=normalBounds.min,'Large lure must stay fully on screen');
joy.dx=-1;game.moveBait(10);
assert.equal(bait.x,feverBounds.min,'Fever lure must reach left edge without clipping');
joy.active=false;state.fever.ready=savedFeverReady;
console.log('PASS: full fever catches held by half-curled lure underwater, released after surface, multi-catch swallowing; symmetric joystick, ecological swimming, and capture/escape interactions');

