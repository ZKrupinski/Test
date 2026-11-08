'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('human-fishing/fish-bitmap-catalog.js','utf8');
const html=fs.readFileSync('human-fishing/index.html','utf8');
const data=JSON.parse(fs.readFileSync('human-fishing/special-creature-candidates.json','utf8'));
function load(ready){
 const images=[];
 function Image(){images.push(this)}
 const window={HumanFishingFishAssetsReady:true,HumanFishingSpecialAssetsReady:ready};
 vm.runInNewContext(source,{window,Image,Promise});
 const list=Array.from({length:240},(_,i)=>({id:'F'+String(i+1).padStart(3,'0'),name:'base'+i,habitat:Math.floor(i/20),index:i%20}));
 window.HumanFishingArt.extend(list);
 return {list,art:window.HumanFishingArt,images};
}
assert.equal(data.candidates.length,8);
assert.ok(data.candidates.slice(5).every(x=>x.scientificName===null&&x.origin==='ORIGINAL_FICTIONAL'));
const off=load(false),on=load(true);
assert.equal(off.list.length,291);
assert.equal(on.list.length,292);
assert.ok(!off.list.some(x=>x.id==='S001'));
assert.equal(on.list.filter(x=>x.id==='S001').length,1);
assert.equal(new Set(on.list.map(x=>x.id)).size,292);
assert.equal(on.art.specialCount,1);
assert.equal(on.art.bitmap('S001'),null);
assert.equal(on.images[0].src,'./assets/special-creatures/S001.png?v=20261108-s001');
assert.match(html,/value="-5"/);
assert.match(html,/assets\/special-creatures\/ready\.js/);
assert.match(html,/sp\.specialCreature\?'\.\/assets\/special-creatures\//);
const ready=fs.readFileSync('human-fishing/assets/special-creatures/ready.js','utf8');
if(ready.includes('=true'))assert.ok(fs.existsSync('human-fishing/assets/special-creatures/S001.png'));
console.log('PASS: 291 fish unaffected; special S001 appears only after validated asset; originals and fictional records are distinct.');
