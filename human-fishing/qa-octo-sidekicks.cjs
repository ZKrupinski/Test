/* Character-action regression test: no live images/network needed. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('human-fishing/assets/octopus/octopus-sidekicks.js','utf8');
const root={};
class FakeImage{
 constructor(){this.ready=false;this.packed=null;this.naturalWidth=640;this.naturalHeight=640}
 set src(x){this._src=x}
 get src(){return this._src}
}
vm.runInNewContext(source,{window:root,Image:FakeImage,console,Math,Number},{filename:'octopus-sidekicks.js'});
assert.equal(typeof root.drawOctopusSidekicks,'function');
assert.equal(typeof root.octoSidekicksObserve,'function');
assert.equal(typeof root.octoSidekicksSignal,'function');
const ctx={drawImage(){},save(){},restore(){},translate(){},rotate(){},scale(){}};
function step(t,state){if(state)root.octoSidekicksObserve(state,t);root.drawOctopusSidekicks(ctx,t);return root.octoSidekicksInfo()}
const states={view:'fish',lure:false,near:false,hook:false,fever:false,casting:false};
let s=step(0,states);
assert.equal(s.length,1,'Purple cheerleader removed, only the red companion stays');
assert.equal(s[0].name,'빨간 문어');
assert.equal(s[0].state,'idle');
assert.equal(s[0].x,210);
assert.ok(!source.includes("name:'보라 문어'"),'Purple companion must not be instantiated');
assert.ok(!source.includes("purple[name]=load("),'Do not preload retired purple companion sheets');
s=step(2,{...states,casting:true});assert.equal(s[0].state,'cast');
s=step(4,{...states,hook:true});assert.equal(s[0].state,'bite');
root.octoSidekicksCatch(6,{rare:true});
s=step(7);assert.equal(s[0].state,'catch');
assert.ok(['gorge','eat','snack','chew','open','victory'].includes(s[0].action));
root.octoSidekicksFail(11);s=step(11.8);assert.equal(s[0].state,'fail');
s=step(15,{...states,fever:true});assert.equal(s[0].state,'fever');
assert.equal(s[0].action,'swim');
step(19,{...states,fever:false});
const passiveActions=new Set();
for(let t=22;t<110;t+=.27){
 s=step(t,states);
 for(const f of s)if(f.state==='idle')passiveActions.add(f.action);
}
assert.ok(passiveActions.has('idle'));
assert.ok(passiveActions.has('bait'));
assert.ok(passiveActions.has('idle_alt'));
assert.equal(passiveActions.has('swim'),false);
root.octoSidekicksSignal('entrance',120);
const introFriends=step(120.2,states);
assert.equal(introFriends.length,1,'Only one red companion can join the intro');
assert.equal(introFriends[0].state,'entrance','Red companion must travel with the hero');
assert.equal(introFriends[0].action,'swim','Red companion uses its original swim row');
assert.equal(step(122.5,states)[0].state,'idle','Companions must return to idle after entrance');
const files=['purple_idle_v2.webp','purple_excited.webp','purple_toss.webp','purple_gorge.webp',
 'purple_snack.webp','purple_victory.webp','purple_fail_v2.webp','purple_swim.webp'];
const player=fs.readFileSync('human-fishing/index.html','utf8');
for(const name of files){
 assert.ok(player.includes(name),'Missing 16-frame PLAYER asset: '+name);
 assert.ok(!source.includes(name),'New player artwork leaked into original companion: '+name);
}
assert.ok(player.includes('playerOctoPose(now)'));
assert.ok(player.includes("idle_alt:'purple_idle_v2.webp'"),'Main octopus must preserve user-approved original Idle artwork');
const cur=player.match(/var playerIdleGazeFrames=\[([^\]]+)\]/);
assert.ok(cur,'Aligned gaze frame loop must be explicitly curated');
const allowed=new Set([0,3,4,6,9,10,11,12]);
const curated=cur[1].split(',').map(Number);
assert.equal(curated.length,16,'The curated Idle must still play sixteen frames');
assert.ok(curated.every(f=>allowed.has(f)),'Curated Idle should never play a divergent-pupil frame');
assert.ok(player.includes("if(action==='idle_alt')frame=playerIdleGazeFrames"),
 'Only the baseline Idle should remap frame indices; other actions stay original');
assert.ok(player.includes("action:'mouth_open'"),'New mouth-opening sequence must play on catch approach');
const idleMix=player.slice(player.indexOf('function nextPlayerOctoIdle(){'),player.indexOf('function playerOctoPose(now){'));
for(const action of ['old_mouth_idle','excited']){
 assert.ok(idleMix.includes("'"+action+"'"),'Missing regular/occasional fishing idle action: '+action);
}
const idleChoices=idleMix.match(/var choices=\[([^\]]+)\]/)?.[1]||'';
assert.doesNotMatch(idleChoices,/['"]fail_alt['"]/,
 'Disappointed expression must never appear in normal idle');
assert.ok(player.includes('purple_idle_lookdown_16f.webp'),
 'Original default idle needs the freshly painted cute downward-eye sprite');
assert.ok(player.includes('purple_bait_sinking_16f.webp'),
 'The earlier bowed-head artwork must be reserved for sinking bait');
assert.match(player,/gazeCol\*400,gazeRow\*440,400,440/,
 'The new independent 400x440 bitmap cells must not bleed into neighbors');
assert.doesNotMatch(idleChoices,/['"](?:gorge|snack)['"]/,
 'Main character bucket-eating idle animations must be aquarium-only');
assert.ok(player.includes("function aquariumKeeperPose(now){")&&
 player.includes("drawOcto(now,aquariumKeeperPose(now))"),
 'Both user-approved barrel/fish idle poses must appear in the aquarium');
assert.ok(player.includes("old_mouth_idle:'./assets/octopus/player/mouth_open_original_style.webp"),
 'Previous mouth opening is required as an idle-only emote');
assert.doesNotMatch(idleMix.match(/var choices=\[[^\]]+\]/)?.[0]||'',/['"]swim['"]/,
 'Protagonist special Idle cannot include the swimming intro');
assert.ok(idleMix.includes('playerOctoIdleWait')&&idleMix.includes('Math.random()'),
 'Regular calm idle must separate occasional emotional reactions');
assert.ok(!idleMix.includes('playerOctoIdleBag.pop()'),
 'A forced parade of all idle animations must never run');
assert.ok(player.includes("PLAYER_ANIM_RATE=.91"),'Main octopus animation needs slightly slower playback');
assert.ok(player.includes('var opening=clamp((ascent-.045)/.58'),'Main octopus should begin opening before the catch reaches the surface');
assert.ok(player.includes("fishAction==='hooked'"),'Hooked fish should have continuous flailing frames');
assert.ok(player.includes("action:'swallow_success'")||player.includes("startPlayerOctoReaction('swallow_success')"),'New success animation must be triggered');
assert.ok(player.includes("startPlayerOctoReaction('swallow_failure')"),'New failure animation must be triggered');
console.log('PASS: purple cheering companion removed, red cheerleader retained, all approved purple PLAYER art unchanged');
