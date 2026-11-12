'use strict';
// Stage selection alone keeps the complete menu painting visible for
// at least 2500 ms after it first appears, even when assets finish instantly.
// Ordinary menu transitions and first title start must not inherit this hold.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const boot=fs.readFileSync(__dirname+'/boot.js','utf8');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
new vm.Script(boot);
assert.match(html,/sceneGuard\(function\(\)\{zone=selectedZone;save.zone=zone;persist\(\);buildFish\(\);setMode\('fish'\)\},'stage'\)/);
assert.match(html,/window.HumanFishingBoot.guard\(callback,loadingKind\)/);
assert.match(boot,/var STAGE_LOADING_MIN_MS=2500/);
assert.match(boot,/menuMinimumVisibleMs=loadingKind==='stage'\?STAGE_LOADING_MIN_MS:550/);

function fixture(){
 let now=0,serial=0,active=[],raf=[],timers=[],nodes={},started=0;
 function element(id){
  if(nodes[id])return nodes[id];
  const classes=new Set();
  return nodes[id]={hidden:false,style:{},disabled:false,value:0,
   classList:{contains:x=>classes.has(x),add:x=>classes.add(x),remove:x=>classes.delete(x)},
   setAttribute(){},removeAttribute(){},addEventListener(){},contains(x){return x===this;}};
 }
 class Img{
  constructor(){this._src='';this.complete=true;this.naturalWidth=32;}
  set src(v){this._src=v;} get src(){return this._src;}
  getAttribute(name){return name==='src'?this.src:null;}
  decode(){return Promise.resolve();}
 }
 const window={Image:Img,innerWidth:1536,innerHeight:864,addEventListener(){},
  HumanFishingMenuLoading:{
   next(){},prewarmNext(){},canDraw(){return true;},
   drawNow(){return true;}
  }};
 const document={querySelector:()=>element('root'),querySelectorAll:()=>[],
  getElementById:element,fonts:{ready:Promise.resolve()},
  addEventListener(){},documentElement:{},fullscreenElement:null};
 const context={window,document,screen:{},navigator:{userAgentData:{mobile:false},userAgent:'Desktop'},
  WeakMap,Date:{now:()=>now},
  setTimeout(fn,ms){timers.push({id:++serial,at:now+ms,fn});return serial;},
  clearTimeout(id){timers=timers.filter(x=>x.id!==id);},
  requestAnimationFrame(fn){raf.push(fn);},console};
 vm.runInNewContext(boot,context);
 async function flush(){for(let j=0;j<80;j++)await Promise.resolve();}
 async function run(ms){
  now+=ms;
  for(let i=0;i<12;i++){
   const due=timers.filter(t=>t.at<=now);
   if(!due.length)break;
   timers=timers.filter(t=>t.at>now);
   for(const t of due)t.fn();
   await flush();
  }
  const frames=raf.splice(0);for(const cb of frames)cb(now);
  const next=raf.splice(0);for(const cb of next)cb(now);
  await flush();
 }
 return {window,document,nodes,run,flush,start:async()=>{
  window.HumanFishingBoot.begin(()=>started++);
  await flush();element('bootStart').onclick();await flush();
  assert.equal(started,1);assert.equal(element('bootOverlay').hidden,true);
 }};
}
(async()=>{
 const f=fixture();await f.start();
 const overlay=f.nodes.bootOverlay,boot=f.window.HumanFishingBoot;
 boot.guard(()=>{},'stage');await f.flush();
 assert.equal(boot.busy,false,'Resource completion must not wait for the purely visual hold');
 assert.equal(overlay.hidden,false,'Finished stage must keep its artwork visible');
 await f.run(2400);assert.equal(overlay.hidden,false,'Stage illustration must remain after 2.4 seconds');
 await f.run(100);assert.equal(overlay.hidden,true,'Stage illustration must dismiss at 2.5 seconds');
 boot.guard(()=>{});await f.flush();
 assert.equal(overlay.hidden,false,'Ordinary menu still uses its short artwork hold');
 await f.run(549);assert.equal(overlay.hidden,false,'Ordinary menu visible for 550 ms');
 await f.run(1);assert.equal(overlay.hidden,true,'Ordinary menu must not inherit the 2.5-second hold');
 boot.guard(()=>{},'stage');await f.flush();
 await f.run(2500);assert.equal(overlay.hidden,true,'Repeated stage visit remains bounded');
 console.log('PASS: initial title unchanged; stage entry holds 2500 ms after completed loading; ordinary menu remains 550 ms; repeat stages safe');
})().catch(e=>{console.error(e);process.exitCode=1;});
