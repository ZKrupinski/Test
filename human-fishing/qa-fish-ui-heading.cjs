'use strict';
/* DOM-only left-facing fish thumbnail orientation checks. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('human-fishing/index.html','utf8');
const source=html.match(/<script>([\s\S]*?)<\/script>/i)?.[1];
assert.ok(source);
new vm.Script(source);
const a=source.indexOf('// CATCH_SHOWCASE_BEGIN');
const b=source.indexOf('// CATCH_SHOWCASE_END',a);
assert.ok(a>0&&b>a);
const sandbox={Math,encodeURIComponent,escapeHtml:s=>String(s)};
vm.createContext(sandbox);
vm.runInContext(source.slice(a,b),sandbox);
const flip=(id,extra)=>sandbox.fishUiMirrorSource(Object.assign({id},extra));
for(const id of ['F001','F240','F304','F306','F342','F365','F372'])
 assert.equal(flip(id),true,id+' right-facing source must mirror');
for(const id of ['F373','F378','F379','F380','F381','F382','F383','F384'])
 assert.equal(flip(id),false,id+' left-facing source must remain unchanged');
assert.equal(flip('S009'),true);
assert.equal(flip('S013'),true);
assert.equal(flip('S001'),false);
assert.equal(flip('F385',{collectionArtFaces:'right'}),true);
assert.equal(flip('F001',{collectionArtFaces:'left'}),false);
assert.equal(flip('H002'),false);
assert.equal(sandbox.fishUiMirrorSource(null),false);
assert.ok(html.includes('#panelBody .book-fish-thumb img.fish-ui-mirror'));
assert.ok(html.includes('#catchShowcase .catch-card-thumb img.fish-ui-mirror'));
assert.ok(html.includes('transform:scaleX(-1)'));
assert.ok(html.includes("fishUiMirrorSource(sp)?' fish-ui-mirror':''"));
assert.ok(html.includes("fishUiMirrorSource(item.sp)?' fish-ui-mirror':''"));
const trophy=id=>sandbox.catchShowcaseCard({sp:{id},name:'물고기',size:'중형',quantity:1,fresh:false,forSale:false},false,0);
assert.match(trophy('F001'),/class="fish-ui-art fish-ui-mirror"/);
assert.match(trophy('F372'),/class="fish-ui-art fish-ui-mirror"/);
assert.match(trophy('F373'),/class="fish-ui-art"/);
assert.doesNotMatch(trophy('F373'),/fish-ui-mirror/);
assert.doesNotMatch(trophy('F379'),/fish-ui-mirror/);
assert.equal((source.match(/fishUiMirrorSource\(/g)||[]).length,3,'Only two UI call sites and declaration');
console.log('PASS: original fish head-left presentation for all codex and acquired item tiles; gameplay unaffected');
