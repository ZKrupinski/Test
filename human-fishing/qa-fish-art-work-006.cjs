'use strict';
// Run from repository root: node human-fishing/qa-fish-art-work-006.cjs
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const root='human-fishing/';
const installed=JSON.parse(fs.readFileSync(root+'assets/fish-expansion-006/installed-manifest.json','utf8'));
const source=fs.readFileSync(root+'fish-expansion-catalog-006.js','utf8');
const html=fs.readFileSync(root+'index.html','utf8');
assert.equal(installed.count,8);
assert.equal(installed.species.length,8);
assert.equal(installed.originalPixelsPreserved,true);
assert.equal(new Set(installed.species.map(x=>x.gameId)).size,8);
assert.equal(new Set(installed.species.map(x=>x.scientificName)).size,8);
assert.ok(html.includes('assets/fish-expansion-006/ready.js?v=20261108-work8'));
assert.ok(html.includes('HumanFishingFishExpansion006.extend(species)'));
assert.match(fs.readFileSync(root+'assets/fish-expansion-006/ready.js','utf8'),/HumanFishingFishExpansion006Ready=true/);
for(const row of installed.species){
 const sourceReview=JSON.parse(fs.readFileSync(root+row.sourcePath.replace(/\/[^/]+$/,'/review-manifest.json'),'utf8'));
 const reference=sourceReview.species.find(x=>x.scientificName===row.scientificName);
 assert.ok(reference,row.scientificName);
 assert.equal(reference.gitBlobSha,row.gitBlobSha);
 assert.equal(reference.sha256,row.sha256);
 const original=fs.readFileSync(root+row.sourcePath);
 const installedPng=fs.readFileSync(root+'assets/fish/individual/'+row.filename);
 assert.ok(original.equals(installedPng),'Original PNG was modified: '+row.gameId);
 assert.equal(crypto.createHash('sha256').update(installedPng).digest('hex'),row.sha256);
 assert.equal(installedPng.subarray(1,4).toString('ascii'),'PNG');
 assert.equal(installedPng.readUInt32BE(16),row.width);
 assert.equal(installedPng.readUInt32BE(20),row.height);
 assert.equal(installedPng[25],6,'PNG must have RGBA');
 assert.ok(Array.isArray(row.reviewHolds)&&row.reviewHolds.length>0,'Unresolved visual holds must be disclosed');
}
for(const active of [false,true]){
 const win={HumanFishingFishExpansion006Ready:active};
 vm.runInNewContext(source,{window:win});
 const a=Array.from({length:296},(_,i)=>({id:'EXIST'+i}));
 win.HumanFishingFishExpansion006.extend(a);
 win.HumanFishingFishExpansion006.extend(a);
 assert.equal(a.length,active?304:296);
}
console.log('PASS: 8 Work-origin RGBA PNGs installed byte-identically, gated species/animation registration and no art retouching; recorded visual holds are not waived.');
