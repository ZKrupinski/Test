'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root='human-fishing/';
const source=fs.readFileSync(root+'fish-bitmap-catalog.js','utf8');
const html=fs.readFileSync(root+'index.html','utf8');
const data=JSON.parse(fs.readFileSync(root+'special-creature-candidates.json','utf8'));
const manifest=JSON.parse(fs.readFileSync(root+'assets/special-creatures/batch-002-installed-manifest.json','utf8'));
const installedIds=manifest.creatures.map(x=>x.id).sort();
assert.deepEqual(installedIds,Array.from({length:12},(_,i)=>'S'+String(i+6).padStart(3,'0')));
assert.equal(manifest.installStatus,'SPRITES_INSTALLED_AND_CATALOG_LIVE');
assert.equal(manifest.gameCatalogChanged,true);
assert.equal(data.candidates.length,24);
assert.equal(new Set(data.candidates.map(x=>x.id)).size,24);
const liveRows=data.candidates.filter(x=>x.gameStatus==='LIVE');
assert.equal(liveRows.length,13);
assert.equal(data.liveCount,13);
assert.equal(data.plannedWithoutArt,11);
assert.deepEqual(liveRows.map(x=>x.id).sort(),['S001',...installedIds]);
assert.ok(liveRows.every(x=>x.rarity==='MYTHIC'&&x.countsToward1600FishGoal===false));
assert.ok(data.candidates.filter(x=>x.id>='S018').every(x=>x.gameStatus==='CONCEPT_NO_ART'&&x.imagePath===null));
assert.ok(data.candidates.filter(x=>x.id>='S002'&&x.id<='S005').every(x=>x.imagePath===null));
for(const a of manifest.creatures){
 const c=liveRows.find(x=>x.id===a.id);
 assert.ok(c,'Missing LIVE special '+a.id);
 assert.equal(c.name,a.nameKo,'Sprite/name mismatch '+a.id);
 assert.equal(c.assetSha256,a.sha256,'Manifest candidate SHA mismatch '+a.id);
 assert.equal(c.imagePath,'assets/special-creatures/'+a.filename);
 const file=root+c.imagePath;
 assert.ok(fs.existsSync(file),'Missing approved original '+file);
 const bytes=fs.readFileSync(file);
 assert.equal(bytes.length,a.bytes,'Asset byte length '+a.id);
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),a.sha256,'Asset hash '+a.id);
}
function load(ready){
 const images=[];
 function Image(){images.push(this)}
 const window={HumanFishingFishAssetsReady:true,HumanFishingSpecialAssetsReady:ready};
 vm.runInNewContext(source,{window,Image,Promise});
 const list=Array.from({length:240},(_,i)=>({id:'F'+String(i+1).padStart(3,'0'),name:'base'+i,habitat:Math.floor(i/20),index:i%20}));
 window.HumanFishingArt.extend(list);
 return {list,art:window.HumanFishingArt,images};
}
const off=load(false),on=load(true);
assert.equal(off.list.length,291,'No extra fish registered without ready flag');
assert.equal(on.list.length,304,'291 original + 13 active special');
assert.equal(off.art.specialCount,0);
assert.equal(on.art.specialCount,13);
assert.equal(on.list.filter(x=>x.specialCreature).length,13);
assert.equal(new Set(on.list.map(x=>x.id)).size,304);
for(const row of liveRows){
 const sp=on.list.find(x=>x.id===row.id);
 assert.ok(sp&&sp.specialCreature);
 assert.equal(sp.name,row.name);
 assert.equal(sp.habitat,row.habitat);
 assert.equal(sp.rarity,'MYTHIC');
 assert.equal(sp.artSizeClass,row.size);
 assert.equal(sp.behaviorArchetype,row.behavior);
 assert.equal(on.art.bitmap(row.id),null,'Async bitmap should load safely');
 const last=on.images.at(-1);
 assert.equal(last.src,'./assets/special-creatures/'+row.id+'.png?v=20261109-special-live13');
}
assert.equal(on.art.bitmap('S002'),null,'Unfinished special cannot be loaded');
assert.equal(on.art.bitmap('S018'),null,'Unfinished special cannot be loaded');
assert.match(html,/value="-5"/,'The special-creature codex filter must be present');
assert.match(html,/sp\.specialCreature\?'\.\/assets\/special-creatures\//);
assert.match(html,/sp\.specialCreature/);
assert.match(html,/specialPulseAt/);
assert.match(html,/assets\/special-creatures\/ready\.js/);
const ready=fs.readFileSync(root+'assets/special-creatures/ready.js','utf8');
assert.ok(ready.includes('=true'));
console.log('PASS: all 13 mythic special creatures are live in the codex, all 12 newly installed original PNG SHA-256 hashes match, 291 core fish remain unchanged.');
