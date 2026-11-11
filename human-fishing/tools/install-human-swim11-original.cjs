#!/usr/bin/env node
'use strict';
/* Install exact original user-supplied PNG bytes, without alpha changes or resampling. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const base=path.resolve(__dirname,'..'),src=path.resolve(process.argv[2]||'');
assert(src&&fs.existsSync(src),'Missing extracted ZIP directory');
const expected=require('./human-swim11-original-expected.json');
const uploaded=JSON.parse(fs.readFileSync(path.join(src,'manifest.json'),'utf8'));
assert.equal(uploaded.actors.length,11);
const all=JSON.parse(fs.readFileSync(path.join(base,'assets/humans/human-swim11-manifest.json'),'utf8'));
function sha(bytes){return crypto.createHash('sha256').update(bytes).digest('hex')}
function gitHash(bytes){return crypto.createHash('sha1').update('blob '+bytes.length+'\\0').update(bytes).digest('hex')}
for(const e of expected.actors){
 const item=uploaded.actors.find(a=>a.id===e.id);
 assert(item&&item.path===e.path&&item.sha256===e.sha256,'Unexpected sprite manifest: '+e.key);
 const file=path.join(src,e.path),bytes=fs.readFileSync(file);
 assert(bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')),'Not PNG: '+e.key);
 assert.equal(sha(bytes),e.sha256,'Original PNG bytes differ: '+e.key);
 assert.equal(bytes.readUInt32BE(16),e.size[0]);assert.equal(bytes.readUInt32BE(20),e.size[1]);
 assert.equal(bytes[25],6,'Requires RGBA PNG');
 fs.copyFileSync(file,path.join(base,'assets/humans',e.path));
 const existing=all.actors.find(a=>a.id===e.id);assert(existing,'Missing catalog ID '+e.id);
 existing.size=e.size;existing.sha256=e.sha256;existing.gitBlob=gitHash(bytes);
}
all.version=expected.version;all.imageChanges='Original user PNG byte-for-byte; no alpha cleanup, cropping, re-encoding or resizing';
fs.writeFileSync(path.join(base,'assets/humans/human-swim11-manifest.json'),JSON.stringify(all,null,2)+'\\n');
for(const p of ['index.html','human-sprites.js','qa-human-swim11.cjs']){
 const file=path.join(base,p),old=fs.readFileSync(file,'utf8');
 const newText=old.replaceAll('20261111-human-swim11-v2',expected.version);
 assert(newText!==old||old.includes(expected.version),'Could not update cache version: '+p);
 fs.writeFileSync(file,newText);
}
console.log('Verified and installed all 11 unmodified user PNG sheets; no alpha processing.');