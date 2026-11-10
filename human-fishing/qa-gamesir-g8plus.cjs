/* GameSir G8+ Android haptics: detect/fallback/diagnostics without native claims. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=__dirname,source=fs.readFileSync(root+'/gamepad.js','utf8');
const html=fs.readFileSync(root+'/index.html','utf8');
new vm.Script(source);
(async function(){
 let calls=[],p={index:0,id:'GameSir-G8+',mapping:'standard',connected:true,
   buttons:Array.from({length:17},()=>({pressed:false,value:0})),axes:[0,0],
   vibrationActuator:{effects:['dual-rumble'],playEffect(type,payload){
    calls.push([type,payload]);return Promise.resolve('complete');
   }}};
 const doc={hidden:false,getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[]};
 const win={navigator:{getGamepads:()=>[p]},document:doc,performance:{now:()=>3000}};
 vm.runInNewContext(source,{window:win,Date});
 const pad=win.HumanFishingGamepad;
 pad.init({move(){},busy(){return false;}});
 assert.equal(pad.hapticInfo().isGameSirG8Plus,true,'G8+ ID recognition');
 assert.equal(pad.hapticInfo().actuatorAvailable,true,'G8+ haptic exposed');
 assert.equal(pad.testRumble(),true,'GameSir test command must submit');
 await Promise.resolve();await Promise.resolve();
 assert.equal(pad.hapticInfo().lastResult,'command-complete');
 assert.equal(calls.length,1);
 assert.equal(calls[0][0],'dual-rumble');
 assert(calls[0][1].strongMagnitude>=.8&&calls[0][1].weakMagnitude>=.8);
 // The browser may reject dual-rumble while supporting an older pulse API.
 calls=[];
 p.vibrationActuator={effects:['dual-rumble'],playEffect(){
  calls.push(['dual']);return Promise.resolve('not-supported');
 }};
 p.hapticActuators=[{pulse(magnitude,duration){
  calls.push(['pulse',magnitude,duration]);return Promise.resolve(true);
 }}];
 assert.equal(pad.testRumble(),true);
 for(let i=0;i<8;i++)await Promise.resolve();
 assert.deepEqual(calls.map(x=>x[0]),['dual','pulse'],'fall back to physical pad pulse after rejected dual-rumble');
 assert.equal(pad.hapticInfo().lastResult,'command-complete');
 // Do NOT claim support when connected Bluetooth G8+ hides actuators entirely.
 p.vibrationActuator=null;p.hapticActuators=[];
 assert.equal(pad.hapticInfo().actuatorAvailable,false);
 assert.equal(pad.testRumble(),false);
 assert.equal(pad.hapticInfo().lastResult,'not-exposed');
 assert.match(pad.hapticInfo().message,/브라우저.*모터/);
 // Browsers that return a promise rejection must not report success.
 p.vibrationActuator={effects:['dual-rumble'],playEffect(){return Promise.reject(new Error('not-supported'));}};
 assert.equal(pad.testRumble(),true);
 for(let i=0;i<8;i++)await Promise.resolve();
 assert.equal(pad.hapticInfo().lastResult,'rejected');
 // Physical button connectivity and haptics are separate capabilities.
 p.vibrationActuator=null;
 assert.equal(pad.hapticInfo().connected,true);
 assert.match(html,/gamepad\.js\?v=20261110-pad1/);
 console.log('PASS: GameSir G8+ recognition, mobile dual-rumble, async pulse fallback, test command, unsupported diagnosis');
})().catch(function(e){console.error(e);process.exitCode=1});
