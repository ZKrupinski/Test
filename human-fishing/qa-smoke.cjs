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
 fishVisual:fishVisualProfile,
 fishAppearance:fishSpeciesAppearance,
 fishSprite:fishSprite,
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
 rodHandling:rodHandling,
 getRodMotion:function(){return rodMotion},
 hideStick:hideVirtualJoystick,
 getJoystick:function(){return joystick},
 getSave:function(){return save},
 aquariumEnsure:aquariumEnsureFish,
 aquariumTap:aquariumTapFish,
 aquariumUpdate:aquariumUpdateFish,
 aquariumDraw:drawingTank,
 setTime:function(v){time=v},
 aquariumActors:function(){return aquariumFishActors},
 aquariumTurnScale:aquariumTurnScale,
 aquariumStruggle:aquariumStartStruggle,

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
 feverMouthFrame:feverMouthSpriteFrame,
 rodTip:rodTip,
 getCatchFx:function(){return catchFx},
 path:swallowPoint,
 getMouthPos:mouthPos,
 mouthOpen:mouthGape,
 mouthFrames:function(){return mouthFrames},
 swallow:playCatchFx,
 getCast:function(){return cast},
 getIntro:function(){return introEntrance},
 markIntroHeroReady:function(){playerOctoAtlas.swim={ready:true}},
 advanceIntro:advanceIntroEntrance,
 getHook:function(){return hook},
 catchNow:success,
 setHook:function(h){hook=h},
 triggerEscape:escapeHook,
 getEscape:function(){return escapeFx},
 getGroggy:function(){return octoGroggy},
 getPendingEscape:function(){return pendingEscapeRestart},
 escapePose:escapePose,
 fishHeading:escapeFishHeading,
 pulse:vibrationPulse,
 offset:vibrationOffset,
 getVibration:function(){return vibrations},
 checkBrush:checkBaitBrush,
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
// Entrance must hold the FIRST cast until hero, rod and both friends have
// traveled together from off-screen left. Fast-forward it for gameplay tests.
assert.ok(game.getIntro().active,'Opening ensemble must start offscreen');
assert.equal(game.getIntro().offset,-260,'The group must start visibly just left of its resting position');
assert.match(script,/heroIntroImage\.ready/,'Opening should wait for illustrated character atlas');
assert.match(script,/redIntroReady/,'Opening must wait for the compact red cheerleader atlas');
assert.match(html,/preload" as="image" fetchpriority="high" href="\.\/assets\/octopus\/atlases\/purple_swim_intro\.webp/,
 'Start screen must prioritize the illustrated hero instead of later emotes');
assert.match(html,/preload" as="image" fetchpriority="high" href="\.\/assets\/octopus\/atlases\/red_intro_swim\.webp/,
 'Start screen must prioritize the matching red cheerleader');
assert.doesNotMatch(script,/introEntrance\.loadingTime<4/,
 'The arbitrary four-second release must not show only one of the two characters');
assert.equal(game.getCast().active,false,'Do not start casting during intro');
// Simulate delayed image download: startup animation must NOT run with just
// the red friend or just the main hero, regardless of elapsed real time.
game.advanceIntro(5);
assert.equal(game.getIntro().elapsed,0,'Cannot begin the hero entrance with missing art');
assert.equal(game.getIntro().visualReady,false,'Both intro sprites must be ready');
mock.window.octoSidekicksIntroReady=function(){return false};
game.markIntroHeroReady();
game.advanceIntro(4);
assert.equal(game.getIntro().elapsed,0,'A lone purple hero must not appear before red cheerleader');
mock.window.octoSidekicksIntroReady=function(){return true};
let syncedEntranceSignal=0;
mock.window.octoSidekicksSignal=function(kind){if(kind==='entrance')syncedEntranceSignal++};
game.advanceIntro(.90);
assert.equal(syncedEntranceSignal,1,'Red and hero must begin their entrance at the same moment');
assert.equal(game.getIntro().visualReady,true,'Both sprites were ready before the opening');
assert.ok(game.getIntro().active,'Entrance must still be underway at halfway');
assert.ok(game.getIntro().offset > -260&&game.getIntro().offset < -60,
 'Characters must have visibly moved right during the entrance');
game.advanceIntro(.93);
assert.equal(game.getIntro().active,false,'Arrival must settle on the stage');
assert.equal(game.getIntro().offset,0,'Characters must finish at their usual x positions');
assert.ok(game.getCast().active,'First bait throw begins only after arrival');
const runtimeTick=script.slice(script.lastIndexOf('function tick(stamp){'));
const translate=runtimeTick.indexOf('ctx.translate(introEntrance.offset,0)');
const sidekicks=runtimeTick.indexOf('window.drawOctopusSidekicks(ctx,time,octo)',translate);
const hero=runtimeTick.indexOf('drawOcto(time);drawRod(time);drawHelpers(time)',sidekicks);
const restore=runtimeTick.indexOf('ctx.restore()',hero);
assert.ok(translate>=0&&sidekicks>translate&&hero>sidekicks&&restore>hero,
 'The FINAL active renderer must translate the hero, both friends and fishing rod together');
assert.match(runtimeTick,/if\(view==='fish'&&!introEntrance\.active\)/,
 'No bait movement may start until the visible entrance finishes');
assert.match(script,/WATER_SURFACE_Y=293,PLAYER_STAGE_DROP=46/,
 'The waterline must move down 24px while the hero has 46px headroom');
assert.match(runtimeTick,/ctx\.translate\(0,PLAYER_STAGE_DROP\)/,
 'Final active renderer must shift the main octopus, rod and red cheerleader together');
assert.match(script,/CATCH_MOUTH_X=470,CATCH_MOUTH_LOCAL_Y=177/,
 'The new open-mouth catch target must move 18px right and 14px up');
assert.equal(game.getMouthPos(0).x,470,'Bait target X must sit inside the open mouth');
assert.equal(game.getMouthPos(0).y,223,'Bait target Y must sit inside the open mouth after player drop');
assert.match(script,/worldTip=rodTip\(now\),tip=\{x:worldTip\.x,y:worldTip\.y-PLAYER_STAGE_DROP\}/,
 'Rod tip physics must match the translated rod artwork');
const redSidekick=fs.readFileSync('human-fishing/assets/octopus/octopus-sidekicks.js','utf8');
assert.match(redSidekick,/kind:'red'[^\n]*footY:259/,
 'Red cheerleader must share the hero\'s footline before the group shift');


assert.equal(game.species.length,240);

const fishClasses=new Set(),fishShapes=new Set(),signatureMotifs=new Set();
for(const fish of game.species){
 const visual=game.fishVisual(fish),art=game.fishAppearance(fish);
 fishClasses.add(visual.category);fishShapes.add(visual.shape);signatureMotifs.add(art.motif);
 assert.ok(['SMALL','MEDIUM','LARGE','SPECIAL'].includes(visual.category),
  'Fish needs one valid size class: '+fish.name);
 assert.ok(visual.maxScale>visual.minScale&&visual.minScale>.4&&visual.maxScale<2.5,
  'Species display size must be well-defined: '+fish.name);
 assert.ok(/^#[a-f\d]{6}$/i.test(art.body)&&/^#[a-f\d]{6}$/i.test(art.accent),
  'Real-species art palette must use RGB hex colors: '+fish.name);
 assert.ok(art.designNote.length>2,'Fish needs a future bitmap-art note: '+fish.name);
 assert.equal(game.fishSprite(fish),game.fishSprite(fish),
  'Each fish must reuse its cached bitmap artwork: '+fish.name);
}
assert.deepEqual([...fishClasses].sort(),['LARGE','MEDIUM','SMALL','SPECIAL'],
 'The 240-fish catalog needs all four visual body-size classes');
assert.ok(fishShapes.size>=16,'The 240-species catalog needs at least sixteen distinguishable body silhouettes');
assert.ok(signatureMotifs.size>=17,'Real species need diverse color and marking motifs');
// 2.0 color-ID regression: same-named species stay stable, different
// species must not fall back to shared habitat colors.
const colorIdentities=new Set(),baseColors=new Set(),tailColors=new Set();
const genusPatterns=new Set();
function hexRgb(hex){return[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16))}
function rgbDistance(a,b){const x=hexRgb(a),y=hexRgb(b);return Math.sqrt(x.reduce((n,v,i)=>n+(v-y[i])**2,0))}
for(const sp of game.species){
 const p=game.fishAppearance(sp);
 const token=[p.body,p.accent,p.tail,p.motif].join(':');
 assert.equal(token,[game.fishAppearance(sp).body,game.fishAppearance(sp).accent,game.fishAppearance(sp).tail,game.fishAppearance(sp).motif].join(':'),
  'A species must keep its permanent colors across frames and reloads: '+sp.name);
 assert.ok(/^#[a-f0-9]{6}$/i.test(p.tail),'Every species needs a distinct readable tail color');
 assert.ok(/^#[a-f0-9]{6}$/i.test(p.mark),'Every species needs a distinct marking color');
 assert.ok(!colorIdentities.has([p.body,p.accent].join(':')),
  'Two differently named species must never share the same body/accent combination: '+sp.name);
 colorIdentities.add([p.body,p.accent].join(':'));
 baseColors.add(p.body);tailColors.add(p.tail);
 genusPatterns.add(p.motif);
}
assert.equal(colorIdentities.size,240,'All 240 fish must have stable, non-repeating color identities');
assert.ok(baseColors.size>=225,'Almost every fish should have its own distinct visible body color');
assert.ok(tailColors.size>=225,'Species tail colors must vary noticeably across the catalog');
for(let habitat=0;habitat<12;habitat++){
 const population=game.species.slice(habitat*20,(habitat+1)*20);
 const colors=population.map(sp=>game.fishAppearance(sp));
 assert.ok(new Set(colors.map(p=>p.body)).size>=19,
  'Every habitat should show 19+ visibly different bodies');
 let contrastingPairs=0;
 for(let i=1;i<colors.length;i++)
  if(rgbDistance(colors[i-1].body,colors[i].body)>55)contrastingPairs++;
 assert.ok(contrastingPairs>=12,
  'Adjacent entries within a habitat must have high-contrast color choices');
}
assert.ok([...genusPatterns].filter(p=>p.startsWith('identity-')).length>=6,
 'Every one of the six generic identity patterns should be represented');
const named=(name)=>game.fishAppearance(game.species.find(sp=>sp.name===name));
assert.notEqual(named('네온테트라').body,named('카디널테트라').body,
 'Similar tetra species must no longer share the same blue');
assert.notEqual(named('네온테트라').body,named('블랙네온테트라').body,
 'Black neon tetras must differ from standard neon tetras');
assert.notEqual(named('구피').body,named('엔들러구피').body,
 'Endler guppies must visually differ from normal guppies');
assert.equal(named('흰동가리').motif,'clown','Familiar clownfish white bands remain');
assert.equal(named('블루탱').motif,'bluetang','Blue tang black side design remains');
assert.equal(named('고래상어').motif,'whaleshark','Whale shark white spots remain');

function requireFish(name,expectedClass,shape,motif){
 const fish=game.species.find(f=>f.name===name);
 assert.ok(fish,'Named fish reference missing: '+name);
 assert.equal(game.fishVisual(fish).category,expectedClass,'Wrong characteristic size for '+name);
 assert.equal(game.fishVisual(fish).shape,shape,'Wrong anatomy for '+name);
 assert.equal(game.fishAppearance(fish).motif,motif,'Wrong signature markings for '+name);
}
requireFish('네온테트라','SMALL','needle','neon');
requireFish('구피','SMALL','guppy','guppy');
requireFish('비단잉어','SPECIAL','koi','koi');
requireFish('흰동가리','MEDIUM','standard','clown');
requireFish('가시해마','SPECIAL','horse','seahorse');
requireFish('만타가오리','SPECIAL','ray','manta');
requireFish('고래상어','LARGE','shark','whaleshark');
requireFish('귀상어','LARGE','hammer','solid');
requireFish('쏠배감펭','SPECIAL','lion','lion');
requireFish('산갈치','SPECIAL','eel','oarfish');
requireFish('레드벨리피라냐','MEDIUM','standard','redbelly');
requireFish('스칼라엔젤피시','MEDIUM','angel','angelfish');
requireFish('디스커스','MEDIUM','discus','discus');
requireFish('블루탱','MEDIUM','tang','bluetang');
requireFish('베타','SPECIAL','betta','betta');
requireFish('금붕어','SPECIAL','goldfish','goldfish');
requireFish('소드테일','SPECIAL','swordtail','swordtail');

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
const beforeX=game.getBob().x;
pointer('pointerdown',1070,360); // far away from lure (~640, 295), should still work
assert.equal(stick.classList.contains('visible'),true,'Any underwater touch should open the joystick');
assert.equal(element('virtualKnob').style.left,'50%','Knob should start centered');
step(2);
assert.ok(game.getBob().x<750,'Touching distant water must not teleport the lure');
// Releasing an unmoved stick should not catch.
pointer('pointerup',1070,360);
assert.equal(stick.classList.contains('visible'),false,'Joystick should close on touch release');
const stillX=game.getBob().x;
step(2);
assert.ok(Math.abs(game.getBob().x-stillX)<25,'Tap-only gesture should leave bait in place');
// Control from arbitrary screen position and move bait while held.
pointer('pointerdown',1120,360);
pointer('pointermove',1190,360);
step(18);
assert.ok(game.getBob().x>beforeX+24,'Rightward joystick tilt must move the lure');
assert.ok(game.getBob().x<900,'Joystick must move relative to bait, never teleport to touch position');
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
assert.match(catalog,/data-shop-buy=/,'Shop must provide purchase buttons');
assert.doesNotMatch(catalog,/data-gear-action=|data-loadout=|data-shop="/,'Shop must not offer equipping or upgrading');
assert.ok(typeof element('navGear').onclick==='function','Equipment navigation missing');
element('navGear').onclick();
const equipmentScreen=element('panelBody').innerHTML;
assert.match(equipmentScreen,/현재 장착 스탯/,'Equipment stats summary missing');
assert.match(equipmentScreen,/data-gear-slot="rod"/,'Equipment slots missing');
assert.match(equipmentScreen,/data-loadout="upgrade"/,'Equipment upgrades missing');
assert.match(equipmentScreen,/data-loadout="equip"/,'Equipment equipping missing');
element('navShop').onclick();
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
assert.ok(game.getFeverFx(),'Octo Fever mouth suction must start');
const lureStart={x:bob.x,y:bob.y};
const fxStart=game.getFeverFx();
const startingFish=fxStart.caught[0];
const startingHuman=fxStart.caught[1];
const earlyToss=game.toss(startingFish,fxStart,0,clock/1000);
assert.equal(earlyToss.phase,'gather','Before suction, captured fish must drift toward the opening mouth');
assert.equal(earlyToss.attached,true,'Captured fish must remain associated with the suction mouth');
// Suction stays at the exact release point, then retrieves only after swallowing.
for(const elapsed of [.1,.5,1,fxStart.suctionEnd-.01]){
 const fx={...fxStart,elapsed};const pose=game.reel(fx,clock/1000);
 assert.equal(pose.x,lureStart.x);assert.equal(pose.y,lureStart.y);
 assert.equal(pose.progress,0,'No reeling during suction');
}
const waiting={...fxStart,elapsed:.55};
const queuedFirst=game.toss(startingFish,waiting,0,clock/1000);
const queuedSecond=game.toss(startingHuman,waiting,1,clock/1000);
assert.ok(Math.hypot(queuedFirst.x-queuedSecond.x,queuedFirst.y-queuedSecond.y)>70,'Waiting catches must have separate slots');
for(const [i,entity] of fxStart.caught.entries()){
 const before={...fxStart,elapsed:fxStart.reelStart};
 const lifted={...fxStart,elapsed:fxStart.reelStart+.41};
 const a=game.toss(entity,before,i,clock/1000),b=game.toss(entity,lifted,i,clock/1000);
 const ra=game.reel(before,clock/1000),rb=game.reel(lifted,clock/1000);
 assert.equal(a.done,false);assert.equal(b.done,false);
 assert.equal(a.phase,'held');assert.equal(b.phase,'held');
 assert.equal(b.scale,a.scale,'Fish must not shrink into the bait');
 assert.ok(Math.abs((b.x-a.x)-(rb.x-ra.x))<1e-7);
 assert.ok(Math.abs((b.y-a.y)-(rb.y-ra.y))<1e-7,'All fish follow the same lift');
 const delivered=game.toss(entity,{...fxStart,elapsed:fxStart.reelStart+.82+.73},i,clock/1000);
 assert.ok(delivered.done,'Only main octopus swallows after group retrieval');
 assert.equal(delivered.x,game.getMouthPos(clock/1000).x);
}
assert.match(script,/var d=fx.radius\*2\/\.55/,'Visible whirlpool must scale to gameplay capture radius');
for(const [elapsed,lo,hi] of [[0,0,0],[.1,0,4],[.3,5,11],[fxStart.suctionEnd-.1,5,11],[fxStart.reelStart,15,15]]){
 const f=game.feverMouthFrame({...fxStart,elapsed});assert.ok(f>=lo&&f<=hi);
}
step(35);
assert.equal(bob.x,lureStart.x);assert.equal(bob.y,lureStart.y);
assert.equal(game.mouthOpen(),0,'Player mouth must not gape during underwater bait suction');
assert.match(script,/drawFeverTossCreature\(entity,fx,i,time,'attached'\)/);
assert.match(script,/drawFeverTossCreature\(entity,fx,i,time,'released'\)/);
assert.ok(script.indexOf("var fx=feverFx;",script.indexOf('// 3) Draw all ambient creatures'))>0,
 'Captured fish must render after ambient fish');
assert.match(script,/octofever_vortex_soft_v2\.webp/);
const retract=game.reel({...fxStart,elapsed:fxStart.reelStart+.41},clock/1000);
assert.ok(retract.progress>.4&&retract.progress<.6);
step(165);
assert.equal(game.getFeverFx(),null);
assert.ok(game.getCast().active);
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
// With the lowered surface, the escaping fish needs a few extra frames
// to reach the *new* waterline before its splash is expected.
step(38);
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
const mouth=game.getMouthPos(0),origin={x:830,y:510};
assert.equal(mouth.x,470,'Reeled-in red bait must end 18px to the right');
assert.equal(mouth.y,223,'Reeled-in red bait must end 14px higher');
const first=game.path(origin.x,origin.y,mouth,.26);
const middle=game.path(origin.x,origin.y,mouth,.54);
const near=game.path(origin.x,origin.y,mouth,.88);
const finish=game.path(origin.x,origin.y,mouth,1);
assert.ok(first.y<origin.y,'Fish should immediately rise after hooking');
assert.ok(middle.y<first.y,'Hook trajectory must continue rising with no surface pause');
assert.ok(near.y<269,'Approaching fish must pass the waterline without stopping');
assert.ok(Math.abs(finish.x-mouth.x)<.001&&Math.abs(finish.y-mouth.y)<.001,'Path must end in the octopus mouth');
assert.match(runtimeTick,/var point=swallowPoint\(hook\.startX,hook\.startY,mouthPos\(time\),p\)/,
 'Hook motion must aim at the updated animated mouth, not a stale coordinate');
assert.match(runtimeTick,/bob\.x=o\.x;bob\.y=o\.y/,
 'The red bait must follow the reeled-in fish along that same mouth trajectory');
assert.match(runtimeTick,/drawBaitAbovePlayer\(time\)/,
 'Bait must remain layered above protagonist and fishing line until swallowing');
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
// Rod physics: tier upgrades should be unmistakable in moving, turning, and stopping.
const poor=game.rodHandling(game.selectGear('rod'),0);
const topGear={id:'abyss',tier:5};
const elite=game.rodHandling(topGear,10);
assert.ok(elite.speed>=poor.speed*2.6,'Top rods must move the lure dramatically faster');
assert.ok(elite.acceleration>poor.acceleration*8,'High-end rods should accelerate promptly');
assert.ok(elite.braking>poor.braking*8,'High-end rods should stop with precision');
assert.ok(elite.deadZone<poor.deadZone,'High-end rods must sense small input better');
assert.ok(elite.wobble<poor.wobble*.1,'High-end rods should hold a stable heading');
assert.ok(game.rodHandling({id:'cork',tier:0},10).speed>poor.speed,
 'Upgrading the same rod should improve handling, not only capture probability');
const equippedRod=state.gearEquipped.rod;
function steeringTrial(id,lv){
 state.gearEquipped.rod=id;
 state.gearLevels.rod[id]=lv;
 game.hideStick();
 joy.active=true;joy.dx=1;joy.dy=0;
 bait.x=640;bait.y=420;
 for(let n=0;n<45;n++)game.moveBait(1/60);
 const advance=bait.x-640,forward=game.getRodMotion().vx;
 // Braking is measured from full forward velocity before testing reversal.
 joy.dx=0;
 for(let n=0;n<16;n++)game.moveBait(1/60);
 const stopped=game.getRodMotion().vx;
 game.hideStick();joy.active=true;joy.dx=1;joy.dy=0;
 bait.x=640;bait.y=420;
 for(let n=0;n<45;n++)game.moveBait(1/60);
 joy.dx=-1;
 for(let n=0;n<18;n++)game.moveBait(1/60);
 const reversed=game.getRodMotion().vx;
 game.hideStick();
 return{advance,forward,reversed,stopped};
}
const lowTrial=steeringTrial('cork',0);
const highTrial=steeringTrial('abyss',10);
assert.ok(highTrial.advance>lowTrial.advance*2.4,
 'High-quality fishing rod must visibly travel much farther on identical stick input');
assert.ok(lowTrial.reversed>0,
 'Basic fishing rod should retain rightward inertia after sudden reversal');
assert.ok(highTrial.reversed<0,
 'Legendary fishing rod should already be moving left after reversal');
assert.ok(Math.abs(highTrial.stopped)<Math.abs(lowTrial.stopped),
 'Premium rod should settle faster after releasing the joystick');
state.gearEquipped.rod=equippedRod;
assert.match(script,/equipmentMetricsHtml\(cat,item,lv/,
  'Equipment cards must show live handling and stat parameters');
// Alpha 2.2: separate screen, animal and lure vibration layers, short contact pulses.
const impacts=game.getVibration();
for(const name of ['screen','octo','lure'])impacts[name].length=0;
impacts.lastBrush=-5;impacts.lastSwallow=-5;
assert.ok(game.pulse('brush'),'First fish contact should trigger a subtle vibration');
assert.equal(impacts.screen.length,1,'Fish grazing bait should create one small screen pulse');
assert.equal(impacts.octo.length,0,'Grazing must not jolt the octopus');
assert.equal(impacts.lure.length,1,'Grazing must shake the lure itself');
const softPower=impacts.screen[0].power;
assert.ok(softPower<.3,'Grazing should be almost imperceptible on the entire screen');
assert.equal(game.pulse('brush'),false,'Contact pulses must be debounced to prevent nonstop shaking');
assert.ok(game.pulse('bite'),'Hook bite must have a dedicated impact');
assert.ok(impacts.screen.at(-1).power>softPower*5,'Hooking must be clearly more forceful than grazing');
assert.ok(impacts.octo.length>0,'Hooking should create a small octopus recoil');
assert.ok(game.pulse('swallow'),'Swallowing should produce a strong but finite impulse');
assert.ok(impacts.octo.at(-1).power>impacts.screen.at(-1).power,
 'Octopus should visibly react more than the entire camera at swallowing');
assert.equal(game.pulse('swallow'),false,'Multiple catches in one mouth frame must not stack unlimited impacts');
assert.ok(game.pulse('escape'),'Escaped fish must recoil hard against line, octopus and screen');
const capped=game.offset('screen');
assert.ok(Math.abs(capped.x)<=6&&Math.abs(capped.y)<=6,'Camera shake must stay within a 6px safety cap');
assert.ok(game.pulse('fever'),'Fever casting has a separate pulse');
assert.ok(game.pulse('counter'),'Human aerial counterattack requires a stronger recoil');
assert.ok(impacts.screen.length<=5&&impacts.octo.length<=5,
 'Continuous multi-catch actions must never accumulate unbounded vibrations');
// A single fish brushing the lure should shake just that fish once until it exits.
game.switchView('fish');game.getCast().active=false;game.setHook(null);
step(65); // Let the longer 16-frame player swallow finish before checking new lure contact.
game.getCast().active=false;
assert.equal(game.getCatchFx(),null,'Test environment must not still be playing catch effects');
const grazed=game.makeFish(game.species[0],660,425,1,false,0);
game.setFish([grazed]);
const brushBob=game.getBob();brushBob.x=660;brushBob.y=425;
impacts.lastBrush=-5;impacts.screen.length=0;impacts.lure.length=0;
game.checkBrush();
assert.ok(grazed.shakeUntil>0,'Fish must have its own local sprite vibration at bait contact');
const brushCount=impacts.lure.length;
game.checkBrush();
assert.equal(impacts.lure.length,brushCount,'One continuous graze must not repeat vibration every frame');
brushBob.x=900;game.checkBrush();
assert.equal(grazed.brushTouching,false,'Contact must clear when fish and lure separate');
assert.match(script,/vibration:hook\.kind==='fish'/,'Flying hooked fish must keep struggling toward the octopus mouth');
assert.match(script,/vibrationPulse\('swallow'\)/,'Successful mouth swallowing must trigger impact');
assert.match(script,/vibrationPulse\('escape'\)/,'Failed catches must rebound visibly');
assert.match(script,/vibrationPulse\('fever'\)/,'Fever catches must vibrate');
assert.match(script,/ctx\.translate\([^\n]*cameraVibration\.x[^\n]*cameraVibration\.y\)/,'Camera shake must move the entire fishing scene');

// Aquarium regression: target the touched fish, rotate 180 degrees and keep
// other inhabitants undisturbed. Wriggling must have an independent timer.
{
 const aquariumSave=game.getSave();
 const originalPlaced=aquariumSave.placed.slice();
 const originalView='fish';
 aquariumSave.placed=['F001','F002'];
 game.aquariumEnsure(10);
 const fishActors=game.aquariumActors();
 assert.equal(fishActors.length,2,'Two placed species need two stable tank actors');
 assert.notEqual(fishActors[0].phase,fishActors[1].phase,
  'Aquarium fish need independent animation phases');
 const beforeDirection=fishActors[0].dir,otherDirection=fishActors[1].dir;
 game.switchView('tank');
 element('panel').classList.remove('open');
 element('aquaSaleReceipt').classList.remove('visible');
 const tap={clientX:fishActors[0].x,clientY:fishActors[0].y,
  defaultPrevented:false,preventDefault(){this.defaultPrevented=true}};
 assert.equal(game.aquariumTap(tap),true,'Tapping a displayed fish must register');
 assert.equal(fishActors[0].dir,-beforeDirection,
  'The selected fish must reverse its swim direction');
 assert.equal(fishActors[1].dir,otherDirection,
  'Other fish must not simultaneously reverse');
 assert.equal(tap.defaultPrevented,true,
  'Captured aquarium taps should not trigger fishing gestures');
 const turnStart=fishActors[0].turnStart,turnDuration=fishActors[0].turnDuration;
 assert.equal(game.aquariumTurnScale(fishActors[0],turnStart),-beforeDirection,
  'Turn must begin in the original facing');
 assert.ok(Math.abs(game.aquariumTurnScale(fishActors[0],
  turnStart+turnDuration*.5))<.08,'Halfway through turn should show side-on silhouette');
 assert.equal(game.aquariumTurnScale(fishActors[0],turnStart+turnDuration+.01),
  beforeDirection,'The 180-degree turn must end facing the opposite direction');
 game.aquariumStruggle(fishActors[0],turnStart+1,1);
 assert.ok(fishActors[0].struggleEnd>turnStart+1,
  'Wriggling must be scheduled independently from fish direction');
 aquariumSave.placed=originalPlaced;
 game.switchView(originalView);
}

// An animated species must use its official sprite player instead of the
// aquarium fallback's procedural rotation and scale.
{
 const aquariumSave=game.getSave();
 const oldPlaced=aquariumSave.placed.slice();
 aquariumSave.placed=['F123','F002']; // F123 = Blue Tang / 블루탱
 game.setTime(40);
 game.aquariumEnsure(40);
 const fishActors=game.aquariumActors();
 const animated=fishActors.find(a=>a.sp?.name==='블루탱');
 assert.ok(animated,'Aquarium needs the Blue Tang specimen for sprite regression');
 const calls=[];
 const prev=mock.window.BlueTangSprites;
 mock.window.BlueTangSprites={
  ready(){return true},
  supports(sp){return !!sp&&sp.name==='블루탱'},
  draw(ctx,frame,now){
   calls.push({action:frame.spriteAction,explicit:frame.spriteAquarium,
    turnStart:frame.spriteTurnStart,turnFrom:frame.spriteTurnFrom,
    duration:frame.spriteTurnDuration,frame:frame.spriteFrame,
    x:frame.x,y:frame.y,now:now});
   return true;
  }
 };
 game.switchView('tank');
 element('panel').classList.remove('open');
 element('aquaSaleReceipt').classList.remove('visible');
 game.aquariumDraw(40);
 assert.equal(calls.at(-1).action,'swim',
  'An animated aquarium fish must use its official swimming frames');
 assert.equal(calls.at(-1).explicit,true,
  'The sprite player must own animation state and transformations');
 const beginning=animated.dir;
 game.setTime(40.1);
 const e={clientX:animated.x,clientY:animated.y,preventDefault(){}};
 assert.equal(game.aquariumTap(e),true,'Aquarium must receive a Blue Tang tap');
 assert.equal(animated.dir,-beginning);
 game.aquariumDraw(40.28);
 assert.equal(calls.at(-1).turnStart,40.1,
  'The official sprite player must receive the aquarium U-turn trigger');
 assert.equal(calls.at(-1).turnFrom,beginning,
  'The official sprite player must preserve the original turn direction');
 game.aquariumStruggle(animated,41.1,1);
 game.aquariumDraw(41.2);
 assert.ok(['hooked','last_resist'].includes(calls.at(-1).action),
  'Wriggling must use an existing official Blue Tang animation');
 assert.ok(Number.isFinite(calls.at(-1).frame),
  'Official struggle animation must advance through sprite sheet frames');
 mock.window.BlueTangSprites=prev;
 aquariumSave.placed=oldPlaced;
 game.switchView('fish');
}
console.log('PASS: Blue Tang aquarium uses official swim, 8-frame turn and struggle sprite playback');

console.log('PASS: aquarium fish touch-to-turn, independent swimmers and random wriggle timelines');

console.log('PASS: localized fish and octopus shake, gentle contact, bite, suction, escape, human counterattack and limited camera vibration; all previous gameplay tests');



