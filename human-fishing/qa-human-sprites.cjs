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
assert(index.includes('human-sprites.js?v=20261110-large-human-no-ring-v3'));
assert(index.includes('assets/humans/ready.js?v=20261110-baby-v1'));
const renderer=fs.readFileSync(path.join(root,'human-sprites.js'),'utf8');
new Function(renderer);
assert(renderer.includes("state==='hooked'?'20261110-hooked-v2':version"));
assert(renderer.includes('fw:444,fh:444'));
for(const action of ['swim','resist','taunt','hooked'])assert(renderer.includes('baby_'+action+'_8f.png'));
const expected={
 'baby_swim_8f.png':'77df32dbccbc68847d9b1eadf32a92402efacb6d8cd0f37ddc96f91310462a7e',
 'baby_resist_8f.png':'ed6e3fbb9ee784c4d66e2ec61a9d82841dd6d011247843a7ac6c624d2086196e',
 'baby_taunt_8f.png':'77890fbe410721244adf06cd422c3d90fad5755c384d85a44adbf6a675eb0565',
 'baby_hooked_8f.png':'5ba5747a2c8ea583bccc9dbef4404478a7b1b0020723fe4f10084bd9ddf5e86e'
};
if(ready.includes('Ready=true')){
 for(const [name,hash] of Object.entries(expected)){
  const png=fs.readFileSync(path.join(base,name));
  assert.equal(crypto.createHash('sha256').update(png).digest('hex'),hash,name+' original bytes changed');
  assert(png.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')),name+' invalid PNG');
  assert.equal(png.readUInt32BE(16),name==='baby_hooked_8f.png'?1776:1448,name+' width');
  assert.equal(png.readUInt32BE(20),name==='baby_hooked_8f.png'?888:1086,name+' height');
  assert.equal(png[25],6,name+' must be RGBA');
 }
 console.log('PASS: all four approved 1448x1086 RGBA sprite sheets present, checksummed and enabled');
}else{
 assert(ready.includes('Ready=false'),'Bad load gate');
 console.log('PASS: sprite fallback remains active until all images are installed');
}

// All 24 human types share one world-space sprite with a DISPLAY-only boost.
assert.match(renderer,/var HUMAN_WORLD_RENDER_BOOST=1\.85/,'human world render boost missing');
assert.match(renderer,/var scale=\(mood==='hooked'\?\.33:\.36\)\*size\*\(actor\.id>=20\?1\.05:1\)\*HUMAN_WORLD_RENDER_BOOST/);
const vm=require('node:vm');
class MockHumanImage{
 constructor(){this.complete=true;this.naturalWidth=1448;this.naturalHeight=1086;}
 set src(value){
  this._src=value;
  if(value.includes('hooked')){this.naturalWidth=1776;this.naturalHeight=888;}
 }
 get src(){return this._src}
}
const env={window:{HumanFishingBabySpritesReady:true},Image:MockHumanImage};
vm.runInNewContext(renderer,env);
const art=env.window.HumanFishingBabySprites;
const captures=[],context={
 save(){},restore(){},translate(){},scale(){},
 drawImage(...args){captures.push(args);}
};
for(const mood of ['swim','resist','taunt','hooked']){
 assert(art.render(context,{id:8,x:0,y:445,vx:1,size:1.02,phase:0},0,mood),
  mood+' should use the approved existing bitmap');
 const call=captures[captures.length-1];
 assert(call[7]>205,mood+' must appear larger than the typical large fish');
}
assert.match(index,/ctx\.translate\(sx,sy\+6\);ctx\.scale\(1\.0,1\.0\);/,'aquarium human no longer must be shrunk to .76');
assert.doesNotMatch(index,/circle\(sx,sy\+24,86/,'aquarium human vector halo still present');
assert.doesNotMatch(index,/ctx\.ellipse\(sx,sy\+24,84,108/,'aquarium human elliptical bubble still present');
console.log('PASS: adult-scale cartoon human world sprites, larger aquarium display, no vector oval or bubble');
