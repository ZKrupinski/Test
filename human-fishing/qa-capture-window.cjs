'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const game=html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(game);
const fish={x:50,y:60,sp:{rarity:'COMMON'}},human={id:21,x:50,y:60};
let touch=true,locks=0;
const env={time:10,view:'fish',fish:[fish],hum:[],joystick:{active:true},cast:{active:false},hook:null,feverFx:null,escapeFx:null,catchFx:null,lureRecovery:{active:false},save:{fever:{ready:false}},$(){return {classList:{contains:()=>false}}},danglingBaitPosition:()=>({x:50,y:60}),fishMouthOverlapsLure:()=>touch,humanMouthOverlapsLure:()=>touch,vibrationPulse(){},playFoley(key){if(key==='captureLock')locks++;},Math};
vm.createContext(env);
vm.runInContext(game.slice(game.indexOf('var captureCue=null;'),game.indexOf('// Intermittent underwater currents:')),env);
env.checkBaitWeakspot();assert(env.captureCueActive());
const until=env.captureCue.until;
env.time+=.1;env.checkBaitWeakspot();assert.equal(env.captureCue.until,until,'Holding must not extend timing window');
env.joystick.active=false;assert(env.captureCueActive(),'Touch release must retain cue for shared release handler');
env.joystick.active=true;env.time=until+.001;env.checkBaitWeakspot();assert(!env.captureCueActive(),'Timeout ends capture cue');
env.checkBaitWeakspot();assert.equal(env.captureCue,null,'Persistent contact must not rearm');
touch=false;env.checkBaitWeakspot();touch=true;env.checkBaitWeakspot();assert(env.captureCueActive(),'Leaving then recontacting rearms');
env.hook={};assert(!env.captureCueActive(),'Hook ends freeze');env.hook=null;
let prev=1;for(const rarity of ['COMMON','UNCOMMON','RARE','EPIC','LEGEND','MYTHIC']){const d=env.captureWindowSeconds({sp:{rarity}},'fish');assert(d<prev);prev=d;}
assert(env.captureWindowSeconds(human,'human')<env.captureWindowSeconds({id:1},'human'));
env.captureCue=null;env.fish=[];env.hum=[human];env.checkBaitWeakspot();assert.equal(env.captureCue.kind,'human');
env.view='tank';assert(!env.captureCueActive());
console.log('PASS: contact edge, timeout, no repeated rearm, release timing, rarity scaling, human cue and scene cleanup');

// Regression: the sixth successful catch readies Fever, but must not mute
// the contact lock for all subsequent fish/humans until Fever is consumed.
env.view='fish';env.hum=[];env.fish=[fish];
for(let attempt=0;attempt<20;attempt++){
 env.captureCue=null;touch=false;env.checkBaitWeakspot();touch=true;
 env.time+=1;env.save.fever.ready=attempt>=6;
 const before=locks;env.checkBaitWeakspot();
 assert(env.captureCueActive(),'Contact cue remains available after repeated catches / Fever ready');
 assert.equal(locks,before+1,'Each new contact must play one lock');
 env.checkBaitWeakspot();assert.equal(locks,before+1,'Held contact must not loop sound');
 env.joystick.active=false;env.checkBaitWeakspot();
 assert.equal(fish.captureContactSpent,false,'Gesture end clears consumed contact');
 env.joystick.active=true;
}
env.feverFx={};const beforeFever=locks;env.checkBaitWeakspot();
assert.equal(locks,beforeFever,'An actively running Fever still blocks normal contact cues');
console.log('PASS: 20 repeated attempts including Fever-ready, one-shot lock and gesture reset');
