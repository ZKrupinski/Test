'use strict';
// Batch009 partial: exactly ten verified source PNGs are LIVE, remaining twenty images never activated.
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto'),vm=require('node:vm');
const root='human-fishing/';
const review=JSON.parse(fs.readFileSync(root+'art-review/batch-009/review-manifest.json','utf8'));
const manifest=JSON.parse(fs.readFileSync(root+'assets/fish-expansion-009/installed-manifest.json','utf8'));
const html=fs.readFileSync(root+'index.html','utf8');
const bitmap=fs.readFileSync(root+'fish-bitmap-catalog.js','utf8');
const js=fs.readFileSync(root+'fish-expansion-catalog-009.js','utf8');
const rows=[...review.species,...review.specialCreatures];
assert.equal(review.species.length,18);
assert.equal(review.specialCreatures.length,12);
assert.equal(rows.length,30);
assert.equal(new Set(rows.map(x=>x.sourceFile)).size,30);
assert.equal(new Set(rows.map(x=>x.sha256)).size,30);
assert.equal(new Set(rows.map(x=>x.nameKo)).size,30);
assert.equal(review.counts.liveAdded,10);
assert.equal(manifest.count,10);
assert.equal(manifest.baseFishCount,333);
assert.equal(manifest.fishCountAfter,343);
assert.equal(manifest.totalCatchableAfter,344);
assert.equal(manifest.originalPixelsPreserved,true);
assert.equal(manifest.pendingRealFish,8);
assert.equal(manifest.pendingFictionalSpecial,12);
assert.deepEqual(manifest.species.map(x=>x.gameId),Array.from({length:10},(_,i)=>'F'+(355+i)));
assert.equal(new Set(manifest.species.map(x=>x.scientificName.toLowerCase())).size,10);
assert.equal(new Set(manifest.species.map(x=>x.behavior.archetype)).size,10);
assert.ok(html.includes('fish-expansion-catalog-009.js?v=20261108-batch009-ten'));
assert.ok(html.includes('HumanFishingFishExpansion009.extend(species)'));
assert.ok(html.includes('sortFishForCodexByRegion'));
assert.ok(html.includes('humanFishingAlpha01'));
assert.match(fs.readFileSync(root+'assets/fish-expansion-009/ready.js','utf8'),/HumanFishingFishExpansion009Ready=true/);
assert.match(bitmap,/20261108-batch009-ten/);
const prev=['fish-expansion-catalog.js','fish-expansion-catalog-023.js','fish-expansion-catalog-004.js','fish-expansion-catalog-006.js','fish-expansion-catalog-007.js','fish-expansion-catalog-008.js'].map(x=>fs.readFileSync(root+x,'utf8'));
const pngsig=Buffer.from([137,80,78,71,13,10,26,10]);
for(const row of manifest.species){
 const reviewRow=review.species.find(x=>x.scientificName===row.scientificName);
 assert.ok(reviewRow,'Missing review record');
 assert.equal(reviewRow.gameId,row.gameId);
 assert.equal(reviewRow.status,'LIVE_WITH_VISUAL_REVIEW_FLAGS');
 assert.equal(reviewRow.sha256,row.sha256);
 assert.equal(reviewRow.sourceFile.startsWith('exec-'),true);
 assert.ok(!prev.some(x=>x.includes(row.scientificName)),'Existing taxonomy duplicate: '+row.scientificName);
 assert.ok(row.behavior&&row.behavior.archetype&&row.behavior.speedMultiplier>0);
 assert.ok(row.habitat>=0&&row.habitat<12);
 assert.ok(['SMALL','MEDIUM','LARGE'].includes(row.size));
 const png=fs.readFileSync(root+row.installedPath);
 assert.equal(png.subarray(0,8).compare(pngsig),0);
 assert.equal(png.readUInt32BE(16),row.width);
 assert.equal(png.readUInt32BE(20),row.height);
 assert.equal(png[25],6,'RGBA required');
 assert.equal(crypto.createHash('sha256').update(png).digest('hex'),row.sha256,'Original source bytes changed '+row.gameId);
 assert.equal(row.originalPixelsPreserved,true);
 assert.equal(row.artStatus,'LIVE_WITH_VISUAL_REVIEW_FLAGS');
}
for(const row of review.species.slice(10)){
 assert.equal(row.status,'ART_REVIEW','Missing original may not be installed');
 assert.equal(row.gameId,null);
}
for(const row of review.specialCreatures){
 assert.equal(row.status,'ART_REVIEW');
 assert.equal(row.gameId,null);
}
assert.equal(review.specialCreatures.filter(x=>x.qaFlags.includes('BROAD_HALO_REMAINS')).length,5);
const current={HumanFishingFishExpansion009Ready:true};vm.runInNewContext(js,{window:current});
const list=Array.from({length:334},(_,i)=>({id:'PREEXISTING_'+i}));
const baseline=JSON.stringify(list);
current.HumanFishingFishExpansion009.extend(list);
current.HumanFishingFishExpansion009.extend(list);
assert.equal(list.length,344);
assert.equal(JSON.stringify(list.slice(0,334)),baseline);
assert.ok(list.slice(334).every(x=>x.artBatch==='009'));
const disabled={HumanFishingFishExpansion009Ready:false};vm.runInNewContext(js,{window:disabled});
const empty=[];disabled.HumanFishingFishExpansion009.extend(empty);assert.equal(empty.length,0);
for(const id of ['F032','F055','F150']){
 assert.equal(fs.readFileSync(root+'assets/fish/individual/'+id+'.png').subarray(0,8).compare(pngsig),0,'Existing art lost '+id);
}
console.log('PASS: ten original batch009 fish F355-F364, original SHA256, regional codex, behavior, save continuity, existing originals and 20 pending holds.');
