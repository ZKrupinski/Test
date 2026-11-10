/* Fever card lifetime + habitat ambience readiness regression tests. */
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const ambient=fs.readFileSync(__dirname+'/ambient.js','utf8');
const boot=fs.readFileSync(__dirname+'/boot.js','utf8');
const game=html.match(/<script>([\s\S]*?)<\/script>/);
assert(game,'main script missing');
new vm.Script(game[1]);new vm.Script(ambient);new vm.Script(boot);
for(const [re,msg] of [
 [/catchShowcaseActiveFever=false,catchShowcasePending=\[\]/,'Fever queue state'],
 [/if\(!force&&catchShowcaseActiveFever&&catchShowcaseExpiresAt>time\)return false/,'next cast cannot cancel Fever awards'],
 [/catchShowcasePending\.push\(\{items:shown,fever:!!fever\}\)/,'new prizes queue while Fever'],
 [/if\(next\)showCatchShowcase\(next\.items,next\.fever\)/,'queued prizes displayed'],
 [/catchShowcaseExpiresAt=time\+\(fever\?\(shown\.length-1\)\*\.52\+\.85:2\.35\)/,'full last-card animation window'],
 [/\.catch-card\.fever\{animation:catchCardFever \.85s both linear\}/,'last-card CSS matches timer'],
 [/if\(m!=='fish'\)\{lureRecovery\.active=false;stopCatchShowcase\(true\);\}/,'explicit scene changes cancel awards'],
 [/window\.HumanFishingBoot\.registerPreload\(function\(\)/,'habitat sound participates in image loading'],
 [/return window\.HumanFishingAmbient\.prime\(zone\)/,'preload correct habitat'],
 [/window\.HumanFishingAmbient\.unlock\(\)/,'start unlocks environment sound'],
 [/ambient\.js\?v=20261110-ambient-preload-v3/,'audio cache-bust']
 ])assert.match(html,re,msg);
assert.doesNotMatch(html,/#stage:has\(#banner\.visible\) #catchShowcase\{display:none\}/,'bonus banners should never blank awards');
assert.match(boot,/var soundReady=Promise\.resolve\(\)/);
assert.match(boot,/await soundReady/);
assert.match(boot,/registerPreload:function\(fn\)/);
assert.match(boot,/boundedAudioLoad\(extraPreload\(\)\)/);
assert.match(boot,/window\.HumanFishingAmbient\.unlock\(\)/);
assert.match(ambient,/delete loading\[name\]/,'failed audio load must be released for future retry');
assert.match(ambient,/var firstStart=enabled&&!active\.surface\.everAudible/,'immediate audio fade');
console.log('PASS: Fever multi-catch sequence protected and queued, announcements cannot wipe cards, OGGs preload before stage start');
