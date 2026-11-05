'use strict';
// Direct behavioral QA for the *main* character's octopus animation director.
// Extracts only its pure pose selectors and runs them in deterministic JS VM.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('human-fishing/index.html','utf8');
const a=src.indexOf("var playerOctoLastIdle='idle_alt'");
const b=src.indexOf('function drawOcto(now,poseOverride){',a);
assert.ok(a>=0&&b>a,'Player pose director not found');
let seed=41;
const fakeMath=Object.create(Math);
fakeMath.random=function(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const env={
 Math:fakeMath,view:'fish',time:0,hook:null,feverFx:null,octoGroggy:0,
 catchFx:null,cast:{active:false,elapsed:0},joystick:{active:false,engaged:false},
 introEntrance:{active:false,elapsed:0,duration:1.75,offset:0},
 playerOctoReaction:null,playerOctoIdleState:null,save:{up:[0]},
 gearPower:()=>0,clamp:(v,min,max)=>Math.max(min,Math.min(max,v))
};
vm.createContext(env);
vm.runInContext(src.slice(a,b),env,{filename:'player-pose-director.js'});
function pose(t){env.time=t;return env.playerOctoPose(t)}
assert.equal(env.PLAYER_ANIM_RATE,.91,'Rate change must be subtle');
assert.equal(pose(0).action,'idle_alt','Idle must start as the default pose');
assert.equal(pose(3).action,'idle_alt','Do not continuously cycle poses by default');
let durationByPhase=0,nonIdleFrames=0,last='idle_alt',previousNonIdle=null;
for(let i=0;i<3500;i++){
 let t=i*.08;
 const p=pose(t);
 if(p.action!=='idle_alt')nonIdleFrames++;
 if(last==='idle_alt'&&p.action!=='idle_alt'){
  if(previousNonIdle)assert.notEqual(p.action,previousNonIdle,'Duplicate emote twice in a row');
  previousNonIdle=p.action;
 }
 if(last!=='idle_alt'&&p.action!=='idle_alt'&&last!==p.action)
  throw Error('Adjacent emote actions must be separated by Idle');
 last=p.action;
}
assert.ok(nonIdleFrames>110,'Occasional expressions must still appear');
assert.ok(nonIdleFrames<1100,'Idle should occupy a majority of ordinary time');
assert.doesNotMatch(src.match(/var choices=\[[^\]]+\]/)?.[0]||'',/['"]swim['"]/,
 'Swimming sheet is reserved exclusively for the entrance');
env.cast={active:true,elapsed:.70};
assert.equal(pose(300).action,'excited',
 'Fishing cast must use clean protagonist artwork without the painted extra rod or fish bucket');
assert.match(src,/if\(view!=='tank'&&\(pose\.action==='toss'\|\|pose\.action==='gorge'\|\|pose\.action==='snack'\)\)/,
 'Final protagonist renderer must block the barrel and duplicate-rod sprites outside aquarium');
assert.match(src,/var action=cycle<2\.6\?'toss':cycle<5\.2\?'gorge':cycle<7\.8\?'snack':'idle_alt'/,
 'The original painted rod and bucket animations must remain playable in aquarium');
env.cast={active:true,elapsed:2.32,duration:3.25,landing:true};
const sinking=pose(300.1);
assert.equal(sinking.action,'bait_sinking',
 'New bowed-head sprite must appear ONLY while the lure is actually sinking underwater');
assert.ok(sinking.frame>0&&sinking.frame<16,'Water sinking uses the full painted 16-frame sequence');
assert.match(src,/var choices=\['old_mouth_idle','excited'\]/,
 'Disappointment and scared face must be excluded from passive idle pool');
env.cast={active:false,elapsed:0};
env.joystick={active:true,engaged:true};
assert.equal(pose(301).action,'excited','Moving the bait should alert the protagonist, not replay swim');
env.joystick={active:false,engaged:false};
env.playerOctoCue('excited',.9);
assert.equal(pose(301).action,'excited','Bait brush/touch must trigger an excited reaction');
assert.equal(pose(302).action,'idle_alt','A brief input reaction must return to calm idle');
env.hook={kind:'fish',obj:{sp:{},x:100},elapsed:.05,travelDuration:1.0,willEscape:false};
assert.equal(pose(303).action,'mouth_open','Reeling needs the approved new mouth sprite');
env.hook.elapsed=.76;
assert.equal(pose(303).frame,15,'Main mouth must be fully open early on ascent');
env.hook=null;
env.feverFx={caught:[{sp:{}}],elapsed:.75};
assert.equal(pose(304).action,'idle_alt','Only underwater bait opens during Fever suction; player remains idle');
env.feverFx=null;
env.playerOctoReaction={type:'swallow_success',start:305,duration:.86};
assert.equal(pose(305).action,'swallow_success','The successful catch must override idle');
env.playerOctoReaction={type:'swallow_failure',start:307,duration:1.16};
assert.equal(pose(307).action,'swallow_failure','The escaped fish must override idle');
assert.match(src,/playerOctoCue\('excited',\.9\/PLAYER_ANIM_RATE\)/,
 'Bait brush must signal the protagonist');
assert.match(src,/old_mouth_idle:'\.\/assets\/octopus\/player\/mouth_open_original_style\.webp/,
 'Old open-mouth sprite must remain loaded for passive emotes');
env.playerOctoReaction=null;env.introEntrance={active:true,elapsed:.7,duration:1.75};
assert.equal(pose(310).action,'swim','The hero swims only during the first entrance');
env.introEntrance.active=false;
assert.match(src,/if\(introEntrance\.active\)\{/,'Entrance state must override idle');
assert.match(src,/function advanceIntroEntrance\(dt\)/,'Entrance progression is required');
assert.match(src,/if\(introEntrance\.active\)return;/,'First cast must wait for the entrance');
console.log('PASS: normal idle dominates; occasional non-consecutive original emotes; cast, joystick, brush, reel, fever, success, failure and 9% slower playback');

