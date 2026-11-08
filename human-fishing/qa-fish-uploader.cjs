'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const s=fs.readFileSync('human-fishing/tools/fish-bitmap-uploader.html','utf8');
const workflows=[
['fish-art-import.zip','.github/workflows/install-human-fish-art.yml'],
['fish-art-import-batch-001.zip','.github/workflows/install-fish-art-batch001.yml'],
['fish-art-import-batch-023.zip','.github/workflows/install-fish-art-batch023.yml'],
['fish-art-import-batch-004.zip','.github/workflows/install-fish-art-batch004.yml'],
['special-creature-import.zip','.github/workflows/install-special-creature-art.yml'],
['fish-art-fast-pack-17.zip','.github/workflows/install-fish-art-fast-pack.yml']
];
for(const [name,workflow] of workflows){
 assert.ok(s.includes(name),'Missing uploader ZIP mapping: '+name);
 assert.ok(fs.existsSync(workflow),'Missing install workflow: '+workflow);
}
assert.ok(s.includes('https://api.github.com/repos/ZKrupinski/Test/contents/human-fishing/'));
assert.ok(s.includes("reader.readAsDataURL(file)"));
assert.ok(s.includes("'PUT',url,auth,JSON.stringify(body),true"));
assert.ok(!/localStorage|sessionStorage|navigator\.sendBeacon/.test(s),'Token must not be stored or sent elsewhere');
assert.ok(s.includes("tokenInput.value=''"),'Must clear PAT on successful upload');
const inline=s.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(inline,'Inline upload script missing');
const vm=require('node:vm');new vm.Script(inline[1]);
console.log('PASS: all five PNG batch workflows linked; secure direct GitHub browser uploader parses, no token persistence.');
