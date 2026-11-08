'use strict';
/* Enforce original 304 untouched and reject duplicate/recolor filler.
 * Approved new-silhouette art is staged separately, never counted as live.
 */
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const base='human-fishing/';
const index=fs.readFileSync(base+'index.html','utf8');
const manifest=JSON.parse(fs.readFileSync(base+'assets/fish/manifest.json','utf8'));
const curation=JSON.parse(fs.readFileSync(base+'fish-art-curation.json','utf8'));
assert.equal(manifest.counts.total,304);
assert.equal(manifest.fish.length,304);
assert.equal(manifest.fish[0].id,'F001');
assert.equal(manifest.fish[303].id,'F304');
assert.equal(new Set(manifest.fish.map(x=>x.id)).size,304);
assert.doesNotMatch(index,/<script src="\.\/fish-expansion\.js/,
 'Never load the retired 600 recolors and misleading fish types');
assert.doesNotMatch(index,/HumanFishingSpeciesExpansion\.extend/,
 'The 600 recolor fish are not real distinct species');
assert.equal(curation.originalCataloguePreserved,304);
assert.equal(curation.artCandidates,52);
assert.equal(curation.rejectedFromNewSheets,92);
assert.equal(curation.liveAddedSpecies,0,
 'Do not say generated art has shipped until actual distinct sprites are integrated');
assert.equal(curation.candidates.length,52);
assert.equal(new Set(curation.candidates.map(x=>x.candidateId)).size,52);
assert.equal(new Set(curation.candidates.map(x=>x.name)).size,52);
assert.equal(curation.candidates.filter(x=>x.sizeClass==='SMALL').length,13);
assert.equal(curation.candidates.filter(x=>x.sizeClass==='MEDIUM').length,14);
assert.equal(curation.candidates.filter(x=>x.sizeClass==='LARGE').length,25);
assert.ok(curation.candidates.every(x=>x.status==='source-art-in-review-not-registered'));
const oldNames=new Set(manifest.fish.map(x=>x.name));
for(const candidate of curation.candidates)
 assert.ok(!oldNames.has(candidate.name),
  'Review rejected an unchanged old species name: '+candidate.name);
const dir=base+'assets/fish/individual';
for(let i=305;i<=904;i++)
 assert.ok(!fs.existsSync(path.join(dir,'F'+String(i).padStart(3,'0')+'.png')),
  'Retired duplicate artwork is still present: F'+i);
console.log('PASS: original 304 fish/saves intact, 600 duplicate/recolor PNGs fully removed, 52 distinct-silhouette candidates separated from live catalog, no padded species count.');
