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
assert.match(boot,/window\.HumanFishingMenuLoading\.next\(\)/);
assert.match(boot,/Math\.max\(0,menuMinimumVisibleMs-\(Date\.now\(\)-menuShownAt\)\)/);
assert.match(boot,/menuMinimumVisibleMs=loadingKind==='stage'\?STAGE_LOADING_MIN_MS:550/);
assert.match(boot,/menuImageBaseline\.get\(im\)!==source\(im\)/);
assert.match(boot,/overlay\.hidden=!!window\.HumanFishingMenuLoading/);
assert.match(boot,/album\.drawNow\(\);\s*menuShownAt=Date\.now\(\);\s*overlay\.hidden=false/);
assert.match(boot,/window\.HumanFishingMenuLoading\.prewarmNext\(\)/);
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
const drawn=[],frames=[],images=[],clips=[];
let loading=true, value=.4;
const ctx={fillRect(){},beginPath(){},rect(...a){clips.push(a)},clip(){},save(){},restore(){},
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
assert.equal(images.length,0,'Menu images must NOT delay the original initial title');
const queued=api.prewarmNext();
assert.equal(api.selected,-1,'Warming artwork must not switch the active scene');
assert.equal(images.length,4,'Warm exactly one scene plus shared bitmap UI after start');
assert.equal(api.next(),queued,'First menu should use the warmed artwork');
const firstRound=[api.selected],secondRound=[];
for(let i=1;i<10;i++){
 const selected=api.next();
 if(i<5)firstRound.push(selected);else secondRound.push(selected);
}
assert.equal(new Set(firstRound).size,5,'The first shuffle-bag round repeated an illustration');
assert.equal(new Set(secondRound).size,5,'The second round skipped an illustration');
assert.notEqual(firstRound[4],secondRound[0],'Adjacent rounds may not repeat the same image');
assert.equal(images.length,8,'Only five scene images and three UI bitmaps exist after a full gallery cycle');
const activeImg=images.find(im=>im.src.includes(sources[api.selected]));
assert(activeImg,'Selected illustration must be loaded');
activeImg.complete=false;
assert.equal(api.canDraw(),false,'Cannot expose a partial painted scene');
assert.equal(api.drawNow(),false,'A missing scene must not paint the label or bar alone');
frames.shift()(100);
assert.equal(drawn.length,0,'First visible frame must not contain only some sprites');
activeImg.complete=true;
assert.equal(api.canDraw(),true);
assert.equal(api.drawNow(),true);
const sourcesDrawn=drawn.map(a=>a[0].src||'');
assert.equal(sourcesDrawn.length,4,'One atomic frame has background, label, frame and water-fill in order');
assert(sourcesDrawn[0].includes(sources[api.selected]));
assert(sourcesDrawn[1].includes('menu_loading_label'));
assert(sourcesDrawn[2].includes('menu_loading_frame'));
assert(sourcesDrawn[3].includes('menu_loading_fill'));
assert(sourcesDrawn.some(x=>x.includes(sources[api.selected])),'Chosen shuffled painting was not drawn');
const fillDraw=drawn.find(a=>a[0].src&&a[0].src.includes('menu_loading_fill.webp'));
assert(fillDraw,'Water fill missing');
assert.equal(fillDraw[3],762,'Filling uses a full-size bitmap, clipped by progress');
assert(Math.abs(clips.at(-1)[2]-762*value)<1e-6,'Actual 40% progress must clip to 40% width');
loading=false;drawn.length=0;frames.shift()(110);
assert.equal(drawn.length,0,'Menu loader must not cover title when inactive');
console.log('PASS: original title untouched; first slide warmed after START; gallery without repeats; no partial menu frames; 4 bitmap layers appear atomically and progress clips correctly');
