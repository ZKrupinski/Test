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
assert.equal(s.length,2);
assert.equal(s[0].state,'idle');
assert.equal(s[0].x,112);
assert.equal(s[1].footY,undefined); // foot is applied internally to both sprites
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
const files=['purple_idle_v2.webp','purple_excited.webp','purple_toss.webp','purple_gorge.webp',
 'purple_snack.webp','purple_victory.webp','purple_fail_v2.webp','purple_swim.webp'];
const player=fs.readFileSync('human-fishing/index.html','utf8');
for(const name of files){
 assert.ok(player.includes(name),'Missing 16-frame PLAYER asset: '+name);
 assert.ok(!source.includes(name),'New player artwork leaked into original companion: '+name);
}
assert.ok(player.includes('playerOctoPose(now)'));
assert.ok(player.includes("action:'mouth_open'"),'New mouth-opening sequence must play on catch approach');
const idleMix=player.slice(player.indexOf('function nextPlayerOctoIdle(){'),player.indexOf('function playerOctoPose(now){'));
for(const action of ['old_mouth_idle','gorge','snack','fail_alt','excited','swim']){
 assert.ok(idleMix.includes("'"+action+"'"),'Missing situational/occasional idle action: '+action);
}
assert.ok(player.includes("old_mouth_idle:'./assets/octopus/player/mouth_open_original_style.webp"),
 'Previous mouth opening is required as an idle-only emote');
assert.ok(idleMix.includes('playerOctoIdleWait')&&idleMix.includes('Math.random()'),
 'Regular calm idle must separate occasional emotional reactions');
assert.ok(!idleMix.includes('playerOctoIdleBag.pop()'),
 'A forced parade of all idle animations must never run');
assert.ok(player.includes("PLAYER_ANIM_RATE=.91"),'Main octopus animation needs slightly slower playback');
assert.ok(player.includes('var opening=clamp((ascent-.045)/.58'),'Main octopus should begin opening before the catch reaches the surface');
assert.ok(player.includes("fishAction==='hooked'"),'Hooked fish should have continuous flailing frames');
assert.ok(player.includes("action:'swallow_success'")||player.includes("startPlayerOctoReaction('swallow_success')"),'New success animation must be triggered');
assert.ok(player.includes("startPlayerOctoReaction('swallow_failure')"),'New failure animation must be triggered');
console.log('PASS: original red/purple companion atlases restored, player uses eight untouched final 16-frame sheets');
