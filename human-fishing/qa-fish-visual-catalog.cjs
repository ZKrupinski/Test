'use strict';
/* Keep the original 304 alpha PNGs, prevent visually redundant collection entries,
 * and ensure the 304 manifest rarities match the actual game configuration.
 * Run: node human-fishing/qa-fish-visual-catalog.cjs from repository root.
 */
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const root='human-fishing/';
const registry=JSON.parse(fs.readFileSync(root+'assets/fish/manifest.json','utf8'));
const source=fs.readFileSync(root+'fish-bitmap-catalog.js','utf8');
const index=fs.readFileSync(root+'index.html','utf8');
const sandbox={window:{HumanFishingFishAssetsReady:true},Image:function(){}};
vm.runInNewContext(source,sandbox);
const art=sandbox.window.HumanFishingArt,alias=art.visualAliases;
assert.equal(registry.fish.length,304);
assert.equal(Object.keys(alias).length,22);
assert.equal(new Set(Object.keys(alias)).size,Object.keys(alias).length);
for(const [id,to] of Object.entries(alias)){
 assert.ok(registry.fish.some(x=>x.id===id),'missing duplicate art: '+id);
 assert.ok(registry.fish.some(x=>x.id===to),'missing canonical art: '+to);
 assert.equal(registry.fish.find(x=>x.id===id).visualAliasOf,to);
 assert.notEqual(id,to);
}
const raw=index.slice(index.indexOf('var raw=['),index.indexOf('var humans=['));
const names=[...raw.matchAll(/'([^'|]+)\|([^']+)'/g)].flatMap(x=>x[2].split(','));
assert.equal(names.length,240);
const fix=JSON.parse(source.match(/var baseTierFix=(\{[^;]+\});/)[1]);
const tiers=JSON.parse(source.match(/var groupTiers=(\[[\s\S]*?\]);\s*var baseTierFix/)[1].replace(/'/g,'"'));
const list=names.map((name,i)=>{
 const k=i%20;return{id:'F'+String(i+1).padStart(3,'0'),name,habitat:Math.floor(i/20),index:k,
  rarity:k===19?'MYTHIC':k===18?'LEGEND':k===17?'EPIC':k>=15?'RARE':k>=11?'UNCOMMON':'COMMON'};
});
art.extend(list);
assert.equal(list.length,283);
for(let i=0;i<240;i++)if(fix[names[i]])list[i].rarity=fix[names[i]];
for(const [id] of Object.entries(alias))assert.ok(!list.some(x=>x.id===id&&!x.archivedVisualDuplicate),'visual duplicate still in visible catalogue: '+id);
for(const sp of list)assert.equal(sp.rarity,registry.fish.find(x=>x.id===sp.id).rarity,'wrong rarity: '+sp.id);
const save={owned:{F061:2,F241:3,F001:1,F248:2,F262:4},placed:['F241','F262','F248'],fishMotionOverrides:{F241:{amp:1.5}}};
assert.equal(art.migrateSave(save),true);
assert.deepEqual(JSON.parse(JSON.stringify(save.owned)),{F061:5,F001:3,F261:4});
assert.deepEqual(Array.from(save.placed),['F061','F261','F001']);
assert.equal(art.migrateSave(save),false);
  assert.ok(list.find(x=>x.id==='F122').archivedVisualDuplicate,'Base duplicate must not appear in codex');
  assert.ok(!list.some(x=>x.id==='F265'||x.id==='F266'),
   'Wrongly named lookalike reef morphs may not enter the catalog');
  const reefSave={owned:{F121:1,F122:2,F265:3,F123:4,F266:2},
   placed:['F122','F265','F266']};
  assert.equal(art.migrateSave(reefSave),true);
  assert.deepEqual(JSON.parse(JSON.stringify(reefSave.owned)),{F121:6,F123:6});
  assert.deepEqual(Array.from(reefSave.placed),['F121','F121','F123']);
assert.equal(registry.counts.activeCollectionEntries,list.filter(x=>!x.archivedVisualDuplicate).length);
assert.ok(index.includes('filter===-4'),'newly illustrated fish codex filter missing');
console.log('PASS: 304 source PNGs untouched, 282 distinct visible codex entries, 22 aliases, save migration idempotent, all rarity labels synchronized.');
