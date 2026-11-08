'use strict';
// Batch008: seven ONLY distinct species from ten user-approved fish illustrations.
// Explicitly forbid silently replacing previously installed fish.
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto'),vm=require('node:vm');
const root='human-fishing/';
const manifest=JSON.parse(fs.readFileSync(root+'assets/fish-expansion-008/installed-manifest.json','utf8'));
const review=JSON.parse(fs.readFileSync(root+'art-review/batch-008/review-manifest.json','utf8'));
const html=fs.readFileSync(root+'index.html','utf8');
const src=fs.readFileSync(root+'fish-expansion-catalog-008.js','utf8');
assert.equal(manifest.count,7);assert.equal(manifest.excludedCount,3);
assert.equal(manifest.originalCountBefore,326);assert.equal(manifest.originalCountAfter,333);
assert.equal(manifest.totalCatchableAfter,334);
assert.equal(manifest.originalPixelsPreserved,true);
assert.deepEqual(manifest.species.map(x=>x.gameId),['F348','F349','F350','F351','F352','F353','F354']);
assert.ok(html.includes('assets/fish-expansion-008/ready.js?v=20261108-batch008'));
assert.ok(html.includes('fish-expansion-catalog-008.js?v=20261108-batch008'));
assert.ok(html.includes('HumanFishingFishExpansion008.extend(species)'));
assert.match(fs.readFileSync(root+'assets/fish-expansion-008/ready.js','utf8'),/HumanFishingFishExpansion008Ready=true/);
assert.ok(html.includes('sortFishForCodexByRegion'));
const excluded=['F032','F055','F150'];
assert.deepEqual(manifest.excluded.map(x=>x.id),excluded);
assert.deepEqual(review.excluded.map(x=>x.id),excluded);
assert.deepEqual(review.overwrittenOriginalIds,[]);
const installedIds=new Set(manifest.species.map(x=>x.gameId));
assert.ok(excluded.every(id=>!installedIds.has(id)),'Existing species must never be re-imported');
assert.equal(new Set(manifest.species.map(x=>x.scientificName)).size,7);
assert.equal(new Set(manifest.species.map(x=>x.nameKo)).size,7);
const signature=Buffer.from([137,80,78,71,13,10,26,10]);
const png=(id)=>fs.readFileSync(root+'assets/fish/individual/'+id+'.png');
for(const id of excluded){
 const original=png(id);
 assert.equal(original.subarray(0,8).compare(signature),0,'Existing original unexpectedly missing '+id);
}
const oldCatalogs=['fish-expansion-catalog.js','fish-expansion-catalog-023.js','fish-expansion-catalog-004.js','fish-expansion-catalog-006.js','fish-expansion-catalog-007.js'].map(f=>fs.readFileSync(root+f,'utf8'));
for(const row of manifest.species){
 const buf=png(row.gameId);
 assert.equal(buf.subarray(0,8).compare(signature),0,row.gameId+' PNG signature');
 assert.equal(buf.readUInt32BE(16),row.width,row.gameId+' width');
 assert.equal(buf.readUInt32BE(20),row.height,row.gameId+' height');
 assert.equal(buf[25],6,row.gameId+' RGBA PNG');
 assert.equal(crypto.createHash('sha256').update(buf).digest('hex'),row.sha256);
 assert.ok(review.species.some(r=>r.gameId===row.gameId&&r.originalSha256===row.sha256));
 assert.ok(!oldCatalogs.some(s=>s.includes(row.scientificName)),'Already registered scientific name '+row.scientificName);
 assert.ok(['SMALL','MEDIUM','LARGE'].includes(row.size));
 assert.ok(row.habitat>=0&&row.habitat<12);
 assert.ok(row.behavior&&row.behavior.archetype&&row.behavior.speedMultiplier>0);
}
assert.equal(new Set(manifest.species.map(x=>x.behavior.archetype)).size,7);
assert.equal(manifest.species.find(x=>x.gameId==='F351').scientificName,'Pterois volitans');
assert.equal(manifest.species.find(x=>x.gameId==='F352').scientificName,'Hippocampus kuda');
const win={HumanFishingFishExpansion008Ready:true};vm.runInNewContext(src,{window:win});
const species=Array.from({length:327},(_,i)=>({id:'LIVE_'+i}));
const original=JSON.stringify(species);
win.HumanFishingFishExpansion008.extend(species);
win.HumanFishingFishExpansion008.extend(species);
assert.equal(species.length,334);
assert.equal(JSON.stringify(species.slice(0,327)),original);
assert.ok(species.slice(-7).every(sp=>sp.expansionSpecies&&sp.artBatch==='008'));
const disabled={HumanFishingFishExpansion008Ready:false};vm.runInNewContext(src,{window:disabled});
const untouched=[];disabled.HumanFishingFishExpansion008.extend(untouched);
assert.equal(untouched.length,0);
assert.ok(html.includes('humanFishingAlpha01'),'Save key changed');
console.log('PASS: 7 truly new species 326->333; F032/F055/F150 preserved unchanged, 7 original PNG SHA256 matches, codex and unique behaviors activated.');
