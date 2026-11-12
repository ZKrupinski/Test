/* Temporary human test preview must not modify real save progress. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert(script,'Game script missing');
new vm.Script(script,{filename:'human-fishing.js'});
const start=script.indexOf('var HUMAN_TEST_UNLOCK_ALL=true');
const end=script.indexOf("$('navHuman')",start);
assert(start>0&&end>start,'Explicit temporary human test unlock missing');
const save={human:{'2':3},humanPlaced:['19'],owned:{F001:1}};
const snapshot=JSON.stringify(save);
const sandbox={save,window:{HumanFishingSisterSpritesReady:true,HumanFishingExtraBabiesReady:true},Math,rnd:(a,b)=>a};
vm.createContext(sandbox);
const rosterStart=script.indexOf('var humans=[');
const rosterEnd=script.indexOf("var key='humanFishingAlpha01'",rosterStart);
const orderStart=script.indexOf('function humanCodexDisplayOrder(){');
const orderEnd=script.indexOf('function renderBook(',orderStart);
assert(rosterStart>=0&&rosterEnd>rosterStart&&orderStart>=0&&orderEnd>orderStart);
vm.runInContext(script.slice(rosterStart,rosterEnd),sandbox);
vm.runInContext(script.slice(orderStart,orderEnd),sandbox);
vm.runInContext(script.slice(start,end),sandbox);
const orderedIds=Array.from(sandbox.humanCodexDisplayOrder(),x=>String(x.id));
assert.equal(orderedIds.length,38);
assert.equal(sandbox.HUMAN_TEST_UNLOCK_ALL,true);
for(let id=0;id<40;id++)
 assert.equal(sandbox.humanOwnedForDisplay(id),[17,22].includes(id)?0:id===2?3:1);
for(let page=0;page<5;page++){
 vm.runInContext('humanTestPreviewPage='+page,sandbox);
 assert.deepEqual(Array.from(sandbox.humanExhibitIds()),orderedIds.slice(page*8,page*8+8));
}
assert.match(script,/var id=String\(a\.id\),n=humanOwnedForDisplay\(id\)/,'Codex thumbnails must show acquired art');
assert.match(script,/var placed=humanExhibitIds\(\)/,'Aquarium exhibition and gameplay must share the test page');
assert.match(script,/data-human-test-page="next"/,'Aquarium requires page controls');
vm.runInContext('HUMAN_TEST_UNLOCK_ALL=false',sandbox);
assert.equal(sandbox.humanOwnedForDisplay(0),0);
assert.deepEqual(Array.from(sandbox.humanExhibitIds()),['19']);
assert.equal(JSON.stringify(save),snapshot,'A test-only preview must never write human inventory or placements');
console.log('PASS: all 38 active human codex previews and five aquarium pages, with real save untouched');
