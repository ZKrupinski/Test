'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const base='human-fishing/';
const inv=JSON.parse(fs.readFileSync(base+'fish-art-fast-inventory.json','utf8'));
const special=JSON.parse(fs.readFileSync(base+'special-creature-candidates.json','utf8'));
const first=JSON.parse(fs.readFileSync(base+'fish-art-batch-001-assignments.json','utf8'));
const second=JSON.parse(fs.readFileSync(base+'fish-art-batch-002-queue.json','utf8'));
const firstValid=['F306','F311','F312','F314','F315','F316'];
const firstHold=['F305','F308','F309','F313','F317'];
const secondValid=Array.from({length:10},(_,i)=>'F'+(319+i));
assert.equal(inv.confirmedLiveBeforeFastPack,304);
assert.deepEqual(inv.originalFirstSourceReady,firstValid);
assert.deepEqual(inv.originalFirstSourceEdgeHolds,firstHold);
assert.deepEqual(inv.originalSecondSourceReady,secondValid);
assert.equal(inv.fastPack,'fish-art-fast-pack-17.zip');
assert.equal(inv.presentOnlyAsArtReview.silhouetteCandidates,52);
assert.equal(special.candidates.length,24);
assert.equal(new Set(special.candidates.map(x=>x.id)).size,24);
assert.equal(special.liveCount,13,'All S001 and S006-S017 approved specials must be LIVE');
assert.ok(special.candidates.filter(x=>x.id>='S006'&&x.id<='S017').every(x=>x.gameStatus==='LIVE'&&x.rarity==='MYTHIC'));
assert.ok(special.candidates.filter(x=>x.id>='S018').every(x=>x.gameStatus==='CONCEPT_NO_ART'&&x.imagePath===null));
assert.ok(firstHold.every(id=>first.records.some(x=>x.gameId===id&&x.artStatus==='HOLD_SOURCE_EDGE_CLIP_REVIEW')));
assert.ok(firstValid.every(id=>first.records.some(x=>x.gameId===id&&['READY_FOR_IMPORT_QA','LIVE'].includes(x.artStatus))));
assert.ok(secondValid.every(id=>second.candidates.some(x=>x.gameId===id&&['READY_FOR_IMPORT_QA','LIVE'].includes(x.artStatus))));
assert.deepEqual(second.candidates.filter(x=>x.artStatus==='LIVE_WITH_REVIEW_FLAGS').map(x=>x.gameId).sort(),['F334','F335']);
const r1=fs.readFileSync(base+'assets/fish-expansion/ready.js','utf8').includes('=true');
const r2=fs.readFileSync(base+'assets/fish-expansion-023/ready.js','utf8').includes('=true');
const r3=fs.readFileSync(base+'assets/special-creatures/ready.js','utf8').includes('=true');
assert.equal(r1,r2,'Fast-pack must not activate only one fish portion');
assert.equal(r2,r3,'Fast-pack special creature and fish activation must match');
if(r1){
 const parts=['assets/fish-expansion/installed-manifest.json','assets/fish-expansion-023/installed-manifest.json'];
 const approved=parts.flatMap(path=>JSON.parse(fs.readFileSync(base+path,'utf8')).species);
 assert.equal(approved.length,16);
 for(const row of approved){
  const png=fs.readFileSync(base+'assets/fish/individual/'+row.gameId+'.png');
  assert.equal(crypto.createHash('sha256').update(png).digest('hex'),row.sha256);
 }
 assert.ok(fs.existsSync(base+'assets/special-creatures/S001.png'));
 assert.equal(inv.fastPackInstalled,true);
 assert.equal(inv.confirmedLiveAfterFastPack,320);
}else{
 assert.notEqual(inv.fastPackInstalled,true);
}
console.log('PASS: 16 verified originals staged or installed together, five edge-clip images held, 24 special concepts tracked separately, two Work duplicates reconciled');
