'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
for(const state of ['idle','swim','back_swim','suction']){
 const file='human-fishing/assets/octopus/bait/red_lure_polished_'+state+'_8f.png';
 const b=fs.readFileSync(file);
 assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 assert.equal(b.readUInt32BE(16),1024,'Four 256px columns required');
 assert.equal(b.readUInt32BE(20),512,'Two 256px rows required');
 assert.equal(b[24],8,'Expected 8-bit channel depth');
 assert.equal(b[25],6,'Transparent RGBA PNG required');
 assert.ok(b.length>100000,'Missing detailed painted art '+state);
 console.log('PASS '+state+': 4x2, 8-frame, RGBA PNG');
}

// Direction selection follows motion, retains its state near rest, and never mirrors the face.
const vm=require('node:vm'),html=fs.readFileSync('human-fishing/index.html','utf8');
const source=html.slice(html.indexOf('var polishedLureSwimDirection=1;'),html.indexOf('function drawRedLure('));
const state={};vm.createContext(state);vm.runInContext(source,state);
assert.equal(state.polishedLureSwimMode(100),'swim');
assert.equal(state.polishedLureSwimMode(-100),'back_swim');
assert.equal(state.polishedLureSwimMode(2),'back_swim');
assert.equal(state.polishedLureSwimMode(80),'swim');
assert.equal(state.polishedLureSwimMode(-2),'swim');
console.log('PASS forward/backward selection and near-zero direction stability');
