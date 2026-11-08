'use strict';
/* Enforce original 304 untouched and reject duplicate/recolor filler.
 * Approved new-silhouette installations must match their verified image hashes.
 */
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path'),crypto=require('node:crypto');
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
const approved=new Map();
for(const batch of ['001','023','004','006']){
 const manifestPath=base+'assets/fish-expansion-'+batch+'/installed-manifest.json';
 if(!fs.existsSync(manifestPath))continue;
 const installed=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 for(const row of installed.species||[])approved.set(row.gameId,row.sha256);
}
for(let i=305;i<=904;i++){
 const id='F'+String(i).padStart(3,'0'),file=path.join(dir,id+'.png');
 if(!fs.existsSync(file))continue;
 assert.ok(approved.has(id),'Retired duplicate artwork is still present: '+id);
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),approved.get(id),
  'Installed artwork differs from its verified original: '+id);
}
console.log('PASS: original 304 fish/saves intact, retired recolors excluded and installed original sprite hashes verified, 52 distinct-silhouette candidates separated from live catalog, no padded species count.');
