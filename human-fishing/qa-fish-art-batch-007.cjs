'use strict';
// node human-fishing/qa-fish-art-batch-007.cjs
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto'),vm=require('node:vm');
const root='human-fishing/';
const manifest=JSON.parse(fs.readFileSync(root+'assets/fish-expansion-007/installed-manifest.json','utf8'));
const review=JSON.parse(fs.readFileSync(root+'art-review/batch-007/review-manifest.json','utf8'));
const html=fs.readFileSync(root+'index.html','utf8');
const src=fs.readFileSync(root+'fish-expansion-catalog-007.js','utf8');
assert.equal(manifest.count,6);assert.equal(manifest.baseFishCount,320);assert.equal(manifest.fishCountAfterInstall,326);
assert.equal(manifest.totalCatchableSpeciesAfterInstall,327);
assert.equal(manifest.originalPixelsPreserved,true);
assert.equal(new Set(manifest.species.map(x=>x.gameId)).size,6);
assert.equal(new Set(manifest.species.map(x=>x.scientificName)).size,6);
assert.ok(html.includes('assets/fish-expansion-007/ready.js?v=20261108-batch007'));
assert.ok(html.includes('fish-expansion-catalog-007.js?v=20261108-batch007'));
assert.ok(html.includes('HumanFishingFishExpansion007.extend(species)'));
assert.match(fs.readFileSync(root+'assets/fish-expansion-007/ready.js','utf8'),/HumanFishingFishExpansion007Ready=true/);
const pngSignature=Buffer.from([137,80,78,71,13,10,26,10]);
for(const row of manifest.species){
 assert.match(row.gameId,/^F34[2-7]$/);assert.ok(row.scientificName&&row.nameKo);
 const png=fs.readFileSync(root+row.installedPath);
 assert.equal(png.subarray(0,8).compare(pngSignature),0,row.gameId+' PNG signature');
 assert.equal(png.readUInt32BE(16),row.width);assert.equal(png.readUInt32BE(20),row.height);
 assert.equal(png[25],6,row.gameId+' must be RGBA PNG');
 assert.equal(crypto.createHash('sha256').update(png).digest('hex'),row.sha256);
 const r=review.species.find(x=>x.gameId===row.gameId);assert.ok(r);assert.equal(r.originalSha256,row.sha256);
 assert.ok(row.behavior?.archetype);assert.ok(row.behavior?.speedMultiplier>0);
 assert.ok(row.habitat>=0&&row.habitat<12);assert.ok(['SMALL','MEDIUM','LARGE'].includes(row.size));
 if(row.gameId==='F345'){assert.equal(row.regionProvisional,true);assert.match(row.nativeRegion,/파라과이/);}
 if(row.gameId==='F344'){assert.equal(row.regionProvisional,true);assert.match(row.nativeRegion,/서아프리카/);}
}
assert.equal(new Set(manifest.species.map(x=>x.behavior.archetype)).size,6);
const win={HumanFishingFishExpansion007Ready:true};vm.runInNewContext(src,{window:win});
const list=Array.from({length:321},(_,i)=>({id:'existing-'+i}));
win.HumanFishingFishExpansion007.extend(list);win.HumanFishingFishExpansion007.extend(list);
assert.equal(list.length,327);assert.equal(new Set(list.map(x=>x.id)).size,list.length);
assert.ok(list.slice(-6).every(x=>x.expansionSpecies&&x.artBatch==='007'));
const disabled={HumanFishingFishExpansion007Ready:false};vm.runInNewContext(src,{window:disabled});
const none=[];disabled.HumanFishingFishExpansion007.extend(none);assert.equal(none.length,0);
assert.ok(html.includes('humanFishingAlpha01'),'Existing save key must not change');
// Codex display order must group every historical and newly installed fish by its
// registered habitat, then by stable ID. Do not reorder gameplay species or save keys.
assert.match(html,/var visibleFish=sortFishForCodexByRegion\\(/);
const sorterSource=html.match(/function sortFishForCodexByRegion\\(list\\)\\{[\\s\\S]*?\\n\\}/);
assert.ok(sorterSource,'Codex sorting helper must be present');
const sortCtx={};vm.runInNewContext(sorterSource[0]+';this.sortCodex=sortFishForCodexByRegion;',sortCtx);
const unsorted=[
 {id:'F346',habitat:4},{id:'F342',habitat:3},{id:'F007',habitat:0},
 {id:'F347',habitat:2},{id:'F341',habitat:7},{id:'F343',habitat:2},
 {id:'F339',habitat:4},{id:'F344',habitat:2},{id:'F345',habitat:1},
 {id:'F328',habitat:10},{id:'S001',habitat:10,specialCreature:true}
];
const before=JSON.stringify(unsorted);
const ordered=sortCtx.sortCodex(unsorted);
assert.deepEqual(Array.from(ordered,x=>x.id),
 ['F007','F345','F343','F344','F347','F342','F339','F346','F341','F328','S001']);
assert.equal(JSON.stringify(unsorted),before,'Codex sorting must not mutate authoritative species');
const fishOnly=sortCtx.sortCodex(unsorted.filter(x=>!x.specialCreature));
assert.equal(fishOnly.length,10,'Fish-only filter should retain ten example fish');
const regionTwo=sortCtx.sortCodex(unsorted.filter(x=>x.habitat===2));
assert.deepEqual(Array.from(regionTwo,x=>x.id),['F343','F344','F347']);
console.log('PASS: codex grouped by region with newly added species in regional ID order; gameplay order untouched.');
console.log('PASS: six byte-identical RGBA sprites, 320->326 fish + S001, codex/AI/habitat registration and save continuity.');
