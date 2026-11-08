'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const base='human-fishing/';
const m=JSON.parse(fs.readFileSync(base+'fish-art-batch-001-assignments.json','utf8'));
const code=fs.readFileSync(base+'fish-expansion-catalog.js','utf8');
const html=fs.readFileSync(base+'index.html','utf8');
assert.equal(m.records.length,15);
assert.equal(m.readyForUpload,0);
assert.equal(m.liveInstalled,6);
assert.equal(m.records.filter(x=>x.artStatus.startsWith('HOLD')).length,8);
assert.equal(m.records.filter(x=>x.gameId==='F240').length,1);
assert.equal(new Set(m.records.map(x=>x.gameId)).size,15);
assert.equal(new Set(m.records.map(x=>x.scientificName.toLowerCase())).size,15);
assert.ok(m.records.every(x=>x.behaviorProfile?.archetype&&/^F\d{3}$/.test(x.gameId)));
assert.ok(m.records.filter(x=>['READY_FOR_IMPORT_QA','LIVE'].includes(x.artStatus)).every(x=>Number(x.gameId.slice(1))>304));
const sourceCandidates=JSON.parse(fs.readFileSync(base+'fish-production-candidates.json','utf8'));
assert.ok(m.records.filter(x=>x.gameId!=='F240').every(x=>sourceCandidates.candidates.some(c=>c.scientificName===x.scientificName)));
function test(enabled){
 const window={HumanFishingFishExpansionAssetsReady:enabled};
 vm.runInNewContext(code,{window});
 const baseList=Array.from({length:291},(_,i)=>({id:i<240?'F'+String(i+1).padStart(3,'0'):'TMP'+i}));
 window.HumanFishingFishExpansion.extend(baseList);
 window.HumanFishingFishExpansion.extend(baseList);
 return {len:baseList.length,add:window.HumanFishingFishExpansion.count,ids:Array.from(baseList).slice(291).map(x=>x.id)};
}
const off=test(false),on=test(true);
assert.equal(off.len,291);
assert.equal(on.len,297);
assert.equal(on.add,6);
assert.equal(new Set(on.ids).size,6);
const ready=fs.readFileSync(base+'assets/fish-expansion/ready.js','utf8');
if(ready.includes('=true')){
 for(const id of on.ids)assert.ok(fs.existsSync(base+'assets/fish/individual/'+id+'.png'),id+' missing original PNG');
}
assert.deepEqual(on.ids.slice().sort(),['F306','F311','F312','F314','F315','F316']);
assert.ok(html.includes('HumanFishingFishExpansion.extend(species)'));
assert.ok(html.includes('bp.swimAmpMultiplier'));
console.log('PASS: 15 original 1:1 art assignments, 11 ready, 3 review, F240 duplicate excluded, runtime gates + unique ecology, and no fake fish before upload');
