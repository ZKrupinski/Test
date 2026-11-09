'use strict';
const {readFileSync}=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=readFileSync(__dirname+'/boot.js','utf8');
function fixture(width,height){
 const nodes={};const events={};
 function el(id){return nodes[id]??={style:{},hidden:false,disabled:false,removeAttribute(){},addEventListener(k,fn){events[id+k]=fn;}};}
 class Image {constructor(){this.src='';this.complete=false;this.naturalWidth=0;}getAttribute(){return this.src;}decode(){return Promise.resolve();}}
 const timers=[],document={querySelector:()=>el('root'),getElementById:el,addEventListener(){},documentElement:{requestFullscreen:()=>Promise.reject(new Error('gesture required'))},fonts:{ready:Promise.resolve()}};
 const window={Image,innerWidth:width,innerHeight:height,addEventListener(){}};
 vm.runInNewContext(source,{window,document,screen:{orientation:{lock:()=>Promise.reject()}},location:{reload(){}},Date,WeakMap,clearTimeout(){},setTimeout:fn=>timers.push(fn)});
 return {window,nodes,timers};
}
async function flush(){for(let i=0;i<12;i++)await Promise.resolve();}
(async()=>{
 const a=fixture(1536,864);let starts=0;
 const image=new a.window.Image();image.src='test.webp';
 a.window.HumanFishingBoot.begin(()=>starts++);await flush();
 assert.equal(starts,0);assert.equal(a.nodes.bootStart.hidden,true);
 image.complete=true;image.naturalWidth=100;a.timers.shift()();await flush();
 assert.equal(a.nodes.bootStart.hidden,false);assert.equal(starts,0);
 a.nodes.bootStart.onclick();await flush();assert.equal(starts,1);assert.equal(a.nodes.bootOverlay.hidden,true);
 a.nodes.bootStart.onclick();assert.equal(starts,1);
 const b=fixture(390,844);assert.match(b.nodes.root.style.transform,/rotate\(90deg\)/);
 const p=b.window.HumanFishingBoot.point({clientX:195,clientY:422},{getBoundingClientRect:()=>({top:0,right:390,width:390,height:844})},1280,720);
 assert.equal(p.x,640);assert.equal(p.y,360);
 const c=fixture(844,390);assert.match(c.nodes.root.style.transform,/rotate\(0deg\)/);
 const bad=new c.window.Image();bad.src='missing.webp';bad.complete=true;
 c.window.HumanFishingBoot.begin(()=>{throw Error('Must not start with failed art');});await flush();
 assert.match(c.nodes.bootStatus.textContent,/로딩 실패/);assert.equal(c.nodes.bootStart.textContent,'다시 불러오기');
 console.log('PASS: startup blocks pending/failed images, decoded assets require start gesture, duplicate start prevented; portrait input axes and landscape composition correct');
})();
