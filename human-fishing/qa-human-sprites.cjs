/* Human baby bitmap install safety check; run after the ZIP installer and in QA. */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const root=__dirname;
const base=path.join(root,'assets','humans');
const ready=fs.readFileSync(path.join(base,'ready.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(index.includes('human-sprites.js?v=20261110-baby-v1'));
assert(index.includes('assets/humans/ready.js?v=20261110-baby-v1'));
const renderer=fs.readFileSync(path.join(root,'human-sprites.js'),'utf8');
new Function(renderer);
for(const action of ['swim','resist','taunt','hooked'])assert(renderer.includes('baby_'+action+'_8f.png'));
const expected={
 'baby_swim_8f.png':'77df32dbccbc68847d9b1eadf32a92402efacb6d8cd0f37ddc96f91310462a7e',
 'baby_resist_8f.png':'ed6e3fbb9ee784c4d66e2ec61a9d82841dd6d011247843a7ac6c624d2086196e',
 'baby_taunt_8f.png':'77890fbe410721244adf06cd422c3d90fad5755c384d85a44adbf6a675eb0565',
 'baby_hooked_8f.png':'b2693e7e2459a64080d3d7aa87369957aa93b882c54e9aa230a6b755eaf2c0d5'
};
if(ready.includes('Ready=true')){
 for(const [name,hash] of Object.entries(expected)){
  const png=fs.readFileSync(path.join(base,name));
  assert.equal(crypto.createHash('sha256').update(png).digest('hex'),hash,name+' original bytes changed');
  assert(png.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')),name+' invalid PNG');
  assert.equal(png.readUInt32BE(16),1448,name+' width');
  assert.equal(png.readUInt32BE(20),1086,name+' height');
  assert.equal(png[25],6,name+' must be RGBA');
 }
 console.log('PASS: all four approved 1448x1086 RGBA sprite sheets present, checksummed and enabled');
}else{
 assert(ready.includes('Ready=false'),'Bad load gate');
 console.log('PASS: sprite fallback remains active until all images are installed');
}
