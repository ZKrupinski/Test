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
 var progress=document.getElementById('bootProgress');
 var menuShownAt=0,menuImageBaseline=null;
 function showLoading(){
  // A scene transition must never inherit the ready-to-start button artwork.
  overlay.classList.remove('title-ready');
  overlay.classList.add('title-loading');
  // Startup title is separate; only game menu transitions use the painted album.
  if(started)overlay.classList.add('menu-loading');
  else overlay.classList.remove('menu-loading');
  button.hidden=true;button.disabled=true;
  progress.value=0;
 }
 function updateImageProgress(active){
  // On a menu change, measure only new or replaced sources, not every
  // already-decoded fish from past scenes. Startup still measures all assets.
  var targets=started&&menuImageBaseline?active.filter(function(im){
   return menuImageBaseline.get(im)!==source(im);
  }):active;
  var total=targets.length;
  var downloaded=targets.filter(function(im){return im.complete&&im.naturalWidth>0;}).length;
  var decodedCount=targets.filter(function(im){return im.complete&&im.naturalWidth>0&&decoded.get(im)===source(im);}).length;
  // Real image download+decode completion accounts for 90%; fonts/audio follow.
  var fraction=total?(downloaded+decodedCount)/(2*total):1;
  progress.value=Math.max(progress.value||0,Math.min(.90,.90*fraction));
  status.textContent='로딩 중 · '+Math.round(progress.value*100)+'%';
 }
 function isActualMobile(){
  var ua=(navigator.userAgent||'');
  var data=navigator.userAgentData;
  // Never rotate a desktop window, including touch laptops.
  if(data&&typeof data.mobile==='boolean'){
   if(data.mobile)return true;
   if(!/iPad/i.test(ua)&&!/Macintosh/i.test(ua))return false;
  }
  if(/Windows NT|CrOS|X11|Linux x86_64/i.test(ua))return false;
  if(/Android|iPhone|iPad|iPod/i.test(ua))return true;
  return /Macintosh/i.test(ua)&&navigator.maxTouchPoints>1&&
   !!window.matchMedia&&window.matchMedia('(pointer:coarse)').matches;
 }
 function fit(){
  var w=window.innerWidth,h=window.innerHeight;
  rotated=h>w&&isActualMobile();
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
  try{if(isActualMobile()&&screen.orientation&&screen.orientation.lock)await screen.orientation.lock('landscape');}catch(e){}
  fit();
 }
 // Allow first START/A press to launch once preload is complete.
 // Gamepad polling here is independent of gameplay, which begins only after start().
 var startPadPolling=false,startPadWasPressed=false;
 function prestartGamepadFrame(){
  if(started){startPadPolling=false;return;}
  var pressed=false;
  if(!button.hidden&&!button.disabled&&typeof navigator!=='undefined'&&
     typeof navigator.getGamepads==='function'){
   try{
    var list=navigator.getGamepads()||[];
    for(var k=0;k<list.length;k++){
     var pad=list[k];if(!pad||pad.connected===false)continue;
     var a=pad.buttons&&pad.buttons[0],start=pad.buttons&&pad.buttons[9];
     if((a&&(a.pressed||a.value>.55))||(start&&(start.pressed||start.value>.55))){
      pressed=true;break;
     }
    }
   }catch(e){}
  }
  if(pressed&&!startPadWasPressed&&!button.hidden&&!button.disabled){requestStart();return;}
  startPadWasPressed=pressed;
  if(typeof requestAnimationFrame==='function')requestAnimationFrame(prestartGamepadFrame);
  else startPadPolling=false;
 }
 function enablePrestartGamepad(){
  if(!startPadPolling&&typeof requestAnimationFrame==='function'){
   startPadPolling=true;requestAnimationFrame(prestartGamepadFrame);
  }
 }
 var busy=false,depth=0,generation=0,decoded=new WeakMap();
 var extraPreload=null;
 function boundedAudioLoad(promise){
  var timer;
  return Promise.race([Promise.resolve(promise),new Promise(function(resolve){
   timer=setTimeout(resolve,12000);
  })]).catch(function(e){
   if(window.console&&window.console.warn)window.console.warn('Ambient preloading unavailable:',e);
  }).finally(function(){clearTimeout(timer)});
 }
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
  showLoading();
  // Start sound decoding in parallel with image download/decode. AudioContext
  // can decode before gesture; its actual playback is unlocked by START.
  var soundReady=Promise.resolve();
  if(extraPreload){
   try{soundReady=boundedAudioLoad(extraPreload())}
   catch(e){soundReady=Promise.resolve()}
  }
  while(token===generation){
   var active=activeImages(),failed=active.filter(function(im){return im.complete&&!im.naturalWidth;});
   var done=active.filter(function(im){return im.complete&&im.naturalWidth;});
   updateImageProgress(active);
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
     updateImageProgress(active);
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
  progress.value=Math.max(progress.value||0,.94);
  status.textContent='사운드 준비 중 · 94%';
  await soundReady;
  if(token!==generation)return;
  retryImages=[];retryAttempts=0;
  if(retryTimer!==null){clearTimeout(retryTimer);retryTimer=null}
  status.textContent='모든 리소스 준비 완료';
  progress.value=1;
  if(started){
   busy=false;
   // A brief viewing time lets each artwork register during fast cached menu
   // changes; unlike resource loading, the actual progress bar is not faked.
   var hold=window.HumanFishingMenuLoading?Math.max(0,550-(Date.now()-menuShownAt)):0;
   setTimeout(function(){
    if(token!==generation||busy)return;
    requestAnimationFrame(function(){requestAnimationFrame(function(){
     if(token!==generation||busy)return;
     overlay.hidden=true;overlay.classList.remove('menu-loading');
     menuImageBaseline=null;
     root.removeAttribute('aria-busy');
    });});
   },hold);
   return;
  }
  button.textContent='터치 · A / START로 시작';button.hidden=false;button.disabled=false;
  button.onclick=requestStart;enablePrestartGamepad();
  overlay.classList.remove('title-loading');
  overlay.classList.add('title-ready');
  // Fullscreen/orientation lock are only requested after an explicit user gesture.
 }
 function guard(callback){
  if(!started)return callback();
  // Nested mode/panel changes belong to one transition. Ignore repeated input.
  if(busy&&!depth)return;
  if(depth)return callback();
  busy=true;overlay.hidden=false;root.setAttribute('aria-busy','true');
  menuImageBaseline=new WeakMap();
  activeImages().forEach(function(im){menuImageBaseline.set(im,source(im));});
  showLoading();status.textContent='로딩 중 · 0%';
  menuShownAt=Date.now();
  if(window.HumanFishingMenuLoading)window.HumanFishingMenuLoading.next();
  depth++;
  try{return callback();}
  finally{
   depth--;
   // The rest of the synchronous renderer can finish creating its images first.
   Promise.resolve().then(ready);
  }
 }
 var onStart,startPending=false;
 function requestStart(){
  if(started||startPending||button.hidden||button.disabled)return;
  startPending=true;button.disabled=true;
  var finish=function(){if(started)return;startPending=false;start();};
  if(window.HumanFishingTitle&&typeof window.HumanFishingTitle.press==='function')
   window.HumanFishingTitle.press(finish);
  else finish();
 }
 // Explicit first input starts the loaded game once; never eat START/A/ENTER.
 document.addEventListener('keydown',function(e){
  if(started||startPending||button.hidden||button.disabled||e.repeat||e.isComposing||
     e.ctrlKey||e.metaKey||e.altKey)return;
  if(['Enter',' ','ArrowDown','a','A'].includes(e.key)){
   e.preventDefault();requestStart();
  }
 },true);
 function start(){
  if(started)return;
  started=true;fullscreen();overlay.hidden=true;
  overlay.classList.remove('title-ready');overlay.classList.remove('menu-loading');
  root.removeAttribute('inert');
  if(window.HumanFishingAmbient)window.HumanFishingAmbient.unlock();
  onStart();
 }
 // Re-enter fullscreen on a later real gesture if the user has left it.
 root.addEventListener('pointerdown',function(){if(started&&isActualMobile()&&!document.fullscreenElement)fullscreen();},{passive:true});
 // Cover mouse, touch and keyboard activation while assets are pending.
 ['click','pointerdown','pointerup','keydown'].forEach(function(type){
  document.addEventListener(type,function(event){
   if(started&&(busy||!overlay.hidden)&&!overlay.contains(event.target)){
    event.preventDefault();event.stopImmediatePropagation();
   }
  },true);
 });
 window.HumanFishingBoot={
  registerPreload:function(fn){extraPreload=typeof fn==='function'?fn:null;},
  guard:guard,
  get busy(){return busy;},
  begin:function(callback){onStart=callback;ready();},
  point:function(e,canvas,W,H){var r=canvas.getBoundingClientRect();return rotated?
   {x:(e.clientY-r.top)/r.height*W,y:(r.right-e.clientX)/r.width*H}:
   {x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H};}
 };
})();
