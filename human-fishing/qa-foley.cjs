'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const path='human-fishing/';
const foley=fs.readFileSync(path+'foley.js','utf8');
const html=fs.readFileSync(path+'index.html','utf8');
assert.match(html,/<script src="\.\/foley\.js\?v=/,
 'Game must load natural Foley before its inline gameplay script');
assert.doesNotMatch(html,/createOscillator|OscillatorNode/,
 'Electronic oscillator beeps must be removed entirely');
assert.match(html,/function playFoley\(kind,intensity\)/);
assert.match(html,/vibrationPulse\(kind\)/);
assert.match(html,/playFoley\('feverSnap'\)/);
assert.match(html,/playFoley\('rodPump'/);
assert.match(html,/playFoley\('lureMove'/);
assert.match(html,/playFoley\('aquarium'/);
assert.match(html,/playFoley\('escapeSplash'/);
const entries=[...foley.matchAll(/^\s*\w+:\['([\w-]+\.ogg)','(https:\/\/raw\.githubusercontent\.com\/[^']+)'\],?$/gm)];
assert.equal(entries.length,29,'Expected 29 Foley field/physical clips');
for(const [,filename] of entries){
 const file=path+'assets/foley/'+filename;
 assert.ok(fs.existsSync(file),'Audio clip missing: '+file);
 const bytes=fs.readFileSync(file);
 assert.ok(bytes.length>2000&&bytes.subarray(0,4).toString('ascii')==='OggS',
   'Missing or invalid playable OGG: '+file);
}
const eventHandlers={},started=[],fetches=[];
let ac;
class MockContext {
 constructor(){this.currentTime=0;this.state='running';ac=this;}
 decodeAudioData(bytes){return Promise.resolve({length:bytes.byteLength});}
 createBufferSource(){return{playbackRate:{value:1},connect(){},
  start(t){started.push(t)}};}
 createGain(){return{gain:{value:0},connect(){}};}
 resume(){this.state='running';return Promise.resolve();}
}
const sandbox={window:{AudioContext:MockContext},Math,Number,Promise,
 fetch(url){fetches.push(url);return Promise.resolve({ok:true,
 arrayBuffer:()=>Promise.resolve(new Uint8Array(256).buffer)});},
 document:{addEventListener(type,callback){eventHandlers[type]=callback}},
 console};
vm.createContext(sandbox);
vm.runInContext(foley,sandbox,{filename:'foley.js'});
const bus=sandbox.window.HumanFishingFoley;
assert.ok(bus,'Foley runtime missing');
(async()=>{
 await bus.prime();
 assert.equal(bus.getState().sampleCount,29);
 assert.ok(bus.getState().cueCount>=34);
 assert.equal(bus.getState().loaded,29);
 const required=['cast','splash','lureGrab','lureMove','brush','weakspot','bite',
 'miss','panic','reel','rodPump','rodSnap','swallow','catch','feverReady','fever',
 'feverSnap','feverBubbles','fishFlail','escape','escapeSplash','counter',
 'groggy','menuOpen','menuClose','menuTap','menuNavigate','stage','upgrade',
 'purchase','equip','aquarium','aquariumPlace','aquariumRemove','helperIncome','error'];
 for(const event of required){
  assert.ok(bus.hasCue(event),'Missing action sound: '+event);
  ac.currentTime+=1.5;
  const before=started.length;
  assert.equal(bus.play(event),true);
  assert.ok(started.length>before,'Event not audible: '+event);
 }
 ac.currentTime+=1.5;
 assert.equal(bus.play('bite'),true);
 assert.equal(bus.play('bite'),false,'Fast retrigger should be debounced');
 assert.equal(bus.play('unknown_event'),false,'Unknown sounds must not generate audio');
 assert.equal(fetches.length,29,'Every audio source should be preloaded once');
 console.log('PASS: all 29 bundled CC0 OGG samples exist, 36 event cues decode, '+
  'each cue starts playable physical sound, rapid retriggers are rate-limited.');
})().catch(err=>{console.error(err);process.exitCode=1});
