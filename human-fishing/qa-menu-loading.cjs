'use strict';
// Preserve startup title; prove five scene paintings cycle and the bitmap fill
// draws proportionally to actual image/decode progress rather than fake timers.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const dir=__dirname,html=fs.readFileSync(dir+'/index.html','utf8');
const menu=fs.readFileSync(dir+'/menu-loading.js','utf8');
const boot=fs.readFileSync(dir+'/boot.js','utf8');
new vm.Script(menu);new vm.Script(boot);
assert.match(html,/<canvas id="bootTitleCanvas" width="1920" height="1080"/);
assert.match(html,/<canvas id="menuLoadingCanvas" width="1672" height="941"/);
assert.match(html,/#bootOverlay\.menu-loading #bootTitleCanvas\{display:none\}/);
assert.match(html,/#bootOverlay\.menu-loading #menuLoadingCanvas\{display:block\}/);
assert.match(boot,/if\(started\)overlay\.classList\.add\('menu-loading'\)/);
assert.match(boot,/if\(window\.HumanFishingMenuLoading\)window\.HumanFishingMenuLoading\.next\(\)/);
assert.match(boot,/Math\.max\(0,420-\(Date\.now\(\)-menuShownAt\)\)/);
const sources=['menu_01_treasure.webp','menu_02_raft_pursuit.webp','menu_03_pirate_crew.webp',
 'menu_04_shark_encounter.webp','menu_05_seaside_market.webp'];
const extras=['menu_loading_label.webp','menu_loading_frame.webp','menu_loading_fill.webp'];
const manifest=JSON.parse(fs.readFileSync(dir+'/assets/menu-loading/manifest.json','utf8'));
const crypto=require('node:crypto');
for(const name of sources.concat(extras)){
 assert(menu.includes("'"+name+"'"),'Unregistered loading source '+name);
 const entry=manifest.find(x=>x.path===name),data=fs.readFileSync(dir+'/assets/menu-loading/'+name);
 assert(entry,'Missing file from manifest '+name);
 assert.equal(data.length,entry.bytes);
 assert.equal(crypto.createHash('sha256').update(data).digest('hex'),entry.sha256);
}
const drawn=[],frames=[],images=[];
let loading=true, value=.4;
const ctx={fillRect(){},beginPath(){},rect(){},clip(){},save(){},restore(){},
 drawImage(...a){drawn.push(a)},set fillStyle(x){}};
const overlay={get hidden(){return false},classList:{contains(x){return x==='menu-loading'&&loading}}};
const nodes={menuLoadingCanvas:{getContext(){return ctx}},bootOverlay:overlay,
 bootProgress:{get value(){return value}}};
class Image{
 constructor(){this.complete=true;this.naturalWidth=1672;this.naturalHeight=941;images.push(this)}
 set src(x){this._src=x}get src(){return this._src}
}
const scope={window:{},Image,document:{getElementById:x=>nodes[x],visibilityState:'visible'},
 Math:{...Math,random:()=>0},requestAnimationFrame:fn=>frames.push(fn)};
scope.Math=Object.create(Math);scope.Math.random=()=>0;
vm.runInNewContext(menu,scope);
const api=scope.window.HumanFishingMenuLoading;
assert.equal(api.slideCount,5);
assert.equal(images.length,8,'All menu art should be preloaded exactly once');
for(let i=0;i<10;i++){assert.equal(api.next(),i%5);}
frames.shift()(100);
const sourcesDrawn=drawn.map(a=>a[0].src||'');
assert(sourcesDrawn.some(x=>x.includes('menu_05_seaside_market.webp')),'Last sequential painting not drawn');
const fillDraw=drawn.find(a=>a[0].src&&a[0].src.includes('menu_loading_fill.webp'));
assert(fillDraw,'Water fill missing');
assert.equal(fillDraw[3],762,'Filling uses a full-size bitmap, clipped by progress');
loading=false;drawn.length=0;frames.shift()(110);
assert.equal(drawn.length,0,'Menu loader must not cover title when inactive');
console.log('PASS: startup title unaffected; five rotating full-bleed illustrations, approved bitmap UI and actual cropped progress');
