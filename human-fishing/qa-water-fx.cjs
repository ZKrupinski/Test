'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const crypto=require('node:crypto');
const path=require('node:path');
const root=__dirname;
const game=fs.readFileSync(path.join(root,'index.html'),'utf8');
const src=fs.readFileSync(path.join(root,'water-fx.js'),'utf8');
new vm.Script(src);
const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/water-fx/manifest.json'),'utf8'));
assert.equal(manifest.assets.length,4);
for(const asset of manifest.assets){
 const f=path.join(root,'assets/water-fx',asset.file);const buf=fs.readFileSync(f);
 assert.equal(buf.length,asset.bytes);
 assert.equal(buf.toString('hex',0,8),'89504e470d0a1a0a');
 assert.equal(buf.readUInt32BE(16),asset.width);
 assert.equal(buf.readUInt32BE(20),asset.height);
 assert.equal(crypto.createHash('sha256').update(buf).digest('hex'),asset.sha256);
}
assert.ok(game.includes('water-fx.js?v=20261110-waterfx-b4'));
const srcInline=game.match(/<script>([\s\S]*?)<\/script>/i)?.[1];
assert.ok(srcInline,'Main game script not found');new vm.Script(srcInline);
assert.ok(game.includes('waterFx.ambient(ctx,time,WATER_SURFACE_Y,W,H)'));
assert.ok(game.includes('waterFx.surface(ctx,time,WATER_SURFACE_Y,W)'));
assert.ok(game.includes('waterFx.observeLure(time,bob.x,bob.y,WATER_SURFACE_Y,true)'));
assert.ok(game.includes('waterFx.current(ctx,time,bob.x,bob.y,WATER_SURFACE_Y'));
assert.ok(game.includes('waterFx.fever(ctx,time,feverFx,WATER_SURFACE_Y)'));
assert.ok(game.includes("waterFx.emit('escape',pose.x,WATER_SURFACE_Y+4,time,WATER_SURFACE_Y)"));
assert.ok(game.includes('waterFx.drawEvents(ctx,time,WATER_SURFACE_Y,W,H)'));
assert.ok(game.includes("waterFx.emit('miss',bob.x,bob.y,time,WATER_SURFACE_Y)"));
assert.ok(game.includes("waterFx.emit('entry',cast.impactX,surface,time,WATER_SURFACE_Y)"));
assert.doesNotMatch(game,/ctx\.arc\(b\.x,b\.y,b\.r/,'Old vector ambient bubbles must be removed');
assert.doesNotMatch(game,/ctx\.ellipse\(r\.x,r\.y,r\.r/,'Old vector ripple must be removed');
const w={};
class FakeImage{
 constructor(){this.naturalWidth=2048;this.naturalHeight=400;this.ready=false;}
 set src(s){this.path=s;queueMicrotask(()=>this.onload());}
}
vm.runInNewContext(src,{window:w,Image:FakeImage,Promise,Math});
const fx=w.HumanFishingWaterFX;
assert.ok(fx);
(async()=>{
 await fx.preload();
 assert.equal(fx.ready,true);assert.equal(fx.loaded,4);assert.equal(fx.ambientBubbleCount,66);
 const frameCalls=[];const stack=[];const draws=[];let tx=0,ty=0;

 const ctx={globalAlpha:1,save(){stack.push([this.globalAlpha,tx,ty])},restore(){[this.globalAlpha,tx,ty]=stack.pop()},translate(x,y){tx+=x;ty+=y},scale(){},rotate(){},beginPath(){},rect(){},clip(){},drawImage(...args){frameCalls.push(args);draws.push({args,x:tx,y:ty,alpha:this.globalAlpha})}};
 fx.ambient(ctx,3.2,293,1280,720);
 assert.ok(frameCalls.length>30,'Underwater bubbles failed to draw');
 frameCalls.length=0;fx.surface(ctx,3.2,293,1280);
 assert.ok(frameCalls.length>1,'Surface must use repeated native-ratio tiles');
 const tiles=draws.filter(d=>d.args[0].path.includes('water_surface'));
 assert.ok(tiles[0].x-tiles[0].args[7]/2<=0&&tiles.at(-1).x+tiles.at(-1).args[7]/2>=1280,'Tiles must cover full width');
 assert.ok(tiles.every(d=>Math.abs(d.args[7]/d.args[8]-d.args[3]/d.args[4])<1e-9),'Each tile must retain native aspect ratio');
 assert.ok(draws.at(-1).args[8]<=72,'Surface must stay a thin horizontal band');
 assert.ok(tiles.every(d=>d.alpha===1),'Water surface canvas opacity must be exactly 100%');
 assert.ok(tiles.every(d=>Math.abs(d.y-301)<1e-9),'Surface tiles must have a static waterline-centered vertical anchor');
 assert.ok(game.lastIndexOf('waterFx.surface(ctx,time,WATER_SURFACE_Y,W)')>game.lastIndexOf('waterFx.drawEvents(ctx,time,WATER_SURFACE_Y,W,H)'),'Surface must draw above water splashes and all world effects');
 draws.length=0;fx.ambient(ctx,3.2,293,1280,720);
 assert.ok(draws.every(d=>d.args[7]>=7.5),'Ambient bubbles must remain readable');
 assert.ok(draws.every(d=>d.alpha<=.74+1e-9),'Ambient bubbles must be slightly more transparent');
 assert.ok(src.includes('speed:.042+.09*hash(i*17+19)'),'Ambient bubbles must rise at the reduced speed');
 for(const kind of ['entry','exit']){
  fx.clear();fx.emit(kind,640,293,10,293);
  const anchors=[];
  for(const age of [.1,.3,.55]){
   draws.length=0;fx.drawEvents(ctx,10+age,293,1280,720);
   const crowns=draws.filter(d=>d.args[0].path.includes('water_splash')&&d.args[8]>27);
   assert.ok(crowns.length>0);
   assert.ok(crowns.every(d=>Math.abs(d.y+d.args[8]/2-313)<1e-6),'Half-size splash origins must overlap the foreground surface wave at waterY+20');
   assert.ok(crowns.every(d=>d.args[7]<=160&&d.args[8]<=71),'Entry and exit crowns should be approximately 50% of original dimensions');
   anchors.push(crowns.map(d=>[d.y,d.args[8]]));
   if(kind==='exit')assert.equal(crowns.length,3,'Exit uses three staggered fountain fans');
  }
  assert.deepEqual(anchors[1],anchors[0],kind+' splash must not jump vertically between frames');
  assert.deepEqual(anchors[2],anchors[0],kind+' splash must not shrink or hop vertically on fade');
  fx.clear();fx.emit(kind,640,293,10,293);
  fx.drawEvents(ctx,10+(kind==='entry'?.81:1.01),293,1280,720);
  assert.equal(fx.pendingEvents,0,kind+' animation should finish faster');
 }
 fx.drawEvents(ctx,12,293,1280,720);assert.equal(fx.pendingEvents,0,'Effects must expire');
 fx.clear();draws.length=0;
 fx.emit('entry',800,293,3.3,293);
 fx.emit('miss',650,430,3.4,293);
 fx.emit('release',650,430,3.5,293);
 fx.drawEvents(ctx,3.6,293,1280,720);
 assert.ok(frameCalls.length>4,'Bitmap splash and bubbles did not draw');
 fx.current(ctx,3.6,650,430,293,70,2,3,3);
 fx.fever(ctx,3.6,{x:650,y:420,radius:100,elapsed:.2,suctionEnd:1.1},293);
 fx.observeLure(4,630,350,293,true);
 fx.observeLure(4.3,630,267,293,true);
 assert.ok(fx.pendingEvents>0);
 fx.clear();assert.equal(fx.pendingEvents,0);
 console.log('PASS: four approved bitmap atlases are intact; preloaded, underwater bubbles, waterline foreground and release/miss/entry/exit/current/Fever feedback all drawable.');
})().catch(e=>{console.error(e);process.exit(1)});