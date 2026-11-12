'use strict';
const {readFileSync}=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=readFileSync(__dirname+'/boot.js','utf8');
function fixture(width,height,mobile=false){
 const nodes={};const events={};
 function el(id){return nodes[id]??={style:{},hidden:false,disabled:false,removeAttribute(){},addEventListener(k,fn){events[id+k]=fn;}};}
 class Image {constructor(){this.src='';this.complete=false;this.naturalWidth=0;}getAttribute(){return this.src;}decode(){return Promise.resolve();}}
 const timers=[],document={querySelector:()=>el('root'),getElementById:el,addEventListener(){},documentElement:{requestFullscreen:()=>Promise.reject(new Error('gesture required'))},fonts:{ready:Promise.resolve()}};
 const navigator={
  userAgent:mobile?'Mozilla/5.0 (Linux; Android 16; Pixel) Mobile':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/132',
  userAgentData:{mobile},maxTouchPoints:mobile?5:0
 };
 const window={Image,innerWidth:width,innerHeight:height,navigator,addEventListener(){}};
 vm.runInNewContext(source,{window,document,navigator,screen:{orientation:{lock:()=>Promise.reject()}},location:{reload(){}},Date,WeakMap,clearTimeout(){},setTimeout:fn=>timers.push(fn)});
 return {window,nodes,timers};
}
async function flush(){for(let i=0;i<36;i++)await Promise.resolve();}
(async()=>{
 const a=fixture(1536,864);let starts=0;
 const image=new a.window.Image();image.src='test.webp';
 a.window.HumanFishingBoot.begin(()=>starts++);await flush();
 assert.equal(starts,0);assert.equal(a.nodes.bootStart.hidden,true);
 image.complete=true;image.naturalWidth=100;a.timers.shift()();await flush();
 assert.equal(a.nodes.bootStart.hidden,false);assert.equal(starts,0);
 a.nodes.bootStart.onclick();await flush();assert.equal(starts,1);assert.equal(a.nodes.bootOverlay.hidden,true);
 a.nodes.bootStart.onclick();assert.equal(starts,1);
 // Stage audio preloader is a real prerequisite, not merely initiated.
 const audioGate=fixture(1536,864);
 let finishAudio,readyStarts=0,preloadRequests=0;
 audioGate.window.HumanFishingBoot.registerPreload(function(){
  preloadRequests++;
  return new Promise(function(resolve){finishAudio=resolve;});
 });
 audioGate.window.HumanFishingBoot.begin(()=>readyStarts++);
 await flush();
 assert.equal(preloadRequests,1,'Initial ambient preload must start with artwork');
 assert.equal(audioGate.nodes.bootStart.hidden,true,'START must wait for ambient decode');
 finishAudio();await flush();
 assert.equal(audioGate.nodes.bootStart.hidden,false,'START appears after audio is decoded');
 audioGate.nodes.bootStart.onclick();await flush();
 assert.equal(readyStarts,1,'Audio-ready start must only run once');
 const pcPortrait=fixture(390,844);
 assert.match(pcPortrait.nodes.root.style.transform,/rotate\(0deg\)/,'Desktop portrait must not rotate');
 const b=fixture(390,844,true);assert.match(b.nodes.root.style.transform,/rotate\(90deg\)/);
 const p=b.window.HumanFishingBoot.point({clientX:195,clientY:422},{getBoundingClientRect:()=>({top:0,right:390,width:390,height:844})},1280,720);
 assert.equal(p.x,640);assert.equal(p.y,360);
 const c=fixture(844,390);assert.match(c.nodes.root.style.transform,/rotate\(0deg\)/);
 const bad=new c.window.Image();bad.src='missing.webp';bad.complete=true;
 c.window.HumanFishingBoot.begin(()=>{throw Error('Must not start with failed art');});await flush();
 assert.match(c.nodes.bootStatus.textContent,/자동 재시도/);
 assert.equal(c.nodes.bootStart.hidden,true,'Failed boot must not display a separate retry button');
 assert.equal(c.nodes.bootStart.onclick,null,'Failed boot must not depend on manual retry');
 c.timers.shift()();await flush();
 assert.match(bad.src,/hfRetry=1/,'Failed startup image must automatically restart with a new URL');
 assert.equal(starts,1,'Automatic startup recovery must not start a new game without user gesture');
 console.log('PASS: startup blocks pending assets, automatically retries failures without extra dialog, retains start gesture and landscape composition');
})();
