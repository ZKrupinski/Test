'use strict';
/* 304 preserved PNGs + 600 isolated new alpha-clean fish sprites, 12 zones,
 * full rarity/level metadata, source anatomy, old saved ID compatibility.
 * Run: node human-fishing/qa-fish-expansion.cjs
 */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root='human-fishing/';
const html=fs.readFileSync(root+'index.html','utf8');
const source=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
const expansion=fs.readFileSync(root+'fish-expansion.js','utf8');
const artSrc=fs.readFileSync(root+'fish-bitmap-catalog.js','utf8');
const manifest=JSON.parse(fs.readFileSync(root+'assets/fish/manifest.json','utf8'));
assert.ok(source,'Inline game missing');
assert.match(html,/<script src="\.\/fish-expansion\.js\?v=20261108-fish904-v1"><\/script>/,
 'Full fish expansion must load synchronously before the game script');
assert.match(source,/HumanFishingSpeciesExpansion\.extend\(species,fishVisualProfile\)/,
 'Expansion must register AFTER 64 existing original variants, BEFORE gameplay and codex');
const block=source.match(/var raw=\[([\s\S]*?)\];/);
assert.ok(block,'Original 240 species list missing');
const names=block[1].trim().split('\n').map(s=>
 s.trim().replace(/^'/,'').replace(/',?$/,'').split('|')[1].split(','));
assert.equal(names.length,12);
const list=[];
names.forEach((group,h)=>{
 assert.equal(group.length,20);
 group.forEach((name,k)=>list.push({
  id:'F'+String(list.length+1).padStart(3,'0'),habitat:h,name:name,index:k,
  rarity:k>=18?'LEGEND':k>=14?'RARE':'COMMON',level:1
 }));
});
const sandbox={window:{HumanFishingFishAssetsReady:true},Image:function(){},console,Math,Array,Set,Object,String,Number};
vm.createContext(sandbox);
vm.runInContext(artSrc,sandbox,{filename:'fish-bitmap-catalog.js'});
const art=sandbox.window.HumanFishingArt;
assert.ok(art&&art.enabled,'Original fish art loader missing');
art.extend(list);
assert.equal(list.length,304,'Preserve original 304 stable IDs');
const old=list.map(x=>({id:x.id,name:x.name,habitat:x.habitat}));
vm.runInContext(expansion,sandbox,{filename:'fish-expansion.js'});
const ext=sandbox.window.HumanFishingSpeciesExpansion;
assert.ok(ext,'New-fish catalog module missing');
assert.equal(ext.groups.length,12);
ext.extend(list,sp=>({category:sp.habitat===7?'SPECIAL':
 sp.habitat===0?'SMALL':sp.habitat===9?'LARGE':'MEDIUM'}));
assert.equal(list.length,904,'Triple old 304 collectibles with 600 additions');
assert.equal(new Set(list.map(s=>s.id)).size,904);
assert.equal(new Set(list.map(s=>s.name)).size,904,'Every named fish must be unique');
assert.deepEqual(list.slice(0,304).map(s=>({id:s.id,name:s.name,habitat:s.habitat})),old,
 'Existing fish names/IDs and user saves must remain untouched');
for(let h=0;h<12;h++){
 const zone=list.filter(s=>s.habitat===h);
 assert.equal(zone.length,old.filter(sp=>sp.habitat===h).length+50,
  'Each habitat must keep ALL its original base and preexisting morphs, plus 50 new types');
 const extra=zone.filter(s=>s.artExpansion);
 assert.equal(extra.length,50,'12 areas x 50 new types');
 assert.equal(extra.filter(s=>s.colorMorph).length,25,'25 new named + 25 color variants per area');
 for(const s of extra){
  assert.ok(['SMALL','MEDIUM','LARGE','SPECIAL'].includes(s.artSizeClass));
  assert.ok(['COMMON','UNCOMMON','RARE','EPIC','LEGEND','MYTHIC'].includes(s.rarity));
  assert.ok(s.level>=1&&s.level<=80);
  assert.ok(/^F\d{3}$/.test(s.sourceFishId)&&+s.sourceFishId.slice(1)<=240);
 }
}
const newFish=list.filter(s=>s.artExpansion);
assert.equal(newFish.length,600);
assert.equal(newFish.filter(s=>s.artVariant).length,300);
assert.equal(newFish.filter(s=>!s.artVariant).length,300);
const before=list.length;
ext.extend(list,()=>({category:'MEDIUM'}));
assert.equal(list.length,before,'Double catalog installation must never duplicate entries');
assert.equal(manifest.fish.length,904);
assert.equal(manifest.counts.total,904);
assert.equal(manifest.counts.additionalNamed,300);
assert.equal(manifest.counts.additionalColorMorphs,300);
assert.equal(manifest.fish[0].id,'F001');
assert.equal(manifest.fish[303].id,'F304');
const byID=new Map(manifest.fish.map(x=>[x.id,x]));
const imageHash=new Set(),sourceFolders=new Set();
let bytes=0;
for(const sp of newFish){
 const details=byID.get(sp.id);
 assert.ok(details,'No manifest entry for '+sp.id);
 assert.equal(details.name,sp.name,'Name must match PNG provenance '+sp.id);
 assert.equal(details.habitat,sp.habitat);
 assert.equal(details.rarity,sp.rarity);
 assert.equal(details.sourceOriginalId,sp.sourceFishId,
 'Raster source anatomy must match in-game behavior '+sp.id);
 const path=root+'assets/fish/individual/'+sp.id+'.png';
 assert.ok(fs.existsSync(path),'Missing unique fish PNG '+sp.id);
 const raw=fs.readFileSync(path);
 assert.ok(raw.length>3200,'Tiny/truncated PNG '+sp.id);
 assert.equal(raw.subarray(1,4).toString('ascii'),'PNG');
 assert.equal(raw.subarray(12,16).toString('ascii'),'IHDR');
 assert.equal(raw[25],6,'Only true RGBA transparent PNGs allowed for '+sp.id);
 bytes+=raw.length;
 imageHash.add(crypto.createHash('sha256').update(raw).digest('hex'));
 sourceFolders.add(details.sourceOriginalId);
}
assert.equal(imageHash.size,600,'600 individual fish files must not be byte-identical');
assert.ok(sourceFolders.size>=150,'New fish should preserve many unique approved body silhouettes');
assert.ok(bytes<100*1024*1024,'Additional 600 PNGs must remain a downloadable game asset set');
const variantCap=/(variants\.length&&natural\.length\?\(Math\.random\(\)<\.32\?variants:natural\))/;
assert.match(source,variantCap,
 'Fish spawning must preserve rarity and distinguish base names from color morphs');
console.log('PASS: 904 stable unique catalog IDs, 12 expanded habitats, 600 original-derived RGBA PNGs (different colors/patterns), 300 names + 300 explicitly marked morphs, existing saves unchanged.');