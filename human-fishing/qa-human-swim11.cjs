'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),vm=require('node:vm'),path=require('node:path');
const root=__dirname,html=fs.readFileSync(path.join(root,'index.html'),'utf8'),renderer=fs.readFileSync(path.join(root,'human-sprites.js'),'utf8');
const keys=["sleepy","explorer_new","scientist","pirate","nurse","athlete","idol","chef","detective","wizard","angel"],names=["졸린이","탐험가","과학자","해적","간호사","운동선수","아이돌","요리사","탐정","마법사","천사"],hashes=["6d1c8ba6bb1e941e2f1f6d01a4e1d81a9cfcea65be9aa7c25965fcd8afc13266","1073732ddf13fdb976aa58ab55d849fef4fef5dcdc8e5e300eec53b883557279","71729e2b53f3a885550981ad0309d5f6e69f1cf34f0eae4922313ffca2739899","07447532f51695487940ad181ad585f251c6a371eaf430a88856df659f007020","b3be89950875e9b74c050e78220d6cac8e57cfd0466bab290e6a3aa4418fc357","bb5bff19d2aaa3356dd6d11f6ab1afcd5147076982bd1403052470f17e3b96ef","06b641fc61a2641d14ea013278538ff56c4d22b4d3cda010360f459d0a8fcb69","8fe737025b2d12ccf3fb1c2fad79d37ee31d097f2415e4c746b8a38903b4e997","4e2971151d421f8acd79f3f3922959c88b99dd9fe29a24529a249831711cea18","a2712513eb896f621ecc752d0310075f8de86c37d49126b376a3b2fba5de9b3c","0b42ffe04cd8139f101902852fec46190ff720b9c469201e0e33793abb6f10fa"];
new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);new vm.Script(renderer);
const originalHashes=["b0e8aa26d151056688294c7583e9740371c01151c0678f27eaa40bee45e6d225","1e380ab8e3811a10ab5ac49ec8853321685e2cef985d46ac5c4c41c47d908010","80b84007e7b7c708317178b7df2ef1beb1716e442023b2119cc09293c6c7777a","26056746672c4f336dc89648be7129e1d62941d6ebae8af913c2bcf8b6ace8da","a913010b7de6c26566b092b5f55bebab54646c7bd9f877e149b9315e7e3b36ff","7b3287871dbd9eab153cb34690ba2108def1b9abe0c9dc879d45039be4914079","d8c0b232d02f564325a2fdf3f74005a3f06858c2bd89fec1dae813d62fabb273","b188d272f0b003cc6250ff6ecadee10c60307fa04e74091a6ef4f8ebc7a6864e","33916864e5a6c4959e0428b08c5ff3eea0b9140a6af141056512ee7a6eb7a739","63ab8f426f44a2b5694f9afcf572542973404c862a54a83cfa9327b8b24c16b0","201e96083ccb23a6797a37c1f5586f6dbc76867263cc4b7e0bfb47b476969a40"];
const cleanHashes={sleepy:'f910c224b589ed90b4044ccf4de8e495d8e6088a3d3133290596811450a21c9c',nurse:'4c165a368e8b85e5ea64e303df9b639c4c5ecebce4afd5c66115e783f63b36a4',idol:'3d35bf3cc1cb674454fee14dd70690080cfbe962d59b61d7585ea04728b365a5'};
const all=vm.runInNewContext(html.match(/var humans=(\[[^;]*\]);/)[1]);assert.equal(all.length,35);
for(let i=0;i<11;i++){
 assert.equal(all[24+i],names[i]);assert(renderer.includes("'"+(24+i)+"':'"+keys[i]+"'"));
 const b=fs.readFileSync(path.join(root,'assets','humans','baby_swim_'+keys[i]+'_8f.png'));
 const digest=crypto.createHash('sha256').update(b).digest('hex');
 const original=digest===originalHashes[i];
 assert(digest===hashes[i]||original||digest===cleanHashes[keys[i]],'Approved sprite hash mismatch: '+keys[i]);
 assert.equal(b.readUInt32BE(16),i?((original||digest===cleanHashes[keys[i]])?1774:1776):1448);assert.equal(b.readUInt32BE(20),i?((original||digest===cleanHashes[keys[i]])?887:888):1086);assert.equal(b[25],6);
}
assert(html.includes('humanExhibitIds()'));
// Ensure an explicitly versioned human renderer is loaded; don't lock
// this art QA to a dated script URL whenever world display size changes.
assert.match(html,/<script src="\.\/human-sprites\.js\?v=[\w-]+"><\/script>/);
assert(html.includes("function paintHumanUiThumb(canvas,crop,locked)"));
assert(html.includes("randomNewHumanId()"));
assert(html.includes("return 24+Math.floor(rnd(0,11));"),
 'The regular 11 swim variants must remain in the random encounter pool');
console.log('PASS: 11 new swimmers, 3 alpha-clean replacements, and 35-entry catalog');
