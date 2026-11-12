/* Capture difficulty regression: equipment progression, rarity, timing and weakspot sizes. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const game=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert(game,'Fishing gameplay inline script is missing');
new vm.Script(game,{filename:'human-fishing-game.js'});
function section(start,end){
 const from=game.indexOf(start),to=game.indexOf(end,from+start.length);
 assert(from>=0&&to>from,'Cannot isolate '+start);
 return game.slice(from,to);
}
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const power={rod:0,bait:0,net:0,octopus:0,helper:0};
function isBossHumanId(id){return Number(id)>=20&&Number(id)<24}
const sandbox={
 Math,clamp,isBossHumanId,
 gearPower:cat=>power[cat],
 baitTrait:()=>({type:'none',power:0}),
 fishVisualProfile:()=>({category:'SMALL'}),
 selectedGear:()=>({id:'qa-octo',tier:5}),
 gearLevel:()=>10,
 octoStats:()=>({bonus:.27})
};
vm.createContext(sandbox);
vm.runInContext(section('function catchProbability(target,isHuman,fever){',
 '// Raster-only rarity FX'),sandbox);
const tiers=['COMMON','UNCOMMON','RARE','EPIC','LEGEND','MYTHIC'];
const sample={};
for(const strength of [0,10,24]){
 for(const cat of Object.keys(power))power[cat]=strength;
 const catches=tiers.map(rarity=>sandbox.catchProbability({rarity,level:75},false,false));
 for(let i=1;i<catches.length;i++)
  assert(catches[i-1]>catches[i],'Rarity catch chance reversed at '+strength+': '+tiers[i]);
 for(const p of catches)assert(p>0&&p<=1,'Probability must be valid for gear '+strength);
 const elite=sandbox.catchProbability({id:10},true,false);
 const sister=sandbox.catchProbability({id:36},true,false);
 const boss=sandbox.catchProbability({id:22},true,false);
 assert(elite>sister&&sister>boss,'Human boss / sister / elite capture difficulty reversed');
 sample[strength]={catches,elite,sister,boss};
}
for(const tier of [0,1,2,3,4,5]){
 assert(sample[0].catches[tier]<sample[10].catches[tier],
  'Mid-tier equipment must improve every fish catch rate: '+tiers[tier]);
 assert(sample[10].catches[tier]<=sample[24].catches[tier],
  'Top-tier equipment must not reduce fish catch rate: '+tiers[tier]);
}
assert(sample[24].catches[5]>=.34,'Highest equipment still too weak for Mythic');
assert(sample[24].catches[4]>=.42,'Highest equipment still too weak for Legend');
assert(sample[24].boss>=.25,'Highest equipment still too weak for boss human');
assert(sample[24].sister>=.30,'Highest equipment still too weak for sister human');
assert(sample[0].boss<sample[10].boss&&sample[10].boss<sample[24].boss,
 'Human boss needs smooth equipment progression');
for(const strength of [10,24]){
 for(const cat of Object.keys(power))power[cat]=strength;
 const normal=sandbox.catchProbability({rarity:'MYTHIC',level:75},false,false);
 const fever=sandbox.catchProbability({rarity:'MYTHIC',level:75},false,true);
 assert(fever>=normal,'Fever must not reduce the chance of catching Mythic');
}
// Test hidden mouth targets for all six fish rarity bands.
const radiusExpr=game.match(/var FISH_MOUTH_RADIUS=(\{[^;]+\});/);
assert(radiusExpr,'Fish mouth radius table absent');
const radius=vm.runInNewContext('('+radiusExpr[1]+')');
for(let i=1;i<tiers.length;i++)
 assert(radius[tiers[i-1]]>radius[tiers[i]],
 'Harder fish must retain smaller hidden weakspots');
assert(radius.MYTHIC>=4.5&&radius.LEGEND>=5.8,
 'Top fish weakspots still excessively narrow');
assert.match(game,/sizeFactor=clamp\(Math\.sqrt\(60\/Math\.max\(18,h\)\),\.52,1\.30\)/,
 'Large fish cannot lose all the weakspot benefit');
// Premium bait must remain more stable without becoming unfairly narrow.
const baitState={clamp,selectedGear:()=>({tier:0,id:'qa'}),gearLevel:()=>0};
vm.createContext(baitState);
vm.runInContext(section('function baitSwingStats(gear,level){','function baitCenterRadius()'),baitState);
const beginner=baitState.baitSwingStats({tier:0,id:'qa'},0);
const premium=baitState.baitSwingStats({tier:5,id:'qa'},10);
assert(premium.contactRadius>=4.5&&premium.contactRadius<beginner.contactRadius,
 'Premium bait contact radius should be stable but not a severe handicap');
assert(premium.angle<beginner.angle,'Premium bait must retain sway benefit');
// Input-cue difficulty should remain ordered and allow good gear to help.
const cueState={Math,isBossHumanId,gearPower:cat=>power[cat]};
vm.createContext(cueState);
vm.runInContext(section('function captureWindowSeconds(a,kind){','function captureCueActive()'),cueState);
for(const cat of Object.keys(power))power[cat]=0;
const lowCue=tiers.map(rarity=>cueState.captureWindowSeconds({sp:{rarity}},'fish'));
for(const cat of Object.keys(power))power[cat]=24;
const highCue=tiers.map(rarity=>cueState.captureWindowSeconds({sp:{rarity}},'fish'));
for(let i=1;i<tiers.length;i++)assert(highCue[i-1]>highCue[i],
 'Higher rarity should have shorter cue window: '+tiers[i]);
assert(highCue[5]>.24&&highCue[5]<.32,'Mythic lock timing still impossible');
assert(highCue[5]>lowCue[5],'Best equipment should improve Mythic lock timing');
const bossCue=cueState.captureWindowSeconds({id:22},'human');
const eliteCue=cueState.captureWindowSeconds({id:10},'human');
assert(bossCue>.26&&bossCue<eliteCue,'Boss cue must remain hard but usable');
// Human weakspots grow slightly while the body-contact test stays independent.
const mouthState={
 isBossHumanId,
 humanPoseGeometry:a=>({mouth:{x:100,y:110,rx:isBossHumanId(a.id)?8:12,
  ry:isBossHumanId(a.id)?6:9,facing:1}})
};
vm.createContext(mouthState);
vm.runInContext(section('function humanMouthWeakspot(h,now){','function humanBodyContact(h,point){'),mouthState);
const bossMouth=mouthState.humanMouthWeakspot({id:22},0);
const eliteMouth=mouthState.humanMouthWeakspot({id:10},0);
assert(bossMouth.rx>8&&bossMouth.rx<eliteMouth.rx,
 'Boss human mouth needs improved but smaller-than-elite radius');
// High rarity still moves and evades faster than common fish.
const movState={};
vm.createContext(movState);
vm.runInContext(section('var FISH_RARITY_MOVEMENT=', 'function fishRarityMovement(sp){'),movState);
for(let i=1;i<tiers.length;i++){
 const easy=movState.FISH_RARITY_MOVEMENT[tiers[i-1]];
 const hard=movState.FISH_RARITY_MOVEMENT[tiers[i]];
 assert(easy.cap<hard.cap&&easy.cruise<hard.cruise,
  'Rarity movement speed progression reversed: '+tiers[i]);
 assert(easy.lureAvoid<hard.lureAvoid,
  'Rarity lure evasion progression reversed: '+tiers[i]);
}
assert.match(game,/!isBossHumanId\(h\.id\)&&!h\.feverCaptured/,
 'Boss humans must remain excluded from Fever AOE farming');
console.log('PASS: all fish rarity tiers and human classes are smoothly balanced at 0, 10 and 24 equipment power; weakspots, cues, movement and Fever remain ordered');
