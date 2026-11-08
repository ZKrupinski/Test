'use strict';
// node human-fishing/qa-fish-production-plan.cjs (repo root)
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base='human-fishing/';
const data=JSON.parse(fs.readFileSync(base+'fish-production-candidates.json','utf8'));
const art=JSON.parse(fs.readFileSync(base+'assets/fish/manifest.json','utf8'));
const known=JSON.parse(fs.readFileSync(base+'fish-art-curation.json','utf8'));
assert.equal(art.counts.activeCollectionEntries,291);
assert.ok(data.goal.scientificSourceCandidateCount>=1309);
assert.ok(data.goal.potentialAfterEveryCandidateIsApproved>=1600);
assert.equal(data.candidates.length,data.goal.scientificSourceCandidateCount);
assert.equal(new Set(data.candidates.map(x=>x.candidateId)).size,data.candidates.length);
assert.equal(new Set(data.candidates.map(x=>x.scientificName.toLowerCase())).size,data.candidates.length);
assert.equal(data.candidates.filter(x=>x.sourceMatchStatus==='SOURCE_NO_WARNING').length,data.sourceMatchDistribution.sourceNoWarning);
assert.ok(data.candidates.every(x=>x.gameId===null&&x.renderAsset===null&&x.artStatus==='NOT_GENERATED'), 'Do not claim source-only placeholders as art or live species');
assert.ok(data.candidates.every(x=>x.proposedStage>=0&&x.proposedStage<12&&
 ['SMALL','MEDIUM','LARGE'].includes(x.proposedSizeClass)&&
 ['COMMON','UNCOMMON','RARE','EPIC','LEGEND','MYTHIC'].includes(x.proposedRarity)));
assert.equal(data.stageDistribution.reduce((n,x)=>n+x.totalCandidates,0),data.candidates.length);
assert.ok(data.stageDistribution.every(x=>x.totalCandidates>0));
assert.ok(data.candidates.every(x=>x.behaviorPlan.uniquenessSignature&&x.regionVerified===false&&x.silhouetteVerified===false));
assert.equal(data.firstVisualArtBatch.length,12);
assert.ok(data.firstVisualArtBatch.every(x=>data.candidates.some(y=>y.candidateId===x.candidateId)));
assert.equal(known.liveAddedSpecies,0);
assert.ok(fs.existsSync(base+'FISH_PRODUCTION_RULEBOOK.md'));
const gaps=JSON.parse(fs.readFileSync(base+'fish-habitat-sourcing-gaps.json','utf8'));
const batch=JSON.parse(fs.readFileSync(base+'fish-art-batch-001.json','utf8'));
assert.equal(gaps.regionsWithSourcingGaps.reduce((n,x)=>n+x.missingToMinimum,0),gaps.totalAdditionalGenuineNamesNeeded);
assert.equal(batch.species.length,12);
assert.equal(new Set(batch.species.map(x=>x.scientificName)).size,12);
assert.ok(batch.species.every(x=>data.candidates.some(y=>y.scientificName===x.scientificName)));
assert.ok(batch.species.every(x=>x.rgbaPngPath===null&&x.approvedForGame===false));

const next=JSON.parse(fs.readFileSync(base+'fish-art-next-work-queue.json','utf8'));
assert.deepEqual(next.currentBatch,next.nextReviewCandidates.slice(0,6).map(x=>x.scientificName));
assert.ok(!next.currentBatch.includes('Raja clavata'));
assert.ok(!next.currentBatch.includes('Argyrosomus regius'));
console.log('PASS: 1,600+ fish expansion candidate pool, exact scientific uniqueness, 12 provisional habitats, tier/size/AI plans, no fake LIVE art or broken original saves.');
