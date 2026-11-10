'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('human-fishing/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/i)?.[1];
assert.ok(script,'Game script missing');
assert.match(html,/id="currentHud"/);
assert.match(html,/id="currentArrow"/);
assert.match(html,/#currentHud\.visible\{display:flex\}/);
assert.match(script,/updateCastSink\(dt\);[\s\S]*?autoFishingStep\(dt\);[\s\S]*?updateJoystick\(dt\);[\s\S]*?updateWaterCurrent\(dt\);/);
assert.match(script,/if\(cast\.sinkActive\)cast\.sinkActive=false;[\s\S]*?joystick\.active=true;joystick\.id=e\.pointerId;/,
 'Real user input must cancel remaining underwater sink');
assert.match(script,/if\(view!=='fish'\|\|introEntrance\.active[\s\S]*?cast\.active\|\|lureRecovery\.active\)return;/,
 'Airborne lure may remain locked, submerged lure may not');

const castPart=script.slice(script.indexOf('function readyBaitPosition(now){'),
 script.indexOf('// Each rod has its own actual velocity'));
assert.ok(castPart.includes('function updateCastSink(dt)'));
let roll=.15,splash=0;
const castEnv={
 time:0,view:'fish',introEntrance:{active:false},
 cast:{active:false,elapsed:0,impactAt:1.02,impactX:820,landing:false},
 hook:null,feverFx:null,escapeFx:null,
 bob:{x:0,y:0},rodRecoil:{at:-100},lureRecovery:{active:false},
 drag:false,dragPointer:null,dragQualified:false,joystick:{active:false},
 playerOctoCueState:null,playerOctoIdleState:null,
 window:{},rnd:(a,b)=>a+(b-a)*roll,
 playFoley(){},hideVirtualJoystick(){castEnv.joystick.active=false;},
 rodTip(){return{x:490,y:92}},WATER_SURFACE_Y:293,
 $(){return{textContent:''}},Math,
 ripple(){splash++},spawnParticles(){},vibrationPulse(){},
 clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),mix:(a,b,p)=>a+(b-a)*p
};
vm.createContext(castEnv);vm.runInContext(castPart,castEnv,{filename:'cast-unlock.js'});
castEnv.startCast();
assert.equal(castEnv.bob.x,472,'Bait must begin at its rod tip X without teleporting');
assert.equal(castEnv.bob.y,144,'Bait hangs 52px below the rod tip before casting');
castEnv.castMotion(.10);
assert.equal(castEnv.bob.x,472,'Wind-up must hold the connected bait at rod X');
assert.equal(castEnv.bob.y,144,'Wind-up must not jump vertically');
const shallow=castEnv.cast.targetDepth;
assert.ok(shallow>=350&&shallow<=585);
castEnv.castMotion(.84);
assert.equal(castEnv.cast.active,true);
castEnv.castMotion(.10);
assert.equal(splash,1,'Water-entry splash should fire exactly once');
assert.equal(castEnv.cast.landing,true);
assert.equal(castEnv.cast.active,false,'Input must unlock exactly on water entry');
assert.equal(castEnv.cast.sinkActive,true,'Underwater sinking continues without input lock');
assert.ok(castEnv.bob.y>293,'Bait enters the water before manual controls unlock');
castEnv.updateCastSink(.2);
const halfway={...castEnv.bob};
castEnv.joystick.active=true;
castEnv.updateCastSink(.2);
assert.equal(castEnv.cast.sinkActive,false,'Joystick must immediately override passive sinking');
assert.equal(castEnv.bob.y,halfway.y,'Passive sink must not fight manual joystick');
castEnv.joystick.active=false;roll=.85;
castEnv.startCast();
const deep=castEnv.cast.targetDepth;
assert.ok(deep>shallow+100,'Every cast can have significantly different depth');
castEnv.castMotion(1.04);
castEnv.updateCastSink(3);
assert.equal(castEnv.cast.sinkActive,false);
assert.equal(castEnv.bob.y,deep,'Uninterrupted lure settles exactly at chosen randomized depth');
assert.equal(castEnv.bob.x,640,'Uninterrupted lure returns smoothly to center');

const begin=script.indexOf('// Intermittent underwater currents');
const end=script.indexOf('// AUTO_FISHING_BEGIN',begin);
assert.ok(begin>0&&end>begin,'Water current controller missing');
const hudClasses=new Set(),label={textContent:''};
const hud={classList:{add:k=>hudClasses.add(k),remove:k=>hudClasses.delete(k)},
 setAttribute(k,v){this[k]=v}};
const fish={x:560,y:450,feverCaptured:false};
const currentEnv={
 time:0,view:'fish',introEntrance:{active:false},
 cast:{active:false,sinkActive:false},hook:null,feverFx:null,
 escapeFx:null,catchFx:null,lureRecovery:{active:false},octoGroggy:0,
 W:1280,WATER_SURFACE_Y:293,bob:{x:600,y:450},fish:[fish],
 $:k=>k==='currentHud'?hud:label,
 rnd:(a,b)=>a+(b-a)*.5,Math,
 autoFishingBlocked:()=>false,
 baitHorizontalBounds:()=>({min:65,max:1215}),
 clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),
 playFoley(){}
};
vm.createContext(currentEnv);
vm.runInContext(script.slice(begin,end),currentEnv,{filename:'water-current.js'});
currentEnv.waterCurrent.nextAt=0;
currentEnv.updateWaterCurrent(.016);
assert.equal(currentEnv.waterCurrent.active,true,'Current should activate at its randomized scheduled time');
assert.ok(hudClasses.has('visible'),'Only active current should show bottom-center direction');
assert.ok(['←','→','↗','↘','↖','↙'].includes(label.textContent));
const prev={...currentEnv.bob},fishX=fish.x;
currentEnv.time=1;currentEnv.updateWaterCurrent(.5);
assert.ok(Math.abs(currentEnv.bob.x-prev.x)>5,'Currents must visibly move the lure');
assert.ok(Math.abs(fish.x-fishX)>0,'Nearby fish should have a subtle natural drift too');
currentEnv.hook={};
const onHook=currentEnv.bob.x;
currentEnv.updateWaterCurrent(.5);
assert.equal(currentEnv.bob.x,onHook,'Currents must never move a hooked bait');
assert.ok(!hudClasses.has('visible'),'Direction indicator must hide during hooked animation');
currentEnv.hook=null;
currentEnv.time=currentEnv.waterCurrent.start+currentEnv.waterCurrent.duration+.01;
currentEnv.updateWaterCurrent(.016);
assert.equal(currentEnv.waterCurrent.active,false,'Current must stop after its duration');
assert.ok(!hudClasses.has('visible'),'Indicator must vanish when current ends');
currentEnv.view='book';currentEnv.updateWaterCurrent(.2);
assert.ok(!hudClasses.has('visible'),'Never show current in menus');
console.log('PASS: casting unlocks on splash, random depth, manual takeover, intermittent physical currents, direction HUD and safe blocking.');
