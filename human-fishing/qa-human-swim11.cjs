'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),vm=require('node:vm'),path=require('node:path');
const root=__dirname,html=fs.readFileSync(path.join(root,'index.html'),'utf8'),renderer=fs.readFileSync(path.join(root,'human-sprites.js'),'utf8');
const keys=["sleepy","explorer_new","scientist","pirate","nurse","athlete","idol","chef","detective","wizard","angel"],names=["졸린이","탐험가","과학자","해적","간호사","운동선수","아이돌","요리사","탐정","마법사","천사"],hashes=["6d1c8ba6bb1e941e2f1f6d01a4e1d81a9cfcea65be9aa7c25965fcd8afc13266","1073732ddf13fdb976aa58ab55d849fef4fef5dcdc8e5e300eec53b883557279","71729e2b53f3a885550981ad0309d5f6e69f1cf34f0eae4922313ffca2739899","07447532f51695487940ad181ad585f251c6a371eaf430a88856df659f007020","b3be89950875e9b74c050e78220d6cac8e57cfd0466bab290e6a3aa4418fc357","bb5bff19d2aaa3356dd6d11f6ab1afcd5147076982bd1403052470f17e3b96ef","06b641fc61a2641d14ea013278538ff56c4d22b4d3cda010360f459d0a8fcb69","8fe737025b2d12ccf3fb1c2fad79d37ee31d097f2415e4c746b8a38903b4e997","4e2971151d421f8acd79f3f3922959c88b99dd9fe29a24529a249831711cea18","a2712513eb896f621ecc752d0310075f8de86c37d49126b376a3b2fba5de9b3c","0b42ffe04cd8139f101902852fec46190ff720b9c469201e0e33793abb6f10fa"];
new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);new vm.Script(renderer);
const all=vm.runInNewContext(html.match(/var humans=(\[[^;]*\]);/)[1]);assert.equal(all.length,35);
for(let i=0;i<11;i++){
 assert.equal(all[24+i],names[i]);assert(renderer.includes("'"+(24+i)+"':'"+keys[i]+"'"));
 const b=fs.readFileSync(path.join(root,'assets','humans','baby_swim_'+keys[i]+'_8f.png'));
 assert.equal(crypto.createHash('sha256').update(b).digest('hex'),hashes[i]);
 assert.equal(b.readUInt32BE(16),i?1776:1448);assert.equal(b.readUInt32BE(20),i?888:1086);assert.equal(b[25],6);
}
assert(html.includes('humanExhibitIds()'));
assert(html.includes("human-sprites.js?v=20261111-human-swim11-v2"));
assert(html.includes("function paintHumanUiThumb(canvas,crop,locked)"));
assert(html.includes("id:(Math.random()<.42?24+Math.floor(rnd(0,11))"));
console.log('PASS: 11 new swimmers and 35-entry catalog');
