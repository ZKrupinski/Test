'use strict';
// Batch 009 is a production review, not a live installation.
// Keep source references intact until every original PNG can be fetched and hash-verified.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const root='human-fishing/';
const manifest=JSON.parse(fs.readFileSync(root+'art-review/batch-009/review-manifest.json','utf8'));
const fish=manifest.species||[];
const special=manifest.specialCreatures||[];
const rows=[...fish,...special];
assert.equal(manifest.batch,'009');
assert.equal(manifest.status,'ART_REVIEW_NOT_INSTALLED');
assert.equal(manifest.counts.realFishArt,18);
assert.equal(manifest.counts.fictionalSpecialArt,12);
assert.equal(manifest.counts.liveAdded,0);
assert.equal(fish.length,18);
assert.equal(special.length,12);
assert.equal(rows.length,30);
assert.equal(new Set(fish.map(x=>x.scientificName.toLowerCase())).size,18);
assert.equal(new Set(rows.map(x=>x.nameKo)).size,30);
assert.equal(new Set(rows.map(x=>x.sourceFile)).size,30);
assert.equal(new Set(rows.map(x=>x.sha256)).size,30);
assert.equal(new Set(special.map(x=>x.specialId)).size,12);
for(const x of rows){
 assert.equal(x.status,'ART_REVIEW',x.nameKo+' must remain review-only');
 assert.equal(x.gameId,null,x.nameKo+' must not receive an unverified live ID');
 assert.match(x.sourceFile,/^exec-[a-f0-9-]+\.png$/,x.nameKo+' source reference');
 assert.match(x.sha256,/^[0-9a-f]{64}$/,x.nameKo+' recorded SHA256');
 assert.ok(Array.isArray(x.dimensions)&&x.dimensions.length===2,x.nameKo+' recorded dimensions');
 assert.ok(x.dimensions.every(n=>Number.isSafeInteger(n)&&n>0),x.nameKo+' valid dimensions');
 assert.equal(x.mode,'RGBA',x.nameKo+' mode');
 assert.ok(x.qaFlags.includes('ALPHA_EDGE_AND_ANATOMY_REVIEW_REQUIRED'),x.nameKo+' pending visual QA');
}
const halos=special.filter(x=>x.qaFlags.includes('BROAD_HALO_REMAINS'));
assert.equal(halos.length,5,'Five unresolved halo source files must remain on hold');
assert.ok(halos.every(x=>x.cleanupAttempt===true),'Halo cleanup attempt must be recorded');
// Cross-check existing installed metadata, not proposed future taxa.
const installed=[
 'assets/fish-expansion/installed-manifest.json',
 'assets/fish-expansion-023/installed-manifest.json',
 'assets/fish-expansion-004/installed-manifest.json',
 'assets/fish-expansion-006/installed-manifest.json',
 'assets/fish-expansion-007/installed-manifest.json',
 'assets/fish-expansion-008/installed-manifest.json'
];
const already=new Set();
for(const path of installed){
 if(!fs.existsSync(root+path))continue;
 const data=JSON.parse(fs.readFileSync(root+path,'utf8'));
 for(const x of data.species||[])if(x.scientificName)already.add(x.scientificName.toLowerCase());
}
for(const x of fish)assert.ok(!already.has(x.scientificName.toLowerCase()),'Duplicate live scientific name: '+x.scientificName);
const html=fs.readFileSync(root+'index.html','utf8');
const base=fs.readFileSync(root+'fish-bitmap-catalog.js','utf8');
for(const x of fish){
 assert.ok(!html.includes(x.scientificName),'Taxon already in main game: '+x.scientificName);
 assert.ok(!base.includes(x.nameKo),'Name already in base bitmap catalog: '+x.nameKo);
}
const specialPlan=JSON.parse(fs.readFileSync(root+'special-creature-candidates.json','utf8'));
const liveSpecial=new Set((specialPlan.candidates||[]).filter(x=>x.gameStatus==='LIVE').map(x=>x.name));
for(const x of special)assert.ok(!liveSpecial.has(x.nameKo),'Duplicate LIVE special: '+x.nameKo);
// Never report the 30 review-only images as installed or increase the codex count.
assert.ok(!html.includes('fish-expansion-catalog-009.js'));
assert.ok(!html.includes('fish-expansion-009/ready.js'));
assert.match(html,/humanFishingAlpha01/);
console.log('PASS: batch009 review manifest tracks 18 fish + 12 specials, 30 distinct source hashes, five unresolved halos; no duplicate live taxa, no IDs, no unauthorized game activation.');
console.log('PENDING: original PNG bytes not in repository. Source hash, alpha and silhouette verification, habitat/rarity/AI mapping, installation and deploy remain blocked until originals are available.');
