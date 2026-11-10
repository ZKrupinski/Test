'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const boot=fs.readFileSync(__dirname+'/boot.js','utf8');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
function fixture(){
 let now=0,next=0;const timers=new Map(),frames=[],dom=[],nodes={},events={};
 function el(id){return nodes[id]??={hidden:false,style:{},disabled:false,
  setAttribute(){},removeAttribute(){},addEventListener(){},contains(target){return target===this;}};}
 class Image{
  constructor(){this._src='';this.complete=false;this.naturalWidth=0;this.listeners={};this.decodes=0;}
  set src(v){this._src=v;this.complete=false;this.naturalWidth=0;}
  get src(){return this._src;} getAttribute(){return this.src;}
  addEventListener(k,fn){(this.listeners[k]??=new Set()).add(fn);}
  removeEventListener(k,fn){this.listeners[k]?.delete(fn);}
  finish(ok=true){this.complete=true;this.naturalWidth=ok?80:0;const k=ok?'load':'error';this['on'+k]?.();for(const f of this.listeners[k]||[])f();}
  decode(){this.decodes++;return this.decodeImpl?this.decodeImpl():Promise.resolve();}
 }
 const window={Image,innerWidth:1536,innerHeight:864,addEventListener(){}};
 const document={querySelector:()=>el('root'),querySelectorAll:()=>dom,getElementById:el,
  addEventListener(k,fn){events[k]=fn;},documentElement:{},fonts:{ready:Promise.resolve()}};
 const env={window,document,screen:{},Date:{now:()=>now},console,
  setTimeout(fn,ms){timers.set(++next,{fn,at:now+ms});return next;},clearTimeout(id){timers.delete(id);},
  requestAnimationFrame(fn){frames.push(fn);}};
 vm.runInNewContext(boot,env);
 async function flush(){for(let i=0;i<30;i++)await Promise.resolve();}
 async function step(ms){now+=ms;for(const [id,t]of [...timers])if(t.at<=now){timers.delete(id);t.fn();}await flush();}
 async function paint(){while(frames.length){frames.shift()();await flush();}}
 return {window,env,nodes,dom,events,Image,step,flush,paint};
}
(async()=>{
 const f=fixture(),api=f.window.HumanFishingBoot;let starts=0;
 api.begin(()=>starts++);await f.flush();f.nodes.bootStart.onclick();assert.equal(starts,1);
 let commits=0,image,thumb;
 api.guard(()=>{commits++;image=new f.window.Image();image.src='zone.png';thumb=new f.Image();thumb.src='card.png';thumb.loading='lazy';f.dom.push(thumb);api.guard(()=>commits++);});
 await f.flush();assert.equal(api.busy,true);assert.equal(f.nodes.bootOverlay.hidden,false);assert.equal(thumb.loading,'eager');
 api.guard(()=>commits++);assert.equal(commits,2,'Repeated navigation must not overwrite destination');
 let prevented=0;f.events.keydown({target:{},preventDefault(){prevented++},stopImmediatePropagation(){prevented++}});assert.equal(prevented,2);
 image.finish();await f.step(100);assert.equal(api.busy,true,'DOM thumbnails also block');
 let release;thumb.decodeImpl=()=>new Promise(r=>release=r);thumb.finish();await f.step(100);
 assert.equal(api.busy,true,'Load alone cannot reveal before decode');release();await f.flush();
 assert.equal(api.busy,false);assert.equal(f.nodes.bootOverlay.hidden,false);await f.paint();assert.equal(f.nodes.bootOverlay.hidden,true);
 const decodeCount=image.decodes;api.guard(()=>{});await f.flush();await f.paint();assert.equal(image.decodes,decodeCount,'Reuse decoded source');
 // Failed image auto-retries without exposing a manual button or the new scene.
 api.guard(()=>{image.src='broken.png';image.finish(false);});await f.flush();
 assert.equal(api.busy,true);assert.match(f.nodes.bootStatus.textContent,/자동 재시도/);
 assert.equal(f.nodes.bootStart.hidden,true);
 const badSrc=image.src;
 await f.step(350);assert.notEqual(image.src,badSrc,'Broken image must reload automatically');
 assert.match(image.src,/hfRetry=1/,'Recovery must force a new URL');
 assert.equal(api.busy,true,'Scene must stay paused during automatic retry');
 image.finish();await f.step(100);await f.paint();assert.equal(api.busy,false);
 // Decode failure is also retried automatically, keeping the same Image object.
 api.guard(()=>{image.src='decode.png';image.finish();image.decodeImpl=()=>Promise.reject(Error('bad decode'));});await f.flush();
 assert.equal(api.busy,true);assert.equal(f.nodes.bootStart.hidden,true);
 image.decodeImpl=null;await f.step(350);
 assert.match(image.src,/hfRetry=2/);
 image.finish();await f.step(100);await f.paint();assert.equal(api.busy,false);
 // Hung requests time out and retry with backoff, never uncovering the scene.
 api.guard(()=>{image.src='hung.png';});await f.flush();await f.step(30100);
 assert.equal(api.busy,true);assert.match(f.nodes.bootStatus.textContent,/자동 재시도/);
 assert.equal(f.nodes.bootStart.hidden,true);
 await f.step(350);assert.match(image.src,/hfRetry=3/);
 image.finish();await f.step(100);await f.paint();assert.equal(api.busy,false);
 // A URL changed while decode is pending must be loaded and decoded again.
 let resolveOld;api.guard(()=>{image.src='old.png';image.finish();image.decodeImpl=()=>new Promise(r=>resolveOld=r);});await f.flush();
 image.src='new.png';image.decodeImpl=null;resolveOld();await f.flush();assert.equal(api.busy,true);
 image.finish();await f.step(100);await f.paint();assert.equal(api.busy,false);
 const catalogEnv={window:{HumanFishingFishAssetsReady:true},Image:f.Image,console};
 vm.runInNewContext(fs.readFileSync(__dirname+'/fish-bitmap-catalog.js','utf8'),catalogEnv);
 // Observe created images through a subclass, while running the real catalog loader.
 const created=[];catalogEnv.Image=class extends f.Image{constructor(){super();created.push(this);}};
 const art=catalogEnv.window.HumanFishingArt,list=[{id:'F001',habitat:0}];
 const bad=art.primeHabitat(0,list);created[0].finish(false);assert.equal(await bad,false,'Error must not report habitat ready');
 created[0].finish();assert.equal(await art.primeHabitat(0,list),true,'Failed habitat promise cannot poison cache');
 list.push({id:'F002',habitat:0});const expanded=art.primeHabitat(0,list);assert.equal(created.length,2);created[1].finish();assert.equal(await expanded,true);
 assert.ok(html.indexOf('src="./boot.js')<html.indexOf('src="./water-fx.js'),'Water images must be tracked too');
 assert.match(html,/HumanFishingBoot\.busy\)\{last=stamp;requestAnimationFrame\(tick\);return;/);
 assert.match(html,/mode==='book'\?species/);assert.match(html,/aquariumKnownSpecies\(\):species\.filter/);
 assert.equal((html.match(/source=window\.HumanFishingArt\.sourceFor/g)||[]).length,2,'World, codex and reward cards share URLs');
 console.log('PASS: pending/decode/DOM gates, blocked inputs, automated image/decode/timeout retries without button, frozen scenes, cached decode, URL changes and habitat asset recovery');
})().catch(e=>{console.error(e);process.exitCode=1;});
