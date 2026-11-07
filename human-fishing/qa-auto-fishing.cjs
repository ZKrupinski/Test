'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const text=fs.readFileSync('human-fishing/index.html','utf8');
const begin=text.indexOf('// AUTO_FISHING_BEGIN'),end=text.indexOf('// AUTO_FISHING_END',begin);
assert.ok(begin>0&&end>begin,'Auto-fishing runtime block not installed');
assert.ok(text.includes('autoFishingStep(dt);\n   updateJoystick(dt);'),
 'Auto steering must run BEFORE original joystick movement');
assert.match(text,/id="autoFishStatus"/);
const listeners={},attrs={},status={shown:false};
const label={classList:{toggle(name,v){if(name==='active')status.shown=v}},
 setAttribute(k,v){attrs[k]=v}};
const panels={};
for(const k of ['panel','motionTunePanel','rodTunePanel','aquaSaleReceipt']){
 let open=false;
 panels[k]={classList:{contains(){return open}},setOpen(v){open=v}};
}
const target={x:750,y:420,vx:12,sp:{rarity:'COMMON'}};
let releases=0,hideCalls=0;
const ctx={
 time:0,W:1280,H:720,view:'fish',document:{
  hidden:false,addEventListener(k,fn){listeners[k]=fn;}
 },window:{addEventListener(k,fn){listeners[k]=fn;}},
 introEntrance:{active:false},cast:{active:false},hook:null,
 feverFx:null,escapeFx:null,catchFx:null,lureRecovery:{active:false},
 octoGroggy:0,fish:[target],hum:[],save:{fever:{ready:false}},
 bob:{x:500,y:420},joystick:{active:false,id:null,engaged:false,dx:0,dy:0},
 rodMotion:{vx:0,vy:0},PLAYER_ANIM_RATE:1,
 $:id=>id==='autoFishStatus'?label:panels[id],
 clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),
 isFishFleeing:()=>false,
 danglingBaitPosition(){return{x:this.bob.x,y:this.bob.y}},
 fishMouthWeakspot(f){return{x:f.x,y:f.y}},
 fishMouthOverlapsLure(f,bait){return Math.hypot(f.x-bait.x,f.y-bait.y)<=8},
 selectedGear:()=>({tier:0,id:'basic'}),
 gearLevel:()=>0,octoStats:()=>({radius:100}),
 ordinaryFishingTarget:()=>null,
 playerOctoCue(){},
 hideVirtualJoystick(){hideCalls++;ctx.joystick.active=false;ctx.joystick.id=null;
  ctx.joystick.engaged=false;ctx.joystick.dx=0;ctx.joystick.dy=0;},
 release(){releases++},
 console,Math
};
// Use closure-safe stubs for exposed helper names.
ctx.danglingBaitPosition=()=>({x:ctx.bob.x,y:ctx.bob.y});
vm.createContext(ctx);
vm.runInContext(text.slice(begin,end),ctx,{filename:'auto-fishing-runtime.js'});
function step(at){ctx.time=at;ctx.autoFishingStep(.016);}
step(9.999);
assert.equal(ctx.autoFishing.active,false,'Auto must not activate before 10 sec');
assert.equal(releases,0);assert.equal(status.shown,false);
step(10);
assert.equal(ctx.autoFishing.active,true,'Auto begins at 10 seconds idle');
assert.equal(status.shown,true);
assert.equal(ctx.joystick.id,'auto','Autopilot must feed real joystick');
assert.ok(ctx.joystick.dx>0,'Autopilot should steer towards fish');
assert.equal(releases,0,'Cannot teleport directly into capture');
ctx.bob.x=750;step(10.4);
assert.equal(releases,1,'Releasing on actual mouth weakspot calls original release');
assert.equal(ctx.joystick.active,false,'Auto joystick must detach during capture');
assert.equal(ctx.save.fever.ready,false,'Autopilot must not change catch odds');
assert.equal(ctx.bob.x,750,'Autopilot cannot teleport bait coordinates');
ctx.time=11;listeners.pointerdown({});
assert.equal(ctx.autoFishing.active,false,'Real pointer input must cancel auto instantly');
assert.equal(status.shown,false);
step(20.999);
assert.equal(ctx.autoFishing.active,false,'Input restarts 10s countdown');
step(21);
assert.equal(ctx.autoFishing.active,true,'Auto can restart after another 10s idle');
ctx.time=22;listeners.keydown({});
assert.equal(ctx.autoFishing.active,false,'Keyboard input cancels auto');
ctx.time=23;panels.panel.setOpen(true);step(35);
assert.equal(ctx.autoFishing.active,false,'Never auto-fish through menus');
panels.panel.setOpen(false);step(35.001);
assert.equal(ctx.autoFishing.active,false,'Auto timer restarts after menu block');
step(45.01);assert.equal(ctx.autoFishing.active,true);
ctx.time=45.02;ctx.document.hidden=true;listeners.visibilitychange({});
assert.equal(ctx.autoFishing.active,false,'Background tab must stop');
ctx.document.hidden=false;step(55.00);
assert.equal(ctx.autoFishing.active,false);
step(55.02);assert.equal(ctx.autoFishing.active,true);
const beforeFever=releases;
ctx.save.fever.ready=true;ctx.bob.x=750;ctx.autoFishing.target=null;
step(55.5);
assert.equal(releases,beforeFever+1,'Ready Fever uses existing release() when in actual radius');
assert.ok(hideCalls>=2,'Auto joystick detaches before casting and user takeover');
assert.doesNotMatch(text.slice(begin,end),/save\.coins\s*\+|save\.owned\[/,
 'Autopilot must never grant currency or creatures directly');
console.log('PASS: 10s exact idle trigger, natural physics steering, real mouth release, Fever, input cancellation, menus and hidden-tab safety.');
