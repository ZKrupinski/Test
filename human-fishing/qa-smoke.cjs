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
    appendChild(){},setAttribute(){},getContext(){return ctx},
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
  addEventListener(k,fn){listeners['document:'+k]=fn;},
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
 mouthWeakspot:fishMouthWeakspot,
 rarityMovement:fishRarityMovement,
 mouthHit:fishMouthOverlapsLure,
 getBaitTip:function(t){return danglingBaitPosition(t===undefined?time:t)},
 getBaitSwing:baitSwingStats,
 getLureHang:function(){return lureHangState},
 getJointDepth:lureLegJointDepth,
 getBaitTrait:baitTrait,
 getOctoStats:octoStats,
 baitCenterRadius:baitCenterRadius,
 isFishFleeing:isFishFleeing,
 bodyHit:fishBodyContact,
 targetOnRelease:ordinaryFishingTarget,
 scareOnMiss:scareFishOnMiss,
 scareRadius:missScareRadius,
 scareScreenLimits:missScareScreenLimits,
 releaseNow:function(){return release()},
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
 rodTip:rodTip,
 rodPose:evaluateRodPose,
 rodCurve:rodCurve,
 rodWarp:rodWarpAt,
 rodSettings:rodMotionSettings,
 rodDraw:drawRodWarped,
 rodRecoil:triggerRodRecoil,
 rodBitmapSprites:rodBitmapSprites,
 getRodMotion:function(){return rodMotion},
 hideStick:hideVirtualJoystick,
 getJoystick:function(){return joystick},
 getSave:function(){return save},
 setHumanTestUnlock:function(enabled){HUMAN_TEST_UNLOCK_ALL=!!enabled;},
 disableAutoForSmoke:function(){autoFishing.triggerSeconds=1e9;autoFishing.lastInput=time;autoFishing.active=false;},
 renderCodex:renderBook,
 aquariumEnsure:aquariumEnsureFish,
 aquariumTap:aquariumTapFish,
 aquariumUpdate:aquariumUpdateFish,
 aquariumDraw:drawingTank,
 setTime:function(v){time=v},
 aquariumActors:function(){return aquariumFishActors},
 aquariumTurnScale:aquariumTurnScale,
 aquariumStruggle:aquariumStartStruggle,
 raritySparkles:raritySparklesFor,
 motionSettings:fishMotionSettings,
 motionPose:fishMotionPose,
 motionDraw:drawFishOnContext,
 aquariumReset:aquariumResetExhibit,
 aquariumBegin:aquariumBeginPlay,
 aquariumReturn:aquariumReturnToExhibit,
 aquariumSpawn:aquariumSpawnCodexFish,
 aquariumPlaying:function(){return aquariumFishingActive},
 aquariumSaleValue:aquariumUnitSalePrice,

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
 feverLiftRare:feverLiftResistantFish,
 feverReturnRare:feverReturnResistantFish,
 rodTip:rodTip,
 getCatchFx:function(){return catchFx},
 path:swallowPoint,
 getMouthPos:mouthPos,
 mouthOpen:mouthGape,
 mouthFrames:function(){return mouthFrames},
 swallow:playCatchFx,
 getCast:function(){return cast},
 getRecovery:function(){return lureRecovery},
 updateRecovery:updateLureRecovery,
 swapRandom:function(fn){const old=random;random=fn;return old},
 getIntro:function(){return introEntrance},
 markIntroHeroReady:function(){playerOctoAtlas.swim={ready:true}},
 markIntroRigReady:function(){
  rodBitmapSprites[selectedGear('rod').id]={ready:true};
  polishedRedLureArt.idle={ready:true};
  hangingBaitAtlas={ready:true};
 },
 advanceIntro:advanceIntroEntrance,
 getHook:function(){return hook},
 redLureReleasePose:redLurePose,
 getRedLurePulseAt:function(){return redLureReleasePulseAt},
 mouthRigCreate:makeMouthHookRig,
 mouthRigStep:hookedFishMouthPivot,
 mouthRigDraw:drawHookedFishAtMouth,
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
// Manual gameplay cases remain independent of idle automation tests.
game.disableAutoForSmoke();
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
game.advanceIntro(.5);
assert.equal(game.getIntro().visualReady,false,
 'Hero and cheerleaders cannot start before the real rod, red octopus and hooked bait art');
game.markIntroRigReady();
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
assert.match(script,/function drawIntroRig\(now\)\{[\s\S]*?ctx\.translate\(introEntrance\.offset,0\);[\s\S]*?drawLine\(\);drawBaitAbovePlayer\(now\);/,
 'Line and both lure bitmaps must enter from the left with the protagonist');
const runtimeTick=script.slice(script.lastIndexOf('function tick(stamp){'));
const translate=runtimeTick.indexOf('ctx.translate(introEntrance.offset,0)');
const sidekicks=runtimeTick.indexOf('window.drawOctopusSidekicks(ctx,time,octo)',translate);
const hero=runtimeTick.indexOf('drawOcto(time);drawRod(time);',sidekicks);
const restore=runtimeTick.indexOf('ctx.restore()',hero);
assert.ok(translate>=0&&sidekicks>translate&&hero>sidekicks&&restore>hero,
 'The FINAL active renderer must translate the hero, both friends and fishing rod together');
assert.match(runtimeTick,/if\(view==='fish'&&!introEntrance\.active\)/,
 'Do not cast before the visible entrance finishes');
assert.match(runtimeTick,/introEntrance\.active&&introEntrance\.visualReady\)[\s\S]*?drawIntroRig\(time\)/,
 'All entrance frames must draw the suspended rod-line, red octopus and hook');
assert.match(script,/WATER_SURFACE_Y=293,PLAYER_STAGE_DROP=46/,
 'The waterline must move down 24px while the hero has 46px headroom');
assert.match(runtimeTick,/ctx\.translate\(0,PLAYER_STAGE_DROP\)/,
 'Final active renderer must shift the main octopus, rod and red cheerleader together');
assert.match(script,/CATCH_MOUTH_X=500,CATCH_MOUTH_LOCAL_Y=94/,
 'The shared ordinary/Fever bait destination must move 18px right and 74px upward');
assert.equal(game.getMouthPos(0).x,500,'Bait target X must shift slightly to the right');
assert.equal(game.getMouthPos(0).y,140,'Bait target Y must shift up by about one lure diameter');
assert.match(script,/function rodTip\(now\)\{return evaluateRodPose\(now\)\.tip\}/,
 'Physical rod and line must share the identical bent-tip pose');
assert.match(script,/drawRodWarped\(ctx,image,pose,pose\.root\.x,pose\.root\.y,1\)/,
 'Approved rod PNG must be rendered using the deformable pose instead of a rigid pivot');
assert.match(script,/var tip=rodTip\(time\),/,
 'Fishing line must connect directly to the pose-calculated rod tip');
// Six original rod PNGs are flexed non-destructively, with fixed reel root,
// release spring, normal hanging-load, reel-load and identical line anchor.
{
 const gear={id:'cork',tier:0},settings=game.rodSettings(gear);
 const at=(mode,elapsed,weight=1)=>game.rodPose(20,gear,{mode,elapsed,weight});
 const rest=at('hang',0),back=at('cast',.29),released=at('cast',.82),hanging=at('cast',1.6);
 assert.ok(back.bend>rest.bend+20,
  'Casting must deeply bend the tip backwards after the loading phase');
 assert.ok(released.bend<0,
  'The cast release must overshoot past neutral for an elastic whip');
 assert.ok(hanging.bend>0&&hanging.bend<back.bend*.35,
  'Sinking bait must leave a small, downward-loaded, stable tip');
 const reel=at('reel',.42,1),heavy=at('reel',.42,1.55);
 assert.ok(reel.bend>rest.bend+12,
  'A caught fish must bend the rod more than its hanging load');
 assert.ok(heavy.bend>reel.bend+5,
  'Large fish and humans should visibly load the rod harder');
 const recovery=at('recover',.15,28),recoveryEnd=at('recover',1.0,28);
 assert.ok(Math.abs(recoveryEnd.bend-rest.bend)<Math.abs(recovery.bend-rest.bend),
  'Releasing a fish must spring back with decreasing amplitude');
 assert.ok(Object.values(game.rodWarp(-25,35)).every(v=>v===0),
  'Gripped handle and reel anchor must stay rigid before the flex begins');
 const quarter=game.rodWarp(8,35),middle=game.rodWarp(34,35),
  threeQuarter=game.rodWarp(70,35),outer=game.rodWarp(104,35);
 assert.ok(quarter.dy>3,'The rod must already bow near its handle/reel midpoint');
 assert.ok(middle.dy>8,'Middle shaft must visibly bend, not stay rigid');
 assert.ok(threeQuarter.dy>middle.dy+8,
  'The flex must build continuously along the entire shaft');
 assert.ok(outer.dy>threeQuarter.dy+9&&outer.dy>30,
  'The tip must complete a full-rod curved arc');
 assert.ok(game.rodWarp(32,35).sy>0,
  'Mid-blank tangent should lean into the continuous bend');
 const warp=game.rodWarp(104,back.bend);
 assert.ok(Math.abs(back.localTip.x-(104+warp.dx))<1e-8);
 assert.ok(Math.abs(back.localTip.y-(-50+warp.dy))<1e-8);
 const angle=back.angle,drop=46,c=Math.cos(angle),si=Math.sin(angle);
 const px=back.pivot.x,py=back.pivot.y;
 assert.ok(px<0&&Math.abs(py)<20,'Pivot must be inside the approved rod handle');
 assert.ok(Math.abs(back.tip.x-(536+px+(back.localTip.x-px)*c-(back.localTip.y-py)*si))<1e-8);
 assert.ok(Math.abs(back.tip.y-(191+py+(back.localTip.x-px)*si+(back.localTip.y-py)*c+drop))<1e-8);
 // During a single pull the rod MUST visibly lift above its handle 3 times;
 // this is not a reel-only flex that merely moves the tip downwards.
 for(const mode of ['reel','fever']){
  const atPulse=p=>at(mode,p,mode==='reel'?1.3:1.18);
  const valleys=[0,1/3,2/3,1].map(atPulse),
   peaks=[1/6,1/2,5/6].map(atPulse);
  for(const pose of peaks){
   assert.ok(pose.angle<-.68,mode+' must lift the entire rod at least 39 degrees at each pump');
  }
  for(let i=0;i<3;i++){
   assert.ok(peaks[i].angle<valleys[i].angle-.66,
    mode+' pump '+(i+1)+' must pivot the whole rod far above its lowered position');
   assert.ok(peaks[i].tip.y<valleys[i].tip.y-55,
    mode+' pump '+(i+1)+' must raise the attached line tip at least 55px');
  }
  for(const pose of valleys){
   assert.ok(Math.abs(pose.angle)<.04,'Rod should lower between pumps and at release');
   assert.ok(pose.pivot.x===px&&pose.pivot.y===py,
    'Gripped handle must remain a fixed pivot throughout all pumps');
  }
 }
 assert.match(script,/g\.translate\(px,py\);g\.rotate\(pose\.angle\);g\.translate\(-px,-py\)/,
  'Approved rod bitmap must rotate around the same grip point as the line');
 assert.match(script,/ctx\.moveTo\(tip\.x,tip\.y\)/,
  'Line geometry must start at the calculated flexible tip, not old constants');
 const rodIds=['cork','bamboo','marine','carbon','titan','abyss'];
 const rearValues=rodIds.map((id,tier)=>game.rodPose(20,{id,tier},{mode:'cast',elapsed:.25}).bend);
 assert.equal(new Set(rearValues.map(n=>Math.round(n))).size,6,
  'Six rods need different material stiffness and casting arcs');
 const image={ready:true,naturalWidth:1050,naturalHeight:800};
 const segments=[],testCtx={
  save(){},restore(){},translate(){},rotate(){},scale(){},
  transform(){},drawImage(){segments.push([...arguments]);}
 };
 game.rodDraw(testCtx,image,back,536,191,1);
 assert.equal(segments.length,24,
  'Rod bend must use twenty-four smoothly joined runtime display strips');
 assert.ok(segments.every(x=>x[0]===image),
  'All deforming strips must sample one and the same unmodified PNG');
 const tuna=element('rodTuneToggle'),panel=element('rodTunePanel');
 tuna.onclick();
 assert.ok(panel.classList.contains('visible'),'In-game rod tuning must open');
 element('rodTuneSpecies').value='bamboo';element('rodTuneSpecies').onchange();
 element('rodTuneBack').value='175';element('rodTuneBack').oninput();
 assert.equal(game.getSave().rodMotionOverrides.bamboo.back,1.75,
  'Each rod must save its own tuning values');
 assert.ok(game.rodSettings({id:'bamboo',tier:1}).back>settings.back,
  'Tuning updates should affect the render pose immediately');
 element('rodTuneReelTest').onclick();
 element('rodTuneBig').onclick();
 element('rodTuneSnap').onclick();
 element('rodTuneReset').onclick();
 assert.equal(game.getSave().rodMotionOverrides.bamboo,undefined,
  'Rod tuning resets only the selected equipment');
 element('rodTuneClose').onclick();
 assert.ok(!panel.classList.contains('visible'),'Rod tuning must close');
}
const idleBlock=script.slice(script.indexOf('function nextPlayerOctoIdle(){'),
 script.indexOf('function playerOctoCue(',script.indexOf('function nextPlayerOctoIdle(){')));
assert.doesNotMatch(idleBlock,/['"]gorge['"]|['"]snack['"]/,
 'Fish-bucket idle may play in aquarium only');
assert.match(script,/drawOcto\(now,aquariumKeeperPose\(now\)\)/,
 'Aquarium must play fish-from-bucket idle animation');
assert.match(script,/if\(action==='swim'\)cleanDetachedPlayerPixels\(/,
 'Swimming bitmap frames must remove neighboring-frame tails');
assert.match(script,/gazeScale=\.75;/,
 'Painted protagonist must keep one calibrated and UNIFORM scale for X/Y');
assert.match(script,/140-200\*gazeScale,244-412\*gazeScale,400\*gazeScale,440\*gazeScale/,
 'Original character must retain consistent body proportions and planted foot anchor');
assert.doesNotMatch(script,/gazeX=\.83,gazeY=\.65/,
 'Squashed octopus distortion must never return');
assert.match(script,/var playerExcitedIdleFrames=\[6,7,8,9,10,11,12,13,12,11,10,9,8,7\]/,
 'Default idle uses the user-approved excited, mouth-open, raised-tentacle sequence');
assert.match(script,/idle_alt:'purple_idle_v2\.webp'/,
 'Original old idle atlas remains available only to other contexts');
assert.match(script,/purple_sinking_original_pixel_16f\.webp/,
 'Sinking pose must use the original-character pixel sheet');
// Eleven distinct high-quality zone bitmaps for all 12 established regions.
assert.match(script,/var WATER_SURFACE_Y=293,PLAYER_STAGE_DROP=46/,
 'Sea interface must remain locked to the established 293px physics line');
const bgMap=script.match(/var fishingBackgroundZoneKeys=\[([^\]]+)\]/);
assert.ok(bgMap,'Expected painted environment map for all regions');
const backgroundZones=[...bgMap[1].matchAll(/'([^']+)'/g)].map(x=>x[1]);
assert.deepEqual(backgroundZones,[
 'freshwater_planted','amazon','african_lake','asian_wetland',
 'alpine_lake','east_asia','tropical','seagrass',
 'harbor','open_ocean','moonlight','polar_ice'
],'Background scene must match the established creature habitat names');
assert.equal(new Set(backgroundZones).size,12,
 'All twelve habitats must map to distinct background asset names');
assert.match(script,/if\(!under&&drawFishingBitmapBackground\(\)\)return;/,
 'Fishing scene must render prepared bitmap instead of old vector mountains');
assert.match(script,/ctx\.drawImage\(item\.image,0,0,W,H\)/,
 'The entire bitmap frame must use uniform 1280×720 scaling');
assert.match(script,/if\(view!=='tank'\)return;/,
 'Legacy procedural sea plants must never draw over bitmap stage art, even during load');
assert.match(script,/if\(!under\)return;/,
 'Legacy vector fishing scenery must never appear while its bitmap loads');
assert.doesNotMatch(script,/escapeHtml\(sp\.rarity\)\+' Lv\.'/,
 'Fish codex cards must not show rarity text or fish levels');
assert.doesNotMatch(script,/tierLabels\[target\.rarity\]\+' Lv\.'/,
 'Fish catch hints must not display rarity or level text');
assert.match(script,/function drawFishRankTag\(f,lightTarget\)\{[\s\S]*?g\.drawImage\(sheet,/,
 'Rare fish must still use bitmap sparkle frames on the world or FX context, never text labels');
assert.match(script,/var g=lightTarget\|\|ctx,sheet=raritySparkleAtlases/,
 'Rare sprite sparkle must retain original Canvas2D context when no shader target exists');
const sceneDigests=new Map();
for(const name of [...new Set([...backgroundZones,'ruins'])]){
 const path='human-fishing/assets/backgrounds/bg_'+name+'.webp';
 const buf=fs.readFileSync(path);
 assert.ok(buf.length>100000, 'Missing high-quality bitmap: '+name);
 assert.equal(buf.toString('ascii',0,4),'RIFF','Bitmap WebP RIFF header missing: '+name);
 assert.equal(buf.toString('ascii',8,12),'WEBP','Background image is not WebP: '+name);
 if(backgroundZones.includes(name)){
  const sha=require('node:crypto').createHash('sha256').update(buf).digest('hex');
  assert.ok(!sceneDigests.has(sha),
   'Two mapped regions share identical bitmap contents: '+sceneDigests.get(sha)+' / '+name);
  sceneDigests.set(sha,name);
 }
}
const redSidekick=fs.readFileSync('human-fishing/assets/octopus/octopus-sidekicks.js','utf8');
assert.match(redSidekick,/cleanDetachedRedPixels\(data,sw,sh\)/,
 'Red cheerleader sprites must remove adjacent-frame bleed');
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
// Airborne bait cannot be controlled; immediately after surface entry the
// underwater bait IS controllable while the natural sink can still run.
step(57); // ~0.95 seconds, still airborne
pointer('pointerdown',1060,560);
assert.equal(stick.classList.contains('visible'),false,'Airborne lure must stay locked');
pointer('pointerup',1060,560);
step(46); // ~1.72 seconds, below the surface
assert.equal(game.getCast().landing,true,'The bait should splash down');
assert.equal(game.getCast().active,false,'Control must unlock on the splash frame');
assert.ok(game.getBob().x>650,'The bait must land on the right before drifting');
assert.ok(game.getCast().targetDepth>=350&&game.getCast().targetDepth<=585,
 'Every cast should choose a valid random final depth');
pointer('pointerdown',1070,560);
assert.equal(stick.classList.contains('visible'),true,
 'Input must start as soon as the lure is submerged');
assert.equal(game.getCast().sinkActive,false,
 'Real user control overrides lingering automatic sink motion');
pointer('pointerup',1070,560);
step(120);
assert.equal(game.getCast().active,false,'Cast must remain unlocked');
assert.equal(game.getCast().sinkActive,false,'Automatic sink must not restart after a touch');
assert.ok(game.getBob().y>=293&&game.getBob().y<=615,
 'The bait must remain submerged at a safe depth');
pointer('pointerdown',1070,220);
assert.equal(stick.classList.contains('visible'),false,
 'Touches in the upper half must not start fishing control');
pointer('pointerup',1070,220);
const beforeX=game.getBob().x;
pointer('pointerdown',1070,560); // distant touch becomes the origin, not a teleport
assert.equal(stick.classList.contains('visible'),true,
 'Touches in the lower half should open a floating joystick');
assert.equal(element('virtualKnob').style.left,'50%','Knob should start centered');
step(2);
assert.ok(Math.abs(game.getBob().x-beforeX)<30,'Touching distant water must not teleport the lure');
// Releasing an unmoved stick should not catch.
pointer('pointerup',1070,560);
assert.equal(stick.classList.contains('visible'),false,'Joystick should close on touch release');
const stillX=game.getBob().x;
step(2);
assert.ok(Math.abs(game.getBob().x-stillX)<25,'Tap-only gesture should leave bait in place');
// Touch another point in the lower half, then steer freely in all directions.
pointer('pointerdown',1120,560);
pointer('pointermove',1190,560);
step(18);
assert.ok(game.getBob().x>beforeX+24,'Rightward joystick tilt must move the lure');
assert.ok(game.getBob().x<900,'Joystick must move relative to bait, never teleport to touch position');
assert.equal(stick.classList.contains('visible'),true,'Joystick must remain visible during drag');
pointer('pointerup',1190,560);
assert.equal(stick.classList.contains('visible'),false,'Joystick must hide on release');
step(10);
assert.equal(typeof frame,'function');
// Shop catalog must render all 4 tabs and allow changing the sort field.
element('navShop').onclick();
const catalog=element('panelBody').innerHTML;
for(const name of ['낚싯대','미끼','어망','응원단','피버 문어'])assert.ok(catalog.includes(name),name+' missing');
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
// FULL 6/6 must always become READY, regardless of random results.
const oldFeverMath=mock.Math,unluckyMath=Object.create(Math);
unluckyMath.random=()=>.999;mock.Math=unluckyMath;
state.fever.count=5;state.fever.ready=false;
game.record(1);
assert.equal(state.fever.count,6,'Fever meter must cap at 6/6');
assert.equal(state.fever.ready,true,'Six captures MUST make fever READY even with unlucky RNG');
assert.equal(element('feverNum').textContent,'READY','Fever gauge must show READY when full');
assert.equal(element('feverFill').style.width,'100%','READY gauge must be filled');
assert.match(script,/save\.fever\.ready=!!save\.fever\.ready\|\|save\.fever\.count>=6/,
 'Legacy saved 6/6 or higher must auto-repair into READY');
// Gear chance is now an early-roll benefit, never hidden failure after 6/6.
const luckyFeverMath=Object.create(Math);
luckyFeverMath.random=()=>0;mock.Math=luckyFeverMath;
state.fever.count=2;state.fever.ready=false;
game.record(1);
assert.equal(state.fever.count,3,'Early proc becomes eligible at three');
assert.equal(state.fever.ready,true,'Successful early proc should enable READY before 6');
state.fever.count=6;state.fever.ready=true;
mock.Math=oldFeverMath;
const bob=game.getBob();
const caughtFish=game.species[0];
game.setFish([{sp:caughtFish,x:bob.x+10,y:bob.y+10,vx:.2,size:1,phase:0}]);
game.setHum([{id:3,x:bob.x+24,y:bob.y+24,vx:.12,size:1,phase:0}]);
const riggedMath=Object.create(Math);riggedMath.random=()=>0;mock.Math=riggedMath;
game.switchView('fish');game.getCast().active=false;game.setHook(null);game.hideStick();
const readyTap={pointerId:77,clientX:650,clientY:440,preventDefault(){}};
assert.equal(typeof listeners.pointerdown,'function','Bait pointerdown handler required');
assert.equal(typeof listeners.pointerup,'function','Bait pointerup handler required');
listeners.pointerdown(readyTap);
assert.equal(game.getJoystick().active,true,'Tap should start virtual joystick');
assert.equal(game.getJoystick().engaged,false,'A stationary tap cannot pass 10px threshold');
listeners.pointerup(readyTap);
assert.equal(game.getJoystick().active,false,'Tap must release virtual joystick');
assert.ok(game.getFeverFx(),'READY Fever must activate on a stationary tap release');
assert.equal(game.getFeverFx().caught.length,2,'Fever must catch multiple fish and elite humans when rolls succeed');
assert.equal(state.fever.ready,false,'Activation must consume stored fever');
assert.equal(state.fever.count,0,'Fever gauge must reset');
assert.ok(game.getFeverFx(),'Octo Fever mouth suction must start');
const lureStart={x:bob.x,y:bob.y};
const fxStart=game.getFeverFx();
const startingFish=fxStart.caught[0];
const startingHuman=fxStart.caught[1];
assert.match(script,/function feverPolishedMouthFrame\(fx\)/,
 'Octo Fever needs an 8-frame open, sustain, close mouth sequence');
assert.match(script,/red_lure_polished_/,
 'Approved polished PNG bait artwork must load before original fallback');
const earlyToss=game.toss(startingFish,fxStart,0,clock/1000);
assert.equal(earlyToss.phase,'impact');assert.equal(earlyToss.attached,true);
const firstFrame=game.toss(startingFish,{...fxStart,elapsed:1/60},0,clock/1000);
assert.equal(firstFrame.phase,'impact');assert.equal(firstFrame.scale,1);
assert.ok(Math.hypot(firstFrame.x-earlyToss.x,firstFrame.y-earlyToss.y)>2,'Immediate body jolt');
const distant={...startingFish,x:fxStart.x+fxStart.radius*.95,y:fxStart.y};
const beforeSnap=game.toss(distant,{...fxStart,elapsed:.0239},0,clock/1000);
const duringSnap=game.toss(distant,{...fxStart,elapsed:.060},0,clock/1000);
const afterSnap=game.toss(distant,{...fxStart,elapsed:.091},0,clock/1000);
assert.ok(Math.hypot(beforeSnap.x-distant.x,beforeSnap.y-distant.y)<1,'Impact stays local');
assert.equal(duringSnap.phase,'gather');assert.equal(afterSnap.phase,'held');
const gap=p=>Math.hypot(p.x-afterSnap.x,p.y-afterSnap.y);
assert.ok(gap(duringSnap)<gap(beforeSnap)*.25,'At least 75% of pull completed by 60ms');
// On real 60Hz frames the pull must be observable, not an instantaneous teleport.
// The second and third frames close at least 30% and 75% of the original gap.
const secondFrame=game.toss(distant,{...fxStart,elapsed:2/60},0,clock/1000);
const thirdFrame=game.toss(distant,{...fxStart,elapsed:3/60},0,clock/1000);
assert.equal(secondFrame.phase,'gather');assert.equal(thirdFrame.phase,'gather');
assert.ok(gap(secondFrame)<gap(beforeSnap)*.70,'Second 60Hz frame must start a visible sharp snap');
assert.ok(gap(thirdFrame)<gap(beforeSnap)*.25,'Third 60Hz frame must nearly finish the snap');
for(const p of [beforeSnap,secondFrame,thirdFrame,duringSnap,afterSnap])assert.equal(p.scale,1);
const nearEnd=game.toss(distant,{...fxStart,elapsed:.08999},0,clock/1000);
const settled=game.toss(distant,{...fxStart,elapsed:.09},0,clock/1000);
assert.ok(Math.hypot(nearEnd.x-settled.x,nearEnd.y-settled.y)<.1,'Snap ends continuously');
// The destination itself must be compact, not merely reached faster.
const six={...fxStart,caught:Array.from({length:6},()=>({...startingFish,size:1.2})),elapsed:.10};
for(let i=0;i<6;i++){const slot=game.gripSlot(six,i);assert.ok(Math.hypot(slot.x,slot.y)<=61,'Six fish cluster within 61px of lure');}
assert.ok(Math.hypot(afterSnap.x-fxStart.x,afterSnap.y-fxStart.y)<70,'Catch lands near lure');
// Suction stays at the exact release point, then retrieves only after swallowing.
for(const elapsed of [.1,.5,1,fxStart.suctionEnd-.01]){
 const fx={...fxStart,elapsed};const pose=game.reel(fx,clock/1000);
 assert.equal(pose.x,lureStart.x);assert.equal(pose.y,lureStart.y);
 assert.equal(pose.progress,0,'No reeling during suction');
}
const waiting={...fxStart,elapsed:.55};
const queuedFirst=game.toss(startingFish,waiting,0,clock/1000);
const queuedSecond=game.toss(startingHuman,waiting,1,clock/1000);
assert.ok(Math.hypot(queuedFirst.x-queuedSecond.x,queuedFirst.y-queuedSecond.y)>40,'Compact catches retain distinct grip centers');
assert.equal(queuedFirst.scale,1,'Fish must retain original size throughout suction');
assert.equal(queuedSecond.scale,1,'Captured human must retain original size throughout suction');
for(const [i,entity] of fxStart.caught.entries()){
 const before={...fxStart,elapsed:fxStart.reelStart};
 const lifted={...fxStart,elapsed:fxStart.reelStart+.41};
 const a=game.toss(entity,before,i,clock/1000),b=game.toss(entity,lifted,i,clock/1000);
 const ra=game.reel(before,clock/1000),rb=game.reel(lifted,clock/1000);
 assert.equal(a.done,false);assert.equal(b.done,false);
 assert.equal(a.phase,'held');assert.equal(b.phase,'held');
 assert.equal(a.scale,1,'Full-size fish must not shrink during the hold');
 assert.equal(b.scale,1,'Full-size fish must not shrink during lift');
 // Captured fish wriggle and spiral inward instead of riding rigid slots.
 const sa=game.gripSlot(before,i),sb=game.gripSlot(lifted,i);
 assert.ok(Math.hypot(sb.x,sb.y)<Math.hypot(sa.x,sa.y),
  'Fish must move closer to the bait during the lift');
 assert.ok(Math.abs((b.x-a.x)-(rb.x-ra.x))<18,
  'Each fish may spiral but must still follow the rising lure');
 assert.ok(Math.abs((b.y-a.y)-(rb.y-ra.y))<18,
  'Each fish may struggle but must still follow the rising lure');
 const delivered=game.toss(entity,{...fxStart,elapsed:fxStart.reelStart+.82+.73},i,clock/1000);
 assert.ok(delivered.done,'Only main octopus swallows after group retrieval');
 assert.equal(delivered.x,game.getMouthPos(clock/1000).x);
}
assert.match(script,/var d=fx.radius\*2\*scale\*feverSnapScale\(fx\);/,'Fever must flash at full capture radius, then shrink to half');
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
assert.ok(game.getRecovery().active,
 'After arriving, the Fever bait must fall and complete the character reaction');
assert.ok(game.getBob().y>game.getMouthPos(clock/1000).y+24,
 'The lure must drop visibly below the mouth without a stationary pause');
assert.equal(game.getCast().active,false,'Next cast cannot interrupt the reaction');
step(65);
assert.ok(game.getCast().active,
 'After reacting, the line must reel the dangling lure to the rod and auto-cast');
mock.Math=Math;
const currentCatchCount=state.catches,currentCoins=state.coins;
const ordinary=game.species[0];
// Individual fish PNGs face RIGHT; deformation must preserve orientation
// with the same aquarium double-flip protection.
const artLoader=fs.readFileSync('human-fishing/fish-bitmap-catalog.js','utf8');
assert.match(artLoader,/img\._hfFacingRight=true/,
 'Individual fish PNGs must declare their native rightward orientation');
assert.match(script,/var sourceFacing=image\._hfFacingRight\?1:-1/,
 'Fish renderer must read each original PNG orientation');
assert.match(script,/g\.scale\(pose\.sx,1\)/,
 'The facing and yaw must use the shared non-destructive sprite transform');
assert.match(script,/a\.sprite\.vx=sourceFacing\*22/,
 'Aquarium must preserve source facing within the nested renderer');
assert.match(script,/aquariumTurnScale\(a,now\)\*\(-sourceFacing\)/,
 'Aquarium U-turn must adjust its mirror to match bitmap orientation');
for(const sourceFacing of [-1,1])for(const swimFacing of [-1,1]){
 const mirrored=swimFacing!==sourceFacing;
 assert.equal(mirrored? -sourceFacing:sourceFacing,swimFacing,
  'Rendered fish must point '+(swimFacing>0?'right':'left')+
  ' for source facing '+sourceFacing);
}
// Non-destructive fish motion must support all 304 original PNGs, with
// preparation before reversing, 10-12 screen-only display strips, and
// independent species sliders persisted in the existing game save.
{
 assert.match(script,/function drawFishStripWarp\(g,image,w,h/,
  'Fish images must bend at render time without altering their source PNG');
 assert.ok(!/createImageData\(|putImageData\(/.test(
  script.slice(script.indexOf('function drawFishStripWarp('),
   script.indexOf('function drawOcto(now)',script.indexOf('function drawFishStripWarp(')))),
  'Render-time motion must not destructively rewrite image pixels');
 const proto=game.species.find(sp=>sp.name==='블루탱');
 const setting=game.motionSettings(proto),actor={sp:proto,dir:1,vx:24,x:600,y:440,size:1,phase:.25};
 const initial=game.motionPose(actor,15,1,setting);
 assert.equal(initial.sx,1,'Initial fish orientation must match its travel direction');
 actor.dir=-1;
 const began=game.motionPose(actor,15.01,1,setting);
 assert.equal(began.sx,1,'A fish must hold its old facing at turn onset');
 const prep=game.motionPose(actor,15.01+setting.prep*.5,1,setting);
 assert.equal(prep.sx,1,'A fish must hold its old facing while preparing to turn');
 assert.ok(prep.bend!==0,'The fish must visibly coil before it turns');
 const halfway=game.motionPose(actor,15.01+setting.prep+setting.turn*.5,1,setting);
 assert.ok(Math.abs(halfway.sx)<.08,'A 180-degree body turn passes through a narrow frontal pose');
 const recovered=game.motionPose(actor,15.02+setting.prep+setting.turn+setting.recover,1,setting);
 assert.equal(recovered.sx,-1,'A prepared fish ends in the new heading');
 const original=mock.window.HumanFishingArt;
 const image={width:800,height:400,_hfScale:.28,_hfFacingRight:true};
 mock.window.HumanFishingArt={bitmap(){return image;}};
 const calls=[],g={
  save(){},restore(){},translate(){},rotate(){},scale(){},
  drawImage(){calls.push([...arguments]);}
 };
 const sample={sp:proto,x:130,y:60,phase:0,size:1,dir:1,vx:20};
 game.motionDraw(g,sample,25);
 assert.equal(calls.length,setting.strips,
  'Every fish must use runtime display strips rather than a replaced animation sheet');
 assert.ok(calls.every(call=>call[0]===image),
  'Every strip must come from the same original, unmodified PNG');
 mock.window.HumanFishingArt=original;
 element('motionTuneToggle').onclick();
 assert.ok(element('motionTunePanel').classList.contains('visible'),
  'Motion-tuning controls must open inside the game');
 element('motionSpecies').value=proto.id;
 element('motionSpecies').onchange();
 element('motionAmp').value='0';element('motionAmp').oninput();
 assert.equal(game.getSave().fishMotionOverrides[proto.id].amp,0,
  'The per-species tuning tool must persist individual slider changes');
 assert.equal(game.motionSettings(proto).amplitude,0,
  'Setting the swim amplitude to zero must actually disable that motion');
 element('motionReset').onclick();
 assert.equal(game.getSave().fishMotionOverrides[proto.id],undefined,
  'Per-species reset must restore its original tuning preset');
 element('motionClose').onclick();
 assert.ok(!element('motionTunePanel').classList.contains('visible'),
  'The adjustment tool must close without affecting the game');
}
// Regression: after the octopus-mouth escape, neither a dive/flee stage
// switch nor the fading swimming kick may teleport the fish one frame.
for(const dir of [-1,1])for(const phase of [0,.65,1.6,3.3,5.7]){
 const fx={x:500,y:140,dir,phase,human:false,size:1.1};
 for(const edge of [.42,.74,1.19]){
  const before=game.escapePose(fx,edge-.00001);
  const after=game.escapePose(fx,edge);
  assert.ok(Math.hypot(after.x-before.x,after.y-before.y)<.15,
   'Escaping fish must not jump at stage '+edge+' with phase '+phase+' and dir '+dir);
  assert.ok(Math.abs(after.scale-before.scale)<.001,
   'Fish scale must stay continuous across escape stage '+edge);
 }
 const a=game.escapePose(fx,1.19-.0005),b=game.escapePose(fx,1.19),
  c=game.escapePose(fx,1.19+.0005);
 const speedBefore=(b.x-a.x)/.0005,speedAfter=(c.x-b.x)/.0005;
 assert.ok(Math.abs(speedAfter-speedBefore)<10,
  'Fast escape must inherit the dive velocity without a one-frame acceleration spike');
 assert.ok(Math.abs(game.fishHeading(fx,1.1899)-game.fishHeading(fx,1.1901))<.025,
  'Fish body angle must not snap at the high-speed escape handoff');
 for(let t=1.20;t<2.6;t+=.035){
  const a=game.escapePose(fx,t),b=game.escapePose(fx,t+.0001);
  assert.ok(Math.hypot(b.x-a.x,b.y-a.y)<.25,
   'Fast escaping fish must never teleport mid-run; phase '+phase+', time '+t);
 }
}
assert.match(script,/var bobRamp=1-Math\.exp\(-run\/\.10\)/,
 'Fast-escape oscillation must fade in from the previous exact position');
assert.match(script,/var driftAge=run\/\.46,drift=34\*\(1-\(1\+driftAge\)/,
 'Escape depth drift should be smooth without an abrupt cap');
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
// Sparse independent bitmap twinkles: individual stars appear at different
// locations and moments, with no old packed five-star image or text badge.
{
 const previousArt=mock.window.HumanFishingArt;
 const bitmap={width:224,height:144,_hfFacingRight:true,_hfScale:1};
 mock.window.HumanFishingArt={bitmap(){return bitmap;}};
 const rare=game.species.find(sp=>sp.rarity==='RARE');
 assert.ok(rare,'Rare species required for sparkle testing');
 const fish={sp:rare,x:640,y:435,size:1.2,phase:.3,ecoId:215};
 let zero=0,lit=0,max=0;
 for(let i=0;i<280;i++){
  const lights=game.raritySparkles(fish,i*.061);
  max=Math.max(max,lights.length);
  if(lights.length===0)zero++;
  if(lights.length>0)lit++;
  assert.ok(lights.every(p=>p.size>=26&&p.size<=54&&p.alpha>=0&&p.alpha<=1),
   'Rare sparkle sprites must be large enough for mobile but still fade');
  assert.ok(lights.every(p=>Math.abs(p.x-fish.x)<115&&Math.abs(p.y-fish.y)<70),
   'Sparks should scatter along the real fish silhouette, not a detached cluster');
 }
 assert.ok(max<=2,'No rarity should show an overcrowded pile of sparkles');
 assert.match(script,/var radius=\[10,15,19,12\]\[frame\]/,
  'Every raster sparkle frame must use the larger visible artwork');
 assert.ok(zero>50&&lit>10,
  'Sparse twinkles must have visible gaps rather than being constantly illuminated');
 for(const rarity of ['EPIC','LEGEND','MYTHIC']){
  const sp=game.species.find(f=>f.rarity===rarity);
  assert.ok(sp);
  fish.sp=sp;
  const bonus={EPIC:4,LEGEND:7,MYTHIC:10}[rarity];
  let largest=0;
  for(let i=0;i<90;i++){
   const sparks=game.raritySparkles(fish,i*.22);
   assert.ok(sparks.length<=2);
   for(const p of sparks){
    assert.ok(p.size>=26+bonus&&p.size<=54+bonus,
     'Higher rarity must retain its tier-specific enlarged sparkle size');
    largest=Math.max(largest,p.size);
   }
  }
  assert.ok(largest>30+bonus,'Visible high-tier sparkle size never reached');
 }
 mock.window.HumanFishingArt=previousArt;
}
// Failed fish must almost reach the mouth, then thrash, slip back, dive and flee.
game.switchView('fish');game.getCast().active=false;
game.setHook({obj:{sp:ordinary,x:480,y:187,vx:.2,size:1,phase:0},kind:'fish',elapsed:.6,startX:660,startY:470,willEscape:true,escapeAt:.88});
game.triggerEscape();
const startPose=game.escapePose(game.getEscape(),0);
const laterPose=game.escapePose(game.getEscape(),.41);
assert.ok(Math.abs(startPose.x-game.getMouthPos(0).x)<8,
 'Escaping fish must emerge from inside the octopus mouth');
assert.ok(startPose.scale<.5&&laterPose.scale>.9,
 'Fish must visibly grow out of the mouth instead of appearing fully free');
assert.ok(Math.abs(laterPose.x-startPose.x)>25,
 'Escape frames must visibly travel away from the mouth');
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
assert.equal(mouth.x,500,'Reeled-in red bait must reach the new shared rightward arrival point');
assert.equal(mouth.y,140,'Reeled-in red bait must finish one bait diameter higher');
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
assert.match(runtimeTick,/var baitOffset=danglingBaitPosition\(time\)/,
 'The small dangling bait, NOT the octopus body, must follow the hook to the player mouth');
assert.match(runtimeTick,/bob\.x\+=o\.x-baitOffset\.x/,
 "Carrier must converge to keep its hook bait attached to the fish mouth");
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
const hanging=game.getBaitTip();
assert.ok(Math.hypot(hanging.x-actual.x,hanging.y-actual.y)<2.5,
 'During reeling the small bait should share the fish-mouth joint');
assert.ok(game.mouthOpen()>.75,'Octopus should open wide before the creature arrives');
step(35);
assert.equal(game.getHook(),null,'Hook must finish at the mouth and release the live creature');
assert.ok(game.getCatchFx()?.swallowed,'Reward state must mark creature as already swallowed');
step(35);
assert.equal(game.getCatchFx(),null,'Brief glint must finish without a replayed swallow');
assert.ok(game.getRecovery().active,
 'Lure must continue dangling and falling through the full approved reaction');
assert.equal(game.getCast().active,false,'Do not abruptly recast before the reaction ends');
step(45);
assert.ok(game.getCast().active,
 'After finishing the reaction, the line must retract the bait and trigger the next throw');
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
// Separate fish independent of species and schooling. Start two residents at
// the SAME pixel and verify they separate gradually, never teleporting.
const overlapA=game.makeFish(spSmall,640,435,1,true,0),
      overlapB=game.makeFish(spSmall,640,435,1,true,0);
for(const f of [overlapA,overlapB]){
 f.hunter=false;f.swimMode='hover';f.speed=18;f.vx=18;f.vy=0;
 f.swimFreq=0;f.swimAmp=0;f.homeY=435;f.nextTurn=game.getEco().t+30;
}
game.setFish([overlapA,overlapB]);
game.ecoTick(.016);
const firstSpread=Math.hypot(overlapA.x-overlapB.x,overlapA.y-overlapB.y);
assert.ok(firstSpread>0&&firstSpread<8,
 'Initial exact overlap must separate gently, not jump across the screen');
for(let frame=0;frame<150;frame++)game.ecoTick(.016);
const spreadX=(overlapA.x-overlapB.x)/76;
const spreadY=(overlapA.y-overlapB.y)/56;
assert.ok(Math.hypot(spreadX,spreadY)>.80,
 'Fish must not stay stacked and moving in lockstep after 2.4 seconds');
assert.match(script,/brush:\[7\],weakspot:\[91,24,61\]/,
 'Weakspot device vibration must be distinctly longer and stronger than body contact');
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
// The 304 approved high-resolution transparent PNGs encode each species
// silhouette; the obsolete vector-procedural fish generator must stay gone.
assert.doesNotMatch(script,/sprites\[key\]=c;return c/,
 'Legacy vector fish artwork must not be regenerated');
assert.match(script,/window\.HumanFishingArt\.bitmap\(sp\.id\)/,
 'All fish, including rays, seahorses, eels and Blue Tang use individual PNGs');
const fishAssetDir='human-fishing/assets/fish/individual';
for(const id of ['F001','F046','F123','F200','F240','F304']){
 assert.ok(fs.existsSync(fishAssetDir+'/'+id+'.png'),
  'Missing original single-image fish asset '+id);
}
const startIds=new Set(residents.map(f=>f.ecoId));
game.getCast().active=true;
for(let i=0;i<2200;i++){
 game.ecoTick(.04);
 const live=game.getFish();
 assert.ok(live.length<=18,'Ambient ecosystem must not overcrowd the screen');
 for(const f of live){
  assert.ok(f.y>=game.depthMin(f)-.01&&f.y<=game.depthMax(f)+.01,
   'Fish body has left its permitted underwater depth range');
  assert.ok(Math.abs(f.vx)<=330.01,'Wild fish exceeded its controlled rarity/dash/flee maximum');
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
step(100); // Allow full player swallow AND 0.32s natural line retraction to finish before grazing.
game.getCast().active=false;
assert.equal(game.getCatchFx(),null,'Test environment must not still be playing catch effects');
const grazed=game.makeFish(game.species[0],660,425,1,false,0);
game.setFish([grazed]);
const brushBob=game.getBob();
brushBob.x=660;brushBob.y=425;
for(let k=0;k<7;k++){
 const tip=game.getBaitTip();
 brushBob.x+=grazed.x-tip.x;
 brushBob.y+=grazed.y-tip.y;
}
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

// Aquarium regression: exhibit random OWNED species, leave the view, refill
// by an equal count, and start fishing with the very same on-screen fish.
{
 const aquariumSave=game.getSave();
 const previousOwned={...aquariumSave.owned};
 const previousPlaced=aquariumSave.placed.slice();
 aquariumSave.owned={'F001':1,'F002':1,'F003':1};
 aquariumSave.placed=[];
 game.aquariumReset();
 game.setTime(10);
 game.aquariumEnsure(10);
 let actors=game.aquariumActors();
 assert.equal(actors.length,10,'Aquarium must auto-fill ten visible exhibits');
 assert.ok(actors.every(a=>aquariumSave.owned[a.sp.id]>0),
  'Only species already owned in the codex may appear in aquarium');
 assert.equal(new Set(actors.map(a=>a.sp.id)).size,3,
  'All available species should appear before repeating an owned species');
 assert.notEqual(actors[0].phase,actors[1].phase,
  'Aquarium fish need independent animation phases');
 const beforeDirection=actors[0].dir,otherDirection=actors[1].dir;
 game.switchView('tank');
 element('panel').classList.remove('open');
 element('aquaSaleReceipt').classList.remove('visible');
 const tap={clientX:actors[0].x,clientY:actors[0].y,
  defaultPrevented:false,preventDefault(){this.defaultPrevented=true}};
 assert.equal(game.aquariumTap(tap),true,'Tapping a displayed fish must register');
 assert.equal(actors[0].dir,-beforeDirection,'Touched fish must turn around');
 assert.equal(actors[1].dir,otherDirection,'Other fish must not turn');
 assert.equal(tap.defaultPrevented,true,'Aquarium touch must not cast the lure');
 const turnStart=actors[0].turnStart,turnDuration=actors[0].turnDuration;
 assert.equal(game.aquariumTurnScale(actors[0],turnStart),-beforeDirection);
 assert.ok(Math.abs(game.aquariumTurnScale(actors[0],
  turnStart+turnDuration*.5))<.08,'Turn midpoint must show a thin silhouette');
 assert.equal(game.aquariumTurnScale(actors[0],turnStart+turnDuration+.01),
  beforeDirection,'The turn must end in the opposite direction');
 game.aquariumStruggle(actors[0],turnStart+1,1);
 assert.ok(actors[0].struggleEnd>turnStart+1);
 const gone=actors[2];
 gone.x=1280+195;
 game.aquariumUpdate(10.04);
 actors=game.aquariumActors();
 assert.equal(actors.length,10,'One departure must produce one new fish');
 assert.ok(!actors.includes(gone),'The departed actor must be removed');
 assert.ok(actors.at(-1).x<0||actors.at(-1).x>1280,
  'Replacement must enter naturally from outside the screen');
 assert.ok(actors.every(a=>aquariumSave.owned[a.sp.id]>0),
  'Every replacement must be an already owned species');
 // Allow a few swim steps, then snapshot the aquarium immediately before play.
 game.aquariumUpdate(10.08);
 const beforePlay=game.aquariumActors().map(a=>({
  id:a.sp.id,x:a.x,y:a.y,size:a.size,dir:a.dir,phase:a.phase
 }));
 game.setTime(10.08);
 game.aquariumBegin();
 assert.ok(game.aquariumPlaying(),'The aquarium Play button must enter fishing');
 const swimmers=game.getFish();
 assert.equal(swimmers.length,beforePlay.length,
  'Starting aquarium fishing must not create a different fish population');
 for(let i=0;i<beforePlay.length;i++){
  assert.equal(swimmers[i].sp.id,beforePlay[i].id);
  assert.equal(swimmers[i].x,beforePlay[i].x,'Fish x must not teleport');
  assert.equal(swimmers[i].y,beforePlay[i].y,'Fish y must not teleport');
  assert.equal(swimmers[i].size,beforePlay[i].size,'Fish scale must persist');
  assert.equal(Math.sign(swimmers[i].vx),beforePlay[i].dir,
   'Fish must keep facing its swimming direction');
  assert.equal(swimmers[i].phase,beforePlay[i].phase,
   'Fish animation phase must persist');
 }
 // A successful aquarium catch is a sale only: save.owned never changes.
 const sold=swimmers[0],previousInventory={...aquariumSave.owned};
 const previousCoins=aquariumSave.coins;
 game.setHook({obj:sold,kind:'fish',elapsed:.8,startX:sold.x,startY:sold.y});
 game.catchNow();
 assert.deepEqual(aquariumSave.owned,previousInventory,
  'Aquarium catches must never award new specimens');
 const saleIncome=aquariumSave.coins-previousCoins;
 const unit=game.aquariumSaleValue(sold.sp);
 assert.ok(saleIncome===unit||saleIncome===unit*2,
  'Aquarium sale income must follow species tier and net catch quantity');
 assert.ok(!game.getFish().includes(sold),'The caught swimmer must leave the scene');
 // Wait for the 0.79s catch-glint animation before another Fever action.
 step(65);
 assert.equal(game.getCatchFx(),null,'Sale flash must finish before a new Fever action');
 aquariumSave.fever.ready=true;
 const targets=game.getFish();
 assert.ok(targets.length>0);
 const at=targets.find(f=>f.sp.rarity==='COMMON')||targets[0];
 const bait=game.getBob();bait.x=at.x;bait.y=at.y;
 const feverOwned={...aquariumSave.owned},beforeFeverCoins=aquariumSave.coins;
 const previousMath=mock.Math;
 mock.Math=Object.assign(Object.create(Math),{random(){return 0}});
 game.activate();
 mock.Math=previousMath;
 assert.deepEqual(aquariumSave.owned,feverOwned,
  'Aquarium OCTO FEVER must award coins only, not inventory fish');
 assert.ok(aquariumSave.coins>beforeFeverCoins,
  'Successful aquarium Fever catches must pay shop currency');
 game.aquariumReturn();
 assert.equal(game.aquariumPlaying(),false);
 assert.ok(game.aquariumActors().length>0,
  'Returning to the exhibit must preserve surviving swimmers');
 aquariumSave.owned=previousOwned;
 aquariumSave.placed=previousPlaced;
 game.switchView('fish');
}

// The retired Blue Tang multi-frame animation must never mask F123.png.
{
 const bitmapManifest=fs.readFileSync('human-fishing/fish-bitmap-catalog.js','utf8');
 const blueTang=game.species.find(sp=>sp.name==='블루탱');
 assert.ok(blueTang,'The original blue tang species must remain in the catalog');
 assert.equal(blueTang.id,'F123','The original Blue Tang retains stable image ID F123');
 assert.ok(fs.existsSync('human-fishing/assets/fish/individual/F123.png'),
  'The new single-image Blue Tang PNG must be present');
 assert.match(bitmapManifest,/assetPath:'\.\/assets\/fish\/individual\//,
  'All fish should resolve to the individual bitmap directory');
 assert.doesNotMatch(html,/blue-tang-raster\.js|BlueTangSprites|blueTangSpriteQA/,
  'No legacy Blue Tang animation provider or debug overlay may load');
 assert.doesNotMatch(script,/blueTangShowcase|setPreviewAction/,
  'Old eight-frame Blue Tang preview must not return');
 const aquariumSave=game.getSave(),oldOwned={...aquariumSave.owned};
 aquariumSave.owned={'F123':1};
 game.aquariumReset();game.setTime(40);
 game.aquariumEnsure(40);
 const blueTangActors=game.aquariumActors();
 assert.ok(blueTangActors.length>0&&blueTangActors.every(a=>a.sp.id==='F123'),
  'Single-image Blue Tang must display in every owned aquarium slot');
 game.switchView('tank');game.aquariumDraw(40.3);
 aquariumSave.owned=oldOwned;game.switchView('fish');
}
// Non-Fever fishing: only the original fish PNG's invisible mouth region
// accepts the lure center. Body releases start a shared, temporarily
// noncatchable fast escape. Fever retains its own AOE and probability.
{
 const origArt=mock.window.HumanFishingArt;
 const art={width:240,height:108,_hfFacingRight:true,_hfScale:1};
 mock.window.HumanFishingArt={bitmap(){return art}};
 const save=game.getSave(),oldBait=save.gearEquipped.bait,
  oldFever=save.fever.ready;
 const originalOwned=save.owned;
 const common=game.species.find(sp=>sp.rarity==='COMMON'),
       mythic=game.species.find(sp=>sp.rarity==='MYTHIC');
 assert.ok(common&&mythic,'Both common and mythic species must exist');
 // Wrong-body failure should scare a notably smaller random local zone
 // than the old fixed 215px area; ~30% of misses are extra localized.
 assert.equal(game.scareRadius(0),62);
 assert.ok(game.scareRadius(.29)<101);
 assert.ok(game.scareRadius(.30)>=110);
 assert.ok(game.scareRadius(1)<=150);
 const sampled=[0,.08,.16,.24,.32,.44,.56,.68,.8,.92,1].map(game.scareRadius);
 assert.ok(new Set(sampled.map(Math.round)).size>=9,
  'Each body miss should have a genuinely variable effective radius');
 assert.ok(sampled.every(x=>x>=62&&x<=150),
  'Body-miss scare radius must be narrower than the previous 215px');
 const bait=game.getBob();
 function positionHookBaitAt(point){
  for(let k=0;k<8;k++){
   const tip=game.getBaitTip();
   bait.x+=point.x-tip.x;
   bait.y+=point.y-tip.y;
  }
 }
 // Direct fixture view switches bypass the real UI's setMode()/startCast()
 // reset; explicitly finish any previous bait recovery for this test.
 game.getRecovery().active=false;
 game.switchView('fish');game.getCast().active=false;game.setHook(null);
 save.fever.ready=false;
 save.gearEquipped.bait='worm';save.shop.bait=0;
 const baseRadius=game.baitCenterRadius();
 save.gearEquipped.bait='void';
 const superiorRadius=game.baitCenterRadius();
 assert.ok(superiorRadius<baseRadius-.8,
  'Higher-grade bait remains steadier without losing too much capture reach');
 assert.ok(baseRadius<=5.8&&superiorRadius>=4.0,
  'High-tier bait keeps a playable hidden capture radius');
 save.gearEquipped.bait='worm';
 const commonFish=game.makeFish(common,580,440,1,false,0);
 commonFish.behavior='cruise';commonFish.panicUntil=0;
 const rareFish=game.makeFish(mythic,580,440,1,false,0);
 rareFish.size=commonFish.size;rareFish.behavior='cruise';rareFish.panicUntil=0;
 game.setTime(57);
 const mouth=game.mouthWeakspot(commonFish,57),rareMouth=game.mouthWeakspot(rareFish,57);
 assert.ok(mouth&&rareMouth,'Fish mouth weak point should be derived from original bitmap');
 assert.ok(mouth.x>commonFish.x+10,
  'Right-facing fish must have its mouth in front of the body');
 assert.ok(rareMouth.rx<mouth.rx*.4,
  'Mythic fish must have a much smaller catchable mouth area');
 assert.ok(rareMouth.ry<mouth.ry*.4);
 const bigFish=game.makeFish(common,580,440,1,false,0);
 bigFish.size=commonFish.size*3.0;
 bigFish.behavior='cruise';bigFish.panicUntil=0;
 const giantMouth=game.mouthWeakspot(bigFish,57);
 assert.ok(giantMouth&&giantMouth.rx<mouth.rx*.78,
  'Three-times-larger fish should have SMALLER, not larger mouth weak-point radius');
 assert.ok(giantMouth.ry<mouth.ry*.78,
  'Large fish weak-point shrink must apply in both axes');
 commonFish.dir=-1;commonFish.vx=-26;
 commonFish._hfFacing=-1;commonFish._hfTarget=-1;commonFish._hfTurnStart=-100;
 const leftMouth=game.mouthWeakspot(commonFish,57.1);
 assert.ok(leftMouth.x<commonFish.x-10,
  'Mouth geometry must follow the displayed facing direction when reversed');
 commonFish.dir=1;commonFish.vx=26;commonFish._hfFacing=1;
 commonFish._hfTarget=1;commonFish._hfTurnStart=-100;
 const head=game.mouthWeakspot(commonFish,57.1);
 game.setTime(57.1);positionHookBaitAt(head);
 assert.equal(game.mouthHit(commonFish,game.getBaitTip(),57.1),true,
  'Center-on-mouth contact should overlap both invisible areas');
 positionHookBaitAt(commonFish);
 assert.equal(game.bodyHit(commonFish,game.getBaitTip()),true,
  'Body contact must be detected for a failed non-mouth release');
 assert.equal(game.mouthHit(commonFish,game.getBaitTip(),57.1),false,
  'Putting the lure in the middle of a fish must NOT count as a mouth hit');
 const companion=game.makeFish(common,625,455,1,false,0),
       distant=game.makeFish(common,1100,470,-1,false,0);
 game.setFish([commonFish,companion,distant]);
 game.setHum([]);
 const bodyBlocked=game.targetOnRelease();
 assert.equal(bodyBlocked,null,'Body contact should not hook by proximity');
 // The actual release handler must activate the group escape when the
 // bait is released on the fish body.
 game.releaseNow();
 assert.equal(game.getHook(),null,
  'A body-only release must NOT create a fishing hook');
 // Verify that the start impulse is immediate (before any ecosystem frame),
 // rather than gradually easing up from normal roaming velocity.
 assert.ok(Math.abs(commonFish.vx)>=285&&Math.abs(companion.vx)>=285,
  'A body miss must instantly launch nearby fish at >=285 px/s');
 const fleeStartX=commonFish.x;
 game.ecoTick(.016);
 assert.ok(Math.abs(commonFish.x-fleeStartX)>4.4,
  'Fish must visibly cover at least 4.4px in the very first 16ms flee frame');
 assert.ok(Math.abs(commonFish.vx)>=275&&Math.abs(companion.vx)>=275,
  'High-speed escape must remain fast after the first ecosystem update');
 const eco=game.getEco();
 assert.ok(commonFish.fleeBurstUntil>eco.t&&companion.fleeBurstUntil>eco.t,
  'Touching the body must scare all fish in the nearby shoal');
 assert.ok(!distant.fleeBurstUntil,
  'Fish well outside the local scare radius must not panic');
 assert.equal(game.isFishFleeing(commonFish),true);
 assert.equal(game.mouthWeakspot(commonFish,57.1),null,
  'Fleeing fish must immediately lose the invisible mouth weak spot');
 game.ecoTick(.15);
 assert.equal(commonFish.behavior,'flee');
 assert.equal(companion.behavior,'flee');
 assert.ok(Math.abs(commonFish.vx)>110&&Math.abs(companion.vx)>110,
  'The missed release must send nearby fish sprinting faster than ambient speed');
 positionHookBaitAt(commonFish);
 assert.equal(game.targetOnRelease(),null,
  'Fleeing fish must never become eligible for another catch');
 // A wrong-body miss near the stage edge launches INWARD, stays at full
 // bitmap width inside 1280px, and never despawns when it reaches the wall.
 const nearEdge=game.makeFish(common,1200,445,1,false,0);
 nearEdge.panicUntil=0;nearEdge.behavior='cruise';
 game.setFish([nearEdge]);
 bait.x=nearEdge.x;bait.y=nearEdge.y;
 assert.ok(game.scareOnMiss(bait)>=1,
  'Touching a fish body must trigger panic even at minimal scare radius');
 assert.ok(nearEdge.vx<=-285,
  'A fish next to the right edge must immediately flee inward');
 const limits=game.scareScreenLimits(nearEdge);
 for(let i=0;i<300;i++){
  game.ecoTick(.016);
  assert.ok(nearEdge.x>=limits.left-.01&&nearEdge.x<=limits.right+.01,
   'Affected fish must remain wholly inside screen edges after panic');
  assert.ok(game.getFish().includes(nearEdge),
   'Affected fish must not despawn while recovering from a missed catch');
 }
 // Complete the real missed-release recovery before the next input.
 const returning=game.getRecovery();
 assert.equal(returning.kind,'miss_return');
 assert.ok(returning.active);
 assert.equal(returning.toX,640);
 assert.ok(returning.toY>=360&&returning.toY<=590);
 game.setTime(returning.start+.2);game.updateRecovery(.2);
 assert.ok(Math.abs(bait.x-640)<Math.abs(returning.fromX-640));
 game.releaseNow();
 assert.equal(game.getHook(),null,'Return movement must block duplicate release');
 game.setTime(returning.start+.41);game.updateRecovery(.21);
 assert.equal(returning.active,false);
 assert.equal(bait.x,640);assert.equal(bait.y,returning.toY);
 assert.equal(game.getCast().active,false,'A miss must not replay the long cast');
 // Restore a normal catchable state and check the exact mouth actually
 // produces a fish hook via the full normal release path.
 commonFish.panicUntil=0;commonFish.fleeBurstUntil=0;
 commonFish.escapeNoCatchUntil=0;commonFish.behavior='cruise';
 game.setFish([commonFish]);game.getCast().active=false;
 const contact=game.mouthWeakspot(commonFish,57.1);
 assert.ok(contact,'Fish should regain a mouth weak spot after escape ends');
 positionHookBaitAt(contact);
 assert.equal(game.targetOnRelease()?.kind,'fish');
 game.releaseNow();
 assert.ok(game.getHook()&&game.getHook().obj===commonFish,
  'Overlapping bait and mouth must hook the correct fish');
 game.setHook(null);
 save.gearEquipped.bait=oldBait;save.fever.ready=oldFever;
 mock.window.HumanFishingArt=origArt;
 assert.match(script,/function activateOctoFever\(\)/);
 assert.match(script,/Math\.hypot\(f\.x-center\.x,f\.y-center\.y\)<=v\.radius/,
  'Octo Fever continues to use its own AOE, not the mouth weak spot');
 assert.doesNotMatch(script,/drawFishWeakspot\(|ctx\.arc\(mouth\.x/,
  'Mouth and bait hit regions must stay invisible during normal gameplay');
}
console.log('PASS: hook-bait centered fishing, shrinking precision at high tiers, octopus-centered Fever');
// A MYTHIC fish in OCTO FEVER must be drawn into the whirlpool and
// carried all the way to the octopus's mouth even on a guaranteed failure.
// It then visibly breaks free and rejoins the living underwater population.
{
 const sp=game.species.find(f=>f.rarity==='MYTHIC'),common=
  game.species.find(f=>f.rarity==='COMMON');
 assert.ok(game.feverLiftRare(sp),'MYTHIC is eligible for visual retrieval on resistance');
 assert.ok(!game.feverLiftRare(common),'Common fish retain standard Fever catch roll');
 const save=game.getSave(),beforeCoins=save.coins,beforeCatches=save.catches;
 const beforeOwned=save.owned[sp.id]||0,beforeFever=save.fever.ready;
 const priorMath=mock.Math, priorArt=mock.window.HumanFishingArt;
 mock.window.HumanFishingArt={bitmap(){return{
  width:360,height:180,_hfFacingRight:true,_hfScale:1
 }}};
 const bait=game.getBob();bait.x=625;bait.y=460;
 const rare=game.makeFish(sp,640,467,1,false,0);
 rare.size=1.4;rare.panicUntil=0;rare.behavior='cruise';
 game.switchView('fish');game.setFish([rare]);game.setHum([]);
 game.setHook(null);game.getCast().active=false;save.fever.ready=true;
 mock.Math=Object.assign(Object.create(Math),{random(){return .999}});
 game.activate();
 mock.Math=priorMath;
 const fx=game.getFeverFx();
 assert.ok(fx,'Resisted MYTHIC fish must still trigger Fever visuals');
 assert.equal(fx.caught.length,1,'Resisted rare fish must still enter pull-up slots');
 const pulled=fx.caught[0];
 assert.equal(pulled.willEscape,true,'Rare resistance should be resolved at the mouth');
 assert.equal(pulled.sourceFish,rare,'Resisted rare creature must retain original ecosystem identity');
 assert.equal(fx.resisted,1,'One rare fish resisting still counts as resistance');
 assert.equal(save.coins,beforeCoins,'Resisted rare fish must not grant coins');
 assert.equal(save.catches,beforeCatches,'Resisted rare fish must not count as caught');
 assert.equal(save.owned[sp.id]||0,beforeOwned,'Resisted rare fish must not enter inventory');
 assert.ok(fx.duration>fx.reelStart+.82+1.9,
  'Fever must remain alive for the rare mouth-escape and dive');
 const now=clock/1000,releaseAt=fx.reelStart+.82;
 const gathering=game.toss(pulled,{...fx,elapsed:.060},0,now);
 const lifting=game.toss(pulled,{...fx,elapsed:fx.reelStart+.40},0,now);
 assert.equal(gathering.phase,'gather');
 assert.equal(lifting.phase,'held');
 assert.ok(lifting.y<gathering.y-30,'Resisted rare fish must be hauled upwards visibly');
 const gate=releaseAt+.72*.96;
 const justBefore=game.toss(pulled,{...fx,elapsed:gate-.00001},0,now);
 const justAfter=game.toss(pulled,{...fx,elapsed:gate},0,now);
 assert.equal(justBefore.phase,'throw');
 assert.equal(justAfter.phase,'escape');
 assert.ok(Math.hypot(justAfter.x-justBefore.x,justAfter.y-justBefore.y)<.15,
  'Rare creature must break away from mouth without a one-frame position jump');
 assert.ok(Math.abs(justAfter.scale-justBefore.scale)<.005,
  'Rare fish must retain whole-body scale at the mouth-escape handoff');
 const submerged=game.toss(pulled,{...fx,elapsed:gate+.64},0,now);
 assert.ok(submerged.y>293+50,'Failed rare should dive back underwater after mouth escape');
 assert.ok(Math.abs(submerged.x-justAfter.x)>100,
  'Resisted rare fish must sprint away from octopus after breaking loose');
 fx.elapsed=gate+.79;
 game.feverReturnRare(fx,now);
 assert.equal(pulled.escapeReleased,true,
  'Escaped rare fish must transition from Fever sprite to world actor');
 assert.ok(game.getFish().includes(rare)&&!rare.feverCaptured,
  'Rare fish should survive the failed Fever and remain in the ecosystem');
 assert.ok(rare.escapeNoCatchUntil>game.getEco().t,
  'Immediately after escaping, rare fish must be temporarily uncatchable');
 fx.elapsed=fx.duration;
 step(2);
 assert.equal(game.getFeverFx(),null,'Fever should finish after rare fish escapes');
 save.fever.ready=beforeFever;
 mock.window.HumanFishingArt=priorArt;
}
// Regular release: one short mouth-opening pulse from the existing
// transparent red-lure PNG frames, then a fish hooked BY ITS MOUTH and
// physically swung from the bait anchor as the rod retrieves it.
{
 const previousArt=mock.window.HumanFishingArt,previousFever=game.getSave().fever.ready;
 const previousBait=game.getSave().gearEquipped.bait;
 const png={width:320,height:140,_hfFacingRight:true,_hfScale:1};
 mock.window.HumanFishingArt={bitmap(){return png;}};
 const sp=game.species.find(z=>z.rarity==='COMMON');
 const f=game.makeFish(sp,630,460,1,false,0);
 f.behavior='cruise';f.panicUntil=0;f.dir=1;f.vx=25;
 const bait=game.getBob();
 // This isolated rig test bypasses the UI transition/reset on purpose.
 game.getRecovery().active=false;
 game.switchView('fish');game.getCast().active=false;game.setHook(null);
 game.setFish([f]);game.setHum([]);
 game.getSave().fever.ready=false;
 game.setTime(71);
 const weak=game.mouthWeakspot(f,71);
 assert.ok(weak,'The approved PNG must supply a real mouth pivot');
 // Position the actual pierced bait belly on the fish mouth.
  for(let k=0;k<8;k++){
   const tip=game.getBaitTip();
   bait.x+=weak.x-tip.x;
   bait.y+=weak.y-tip.y;
  }
 assert.equal(game.targetOnRelease()?.obj,f,'The center of the bait must overlap the mouth');
 game.releaseNow();
 assert.ok(game.getHook()&&game.getHook().mouthRig,
  'Ordinary successful fish bite must attach a mouth-anchored fish rig');
 const h=game.getHook(),rig=h.mouthRig;
 assert.ok(Math.abs(h.startX-weak.x)<.001&&Math.abs(h.startY-weak.y)<.001,
  'The bait flight must start at the release point, not jump to the fish center');
 assert.ok(Math.abs(rig.mouthX-(weak.x-f.x))<.001,
  'Mouth pivot offset must equal the fish PNG weak-point position');
 assert.equal(game.getRedLurePulseAt(),71,
  'Releasing the lure must trigger the one-shot mouth-open pose immediately');
 const beginning=game.redLureReleasePose(71).frame;
 const gape=game.redLureReleasePose(71.11).frame;
 const shut=game.redLureReleasePose(71.26).frame;
 assert.ok(gape>=9&&gape>beginning&&shut<gape,
  'Red octopus should briefly gape and then close using existing frames');
 h.travelDuration=1.2;
 h.elapsed=.02;
 const pivotA=game.mouthRigStep(h,71.02,{x:weak.x,y:weak.y});
 assert.equal(pivotA.pivotX,weak.x);
 assert.equal(pivotA.pivotY,weak.y);
 h.elapsed=.42;
 const pivotB=game.mouthRigStep(h,71.42,{x:weak.x-190,y:weak.y-116});
 assert.ok(Math.abs(pivotB.angle)>0.04,
  'Fish body must visibly rotate away from horizontal as the lure is reeled');
 assert.ok(Math.abs(pivotB.angle)<=2.15,
  'Physical fish swing must remain bounded under fast lure acceleration');
 // Mouth remains invariant under the entire fish rigid transform:
 // translate(anchor), rotate(body), translate(-mouthOffset).
 const cs=Math.cos(pivotB.angle),sn=Math.sin(pivotB.angle);
 const localX=pivotB.mouthX-pivotB.mouthX,localY=pivotB.mouthY-pivotB.mouthY;
 assert.ok(Math.abs(pivotB.pivotX+(localX*cs-localY*sn)-pivotB.pivotX)<1e-7,
  'Swing rotation must preserve the bait-to-mouth anchor exactly');
 assert.ok(game.mouthRigDraw(h,71.42),
  'Mouth-rig draw must use the original fish bitmap in the normal hook layer');
 h.elapsed=.80;
 const pivotC=game.mouthRigStep(h,71.80,{x:weak.x-220,y:weak.y-220});
 assert.ok(Number.isFinite(pivotC.angle)&&Math.abs(pivotC.angle-pivotB.angle)<2,
  'Reel movement must integrate angular spring instead of snapping to a fixed pose');
 game.setFish([]);game.setHook(null);game.getSave().fever.ready=false;
 game.setTime(72.9);
 game.releaseNow();
 assert.ok(!game.getHook(),'Empty-water release should not hook a fish');
 assert.equal(game.getRedLurePulseAt(),72.9,
  'Even a missed release should briefly open the bait mouth');
 game.getSave().fever.ready=previousFever;
 game.getSave().gearEquipped.bait=previousBait;
 mock.window.HumanFishingArt=previousArt;
 assert.match(script,/ctx\.translate\(-joint\.mouthX,-joint\.mouthY\)/,
  'The fish must render around mouth coordinates, not its center');
 assert.match(script,/drawFishStripWarp\(ctx,image,w,hgt/,
  'Hooked fish should deform its existing bitmap without replacing art');
}
console.log('PASS: bait quick-mouth snap and mouth-pivot fish pendulum follows lure inertia');
console.log('PASS: rare Fever targets visibly reel up, evade at mouth, return alive; giant fish weak spots and bait are smaller');
// Every codex species gets its own original tightly-cropped alpha PNG
// maximized in a landscape card. Uncaught fish must be a SOLID BLACK
// alpha-preserving silhouette, never an icon, label or blurred substitute.
{
 assert.match(html,/#panelBody \.book-cards\{[\s\S]*?grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/,
  'The codex should display wide four-column picture-first cards');
 assert.match(html,/#panelBody \.book-cards \.card\{[\s\S]*?aspect-ratio:1\.78\/1/,
  'Each codex card must have a landscape footprint');
 assert.match(html,/#panelBody \.book-fish-thumb img\{[\s\S]*?object-fit:contain/,
  'Fish illustrations must fill the available thumbnail area without cropping');
 assert.match(html,/#panelBody \.book-cards \.book-fish-card\.locked \.book-fish-thumb img\{\s*filter:brightness\(0\) drop-shadow/,
  'Locked species must display a clean black silhouette preserving PNG transparency');
 assert.match(html,/#panelBody \.book-fish-caption\{[\s\S]*?white-space:nowrap/,
  'Species name and detail must share one unwrapped line beneath the image');
 game.renderCodex(-1,'');
 const markup=element('panelBody').innerHTML;
 const thumbs=[...markup.matchAll(/<img src="\.\/assets\/fish\/individual\/(F\d{3})\.png\?v=20261109-codexfix"[^>]+>/g)];
 assert.equal(thumbs.length,game.species.length,
  'Every species, including the 64 variants, must have an actual codex PNG thumbnail');
 // This VM loads only the inline base catalog (240). At runtime the
 // external fish-bitmap-catalog.js extends it by 64 before the codex opens.
 // Verify both the visible base entries and all 304 referenced files.
 assert.ok(thumbs.length>=240,'The base catalog must show all 240 fish thumbnails');
 const manifest=fs.readFileSync('human-fishing/fish-bitmap-catalog.js','utf8');
 assert.match(manifest,/variantCount:64/,'The external original-art catalog must contain 64 named variants');
 for(let number=1;number<=304;number++){
  const id='F'+String(number).padStart(3,'0');
  assert.ok(fs.existsSync('human-fishing/assets/fish/individual/'+id+'.png'),
   'Original PNG missing for codex fish '+id);
 }
 for(const [,id] of thumbs){
  assert.ok(fs.existsSync('human-fishing/assets/fish/individual/'+id+'.png'),
   'Fish codex thumbnail must resolve to an existing original raster '+id);
 }
 assert.doesNotMatch(markup,/loading="lazy"/,
  'All codex thumbnails must load before scene reveal');
 assert.doesNotMatch(markup,/class="face">🐟|class="face">◈/,
  'Fish thumbnail cards must not use emoji or vector placeholders');
 assert.match(markup,/class="card book-fish-card locked"/,
  'Fish not yet acquired must remain visible as silhouetted artwork');
 const target=game.species[0],owned=game.getSave().owned,prior=owned[target.id];
 owned[target.id]=2;
 game.renderCodex(-1,'');
 const obtained=element('panelBody').innerHTML;
 const captureCard=obtained.match(new RegExp('<div class="card book-fish-card ([^"]*)" data-name="'+target.name+'"'));
 assert.ok(captureCard&&!captureCard[1].includes('locked'),
  'Acquired fish must show their original full-color bitmap without black filter');
 assert.match(obtained,/×2/,'Acquired count should be in the single-line caption');
 if(prior===undefined)delete owned[target.id];else owned[target.id]=prior;
 game.renderCodex(0,'');
 const habitatHtml=element('panelBody').innerHTML;
 const expected=game.species.filter(z=>z.habitat===0).length;
 assert.equal((habitatHtml.match(/class="book-fish-thumb"/g)||[]).length,expected,
  'Habitat filtering must still work with picture-first cards');
 // Verify real locked/unlocked behavior independently of the active test preview.
 game.setHumanTestUnlock(false);
 game.renderCodex(-2,'');
 const humanHtml=element('panelBody').innerHTML;
 assert.ok(humanHtml.includes('book-human-card'),
  'The human collection must remain available and use landscape cards');
 // Human cards now use the approved swimming baby bitmap, in the same
 // thumbnail container as fish; exclude fish CARD records, not shared styles.
 assert.ok(!humanHtml.includes('book-fish-card'),
  'The human-only filter must exclude fish species cards');
 assert.match(humanHtml,/class="book-fish-thumb book-human-thumb"/,
  'Human codex entries should use the approved bitmap thumbnail container');
 assert.match(humanHtml,/class="human-codex-canvas" width="362" height="360" data-human-owned="0"/,
  'Unobtained human must use an alpha-preserving silhouette canvas');
 const humanOwned=game.getSave().human,priorHuman=humanOwned['0'];
 humanOwned['0']=1;
 game.renderCodex(-2,'');
 assert.match(element('panelBody').innerHTML,/class="human-codex-canvas" width="362" height="360" data-human-owned="1"/,
  'Obtained human must show original color artwork');
 if(priorHuman===undefined)delete humanOwned['0'];else humanOwned['0']=priorHuman;
 game.setHumanTestUnlock(true);
 game.renderCodex(-2,'');
 const previewHtml=element('panelBody').innerHTML;
 assert.equal((previewHtml.match(/data-human-owned="1"/g)||[]).length,33,
  'Test preview must show all 33 active original humans as acquired');
}
console.log('PASS: codex displays 304 original high-res fish PNGs in landscape cards, black silhouettes for unowned and one-line captions');
// Difficulty is driven by true movement decisions, not by a label or
// reduced capture probability alone. Rarity increases speed, turning,
// unsynchronized dashes and awareness of the player's approaching lure.
{
 const tiers=['COMMON','UNCOMMON','RARE','EPIC','LEGEND','MYTHIC'];
 const specs=tiers.map(tier=>game.species.find(sp=>sp.rarity===tier));
 assert.ok(specs.every(Boolean),'Movement tiers must have real fish species');
 const ai=specs.map(game.rarityMovement);
 for(let i=1;i<tiers.length;i++){
  assert.ok(ai[i].cruise>ai[i-1].cruise,
   'Cruise speed must strictly increase with rarity '+tiers[i]);
  assert.ok(ai[i].steer>ai[i-1].steer,
   'Rarer fish must steer more responsively '+tiers[i]);
  assert.ok(ai[i].turnMax<ai[i-1].turnMax,
   'Rarer fish must change directions more frequently '+tiers[i]);
  assert.ok(ai[i].dashMax<ai[i-1].dashMax,
   'Rarer fish must schedule more frequent bursts '+tiers[i]);
  assert.ok(ai[i].dashPower>ai[i-1].dashPower,
   'Rarer fish must have stronger dart accelerations '+tiers[i]);
 }
 assert.equal(ai[0].lureSense,0,'COMMON should not proactively dodge the bait');
 assert.ok(ai[5].lureSense>ai[2].lureSense+60,
  'MYTHIC must perceive an approaching bait substantially farther away');
 assert.ok(ai[5].cap>ai[0].cap*2,
  'Rarity-specific actual speed clamp must support fast rare sprints');
 const initialCast=game.getCast().active,initialBait={...game.getBob()};
 game.setHook(null);game.switchView('fish');game.getCast().active=true;
 const eco=game.getEco(),priorMath=mock.Math;
 mock.Math=Object.assign(Object.create(Math),{random(){return .999;}});
 const measured=[];
 for(let i=0;i<tiers.length;i++){
  const f=game.makeFish(specs[i],700,470,1,false,0);
  f.speed=22;f.agility=1;f.vx=22;f.vy=0;f.dir=1;
  f.swimMode='cruise';f.swimFreq=0;f.swimAmp=0;f.phase=0;
  f.nextDart=eco.t+100;f.nextTurn=eco.t+100;
  f.panicUntil=0;f.fightUntil=0;f.hunter=false;
  f.homeY=f.y;f.dartUntil=0;f.dartPrepUntil=0;
  game.setFish([f]);eco.fishTimer=0;eco.humanTimer=0;
  for(let step=0;step<12;step++)game.ecoTick(.04);
  measured.push(Math.abs(f.vx));
  assert.ok(f.x>700,'Swimming fish should continue moving toward its chosen direction');
  assert.notEqual(f.behavior,'flee','Routine rare movement must not trigger catch-disabled panic');
 }
 assert.ok(measured[5]>measured[0]*1.75,
  'MYTHIC fish must actually traverse substantially faster than COMMON');
 assert.ok(measured[3]>measured[1]*1.35,
  'EPIC fish must be noticeably harder to track than UNCOMMON');
 // Lure awareness: 65 px away is outside the previous incidental spook
 // threshold (44px) but well inside MYTHIC sensory distance.
 const mythic=game.makeFish(specs[5],710,475,1,false,0);
 mythic.speed=22;mythic.agility=1;mythic.vx=22;mythic.hunter=false;
 mythic.swimMode='cruise';mythic.swimFreq=0;mythic.swimAmp=0;
 mythic.nextDart=eco.t+100;mythic.nextTurn=eco.t+100;
 mythic.dartUntil=0;mythic.dartPrepUntil=0;mythic.panicUntil=0;
 game.setFish([mythic]);eco.fishTimer=0;eco.humanTimer=0;
 game.getCast().active=false;
 const bait=game.getBob();bait.x=775;bait.y=475;
 for(let n=0;n<8;n++)game.ecoTick(.04);
 assert.equal(mythic.behavior,'evade',
  'MYTHIC fish should actively move away from bait before it touches them');
 assert.ok(mythic.vx<0,'Approaching the mouth of a MYTHIC fish should cause active reversal');
 assert.equal(game.isFishFleeing(mythic),false,
  'Evasion must not remove mouth hit zone: skillful players can still catch it');
 // With the same lure placement, a COMMON fish should remain predictable.
 const normal=game.makeFish(specs[0],710,475,1,false,0);
 normal.speed=22;normal.agility=1;normal.vx=22;normal.hunter=false;
 normal.swimMode='cruise';normal.swimFreq=0;normal.swimAmp=0;
 normal.nextDart=eco.t+100;normal.nextTurn=eco.t+100;
 game.setFish([normal]);eco.fishTimer=0;eco.humanTimer=0;
 for(let n=0;n<8;n++)game.ecoTick(.04);
 assert.ok(normal.vx>0&&normal.behavior!=='evade',
  'COMMON fish must not use high-rarity lure-dodging AI');
 // High-rarity fish should hesitate briefly then rocket away, without
 // becoming automatically uncapturable or using body-miss flee flags.
 game.setFish([mythic]);eco.fishTimer=0;eco.humanTimer=0;
 game.getCast().active=true;mythic.x=690;mythic.y=470;
 mythic.dir=1;mythic.vx=22;mythic.nextTurn=eco.t+100;
 mythic.nextDart=eco.t-.1;mythic.dartUntil=0;mythic.dartPrepUntil=0;
 game.ecoTick(.025);
 assert.equal(mythic.behavior,'feint',
  'Mythic fish must briefly pause to telegraph its quick burst');
 for(let n=0;n<8;n++)game.ecoTick(.04);
 assert.equal(mythic.behavior,'dart','Mythic fish must begin a powerful dart');
 assert.ok(Math.abs(mythic.vx)>100,
  'High-rarity dart must accelerate to a genuinely hard-to-track speed');
 assert.ok(mythic._hfWarpBoost>1.15,
  'Fast rarity dashes must visibly quicken the original fish PNG tail animation');
 assert.ok(Math.abs(normal._hfWarpBoost-1)<.06,
  'Common fish must retain the original calm bitmap swimming motion');
 assert.ok(Math.abs(mythic.vx)<=ai[5].cap+.01,
  'Rarity dash must still obey controlled simulation limits');
 assert.equal(game.isFishFleeing(mythic),false,
  'An ordinary high-rarity dart must not incorrectly hide the catch weak point');
 assert.match(script,/state='evade'/,'Passive rare lure avoidance must be enabled');
 assert.match(script,/state='feint'/,'Rare fish should be able to feint');
 assert.match(script,/state='dart'/,'Rare fish should execute fast bursts');
 mock.Math=priorMath;game.getCast().active=initialCast;
 bait.x=initialBait.x;bait.y=initialBait.y;
}
console.log('PASS: rare fish have independent cruise/turn/dart/feint/dodge AI and remain catchable while evading');
console.log('PASS: Blue Tang now uses individual F123.png only; animated player disabled');

console.log('PASS: aquarium fish touch-to-turn, independent swimmers and random wriggle timelines');

console.log('PASS: localized fish and octopus shake, gentle contact, bite, suction, escape, human counterattack and limited camera vibration; all previous gameplay tests');




{
 // All ten actual fishing hook baits use the same atlas eyelet position.
 // An old 6-item save still resolves its equipped IDs and upgrades.
 const ids=['worm','shrimp','tentacle','cheese','spoon','drumstick',
  'catdoll','coral','star','void'];
 assert.equal(game.shopModels.bait.map(item=>item[0]).join(','),ids.join(','),
  'Bait shop must offer exactly 10 named hook-pierced gear models');
 const saved=game.getSave(),before=saved.gearEquipped.bait;
 const traits=['none','commonCatch','fleeDamping','gentleAttract','rareEncounter',
  'largeCatch','humanEncounter','rareCatch','pearlBonus','feverCharge'];
 let previousRadius=Infinity,previousSwing=Infinity;
 for(let i=0;i<ids.length;i++){
  const id=ids[i],gear={id,tier:i},
   stats=game.getBaitSwing(gear,0),trait=game.getBaitTrait(gear,0);
  assert.equal(trait.type,traits[i],id+' skill must have its own live behavior');
  assert.ok(stats.contactRadius<previousRadius,id+' must have a smaller capture region than lower tier');
  assert.ok(stats.angle<previousSwing,id+' must swing LESS than lower tier');
  assert.ok(stats.contactRadius<=5.8&&stats.contactRadius>=2.9,'Hit circle must fit bait bitmap');
  previousRadius=stats.contactRadius;previousSwing=stats.angle;
 }
 const hi={id:'void',tier:9};
 assert.ok(game.getBaitSwing(hi,10).angle<game.getBaitSwing(hi,0).angle,
  'Leveling steadies the hook on top of its tier improvement');
 assert.ok(game.getBaitSwing(hi,10).contactRadius<game.getBaitSwing(hi,0).contactRadius,
  'Leveling tightens the real fishing weakspot accuracy requirement');
 assert.equal(game.getOctoStats(0,0).radius,100,
  'Baby FEVER octopus must start at 100px radius');
 assert.ok(game.getOctoStats(5,0).radius>=300,
  'King FEVER octopus must have distinctly larger AOE than the baby');
 assert.match(script,/var center=\{x:bob\.x,y:bob\.y\};/,
  'Fever AOE center stays fixed to the red octopus, NOT the dangling hook bait');
 saved.gearEquipped.bait=before;
}
console.log('PASS: 10 unique hooked bait models, preserved legacy IDs, shrinking precision, upgradeable stability and octopus-centered Fever');

{
 game.switchView('fish');game.getRecovery().active=false;
 game.getCast().active=false;game.setHook(null);
 game.setFish([]);game.setHum([]);game.getSave().fever.ready=false;
 const ys=[];const previousRandom=game.swapRandom(()=>0);
 for(const random of [0,.5,.999]){
  game.swapRandom(()=>random);
  game.setTime(200+ys.length);game.getBob().x=100;game.getBob().y=500;
  game.releaseNow();const recovery=game.getRecovery();
  assert.equal(recovery.kind,'miss_return');assert.ok(recovery.active);
  ys.push(recovery.toY);
  game.setTime(recovery.start+.41);game.updateRecovery(.41);
  assert.equal(game.getBob().x,640);assert.equal(game.getBob().y,recovery.toY);
  assert.ok(!recovery.active);
 }
 game.swapRandom(previousRandom);
 assert.ok(ys[0]<ys[1]&&ys[1]<ys[2],'Each miss must resample the return depth');
}
console.log('PASS: missed releases return centrally within 0.4s at randomized safe depths; duplicate inputs blocked and next release enabled');

{
 const s=game.getSave(),oldBait=s.gearEquipped.bait;
 const hang=game.getLureHang(),oldAngle=hang.angle;
 game.switchView('fish');game.setHook(null);game.getRecovery().active=false;
 s.fever.ready=false;s.gearEquipped.bait='worm';
 const b=game.getBob();b.x=640;b.y=430;
 assert.ok(game.getBaitSwing({id:'worm',tier:0},0).angle>=.5,
  'Starter bait must swing significantly more than the old .28 radians');
 for(const a of [-.6,0,.6]){
  hang.angle=a;const pt=game.getBaitTip(0),depth=game.getJointDepth();
  assert.ok(depth>15&&depth<35,'Head pivot must be above the octopus center');
  assert.ok(Math.abs(pt.jointX-(b.x-Math.sin(a)*depth))<1e-8);
  assert.ok(Math.abs(pt.jointY-(b.y-depth+Math.cos(a)*depth))<1e-8);
  // Canvas rotation of the painted bait center (local 1.46, 41).
  assert.ok(Math.abs(pt.x-(pt.jointX+1.46*Math.cos(pt.angle)-41*Math.sin(pt.angle)))<1e-8);
  assert.ok(Math.abs(pt.y-(pt.jointY+1.46*Math.sin(pt.angle)+41*Math.cos(pt.angle)))<1e-8);
 }
 hang.angle=oldAngle;s.gearEquipped.bait=oldBait;
}
console.log('PASS: hanging bait follows rotated lower-center legs beneath hidden head pivot');
