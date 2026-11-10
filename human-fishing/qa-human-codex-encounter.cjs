/* Approved human codex art and perfect fever event guard. */
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm'),path=require('node:path');
const root=__dirname,html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/);assert(script,'Game script absent');
new vm.Script(script[1],{filename:'human-fishing.js'});
for(const [re,description] of [
 [/function paintHumanCodexThumbs\(\)/,'human codex renderer'],
 [/class="human-codex-canvas" width="362" height="360"/,'human canvas thumbnails'],
 [/drawImage\(img,0,90,362,360,0,0,362,360\)/,'approved swim first-frame crop'],
 [/globalCompositeOperation='source-in'/,'locked alpha-preserved silhouette'],
 [/canvas\.dataset\.humanOwned!=='1'/,'color unlocked for owned humans'],
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
assert(fs.existsSync(path.join(root,'assets/humans/baby_swim_8f.png')),'original baby PNG missing');
console.log('PASS: human thumbnail color/silhouette and flawless full-fever guaranteed arrival conditions');
