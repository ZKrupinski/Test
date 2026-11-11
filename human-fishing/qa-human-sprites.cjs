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
assert(index.includes('human-sprites.js?v=20261111-human-swim11-v2'));
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

// New swim-only variants are bound to four specific humans. Existing action
// sheets and geometry are unchanged, preventing mismatched outfits mid-catch.
const variants={
 1:{name:'street',sha:'e6c0914af41024841e616aa2718a0c3d4f233b6a769220871535938521ce1404'},
 5:{name:'explorer',sha:'59709088963daecd1f1b66ec150d2ccb4746976a0d4aec2bf86422a0da27508f'},
 8:{name:'sporty',sha:'c5a0c76e45e3d234b0c69f12739750d4fea3711016d43c65c6f2f071a8b0b533'},
 18:{name:'vip',sha:'3c18e41c644d89ac76785790d9219cdf2e8c47ceddca9c46dc53cd1ecf389409'}
};
for(const [id,{name,sha}] of Object.entries(variants)){
 const file=fs.readFileSync(path.join(base,'baby_swim_'+name+'_8f.png'));
 assert.equal(crypto.createHash('sha256').update(file).digest('hex'),sha,name+' cleaned RGBA mismatch');
 assert(file.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')));
 assert.equal(file.readUInt32BE(16),1448);
 assert.equal(file.readUInt32BE(20),1086);
 assert.equal(file[25],6);
 assert(renderer.includes("'"+id+"':'"+name+"'"),id+' human mapping');
}
assert.match(index,/data-human-id=.*a\.id/,'Human codex must bind art by exact ID');
assert.match(index,/data-human-id=.*item\.humanId/,'Human capture card must bind art by exact ID');
// All human types retain same world-space pose geometry with a DISPLAY-only boost.
assert.match(renderer,/var HUMAN_WORLD_RENDER_BOOST=1\.295/,'human 70 percent render factor missing');
assert.match(renderer,/var scale=\(mood==='hooked'\?\.33:\.36\)\*size\*\(actor\.id>=20&&actor\.id<24\?1\.05:1\)\*HUMAN_WORLD_RENDER_BOOST/);
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
for(const [id,{name}] of Object.entries(variants)){
 assert(art.imageFor(Number(id),'swim').src.includes('baby_swim_'+name+'_8f.png'),
  'Expected distinct approved swim sprite for human '+id);
 assert(art.imageFor(Number(id),'hooked').src.includes('baby_swim_'+name+'_8f.png'),
  'Unfinished action sprite must not change the human appearance');
}
assert(art.imageFor(2,'hooked').src.includes('baby_hooked_8f.png'),
 'Other humans must keep existing original action sheets');
const captures=[],context={
 save(){},restore(){},translate(){},scale(){},
 drawImage(...args){captures.push(args);}
};
for(const mood of ['swim','resist','taunt','hooked']){
 assert(art.render(context,{id:8,x:0,y:445,vx:1,size:1.02,phase:0},0,mood),
  mood+' should use the approved existing bitmap');
 const call=captures[captures.length-1];
 assert(call[7]>145&&call[7]<200,mood+' must be exactly 70% of previous bitmap display width');
}
assert.match(index,/aquariumHumanActors\.forEach\(function\(h\)\{/,'Exhibition humans must render from persistent swimming actors');
assert.match(index,/humanSwimStep\(h,humanDt,now,null,true\)/,'Exhibition humans must swim with shared AI');
assert.doesNotMatch(index,/ctx\.scale\(\.76,\.76\)/,'Aquarium humans must not restore the old .76 shrink');
assert.doesNotMatch(index,/circle\(sx,sy\+24,86/,'aquarium human vector halo still present');
assert.doesNotMatch(index,/ctx\.ellipse\(sx,sy\+24,84,108/,'aquarium human elliptical bubble still present');
const pos=art.geometry({id:8,x:500,y:420,vx:40,size:1});
const mirrored=art.geometry({id:8,x:500,y:420,vx:-40,size:1});
assert(Math.abs(pos.width-362*.36*1.295)<1e-6);
assert.equal(pos.mouth.x-500,500-mirrored.mouth.x,'mouth must mirror with sprite facing');
assert(pos.mouth.x>500&&pos.mouth.rx<=12&&pos.mouth.ry<=9,
 'human mouth must be a hidden small ellipse, not the old 100px body radius');
assert.equal(art.geometry({id:22,x:500,y:420,vx:40,size:1}).mouth.rx,8,
 'Boss human weakspot must be smaller');
console.log('PASS: human bitmap size is exactly 70%, mirrored mouth weakspot, no aquarium vector oval');

assert.match(renderer,/var HUMAN_ANIMATION_SPEED=\.85/,'All human animations should play at 85% of their previous frame rate');
assert.match(renderer,/\*HUMAN_ANIMATION_SPEED/,'Shared slowdown must affect all four actions');
for(const [mood,at] of [['swim',.13],['resist',.08],['hooked',.09],['taunt',.10]]){
 const start=captures.length;
 assert(art.render(context,{id:8,x:0,y:445,vx:1,size:1,phase:0},at,mood));
 assert.equal(captures.length,start+1);
 assert.equal(captures.at(-1)[1],0,mood+' must remain on first frame for a longer interval');
}
assert.match(index,/humanSwimStep\(h,humanDt,now,null,true\);\s*humanIcon\(h,now\);/,'Keep aquarium human animation');
assert.doesNotMatch(index,/ctx\.fillText\(humans\[h\.id\],h\.x,h\.y\+118\)/,'Never draw aquarium human name labels in the world');
console.log('PASS: all human sprite animations play 15% slower; aquarium name overlays removed');
