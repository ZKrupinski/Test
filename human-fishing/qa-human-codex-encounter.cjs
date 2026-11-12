/* Approved human codex art and perfect fever event guard. */
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm'),path=require('node:path');
const root=__dirname,html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/);assert(script,'Game script absent');
new vm.Script(script[1],{filename:'human-fishing.js'});
for(const [re,description] of [
 [/function paintHumanCodexThumbs\(\)/,'human codex renderer'],
 [/class="human-codex-canvas" width="362" height="360"/,'human canvas thumbnails'],
 [/drawImage\(img,0,0,fw,fh,0,0,fw,fh\)/,'approved 362x543 / 444x444 first-frame crop'],
 [/globalCompositeOperation='source-in'/,'locked alpha-preserved silhouette'],
  [/function humanUiThumbFrame\(id\)/,'per-id alpha-tight human UI frame'],
  [/c\.translate\(crop\.w,0\);c\.scale\(-1,1\)/,'both human UI portraits face left'],
 [/canvas\.dataset\.humanOwned!=='1'/,'color unlocked for owned humans'],
 [/data-human-id=.*a\.id/,'per-character codex artwork mapping'],
 [/humanUiThumbFrame\(Number\(canvas\.dataset\.humanId\)\)/,'per-character codex crop'],
 [/paintHumanCodexThumbs\(\);\s*\/\/ The shared resource gate/,'draw after codex opens'],
 [/var perfectFeverRun=\{clean:save\.fever\.count===0&&!save\.fever\.ready,successfulCasts:0\}/,'partial restored meter is not perfect'],
 [/if\(!hook\)perfectFeverRun\.clean=false/,'missed cast breaks clean streak'],
 [/function escapeHook\(\)\{\s*if\(!hook\|\|escapeFx\)return;\s*perfectFeverRun\.clean=false/,'failed hooked catch breaks clean streak'],
 [/perfectFeverRun\.successfulCasts\+\+/,'gauge successful-cast tracking'],
 [/save\.fever\.count===6&&!aquariumFishingActive/,'full meter gate; no early-ready bonus'],
 [/fishAttempted\+\+/,'fish attempted count'],
 [/if\(!captured\)\{resisted\+\+;fishFailed\+\+;\}/,'all failed fish counted'],
 [/awardPerfectHuman=perfectFeverReady&&fishAttempted>0&&fishFailed===0/,'perfect nonempty AOE requirement'],
 [/if\(awardPerfectHuman\)spawnGuaranteedHuman\(\)/,'guaranteed actor creation'],
 [/guaranteedEncounter:true/,'bonus marker'],
 [/eliteChance=\.018\+p\*\.00040/,'slightly boosted normal spawn chance']
 ])assert.match(html,re,description);
assert.doesNotMatch(html,/'<div class="face"'\+\(n\?/,'legacy emoji thumbnails');
// Retired #17/#22 remain hidden, Diver #38 takes old #22's position.
// After all female babies (Angel then Devil), sisters follow Cat, Rabbit, Shark.
assert.match(html,/function humanCodexDisplayOrder\(\)/,
 'Dedicated, codex-only order must exist');
assert.match(html,/filter===-3\|\|filter===-2\?humanCodexDisplayOrder\(\):\[\]/,
 'Human and combined codex filters must share the explicit order');
const codexStart=script[1].indexOf('function humanCodexDisplayOrder(){');
const codexEnd=script[1].indexOf('function renderBook(',codexStart);
assert(codexStart>0&&codexEnd>codexStart,'Cannot extract codex ordering');
const orderContext={humans:Array.from({length:40},(_,id)=>'human '+id)};
orderContext.humans[17]=null;orderContext.humans[22]=null;
orderContext.humans[35]='라비';orderContext.humans[36]='샤린';orderContext.humans[37]='미유';
orderContext.humans[34]='천사';orderContext.humans[38]='다이버';orderContext.humans[39]='악마';
orderContext.isActiveHumanId=id=>typeof orderContext.humans[Number(id)]==='string';
vm.createContext(orderContext);
vm.runInContext(script[1].slice(codexStart,codexEnd),orderContext);
const displayed=Array.from(orderContext.humanCodexDisplayOrder(),item=>item.id);
assert.equal(displayed.length,38);
assert(!displayed.includes(17)&&!displayed.includes(22));
assert.equal(displayed.indexOf(38),displayed.indexOf(21)+1);
assert.equal(displayed.indexOf(23),displayed.indexOf(38)+1);
assert.deepEqual(displayed.slice(-5),[34,39,37,35,36],
 'Sisters must appear after all female babies in Cat, Rabbit, Shark order');
assert.deepEqual(Array.from(orderContext.humanCodexDisplayOrder().slice(-3),x=>x.name),['미유','라비','샤린']);
assert.equal(orderContext.humans[36],'샤린','Shark save ID must not change');
assert(fs.existsSync(path.join(root,'assets/humans/baby_swim_8f.png')),'original baby PNG missing');
console.log('PASS: human thumbnail color/silhouette and flawless full-fever guaranteed arrival conditions');
