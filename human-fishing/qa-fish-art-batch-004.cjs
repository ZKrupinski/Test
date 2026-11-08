'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const root='human-fishing/';
const js=fs.readFileSync(root+'fish-expansion-catalog-004.js','utf8');
const html=fs.readFileSync(root+'index.html','utf8');
const queue=JSON.parse(fs.readFileSync(root+'fish-art-batch-004-queue.json','utf8'));
function test(flag){
 const window={HumanFishingFishExpansion004Ready:flag};
 vm.runInNewContext(js,{window});
 const list=Array.from({length:291},(_,i)=>({id:'BASE'+i}));
 window.HumanFishingFishExpansion004.extend(list);
 window.HumanFishingFishExpansion004.extend(list);
 return {list,records:window.HumanFishingFishExpansion004.records};
}
const off=test(false),on=test(true);
assert.equal(off.list.length,291);
assert.equal(on.list.length,296);
assert.equal(on.records.length,5);
assert.equal(new Set(on.list.map(x=>x.id)).size,296);
assert.equal(queue.candidates.length,5);
assert.equal(new Set(queue.candidates.map(x=>x.scientificName)).size,5);
for(const sp of on.records){
 const q=queue.candidates.find(x=>x.gameId===sp.id);
 assert.ok(q&&q.scientificName===sp.scientificName);
 assert.equal(q.nameKo,sp.name);
 assert.equal(q.proposedZone,sp.habitat);
 assert.equal(q.size,sp.artSizeClass);
 assert.equal(q.rarity,sp.rarity);
 assert.ok(q.expectedSha256?.length===64);
 assert.ok(sp.behaviorProfile?.archetype);
 assert.ok(q.artStatus==='READY_FOR_IMPORT_QA'||q.artStatus==='LIVE');
 assert.equal(!!q.live,q.artStatus==='LIVE');
}
assert.ok(html.includes('HumanFishingFishExpansion004.extend(species)'));
assert.ok(html.includes('assets/fish-expansion-004/ready.js'));
const ready=fs.readFileSync(root+'assets/fish-expansion-004/ready.js','utf8').includes('=true');
assert.equal(queue.candidates.filter(x=>x.artStatus==='LIVE').length,ready?5:0);
if(ready)for(const sp of on.records)assert.ok(fs.existsSync(root+'assets/fish/individual/'+sp.id+'.png'),sp.id);
console.log('PASS: five unique original fourth-batch fish records, safe activation gate, rarity and movement, images checked only when live.');
