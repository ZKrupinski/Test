'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
for(const state of ['idle','swim','suction']){
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
