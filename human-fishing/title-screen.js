/* Human Fishing approved bright 16:9 bitmap title, 2026-11-12. */
(function(){
 'use strict';
 var canvas=document.getElementById('bootTitleCanvas'),overlay=document.getElementById('bootOverlay');
 if(!canvas||!overlay)return;
 var ctx=canvas.getContext('2d',{alpha:false}),W=1920,H=1080;
 var sources={
  background:'./assets/title/bright_title_clean.png?v=20261112-bright-title4',
  prompt:'./assets/title/title_buttons_atlas.png?v=20261112-arcade-buttons1',
  noise:'./assets/title/display_noise.png?v=20261112-bright-title4',
  burst:'./assets/title/fx_burst.png?v=20261112-bright-title4',
  splash:'./assets/title/fx_splash.png?v=20261112-bright-title4'
 };
 var art={},ready=false,failed=false,pressAt=-1,pressDone=null,noisePattern=null;
 Object.keys(sources).forEach(function(k){
  var im=new Image();art[k]=im;
  im.onerror=function(){failed=true;overlay.classList.add('title-asset-failed')};
  im.src=sources[k];
 });
 function loaded(){
  if(failed)return false;
  return Object.keys(art).every(function(k){return art[k].complete&&art[k].naturalWidth>0});
 }
 // Two tightly cropped, alpha-clean bitmap states: GAME START and INSERT COIN.
 // Keep button aspect and 100px+ bottom padding inside the 1920x1080 stage.
 function drawPrompt(state,x,y,scale){
  var cw=600,ch=98,w=838*scale,h=137*scale;
  ctx.save();
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality='high';
  ctx.drawImage(art.prompt,state*cw,0,cw,ch,x-w/2,y-h/2,w,h);
  ctx.restore();
 }
 // A luminous typographic sign, not a clickable plaque or framed button.
 function drawLoading(t){
  ctx.save();
  ctx.translate(W/2,910);
  ctx.globalAlpha=.92+.08*Math.sin(t/360);
  ctx.font='900 74px "Arial Black","Trebuchet MS",system-ui,sans-serif';
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.lineJoin='round';ctx.lineWidth=7;
  ctx.shadowColor='rgba(29,202,255,.7)';ctx.shadowBlur=22;
  ctx.strokeStyle='#16445f';
  ctx.strokeText('NOW LOADING',0,0);
  var fill=ctx.createLinearGradient(0,-42,0,44);
  fill.addColorStop(0,'#ffffff');
  fill.addColorStop(.48,'#ffeaa3');
  fill.addColorStop(1,'#ffc24b');
  ctx.fillStyle=fill;
  ctx.fillText('NOW LOADING',0,0);
  ctx.restore();
 }
 function paint(t){
  requestAnimationFrame(paint);
  if(overlay.hidden||document.visibilityState==='hidden')return;
  // Show the bright background as soon as it is decoded; the button assets
  // may still be loading. Never show START or INSERT COIN during loading.
  if(!art.background.complete||!art.background.naturalWidth){
   ctx.fillStyle='#073a60';
   ctx.fillRect(0,0,W,H);
   drawLoading(t);
   return;
  }
  if(!ready&&loaded()){
   ready=true;noisePattern=ctx.createPattern(art.noise,'repeat');
  }
  var titleReady=ready&&overlay.classList.contains('title-ready');
  var age=pressAt<0?Infinity:t-pressAt,pressed=age<270;
  ctx.drawImage(art.background,0,0,W,H);
  if(!titleReady){
   drawLoading(t);
   return;
  }
  var phase=(t%2400)/2400,frame=phase<.48?0:phase<.52?-1:phase<.98?1:-1;
  if(pressed)frame=0;
  if(frame>=0){
   var breathing=1+.012*Math.sin(t/210);
   var scale=pressed?(age<85?.97:1+.035*Math.sin(Math.min(1,(age-85)/185)*Math.PI)):breathing;
   drawPrompt(frame,W/2,910,scale);
  }
  if(pressed){
   // 270 ms small localized response; remove the old oversized ring/flash.
   var a=1-age/270;
   ctx.save();ctx.globalAlpha=.36*a;
   ctx.drawImage(art.burst,W/2-186,845,372,178);
   ctx.globalAlpha=.27*a;
   ctx.drawImage(art.splash,W/2-360,885,164,101);
   ctx.translate(W/2,0);ctx.scale(-1,1);
   ctx.drawImage(art.splash,196,885,164,101);
   ctx.restore();
  }
  // Keep the UI prompt free of noise overlays to protect clean alpha edges.
 }
 requestAnimationFrame(paint);
 window.HumanFishingTitle={
  press:function(done){
   if(pressDone)return;
   pressDone=done;pressAt=performance.now();
   setTimeout(function(){var fn=pressDone;pressDone=null;if(fn)fn();},265);
  },
  get ready(){return ready}
 };
})();