'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync(__dirname+'/title-screen.js','utf8');
const boot=fs.readFileSync(__dirname+'/boot.js','utf8');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
// The title must never keep a visible START/COIN state during loading.
const state=new Set(['title-loading']);
const overlay={hidden:false,classList:{contains:v=>state.has(v),add:v=>state.add(v),remove:v=>state.delete(v)}};
const calls=[],frames=[];
const ctx={
 drawImage:(im,...args)=>calls.push({type:'image',src:im.src,args}),
 fillText:s=>calls.push({type:'text',text:s}),
 strokeText:s=>calls.push({type:'outline',text:s}),
 createPattern:()=>({}),
 createLinearGradient:()=>({addColorStop(){}}),
 save(){},restore(){},translate(){},scale(){},fillRect(){},
};
class Image{
 constructor(){this.complete=true;this.naturalWidth=600;}
 set src(s){this._src=s;}get src(){return this._src;}
}
const canvas={getContext:()=>ctx};
const document={getElementById:id=>id==='bootOverlay'?overlay:canvas,visibilityState:'visible'};
const window={};
vm.runInNewContext(src,{window,document,Image,requestAnimationFrame:fn=>frames.push(fn),performance:{now:()=>0},setTimeout(){}});
function render(ms){calls.length=0;assert.ok(frames.length);frames.shift()(ms);return calls.slice();}
let c=render(150);
assert.ok(c.some(x=>x.type==='text'&&x.text==='NOW LOADING'));
assert.ok(!c.some(x=>x.type==='image'&&x.src.includes('title_buttons_atlas')));
state.delete('title-loading');state.add('title-ready');
c=render(150);
assert.ok(c.some(x=>x.type==='image'&&x.src.includes('title_buttons_atlas')&&x.args[0]===0),'GAME START at ready');
assert.ok(!c.some(x=>x.type==='text'));
c=render(1400);
assert.ok(c.some(x=>x.type==='image'&&x.src.includes('title_buttons_atlas')&&x.args[0]===600),'INSERT COIN at ready');
state.delete('title-ready');state.add('title-loading');
c=render(1600);
assert.ok(c.some(x=>x.type==='text'&&x.text==='NOW LOADING'),'Scene transition shows loading title');
assert.ok(!c.some(x=>x.type==='image'&&x.src.includes('title_buttons_atlas')),'No arcade button during scene loading');
assert.match(boot,/overlay\.classList\.remove\('title-ready'\)/);
assert.match(boot,/updateImageProgress\(active\)/);
assert.match(boot,/decoded\.get\(im\)===source\(im\)/);
assert.match(html,/#bootProgress::-webkit-progress-value/);
assert.match(html,/title-screen\.js\?v=20261112-now-loading1/);
console.log('PASS: NOW LOADING during start and scene transitions, arcade prompts only ready, image/decode progress and visible meter');
