/* Node gamepad QA: standard control mapping, edge-trigger, menu guard, haptics. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const path=require('node:path'),root=__dirname;
const js=fs.readFileSync(path.join(root,'gamepad.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
new vm.Script(js);
const p={index:0,id:'Mock Xbox Standard Pad',mapping:'standard',connected:true,
 buttons:Array.from({length:17},()=>({pressed:false,value:0})),axes:[0,0,0,0],
 vibrationActuator:{effects:['dual-rumble'],playEffect(type,opts){effects.push([type,opts]);return Promise.resolve('complete');}}};
let pads=[p],effects=[],now=1000,moves=[],actions=0,inputs=0,busy=false;
const doc={hidden:false,getElementById(){return null;},querySelector(){return null;},querySelectorAll(){return []}};
const win={navigator:{getGamepads:()=>pads},document:doc,performance:{now:()=>now}};
vm.runInNewContext(js,{window:win});
win.HumanFishingGamepad.init({move:(x,y)=>moves.push([x,y]),action:()=>actions++,
 userInput:()=>inputs++,busy:()=>busy});
function key(i,on){p.buttons[i].pressed=on;p.buttons[i].value=on?1:0;}
win.HumanFishingGamepad.poll();
key(0,true);win.HumanFishingGamepad.poll();win.HumanFishingGamepad.poll();
assert.equal(actions,1,'A face button must only fire on rising edge');
key(0,false);win.HumanFishingGamepad.poll();
key(7,true);win.HumanFishingGamepad.poll();
assert.equal(actions,2,'Right trigger must also cast/capture');
key(7,false);p.axes=[.65,-.8,0,0];win.HumanFishingGamepad.poll();
assert(moves[moves.length-1][0]>.4&&moves[moves.length-1][1]<-.6,'analog stick values must be normalized');
assert(inputs>0,'controller activity must reset auto fishing idle countdown');
p.axes=[0,0,0,0];win.HumanFishingGamepad.poll();
assert.equal(moves[moves.length-1][0],0,'neutral stick must stop accelerating the lure');
assert(win.HumanFishingGamepad.rumble([80,20,60],4,'bite'),'pad vibration should be scheduled');
assert.equal(effects.length,1);
assert.equal(effects[0][0],'dual-rumble');
assert(effects[0][1].strongMagnitude>.5&&effects[0][1].duration>50);
assert.equal(win.HumanFishingGamepad.rumble([7],1,'brush'),false,'weak vibration must not override strong bite');
now+=500;
assert(win.HumanFishingGamepad.rumble([7],1,'brush'),'short brush rumble after priority expiration');
assert.equal(effects.length,2);
busy=true;key(0,true);win.HumanFishingGamepad.poll();
assert.equal(actions,2,'controller must be inactive while scene preload gate is busy');
busy=false;key(0,false);win.HumanFishingGamepad.poll();
doc.hidden=true;assert.equal(win.HumanFishingGamepad.rumble([70],4,'fever'),false,'hidden page cannot vibrate');
doc.hidden=false;pads=[];
win.HumanFishingGamepad.poll();
assert.equal(moves[moves.length-1][0],0,'disconnect must release analog control');
assert.match(html,/gamepad\.js\?v=20261110-pad1/);
assert.match(html,/window\.HumanFishingGamepad\.poll\(\)/);
assert.match(html,/window\.HumanFishingGamepad\.init\(/);
assert.match(html,/joystick\.id==='gamepad'/);
assert.match(html,/deviceVibrate\(deviceHapticPatterns\[kind\],deviceHapticPriority\[kind\],kind\)/);
assert.match(html,/deviceVibrate\(Math\.round\(40-29\*Math\.pow\(p,\.85\)\),deviceHapticPriority\.pull,'pull'\)/);
const boot=fs.readFileSync(path.join(root,'boot.js'),'utf8');
new vm.Script(boot);
assert.match(boot,/function prestartGamepadFrame\(\)/,'boot screen must accept controller START');
assert.match(boot,/button\.textContent='터치 · A \/ START로 시작'/,'boot button should show controller controls');
assert.match(html,/if\(joystick\.id==='gamepad'\)hideVirtualJoystick\(\)/,'pointer priority');
assert.match(html,/function gamepadMoveLure\(x,y\)/);
console.log('PASS: analog fishing, A/RT edge actions, idle reset, disconnect/scene guard, pad rumble priorities');
