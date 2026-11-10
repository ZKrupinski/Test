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
 var busy=false,depth=0,generation=0,decoded=new WeakMap();
 var retryImages=[],retrySerial=0,retryAttempts=0,retryTimer=null;
 function activeImages(){
  var dom=document.querySelectorAll?Array.from(document.querySelectorAll('img[src]')):[];
  // Lazy thumbnails must also be fetched while their menu is covered.
  dom.forEach(function(img){img.loading='eager';});
  return Array.from(new Set(images.concat(dom))).filter(function(img){return !!img.getAttribute('src');});
 }
 function source(img){return img.currentSrc||img.src;}
 function delay(ms){return new Promise(function(resolve){setTimeout(resolve,ms);});}
 function failure(list,token){
  if(token!==generation)return;
  retryImages=Array.from(new Set(list));
  // Keep the existing preloading screen and simulation pause. Do not open a
  // new failure dialog or require a click; the START button is for startup only.
  button.hidden=true;button.disabled=true;button.onclick=null;
  status.textContent='이미지 '+retryImages.length+'개 로딩 지연 · 자동 재시도 중';
  // Short exponential backoff avoids hammering slow mobile connections.
  // Continue retrying transient HTTP, decode and timeout failures indefinitely.
  var backoff=Math.min(5000,350*Math.pow(2,Math.min(4,retryAttempts++)));
  if(retryTimer!==null)clearTimeout(retryTimer);
  retryTimer=setTimeout(function(){
   retryTimer=null;
   if(token!==generation)return;
   var failedSources=new Set(retryImages.map(function(im){return im.src;}));
   var retry=++retrySerial;
   // Restart every consumer of the same failed URL, preserving Image identity.
   activeImages().filter(function(im){return failedSources.has(im.src);}).forEach(function(im){
    decoded.delete(im);
    var base=im._hfRetryBase||(im._hfRetryBase=im.src);
    im.src=base+(base.indexOf('?')<0?'?':'&')+'hfRetry='+retry;
   });
   // A fresh gate must decode the replacement image before showing the scene.
   ready();
  },backoff);
 }
 async function ready(){
  var token=++generation,startedAt=Date.now();
  button.hidden=true;button.disabled=true;
  while(token===generation){
   var active=activeImages(),failed=active.filter(function(im){return im.complete&&!im.naturalWidth;});
   var done=active.filter(function(im){return im.complete&&im.naturalWidth;});
   status.textContent='리소스 로딩 중 · '+done.length+' / '+active.length;
   document.getElementById('bootProgress').value=active.length?done.length/active.length:0;
   if(failed.length){failure(failed,token);return;}
   if(Date.now()-startedAt>30000){failure(active.filter(function(im){return decoded.get(im)!==source(im);}),token);return;}
   if(done.length===active.length){
    var decodeFailed=[];
    // Bound decoding work: hundreds of simultaneous PNG decodes can exhaust
    // mobile memory or expire together even after every download succeeds.
    for(var offset=0;offset<active.length;offset+=4){
     await Promise.all(active.slice(offset,offset+4).map(async function(im){
     var src=source(im);if(decoded.get(im)===src)return;
     try{
      // A broken decode must not leave the loading screen waiting forever.
      var timer;
      await new Promise(function(resolve,reject){
       timer=setTimeout(function(){reject(new Error('Image decode timed out'));},10000);
       Promise.resolve(im.decode?im.decode():undefined).then(resolve,reject);
      }).finally(function(){clearTimeout(timer);});
      if(source(im)===src)decoded.set(im,src);
     }catch(e){decodeFailed.push(im);}
    }));
     if(token!==generation)return;
    }
    if(token!==generation)return;
    if(decodeFailed.length){failure(decodeFailed,token);return;}
    var current=activeImages();
    if(current.every(function(im){return im.complete&&im.naturalWidth&&decoded.get(im)===source(im);}))break;
   }
   await delay(100);
  }
  if(token!==generation)return;
  if(document.fonts)await document.fonts.ready;
  if(token!==generation)return;
  retryImages=[];retryAttempts=0;
  if(retryTimer!==null){clearTimeout(retryTimer);retryTimer=null}
  status.textContent='모든 리소스 준비 완료';
  document.getElementById('bootProgress').value=1;
  if(started){
   busy=false;
   // Let the paused game render its destination before uncovering the canvas.
   requestAnimationFrame(function(){requestAnimationFrame(function(){
    if(token!==generation||busy)return;
    overlay.hidden=true;root.removeAttribute('aria-busy');
   });});
   return;
  }
  button.textContent='터치하여 시작';button.hidden=false;button.disabled=false;
  button.onclick=start;
  await fullscreen();
  if(document.fullscreenElement||document.webkitFullscreenElement)start();
 }
 function guard(callback){
  if(!started)return callback();
  // Nested mode/panel changes belong to one transition. Ignore repeated input.
  if(busy&&!depth)return;
  if(depth)return callback();
  busy=true;overlay.hidden=false;root.setAttribute('aria-busy','true');
  button.hidden=true;button.disabled=true;status.textContent='리소스 로딩 중';
  depth++;
  try{return callback();}
  finally{
   depth--;
   // The rest of the synchronous renderer can finish creating its images first.
   Promise.resolve().then(ready);
  }
 }
 var onStart;
 function start(){
  if(started)return;
  started=true;fullscreen();overlay.hidden=true;root.removeAttribute('inert');
  onStart();
 }
 // Re-enter fullscreen on a later real gesture if the user has left it.
 root.addEventListener('pointerdown',function(){if(started)fullscreen();},{passive:true});
 // Cover mouse, touch and keyboard activation while assets are pending.
 ['click','pointerdown','pointerup','keydown'].forEach(function(type){
  document.addEventListener(type,function(event){
   if(started&&(busy||!overlay.hidden)&&!overlay.contains(event.target)){
    event.preventDefault();event.stopImmediatePropagation();
   }
  },true);
 });
 window.HumanFishingBoot={
  guard:guard,
  get busy(){return busy;},
  begin:function(callback){onStart=callback;ready();},
  point:function(e,canvas,W,H){var r=canvas.getBoundingClientRect();return rotated?
   {x:(e.clientY-r.top)/r.height*W,y:(r.right-e.clientX)/r.width*H}:
   {x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H};}
 };
})();
