'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root='human-fishing/';
const html=fs.readFileSync(root+'index.html','utf8');
const catalog=fs.readFileSync(root+'fish-bitmap-catalog.js','utf8');
const manifest=JSON.parse(fs.readFileSync(root+'assets/fish/manifest.json','utf8'));
const baseFiles=fs.readdirSync(root+'assets/fish/individual');
const missingBase=manifest.fish.filter(x=>!baseFiles.includes(x.id+'.png'));
assert.deepEqual(missingBase,[],'Original registered PNG missing');
assert.equal(manifest.counts.activeCollectionEntries,282);
assert.equal(manifest.counts.mergedVisualDuplicates,22);
assert.match(html,/\.book-fish-card\.locked \.book-fish-thumb img\{\s*filter:brightness\(0\) drop-shadow/);
assert.match(html,/loading="eager" decoding="async"/);
assert.match(fs.readFileSync(root+'boot.js','utf8'),/리소스.*로딩 실패/);
assert.match(html,/shared resource gate handles thumbnail failures/);
assert.match(html,/catalogueSpecies=species\.filter\(function\(sp\)\{return !sp\.archivedVisualDuplicate/);
assert.match(html,/!sp\.archivedVisualDuplicate&&sp\.habitat===zone&&sp\.rarity===tier/);
const env={window:{HumanFishingFishAssetsReady:true},Image:function(){},Promise};
vm.runInNewContext(catalog,env);
const art=env.window.HumanFishingArt;
const aliases=JSON.parse(catalog.match(/var visualAliases=(\{[^;]+\});/)[1]);
const expected={
  F122:'F121',F265:'F121',F266:'F123',F267:'F124',F268:'F126',
  F269:'F125',F270:'F127',F271:'F128',F272:'F129'};
for(const [id,target] of Object.entries(expected)){
 assert.equal(aliases[id],target);
 assert.equal(manifest.fish.find(f=>f.id===id).visualAliasOf,target);
}
const text=html.slice(html.indexOf('var raw=['),html.indexOf('var humans=['));
const names=[...text.matchAll(/'([^'|]+)\|([^']+)'/g)].flatMap(x=>x[2].split(','));
const fish=names.map((name,i)=>({id:'F'+String(i+1).padStart(3,'0'),name,habitat:Math.floor(i/20),index:i%20}));
art.extend(fish);
assert.equal(fish.length,283);
assert.equal(fish.filter(x=>!x.archivedVisualDuplicate).length,282);
const source=html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(source,'human-fishing.js');
console.log('PASS: 304 original PNGs, black silhouette outline, load retry, 9 archived coral lookalikes, 282 visible unique original entries');
