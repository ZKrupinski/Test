'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const src=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert(src);
new vm.Script(src);
const from=src.indexOf('var humans=['),to=src.indexOf("var key='humanFishingAlpha01'",from);
const d0=src.indexOf('function humanCodexDisplayOrder(){'),d1=src.indexOf('function renderBook(',d0);
assert(from>=0&&to>from&&d0>0&&d1>d0);
const expected=[...Array(17).keys(),18,19,20,21,38,23,
  24,25,26,27,28,29,30,31,32,33,35,36,37,34,39];
for(const installed of [false,true]){
 let seed=231;
 const rnd=(a,b)=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return a+(b-a)*(seed/4294967296)};
 const c={window:{HumanFishingSisterSpritesReady:installed,HumanFishingExtraBabiesReady:installed},rnd,Math};
 vm.createContext(c);
 vm.runInContext(src.slice(from,to),c);
 vm.runInContext(src.slice(d0,d1),c);
 const roster=Array.from(c.humanCodexDisplayOrder());
 const ids=roster.map(v=>v.id),names=roster.map(v=>v.name);
 assert.equal(c.humans.length,installed?40:35,'Keep historical save ID slots');
 assert.equal(c.humans[17],null);assert.equal(c.humans[22],null);
 assert.equal(c.humanRosterSize(),installed?38:33);
 assert.deepEqual(ids,installed?expected:expected.filter(id=>id<35));
 assert(!names.includes('공주')&&!names.includes('고고학자'));
 assert.equal(ids.filter(x=>x===38).length,installed?1:0);
 if(installed)assert.deepEqual(names.slice(-2),['천사','악마']);
 for(let k=0;k<1000;k++){
  for(const [start,len] of [[0,20],[8,12],[20,4]]){
   const id=c.pickHumanId(start,len);
   assert(c.isActiveHumanId(id), 'Inactive character spawned: '+id);
   assert(id>=start&&id<start+len,'Selected character from wrong rarity group');
  }
 }
}
assert.match(src,/save\.humanPlaced=save\.humanPlaced\.filter\(isActiveHumanId\)/);
assert.match(src,/isActiveHumanId\(humanId\)/);
assert.match(src,/humanCodexDisplayOrder\(\)\.slice\(start,start\+8\)/);
assert.match(src,/humanOwnedCount\(\)/);
console.log('PASS: two retired characters hidden; diver at old slot, devil after angel, save IDs and spawn safety');
