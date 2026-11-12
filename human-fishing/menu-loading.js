/* Rotating illustrated in-game scene loader — NOT the initial title screen.
 * Approved five paintings + 3 separate bitmap UI assets.
 * UI progress reads the authoritative bootProgress element (0..1).
 */
(function(){
 'use strict';
 var canvas=document.getElementById('menuLoadingCanvas');
 var overlay=document.getElementById('bootOverlay'),progress=document.getElementById('bootProgress');
 if(!canvas||!overlay||!progress)return;
 var ctx=canvas.getContext('2d',{alpha:false}),W=1672,H=941;
 var root='./assets/menu-loading/',version='?v=20261112-menu-album1';
 var backgrounds=[
  'menu_01_treasure.webp',
  'menu_02_raft_pursuit.webp',
  'menu_03_pirate_crew.webp',
  'menu_04_shark_encounter.webp',
  'menu_05_seaside_market.webp'
 ];
 function load(name){
  var image=new Image();image.decoding='async';image.src=root+name+version;
  return image;
 }
 var slides=backgrounds.map(load);
 var ui={label:load('menu_loading_label.webp'),
         frame:load('menu_loading_frame.webp'),
         fill:load('menu_loading_fill.webp')};
 var first=Math.floor(Math.random()*slides.length),selected=(first+slides.length-1)%slides.length;
 function next(){selected=(selected+1)%slides.length;return selected;}
 function ready(im){return !!(im&&im.complete&&im.naturalWidth>0);}
 function draw(t){
  requestAnimationFrame(draw);
  if(overlay.hidden||!overlay.classList.contains('menu-loading')||
     document.visibilityState==='hidden')return;
  var slide=slides[selected<0?0:selected],fraction=Math.max(0,Math.min(1,Number(progress.value)||0));
  ctx.fillStyle='#06304d';ctx.fillRect(0,0,W,H);
  if(ready(slide))ctx.drawImage(slide,0,0,W,H);
  if(ready(ui.label)){
   ctx.drawImage(ui.label,(W-738)/2,707,738,97);
  }
  // Gold frame and separate full-width watery fill; crop the fill image,
  // never stretch its width as loading progresses (fish remain undistorted).
  var bx=(W-830)/2,by=794,bw=830,bh=103;
  if(ready(ui.frame))ctx.drawImage(ui.frame,bx,by,bw,bh);
  if(ready(ui.fill)&&fraction>0){
   var fx=bx+34,fy=by+24,fw=bw-68,fh=bh-44;
   ctx.save();
   ctx.beginPath();ctx.rect(fx,fy,fw*fraction,fh);ctx.clip();
   ctx.drawImage(ui.fill,fx,fy,fw,fh);
   ctx.restore();
  }
 }
 requestAnimationFrame(draw);
 window.HumanFishingMenuLoading={
  next:next,
  get selected(){return selected;},
  get slideCount(){return slides.length;}
 };
})();
