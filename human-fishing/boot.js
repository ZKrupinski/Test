/* One 1536 x 864 composition, including menus, on every screen. */
(function () {
 'use strict';
 var images=[], NativeImage=window.Image, rotated=false, started=false;
 function TrackedImage(w,h){var img=arguments.length===0?new NativeImage():arguments.length===1?new NativeImage(w):new NativeImage(w,h);images.push(img);return img;}
 TrackedImage.prototype=NativeImage.prototype;
 Object.setPrototypeOf(TrackedImage,NativeImage);
 window.Image=TrackedImage;
 var root=document.querySelector('.wrap'), overlay=document.getElementById('bootOverlay');
 var status=document.getElementById('bootStatus'), button=document.getElementById('bootStart');
 function fit(){
  var w=window.innerWidth,h=window.innerHeight;
  rotated=h>w;
  var scale=Math.min((rotated?h:w)/1536,(rotated?w:h)/864);
  root.style.transform='translate(-50%,-50%) rotate('+(rotated?90:0)+'deg) scale('+scale+')';
 }
 fit();window.addEventListener('resize',fit);
 document.addEventListener('fullscreenchange',fit);
 if(window.visualViewport)window.visualViewport.addEventListener('resize',fit);
 async function fullscreen(){
  try{
   var el=document.documentElement,request=el.requestFullscreen||el.webkitRequestFullscreen;
   if(!document.fullscreenElement&&!document.webkitFullscreenElement&&request)await request.call(el);
  }catch(e){}
  try{if(screen.orientation&&screen.orientation.lock)await screen.orientation.lock('landscape');}catch(e){}
  fit();
 }
 function activeImages(){return images.filter(function(img){return !!img.getAttribute('src');});}
 async function ready(){
  button.hidden=true;button.disabled=true;
  while(true){
   var active=activeImages(),failed=active.filter(function(im){return im.complete&&!im.naturalWidth;});
   var done=active.filter(function(im){return im.complete&&im.naturalWidth;});
   status.textContent='리소스 로딩 중 · '+done.length+' / '+active.length;
   document.getElementById('bootProgress').value=active.length?done.length/active.length:0;
   if(failed.length){
    status.textContent='리소스 '+failed.length+'개 로딩 실패 · 다시 시도해주세요';
    button.hidden=false;button.disabled=false;button.textContent='다시 불러오기';
    button.onclick=function(){failed.forEach(function(im){var src=im.src;im.src=src;});ready();};
    return;
   }
   if(done.length===active.length){
    try{await Promise.all(active.map(function(im){return im.decode?im.decode():Promise.resolve();}));}
    catch(e){await new Promise(function(r){setTimeout(r,100);});continue;}
    if(activeImages().length===active.length)break;
   }
   await new Promise(function(r){setTimeout(r,100);});
  }
  if(document.fonts)await document.fonts.ready;
  status.textContent='모든 리소스 준비 완료';
  document.getElementById('bootProgress').value=1;
  button.textContent='터치하여 시작';button.hidden=false;button.disabled=false;
  button.onclick=start;
  await fullscreen();
  if(document.fullscreenElement||document.webkitFullscreenElement)start();
 }
 var onStart;
 function start(){
  if(started)return;
  started=true;fullscreen();overlay.hidden=true;root.removeAttribute('inert');
  onStart();
 }
 // Re-enter fullscreen on a later real gesture if the user has left it.
 root.addEventListener('pointerdown',function(){if(started)fullscreen();},{passive:true});
 window.HumanFishingBoot={
  begin:function(callback){onStart=callback;ready();},
  point:function(e,canvas,W,H){var r=canvas.getBoundingClientRect();return rotated?
   {x:(e.clientY-r.top)/r.height*W,y:(r.right-e.clientX)/r.width*H}:
   {x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H};}
 };
})();
