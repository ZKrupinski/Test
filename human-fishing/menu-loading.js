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
 // Load each background on demand. This prevents the five large paintings
 // delaying the initial GAME START title. Only the selected scene participates
 // in the next transition's real image/decode gate.
 var slides=backgrounds.map(function(){return null}),ui=null;
 var selected=-1,previous=-1,bag=[];
 var uiPositions=[
  {label:757,frame:853},
  {label:742,frame:838},
  {label:743,frame:849},
  {label:725,frame:810},
  {label:731,frame:838}
 ];
 function next(){
  if(!bag.length){
   bag=backgrounds.map(function(_,i){return i});
   for(var i=bag.length-1;i>0;i--){
    var j=Math.floor(Math.random()*(i+1)),tmp=bag[i];
    bag[i]=bag[j];bag[j]=tmp;
   }
   // Also avoid one duplicate exactly at the end of a five-image round.
   if(bag.length>1&&bag[bag.length-1]===previous){
    var first=bag[0];bag[0]=bag[bag.length-1];
    bag[bag.length-1]=first;
   }
  }
  selected=bag.pop();previous=selected;
  if(!slides[selected])slides[selected]=load(backgrounds[selected]);
  if(!ui){
   ui={label:load('menu_loading_label.webp'),
       frame:load('menu_loading_frame.webp'),
       fill:load('menu_loading_fill.webp')};
  }
  return selected;
 }
 function ready(im){return !!(im&&im.complete&&im.naturalWidth>0);}
 function draw(t){
  requestAnimationFrame(draw);
  if(overlay.hidden||!overlay.classList.contains('menu-loading')||
     document.visibilityState==='hidden')return;
  var slide=slides[selected<0?0:selected],fraction=Math.max(0,Math.min(1,Number(progress.value)||0));
  ctx.fillStyle='#06304d';ctx.fillRect(0,0,W,H);
  if(ready(slide))ctx.drawImage(slide,0,0,W,H);
  var positions=uiPositions[selected]||uiPositions[0];
  if(ui&&ready(ui.label))
   ctx.drawImage(ui.label,(W-738)/2,positions.label-97/2,738,97);
  // Gold frame and separate full-width watery fill; crop the fill image,
  // never stretch its width as loading progresses (fish remain undistorted).
  var bx=(W-830)/2,by=positions.frame-103/2,bw=830,bh=103;
  if(ui&&ready(ui.frame))ctx.drawImage(ui.frame,bx,by,bw,bh);
  if(ui&&ready(ui.fill)&&fraction>0){
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
