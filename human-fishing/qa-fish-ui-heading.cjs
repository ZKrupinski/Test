'use strict';
/* Strict original-art source facing registry: all live/archived PNGs hashed.
 * No silent guessed orientation for future uploaded fish. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root='human-fishing/';
const html=fs.readFileSync(root+'index.html','utf8');
const inline=html.match(/<script>([\s\S]*?)<\/script>/i)?.[1];
assert.ok(inline,'inline game code exists');
new vm.Script(inline);
assert.match(html,/<script src="\.\/fish-ui-facing-registry\.js\?v=20261109-audit389"><\/script>/);
const sandbox={window:{},Math,encodeURIComponent,escapeHtml:s=>String(s)};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(root+'fish-ui-facing-registry.js','utf8'),sandbox);
const registry=sandbox.window.HumanFishingFishUiFacing;
assert.ok(registry);
assert.equal(registry.verifiedCount,389);
const ids=Object.keys(registry.records);
assert.equal(new Set(ids).size,389);
const onDisk=[
 ...fs.readdirSync(root+'assets/fish/individual').filter(x=>/^F\d{3}\.png$/.test(x)).map(x=>({id:x.slice(0,4),file:root+'assets/fish/individual/'+x})),
 ...fs.readdirSync(root+'assets/special-creatures').filter(x=>/^S\d{3}\.png$/.test(x)).map(x=>({id:x.slice(0,4),file:root+'assets/special-creatures/'+x}))
];
assert.equal(onDisk.length,389,'Unexpected sprite inventory (update reviewed orientation registry for EVERY new asset)');
assert.deepEqual(ids.slice().sort(),onDisk.map(x=>x.id).sort(),
 'Future added PNG must have a SHA-256-bound facing-direction entry BEFORE game deploy');
for(const {id,file} of onDisk){
 const row=registry.entryFor(id);
 assert.match(row,/^[RLN]:[a-f0-9]{64}$/,'Each artwork needs explicit R/L/N orientation and SHA-256: '+id);
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),row.slice(2),
  'Sprite source was replaced: re-review orientation and update registry SHA-256 '+id);
}
const a=inline.indexOf('// CATCH_SHOWCASE_BEGIN'),b=inline.indexOf('// CATCH_SHOWCASE_END',a);
assert.ok(a>=0&&b>a);
vm.runInContext(inline.slice(a,b),sandbox);
const mirror=id=>sandbox.fishUiMirrorSource({id});
assert.equal(mirror('F001'),true);
assert.equal(mirror('F240'),true);
assert.equal(mirror('F304'),true);
assert.equal(mirror('F306'),true);
assert.equal(mirror('F314'),true);
assert.equal(mirror('F315'),false,'Sawfish F315 already faces left');
assert.equal(mirror('F316'),true);
assert.equal(mirror('F341'),true);
assert.equal(mirror('F365'),true);
for(const id of ['F373','F374','F375','F376','F377','F378'])
 assert.equal(mirror(id),true,id+' was incorrectly presumed left; it faces right');
for(const id of ['F379','F380','F381','F382','F383','F384'])
 assert.equal(mirror(id),false,id+' source already faces left');
for(const id of ['S001','S008','S009','S010','S011','S012','S013','S014','S015','S017'])
 assert.equal(mirror(id),true,id+' special artwork faces right');
for(const id of ['S006','S007','S016'])assert.equal(mirror(id),false,'Front-facing special should remain upright');
assert.equal(mirror('H001'),false,'Human is not a fish');
assert.equal(mirror('F385'),false,'Unregistered fish is not silently assumed right');
assert.equal(registry.sourceFacingFor('F385'),null,'Future art requires explicit registration before shipping');
assert.equal(sandbox.fishUiMirrorSource({id:'F385',collectionArtFaces:'right'}),true,'New batch art can be previewed prior to registry commit');
assert.equal(sandbox.fishUiMirrorSource({id:'F385',collectionArtFaces:'left'}),false);
assert.ok(html.includes('#panelBody .book-fish-thumb img.fish-ui-mirror'));
assert.ok(html.includes('#catchShowcase .catch-card-thumb img.fish-ui-mirror'));
assert.ok(html.includes('transform:scaleX(-1)'));
assert.ok(html.includes("fishUiMirrorSource(sp)?' fish-ui-mirror':''"));
assert.ok(html.includes("fishUiMirrorSource(item.sp)?' fish-ui-mirror':''"));
const trophy=id=>sandbox.catchShowcaseCard({sp:{id},name:'fish',size:'large',quantity:1,fresh:false,forSale:false},false,0);
assert.match(trophy('F373'),/class="fish-ui-art fish-ui-mirror"/);
assert.match(trophy('F377'),/class="fish-ui-art fish-ui-mirror"/);
assert.match(trophy('S008'),/class="fish-ui-art fish-ui-mirror"/);
assert.doesNotMatch(trophy('F315'),/fish-ui-mirror/);
assert.doesNotMatch(trophy('F379'),/fish-ui-mirror/);
assert.equal((inline.match(/fishUiMirrorSource\(/g)||[]).length,3,'Only two UI call sites, not gameplay');
console.log('PASS: all 389 PNGs hash-bound; codex, locked silhouettes, solo/Fever/aquarium catch cards face left; new art must be registered.');
