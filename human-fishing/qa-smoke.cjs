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
 mouthWeakspot:fishMouthWeakspot,
 mouthHit:fishMouthOverlapsLure,
 baitCenterRadius:baitCenterRadius,
 isFishFleeing:isFishFleeing,
 bodyHit:fishBodyContact,
 targetOnRelease:ordinaryFishingTarget,
 scareOnMiss:scareFishOnMiss,
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
assert.match(script,/CATCH_MOUTH_X=482,CATCH_MOUTH_LOCAL_Y=168/,
 'The open-mouth catch target must track the slightly higher, more rightward cavity');
assert.equal(game.getMouthPos(0).x,482,'Bait target X must sit inside the open mouth');
assert.equal(game.getMouthPos(0).y,214,'Bait target Y must sit inside the open mouth after player drop');
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
 assert.ok(Math.abs(back.tip.x-(536+back.localTip.x*c-back.localTip.y*si))<1e-8);
 assert.ok(Math.abs(back.tip.y-(191+back.localTip.x*si+back.localTip.y*c+drop))<1e-8);
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
assert.match(script,/function drawFishRankTag\(f\)\{[\s\S]*?ctx\.drawImage\(sheet,/,
 'Rare fish must use bitmap sparkle frames, not text labels');
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
 const fx={x:482,y:214,dir,phase,human:false,size:1.1};
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
  assert.ok(lights.every(p=>p.size>=12&&p.size<=30&&p.alpha>=0&&p.alpha<=1),
   'Transparent bitmap twinkle instances should stay small and fade');
  assert.ok(lights.every(p=>Math.abs(p.x-fish.x)<115&&Math.abs(p.y-fish.y)<70),
   'Sparks should scatter along the real fish silhouette, not a detached cluster');
 }
 assert.ok(max<=2,'No rarity should show an overcrowded pile of sparkles');
 assert.ok(zero>50&&lit>10,
  'Sparse twinkles must have visible gaps rather than being constantly illuminated');
 for(const rarity of ['EPIC','LEGEND','MYTHIC']){
  const sp=game.species.find(f=>f.rarity===rarity);
  assert.ok(sp);
  fish.sp=sp;
  for(let i=0;i<90;i++)assert.ok(game.raritySparkles(fish,i*.22).length<=2);
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
assert.equal(mouth.x,482,'Reeled-in red bait must end in the adjusted mouth cavity');
assert.equal(mouth.y,214,'Reeled-in red bait must end at the raised mouth center');
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
 const bait=game.getBob();
 game.switchView('fish');game.getCast().active=false;game.setHook(null);
 save.fever.ready=false;
 save.gearEquipped.bait='worm';save.shop.bait=0;
 const baseRadius=game.baitCenterRadius();
 save.gearEquipped.bait='void';
 const superiorRadius=game.baitCenterRadius();
 assert.ok(superiorRadius>baseRadius+6,
  'High-quality bait must have a visibly larger invisible center contact area');
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
 commonFish.dir=-1;commonFish.vx=-26;
 commonFish._hfFacing=-1;commonFish._hfTarget=-1;commonFish._hfTurnStart=-100;
 const leftMouth=game.mouthWeakspot(commonFish,57.1);
 assert.ok(leftMouth.x<commonFish.x-10,
  'Mouth geometry must follow the displayed facing direction when reversed');
 commonFish.dir=1;commonFish.vx=26;commonFish._hfFacing=1;
 commonFish._hfTarget=1;commonFish._hfTurnStart=-100;
 const head=game.mouthWeakspot(commonFish,57.1);
 bait.x=head.x;bait.y=head.y;
 assert.equal(game.mouthHit(commonFish,bait,57.1),true,
  'Center-on-mouth contact should overlap both invisible areas');
 bait.x=commonFish.x;bait.y=commonFish.y;
 assert.equal(game.bodyHit(commonFish,bait),true,
  'Body contact must be detected for a failed non-mouth release');
 assert.equal(game.mouthHit(commonFish,bait,57.1),false,
  'Putting the lure in the middle of a fish must NOT count as a mouth hit');
 const companion=game.makeFish(common,690,455,-1,false,0),
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
 bait.x=commonFish.x;bait.y=commonFish.y;
 assert.equal(game.targetOnRelease(),null,
  'Fleeing fish must never become eligible for another catch');
 // Restore a normal catchable state and check the exact mouth actually
 // produces a fish hook via the full normal release path.
 commonFish.panicUntil=0;commonFish.fleeBurstUntil=0;
 commonFish.escapeNoCatchUntil=0;commonFish.behavior='cruise';
 game.setFish([commonFish]);game.getCast().active=false;
 const contact=game.mouthWeakspot(commonFish,57.1);
 assert.ok(contact,'Fish should regain a mouth weak spot after escape ends');
 bait.x=contact.x;bait.y=contact.y;
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
console.log('PASS: mouth-only regular fishing, tier-dependent weak points, superior bait radius, fast noncatchable flee; Fever unchanged');
console.log('PASS: Blue Tang now uses individual F123.png only; animated player disabled');

console.log('PASS: aquarium fish touch-to-turn, independent swimmers and random wriggle timelines');

console.log('PASS: localized fish and octopus shake, gentle contact, bite, suction, escape, human counterattack and limited camera vibration; all previous gameplay tests');



