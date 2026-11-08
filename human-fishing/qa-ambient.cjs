'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const crypto=require('node:crypto');
const root='human-fishing/';
const js=fs.readFileSync(root+'ambient.js','utf8');
const html=fs.readFileSync(root+'index.html','utf8');
const themes=['freshwater_planted','amazon','african_lake','asian_wetland',
 'alpine_lake','east_asia','tropical','seagrass','harbor','open_ocean',
 'moonlight','polar_ice','underwater'];
assert.match(html,/<script src="\.\/ambient\.js\?v=/,
 'Ambient sound engine must load before the live fishing game');
assert.match(html,/\/\/ SURFACE_AND_UNDERWATER_AMBIENCE_BEGIN/);
assert.match(html,/\/\/ SURFACE_AND_UNDERWATER_AMBIENCE_END/);
assert.match(html,/updateAmbience\(\);\s*\/\/ Ordered canvas layers/,
 'Ambient must update after the actual lure physics, before rendering');
assert.doesNotMatch(js,/createOscillator|setInterval/,
 'Ambience must use pre-rendered, seamless audio, not runtime bleeps');
assert.match(js,/source\.loop=true/,
 'Ambient must loop without pauses on every 11-second wrap');
for(const key of themes){
 const path=root+'assets/ambience/'+key+'.ogg';
 assert.ok(fs.existsSync(path),'Missing local environment recording: '+key);
 const raw=fs.readFileSync(path);
 assert.ok(raw.length>4500&&raw.length<200000,
  'Ambient file must have a non-silent lightweight OGG payload: '+key);
 assert.equal(raw.subarray(0,4).toString('ascii'),'OggS');
}
const hashes=themes.map(key=>crypto.createHash('sha256')
 .update(fs.readFileSync(root+'assets/ambience/'+key+'.ogg')).digest('hex'));
assert.equal(new Set(hashes).size,13,
 'Each of the 12 surface habitats and underwater must have distinct audio');
let context,starts=0,stops=0,filterSchedules=0;
function param(value){
 return {value,
  cancelScheduledValues(){return this},
  setValueAtTime(v){this.value=v;return this},
  linearRampToValueAtTime(v){this.value=v;return this}};
}
class MockContext{
 constructor(){context=this;this.currentTime=3;this.state='suspended';this.destination={};}
 createGain(){return {gain:param(1),connect(){}}}
 createBiquadFilter(){return{
  type:'lowpass',frequency:{...param(8000),
    linearRampToValueAtTime(v){this.value=v;filterSchedules++;return this}},
  Q:param(.5),gain:param(0),connect(){}}}
 createBufferSource(){return {buffer:null,loop:false,playbackRate:param(1),connect(){},
  start(){starts++},stop(){stops++}}}
 decodeAudioData(bytes){return Promise.resolve({duration:11,bytes:bytes.byteLength})}
 resume(){this.state='running';return Promise.resolve()}
}
let fetches=[];
const events={};
const sandbox={
 window:{AudioContext:MockContext,console},
 document:{visibilityState:'visible',addEventListener(type,fn){events[type]=fn}},
 fetch(url){fetches.push(url);return Promise.resolve({ok:true,
  arrayBuffer(){return Promise.resolve(new ArrayBuffer(32000))}})},
 Promise,Math,Number,Object,console
};
vm.createContext(sandbox);
vm.runInContext(js,sandbox,{filename:'ambient.js'});
const ambient=sandbox.window.HumanFishingAmbient;
assert.ok(ambient,'Ambient bus not installed');
(async function(){
 await ambient.prime(0);
 assert.equal(ambient.getState().loaded,2,
  'Initial resource gate should fetch only the first biome and diver bed');
 ambient.update(0,false,true);
 assert.equal(starts,0,'Autoplay must never start without browser gesture');
 ambient.unlock();
 await Promise.resolve();await Promise.resolve();
 assert.equal(ambient.getState().surface,'freshwater_planted');
 assert.equal(ambient.getState().surfaceGain,.62,
  'At surface use the corresponding region-specific environment');
 assert.equal(ambient.getState().waterGain,0,
  'No underwater loop should be audible above the surface');
 assert.equal(starts,2,'Surface + underwater loops should each start once');
 ambient.update(0,true,true);
 assert.equal(ambient.getState().surfaceGain,.22,
  'Regional surface ambience must remain audible WHILE underwater');
 assert.equal(ambient.getState().waterGain,.79,
  'Deeper muffled diver bed must play simultaneously with surface');
 assert.equal(ambient.getState().underwaterLowpass,255,
  'Underwater mix must attenuate highs far below the old 580Hz cutoff');
 assert.equal(ambient.getState().underwaterPitch,.86,
  'Diver bubbles and pressure recording must play lower and slower');
 assert.equal(ambient.getState().underwaterBassDb,4.5,
  'Underwater low shelf must add warmth to deep pressure tones');
 assert.equal(ambient.getState().surfaceCutoff,820,
  'The quiet surface bed should be low-passed, not killed underwater');
 assert.equal(starts,2,
  'Both surface AND underwater recordings must remain live concurrently');
 const before=filterSchedules;
 for(let i=0;i<300;i++)ambient.update(0,true,true);
 assert.equal(filterSchedules,before,
  'Rendering frames must NOT reschedule filter ramps every frame');
 ambient.update(0,false,true);
 assert.equal(ambient.getState().surfaceGain,.62,
  'Surfacing resumes the matching outdoor environment');
 assert.equal(ambient.getState().waterGain,0,
  'Underwater sound should fade out when the lure surfaces');
 ambient.update(6,false,true);
 await ambient.prime(6);
 assert.equal(ambient.getState().theme,'tropical');
 assert.equal(ambient.getState().surface,'tropical',
  'Changing stage swaps to the matching outdoor loop');
 assert.ok(stops>=1,'Discarded region loops should stop after a crossfade');
 ambient.update(6,false,false);
 assert.equal(ambient.getState().surfaceGain,0,
  'Menus and background tabs should fade ambience away');
 ambient.update(6,false,true);
 assert.equal(ambient.getState().surfaceGain,.62);
 assert.equal(ambient.getState().totalThemes,12);
 assert.equal(fetches.length,3,
  'Only the active habitat and shared underwater bed are fetched');
 const block=html.match(/\/\/ SURFACE_AND_UNDERWATER_AMBIENCE_BEGIN([\s\S]*?)\/\/ SURFACE_AND_UNDERWATER_AMBIENCE_END/);
 assert.ok(block,'Lure-driven ambient classification block missing');
 let calls=[];
 const sim={window:{HumanFishingAmbient:{update(...args){calls.push(args)}}},
  view:'fish',bob:{y:265},zone:6,introEntrance:{active:false},
  document:{visibilityState:'visible'},
  $:id=>id==='panel'?{classList:{contains(){return false}}}:{hidden:true}};
 vm.createContext(sim);
 vm.runInContext('var WATER_SURFACE_Y=293;\n'+block[1],sim);
 sim.updateAmbience();
 assert.deepEqual(calls.at(-1),[6,false,true]);
 sim.bob.y=312;sim.updateAmbience();
 assert.deepEqual(calls.at(-1),[6,true,true],
  'Actual submerged bait must switch to diver mix immediately');
 sim.bob.y=293;sim.updateAmbience();
 assert.deepEqual(calls.at(-1),[6,true,true],
  'Small waterline bobbing must NOT chatter between sound mixes');
 sim.bob.y=282;sim.updateAmbience();
 assert.deepEqual(calls.at(-1),[6,false,true],
  'Sound returns to birds/waves once the lure clears the water');
 sim.introEntrance.active=true;sim.bob.y=400;sim.updateAmbience();
 assert.deepEqual(calls.at(-1),[6,false,true],
  'First octopus entrance should be above-water regardless of idle bob');
 sim.introEntrance.active=false;sim.view='tank';sim.updateAmbience();
 assert.deepEqual(calls.at(-1),[6,true,true],
  'Aquarium should have submerged environmental audio');
 console.log('PASS: 12 distinct surface themes coexist at .22 with darker underwater (.79 /255Hz /-14% pitch /+4.5dB bass); crossfade, autoplay, cache and region swap.');
})().catch(e=>{console.error(e);process.exitCode=1});