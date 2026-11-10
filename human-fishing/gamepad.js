/* HUMAN FISHING gamepad: standard Xbox/PlayStation mapping + optional rumble.
 * Safe on touch/mobile devices with no connected controller.
 */
(function(global){
'use strict';
var doc=global.document,nav=global.navigator||{},api=null,activeIndex=-1;
var lastButtons=[],lastAxis=false,lastControl=-1,status=null,rumbleButton=null,testButton=null,infoText=null;
var lastHapticResult='not-tested',lastResultText='',rumbleRequestSerial=0;
var vibrationOn=true,rumbleEnd=0,rumblePriority=0,deadzone=.17;
var strength={
 brush:[35,.06,.21],weakspot:[125,.28,.48],bite:[142,.78,.68],
 pull:[43,.12,.25],swallow:[190,.53,.35],escape:[240,.87,.75],
 counter:[175,.78,.70],fever:[185,.70,.88],splash:[115,.57,.54],
 test:[240,.90,.82]
};
function isGameSirG8Plus(p){return !!(p&&/gamesir[\s-_]*g8\+|gamesir[\s-_]*g8\s*plus|gamesir.*g8/i.test(String(p.id||'')))}
function actuators(p){
 var a=[],seen=[];
 function add(m){if(m&&seen.indexOf(m)<0){seen.push(m);a.push(m)}}
 if(p){
  add(p.vibrationActuator);
  if(p.hapticActuators)Array.from(p.hapticActuators).forEach(add);
 }
 return a;
}
function hapticPaths(p){
 var list=[];
 actuators(p).forEach(function(a){
  if(typeof a.playEffect==='function'&&
     (!a.effects||a.effects.length===0||Array.from(a.effects).indexOf('dual-rumble')>=0)){
   list.push({type:'dual-rumble',run:function(opt){
    return a.playEffect('dual-rumble',{startDelay:0,duration:opt.duration,
     strongMagnitude:opt.strong,weakMagnitude:opt.weak});
   }});
  }
  // Legacy Chrome/Android controllers sometimes expose pulse but not
  // dual-rumble. This is still the gamepad motor, not navigator.vibrate().
  if(typeof a.pulse==='function'){
   list.push({type:'pulse',run:function(opt){
    return a.pulse(Math.max(opt.strong,opt.weak),opt.duration);
   }});
  }
 });
 return list;
}
function diagnosticText(p){
 if(!p)return '게임패드를 연결하고 아무 버튼을 누르세요.';
 if(!hapticPaths(p).length){
  return isGameSirG8Plus(p)?
   'G8+ 인식 · 브라우저가 패드 진동 모터를 노출하지 않음 (휴대폰 진동과 별개)':
   '게임패드 인식 · 브라우저가 패드 진동 API를 제공하지 않음';
 }
 return '패드 모터 API 감지 · TEST를 눌러 실제 진동을 확인하세요.';
}
function showHapticResult(message){
 lastResultText=message;
 if(infoText)infoText.textContent=message;
}
function hapticInfo(){
 var p=current();
 return {connected:!!p,isGameSirG8Plus:isGameSirG8Plus(p),
  actuatorAvailable:hapticPaths(p).length>0,lastResult:lastHapticResult,
  message:lastResultText||diagnosticText(p)};
}
function getPads(){
 if(typeof nav.getGamepads!=='function')return [];
 try{return Array.from(nav.getGamepads()||[]).filter(function(p){
  return p&&p.connected!==false&&p.buttons&&p.axes&&p.buttons.length>=8&&p.axes.length>=2;
 });}catch(e){return [];}
}
function current(){
 var pads=getPads();
 var match=pads.find(function(p){return p.index===activeIndex;});
 if(!match)match=pads.find(function(p){return p.mapping==='standard'})||pads[0];
 return match||null;
}
function pressed(p,i){var b=p.buttons[i];return !!(b&&(b.pressed||b.value>=.55));}
function axis(n){return Math.abs(n||0)<deadzone?0:Math.max(-1,Math.min(1,(Math.abs(n)-deadzone)/(1-deadzone)))*Math.sign(n);}
function canUse(){return !(doc&&doc.hidden)&&!(api&&api.busy&&api.busy());}
function setStatus(p){
 if(!doc||!doc.getElementById)return;
 if(!status){
  var stage=doc.getElementById('stage');
  if(!stage)return;
  status=doc.createElement('div');
  status.id='gamepadStatus';status.setAttribute('role','status');
  status.setAttribute('aria-live','polite');
  status.style.cssText='display:none;position:absolute;left:14px;bottom:10px;z-index:10;padding:7px 10px;max-width:min(440px,87%);border-radius:8px;background:#071f2cec;border:1px solid #6fcfc677;color:#dcfaf3;font:700 11px/1.4 system-ui,sans-serif;pointer-events:auto;';
  var caption=doc.createElement('span');caption.id='gamepadInfo';status.appendChild(caption);
  rumbleButton=doc.createElement('button');
  rumbleButton.id='gamepadRumbleToggle';rumbleButton.type='button';
  rumbleButton.style.cssText='margin-left:8px;border-radius:5px;padding:3px 6px;background:#1e5164;color:#edffff;border:1px solid #93d7cc77;font:700 11px system-ui;';
  rumbleButton.addEventListener('click',function(){vibrationOn=!vibrationOn;updateToggle();});
  status.appendChild(rumbleButton);
  testButton=doc.createElement('button');
  testButton.id='gamepadRumbleTest';testButton.type='button';
  testButton.textContent='진동 TEST';
  testButton.style.cssText='margin-left:5px;border-radius:5px;padding:3px 6px;background:#1e5164;color:#edffff;border:1px solid #93d7cc77;font:700 11px system-ui;';
  testButton.addEventListener('click',testRumble);
  status.appendChild(testButton);
  infoText=doc.createElement('div');infoText.id='gamepadHapticStatus';
  infoText.setAttribute('role','status');infoText.style.cssText='margin-top:4px;font:600 10px/1.4 system-ui;color:#b9dfda';
  status.appendChild(infoText);
  stage.appendChild(status);
 }
 status.style.display=p?'block':'none';
 if(p){
  var supported=hapticPaths(p).length>0;
  doc.getElementById('gamepadInfo').textContent=
   '🎮 '+(isGameSirG8Plus(p)?'GameSir G8+':String(p.id||'GAMEPAD').slice(0,24))+
   ' · LS 미끼 · A/RT 낚시 · LB/RB 메뉴';
  rumbleButton.disabled=!supported;
  rumbleButton.title=supported?'게임패드 진동 켜기/끄기':'브라우저가 패드 진동 API를 노출하지 않습니다';
  testButton.disabled=!supported;
  testButton.title=supported?'패드 양쪽 그립에 테스트 진동을 전송합니다':
   '모터 API 미노출 · G8+ 노란색 Android 모드에서 Chrome으로 확인하세요';
  lastHapticResult='not-tested';lastResultText='';
  infoText.textContent=diagnosticText(p);
  if(isGameSirG8Plus(p)){
   infoText.title='G8+ Android 모드는 노란 LED. G-Touch(청록) 대신 일반 블루투스 연결을 사용하세요. M + 방향키 위/아래로 패드 모터 세기를 조절할 수 있습니다.';
  }
  updateToggle();
 }
}
function updateToggle(){
 if(!rumbleButton)return;
 rumbleButton.textContent=rumbleButton.disabled?'진동 미지원':vibrationOn?'진동 ON':'진동 OFF';
}
function focusable(){
 if(!doc||!doc.querySelectorAll)return [];
 var root=doc.querySelector('#panel.open')||
  doc.querySelector('#motionTunePanel.visible')||
  doc.querySelector('#rodTunePanel.visible')||
  doc.querySelector('#sideinfo.show');
 if(!root)return [];
 return Array.from(root.querySelectorAll('button,select,input,[tabindex]')).filter(function(el){
  return !el.disabled&&el.getAttribute('aria-hidden')!=='true'&&
   (el.getClientRects?el.getClientRects().length>0:true);
 });
}
function focusStep(delta){
 var elements=focusable();
 if(!elements.length)return false;
 var i=elements.indexOf(doc.activeElement);
 i=(i+delta+elements.length)%elements.length;
 if(elements[i]&&typeof elements[i].focus==='function')elements[i].focus();
 return true;
}
function selectChange(delta){
 var a=doc&&doc.activeElement;
 if(!a)return false;
 if(a.tagName==='SELECT'){
  a.selectedIndex=Math.max(0,Math.min(a.options.length-1,a.selectedIndex+delta));
  if(typeof a.dispatchEvent==='function'&&global.Event)a.dispatchEvent(new global.Event('change',{bubbles:true}));
  return true;
 }
 if(a.type==='range'){
  var step=Number(a.step)||1,min=Number(a.min)||0,max=Number(a.max)||100;
  a.value=String(Math.max(min,Math.min(max,Number(a.value)+delta*step)));
  if(typeof a.dispatchEvent==='function'&&global.Event)a.dispatchEvent(new global.Event('input',{bubbles:true}));
  return true;
 }
 return false;
}
function switchNav(delta){
 if(!doc||!doc.querySelectorAll)return;
 var tabs=Array.from(doc.querySelectorAll('header nav button')).filter(function(b){return !b.disabled;});
 if(!tabs.length)return;
 var n=tabs.findIndex(function(el){return el.classList.contains('active')});
 var next=tabs[(n+delta+tabs.length)%tabs.length];
 if(next&&typeof next.click==='function')next.click();
 if(next&&typeof next.focus==='function')next.focus();
}
function closeMenu(){
 if(!doc)return false;
 var panel=doc.getElementById('panel');
 if(panel&&panel.classList.contains('open')){
  var close=doc.getElementById('closePanel');
  if(close)close.click();else panel.classList.remove('open');
  return true;
 }
 var options=['motionClose','rodClose','aquaSaleClose'];
 for(var i=0;i<options.length;i++){
  var b=doc.getElementById(options[i]);
  if(b&&b.getClientRects&&b.getClientRects().length){b.click();return true;}
 }
 return false;
}
function menuOpen(){
 return !!(doc&&(
  (doc.getElementById('panel')&&doc.getElementById('panel').classList.contains('open'))||
  (doc.querySelector&&doc.querySelector('#motionTunePanel.visible, #rodTunePanel.visible, #sideinfo.show'))));
}
function clickFocused(){
 var list=focusable(),item=doc&&doc.activeElement;
 if(!item||list.indexOf(item)<0){focusStep(1);return;}
 if(item.tagName==='SELECT'){selectChange(1);return;}
 if(typeof item.click==='function')item.click();
}
function poll(){
 if(!api)return;
 var p=current();
 if(!p||!canUse()){
  if(activeIndex!==-1&&api.move)api.move(0,0);
  activeIndex=-1;lastButtons=[];lastAxis=false;setStatus(null);
  return;
 }
 if(p.index!==activeIndex){
  activeIndex=p.index;lastButtons=[];lastAxis=false;lastControl=-1;setStatus(p);
 }
 var buttons=Array.from({length:p.buttons.length},function(_,i){return pressed(p,i);});
 function rising(i){return buttons[i]&&!lastButtons[i];}
 var x=axis(p.axes[0]),y=axis(p.axes[1]),mag=Math.hypot(x,y);
 if(mag>1){x/=mag;y/=mag;}
 var moving=Math.hypot(x,y)>.02;
 var meaningful=moving||buttons.some(Boolean);
 if(meaningful&&api.userInput)api.userInput();
 var modal=menuOpen();
 if(rising(9)){
  if(modal)closeMenu();
  else if(doc&&doc.getElementById('navFish'))doc.getElementById('navFish').click();
 }else if(rising(1)||rising(8)){
  if(modal)closeMenu();
  else if(api.cancel)api.cancel();
 }
 if(rising(4))switchNav(-1);
 if(rising(5))switchNav(1);
 if(modal){
  if(api.move)api.move(0,0);
  if(rising(12))focusStep(-1);
  if(rising(13))focusStep(1);
  if(rising(14))selectChange(-1)||focusStep(-1);
  if(rising(15))selectChange(1)||focusStep(1);
  if(rising(0)||rising(7))clickFocused();
 }else{
  if(rising(12))switchNav(-1);
  if(rising(13))switchNav(1);
  if(rising(2)&&doc&&doc.getElementById('navBook'))doc.getElementById('navBook').click();
  if(api.move)api.move(x,y);
  if((rising(0)||rising(7))&&api.action)api.action();
 }
 lastButtons=buttons;lastAxis=moving;
}
// Uses the controller motor only. Never claim phone navigator.vibrate()
 // as successful G8+ haptics. Try the legacy pulse pathway if dual-rumble
 // was rejected asynchronously by Android Chromium.
function runPadHaptic(p,options,report){
 var paths=hapticPaths(p),i=0,serial=++rumbleRequestSerial;
 function success(path){
  if(report&&serial===rumbleRequestSerial){
   lastHapticResult='command-complete';
   showHapticResult(path.type==='dual-rumble'?
    '패드 진동 명령 완료 · G8+ 그립 진동을 직접 확인하세요.':
    '구형 패드 진동(pulse) 명령 완료 · 실제 진동을 확인하세요.');
  }
 }
 function exhausted(){
  if(report&&serial===rumbleRequestSerial){
   lastHapticResult='rejected';
   showHapticResult('브라우저/연결 모드에서 진동 명령 거절 · G8+ 노란 LED Android 모드 및 진동 강도를 확인하세요.');
  }
 }
 function attempt(){
  while(i<paths.length){
   var path=paths[i++],response;
   try{response=path.run(options)}
   catch(e){continue}
   if(response&&typeof response.then==='function'){
    response.then(function(result){
     if(result==='complete'||result===true||result===undefined)success(path);
     else attempt();
    },function(){attempt();});
   }else if(response===false){
    continue;
   }else{
    success(path);
   }
   return true;
  }
  exhausted();
  return false;
 }
 return attempt();
}
function rumble(pattern,priority,kind){
 if(!vibrationOn||!canUse())return false;
 var p=current();if(!p)return false;
 var pms=Array.isArray(pattern)?pattern.reduce(function(a,b){return a+(Number(b)||0)},0):Number(pattern)||0;
 var setting=strength[kind]||[Math.max(20,pms),.30,.40];
 var duration=Math.min(400,Math.max(15,Math.round(kind==='pull'?Math.min(setting[0],pms):setting[0])));
 var now=(global.performance&&typeof global.performance.now==='function'?global.performance.now():Date.now());
 if(now<rumbleEnd&&(priority||0)<rumblePriority)return false;
 var accepted=runPadHaptic(p,{duration:duration,strong:setting[1],weak:setting[2]},kind==='test');
 if(accepted){rumbleEnd=now+duration;rumblePriority=priority||0;}
 return accepted;
}
function testRumble(){
 var p=current();
 if(!p){lastHapticResult='no-controller';showHapticResult('게임패드 연결을 먼저 확인하세요.');return false;}
 if(!vibrationOn){lastHapticResult='disabled';showHapticResult('진동 OFF 상태입니다. ON으로 바꾼 뒤 테스트하세요.');return false;}
 if(!hapticPaths(p).length){
  lastHapticResult='not-exposed';showHapticResult(diagnosticText(p));return false;
 }
 lastHapticResult='pending';
 showHapticResult('진동 명령 전송 중… (G8+ 양쪽 그립을 확인하세요)');
 return rumble([240],9,'test');
}
function init(callbacks){api=callbacks||{};return{poll:poll,rumble:rumble};}
global.HumanFishingGamepad={init:init,poll:poll,rumble:rumble,testRumble:testRumble,
 getConnected:current,hapticInfo:hapticInfo};
})(window);
