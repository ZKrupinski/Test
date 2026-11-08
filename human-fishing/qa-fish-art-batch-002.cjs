'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const base='human-fishing/';
const q=JSON.parse(fs.readFileSync(base+'fish-art-batch-002-queue.json','utf8'));
const approved=JSON.parse(fs.readFileSync(base+'fish-art-batch-001-assignments.json','utf8'));
const source=JSON.parse(fs.readFileSync(base+'fish-production-candidates.json','utf8'));
assert.equal(q.candidates.length,12);
assert.equal(new Set(q.candidates.map(x=>x.scientificName)).size,12);
assert.equal(q.candidates.filter(x=>['READY_FOR_IMPORT_QA','LIVE'].includes(x.artStatus)).length,10);
assert.equal(q.candidates.filter(x=>x.artStatus==='ART_REVIEW').length,2);
assert.ok(q.candidates.every(x=>x.countsAsGameFish===(x.artStatus==='LIVE')));
assert.ok(q.candidates.filter(x=>['READY_FOR_IMPORT_QA','LIVE'].includes(x.artStatus)).every(x=>x.gameId&&x.imageFile));
assert.ok(q.candidates.every(x=>x.morphologicalDistinctiveness.length>12&&x.behavior.length>5));
assert.ok(q.candidates.every(x=>source.candidates.some(c=>c.scientificName===x.scientificName)), 'Only source-backed distinct taxa may advance');
assert.ok(q.candidates.every(x=>!approved.records.some(p=>p.scientificName===x.scientificName)), 'Duplicate in batch 001');
console.log('PASS: next 12 independent real-species art targets, no duplicated taxonomy and no ungenerated assets counted as live');

for(const x of q.candidates.filter(x=>x.artStatus==='ART_REVIEW')){
 assert.equal(x.gameId,null);assert.equal(x.imageFile,null);
 assert.ok(fs.existsSync(base+x.reviewImageFile));
 assert.ok(x.reviewHolds.length>0);
}
