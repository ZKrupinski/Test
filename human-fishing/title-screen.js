/* Human Fishing bitmap-only 16:9 title (2026-11-12). */
(function(){
 'use strict';
 var canvas=document.getElementById('bootTitleCanvas'),overlay=document.getElementById('bootOverlay');
 if(!canvas||!overlay)return;
 var ctx=canvas.getContext('2d',{alpha:false}),W=1920,H=1080;
 var sources={
  background:'./assets/title/title_background_no_box.webp?v=20261112-title3',
  prompt:'./assets/title/prompt_animation_16f.png?v=20261112-title3',
  noise:'./assets/title/display_noise.png?v=20261112-title3',
  burst:'./assets/title/fx_burst.png?v=20261112-title3',
  splash:'./assets/title/fx_splash.png?v=20261112-title3'
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
 function drawPrompt(frame,x,y,scale){
  var cw=850,ch=142,w=cw*scale,h=ch*scale;
  ctx.drawImage(art.prompt,frame%4*cw,Math.floor(frame/4)*ch,cw,ch,x-w/2,y-h/2,w,h);
 }
 function paint(t){
  requestAnimationFrame(paint);
  if(overlay.hidden||document.visibilityState==='hidden')return;
  if(!ready){
   if(!loaded())return;
   ready=true;noisePattern=ctx.createPattern(art.noise,'repeat');
  }
  var age=pressAt<0?Infinity:t-pressAt,pressed=age<270;
  ctx.drawImage(art.background,0,0,W,H);
  var phase=(t%2400)/2400,frame=-1;
  if(phase<.44)frame=Math.floor(t/130)%8;
  if(phase>=.51&&phase<.95)frame=8+Math.floor(t/130)%8;
  if(pressed)frame=3;
  if(frame>=0){
   var scale=pressed?(age<85?.97:1+.035*Math.sin(Math.min(1,(age-85)/185)*Math.PI)):1;
   drawPrompt(frame,W/2,915,scale);
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
  if(noisePattern){
   ctx.save();ctx.globalAlpha=.25;ctx.fillStyle=noisePattern;
   ctx.fillRect(0,0,W,H);ctx.restore();
  }
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