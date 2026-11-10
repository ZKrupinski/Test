'use strict';
// No game assets are needed: this directly exercises the real GPU pipeline.
const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,args:[
  '--no-sandbox','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  await page.goto('about:blank');
  await page.addScriptTag({path:path.join(__dirname,'fx-shader.js')});
  const outcome=await page.evaluate(()=>{
   const W=1280,H=720,game=document.createElement('canvas');
   game.width=W;game.height=H;
   const ctx=game.getContext('2d');
   ctx.fillStyle='#102636';ctx.fillRect(0,0,W,H);
   const shader=window.HumanFishingFXShader.create({
    width:W,height:H,addStrength:.30,bloomStrength:.35,radius:10});
   if(!shader.available)return {gpu:false,fallthrough:!shader.composite(ctx)};
   shader.beginFrame({x:0,y:0});
   const paint=shader.context;
   paint.fillStyle='rgba(255,240,170,0.95)';
   paint.fillRect(620,330,42,42);
   // The original 2D sprite is already drawn normally at world depth.
   ctx.fillStyle='rgba(255,240,170,0.95)';ctx.fillRect(620,330,42,42);
   const peakBefore=ctx.getImageData(640,350,1,1).data[0];
   const haloBefore=ctx.getImageData(667,350,1,1).data[0];
   const blended=shader.composite(ctx);
   const peakAfter=ctx.getImageData(640,350,1,1).data[0];
   const haloAfter=ctx.getImageData(667,350,1,1).data[0];
   // Foreground test: a water-wave strip is drawn OVER a fish silhouette
   // in the original canvas and ONLY the wave enters the shader source.
   const waveScene=document.createElement('canvas');
   waveScene.width=W;waveScene.height=H;
   const waveCtx=waveScene.getContext('2d');
   waveCtx.fillStyle='#172932';waveCtx.fillRect(0,0,W,H);
   waveCtx.fillStyle='#aa4e54';waveCtx.fillRect(520,292,140,90);
   waveCtx.fillStyle='#82cbc6';waveCtx.fillRect(520,292,140,18);
   const waveBefore=waveCtx.getImageData(550,300,1,1).data[1];
   const waveHaloBefore=waveCtx.getImageData(550,285,1,1).data[1];
   shader.beginFrame({x:0,y:0});
   shader.context.fillStyle='#82cbc6';
   shader.context.fillRect(520,292,140,18);
   const waveComposite=shader.composite(waveCtx);
   const waveAfter=waveCtx.getImageData(550,300,1,1).data[1];
   const waveHaloAfter=waveCtx.getImageData(550,285,1,1).data[1];
   const scaled=window.HumanFishingFXShader.create({
    width:W,height:H,addStrength:.30,bloomStrength:.35,radius:10,lowPower:true});
   return {gpu:true,blended,peakBefore,peakAfter,haloBefore,haloAfter,
    waveComposite,waveBefore,waveAfter,waveHaloBefore,waveHaloAfter,
    lowPower:scaled.lowPower,lowScale:scaled.scale,
    outputW:scaled.outputSize[0],outputH:scaled.outputSize[1],
    settings:shader.settings};
  });
  if(outcome.gpu){
   assert.equal(outcome.blended,true,'Actual WebGL2 composite must render');
   // ADD may saturate a nearly white source, so verify halo AND core.
   assert.ok(outcome.peakAfter>=outcome.peakBefore,'ADD cannot darken illuminated sprite');
   assert.ok(outcome.haloAfter>outcome.haloBefore,'Bloom halo must visibly illuminate neighboring pixels');
   assert.equal(outcome.waveComposite,true,'Foreground water wave must complete WebGL2 composite');
   assert.ok(outcome.waveAfter>outcome.waveBefore,'Wave ADD must brighten the foreground wave bitmap');
   assert.ok(outcome.waveHaloAfter>outcome.waveHaloBefore,'Wave Bloom must spread soft light beyond the wave stripe');
   assert.equal(outcome.lowPower,true);
   assert.equal(outcome.lowScale,6);
   assert.equal(outcome.outputW,214);
   assert.equal(outcome.outputH,120);
   assert.equal(outcome.settings.addStrength,.30);
   assert.equal(outcome.settings.bloomStrength,.35);
   assert.equal(outcome.settings.radius,10);
  }else{
   assert.equal(outcome.fallthrough,true,'No-GPU browser must preserve untouched 2D original');
   console.warn('No WebGL2 available in test environment: verified graceful Canvas2D fallback.');
  }
  console.log('PASS FX GPU/CPU: '+JSON.stringify(outcome));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});