'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const path='human-fishing/';
const foley=fs.readFileSync(path+'foley.js','utf8');
const html=fs.readFileSync(path+'index.html','utf8');
assert.match(html,/<script src="\.\/foley\.js\?v=/,
 'Game must load natural Foley before its inline gameplay script');
assert.doesNotMatch(html,/createOscillator|OscillatorNode/,
 'Electronic oscillator beeps must be removed entirely');
assert.match(html,/function playFoley\(kind,intensity,pitch\)/);
assert.match(html,/vibrationPulse\(kind\)/);
assert.match(html,/playFoley\('feverSnap'\)/);
assert.match(html,/playFoley\('rodPump'/);
assert.match(html,/playFoley\('lureMove'/);
assert.match(html,/playFoley\('aquarium'/);
assert.match(html,/playFoley\('escapeSplash'/);
const entries=[...foley.matchAll(/^\s*\w+:\['([\w-]+\.ogg)','(https:\/\/(?:raw\.githubusercontent\.com|opengameart\.org)\/[^']+)'\],?$/gm)];
assert.equal(entries.length,29,'The 29 existing remote-backed Foley recordings remain intact');
for(const [,filename] of entries){
 const file=path+'assets/foley/'+filename;
 assert.ok(fs.existsSync(file),'Audio clip missing: '+file);
 const bytes=fs.readFileSync(file);
 assert.ok(bytes.length>2000&&bytes.subarray(0,4).toString('ascii')==='OggS',
   'Missing or invalid playable OGG: '+file);
}
// Four original offline-produced, chest-style OGG prize melodies must ship
// locally with the 29 licensed physical samples (no network fallback).
const prizeFiles=['capture_lock.ogg','capture_shot.ogg','chest_prize.ogg','chest_prize_new.ogg',
 'fever_prize_tick.ogg','fever_prize_finish.ogg'];
for(const filename of prizeFiles){
 const asset=path+'assets/foley/'+filename;
 const bytes=fs.readFileSync(asset);
 assert.ok(bytes.length>4000&&bytes.length<120000,
  'Original prize audio must be audible yet lightweight: '+filename);
 assert.equal(bytes.subarray(0,4).toString('ascii'),'OggS',
  'Original prize melody is not a valid OGG: '+filename);
 assert.match(foley,new RegExp(filename.replaceAll('.','\\.')),
  'Original clip must be registered and preloaded: '+filename);
}
assert.match(foley,/catchFanfare:\{gap:\.24,l:\[layer\(\['chestWin'\],\.94,1\)/,
 'Ordinary rewards need a front-facing melody, not tiny coin clicks');
assert.match(foley,/catchNew:\{gap:\.28,l:\[layer\(\['chestNew'\],\.98,1\)/,
 'First discoveries deserve a more substantial dedicated treasure stinger');
assert.match(foley,/feverCard:\{gap:\.24,l:\[layer\(\['feverTick'\],\.79,1\)/,
 'Fever prizes must have audible individual notes, distinct from solo reward');
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
 assert.equal(bus.getState().sampleCount,35);
 assert.ok(bus.getState().cueCount>=40);
 assert.equal(bus.getState().loaded,35);
 const required=['captureLock','captureShot','cast','splash','lureGrab','lureMove','brush','weakspot','bite',
 'miss','panic','reel','rodPump','rodSnap','swallow','catch','feverReady','fever',
 'feverSnap','feverBubbles','fishFlail','escape','escapeSplash','counter',
 'groggy','catchFanfare','catchNew','feverCard','feverFinish','menuOpen','menuClose','menuTap','menuNavigate','stage','upgrade',
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
 assert.equal(fetches.length,35,'Every audio source should be preloaded once');
 assert.doesNotMatch(foley.slice(foley.indexOf('var CUES='),foley.indexOf('var context=')),/victoryBrass|catchFanfareFever/,
  'Do not play theatrical brass anywhere in reward cues');
 console.log('PASS: 29 existing Foley clips + 2 capture recordings + 4 chest/fever melodies decode; 42 cues are audible and responsive, '+
  'each cue starts playable physical sound, rapid retriggers are rate-limited.');
})().catch(err=>{console.error(err);process.exitCode=1});

assert.match(html,/vibrationPulse\('weakspot'\);playFoley\('captureLock'\)/,'Contact onset plays the recorded lock');
assert.match(html,/vibrationPulse\('bite'\);playFoley\('captureShot'\)/,'Shared successful reel input plays recorded shot');
assert.equal((html.match(/playFoley\('captureShot'\)/g)||[]).length,1,'Gunshot must not be duplicated across touch/controller paths');
assert.match(html,/HumanFishingFoley\.prime\(\)/,'Recordings decode before scene start');
