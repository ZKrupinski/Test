/* HUMAN FISHING gamepad: standard Xbox/PlayStation mapping + optional rumble.
 * Safe on touch/mobile devices with no connected controller.
 */
(function(global){
'use strict';
var doc=global.document,nav=global.navigator||{},api=null,activeIndex=-1;
var lastButtons=[],lastAxis=false,lastControl=-1,status=null,rumbleButton=null;
var vibrationOn=true,rumbleEnd=0,rumblePriority=0,deadzone=.17;
var strength={
 brush:[35,.06,.21],weakspot:[125,.28,.48],bite:[142,.78,.68],
 pull:[43,.12,.25],swallow:[190,.53,.35],escape:[240,.87,.75],
 counter:[175,.78,.70],fever:[185,.70,.88],splash:[115,.57,.54]
};
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
  status.style.cssText='display:none;position:absolute;left:14px;bottom:10px;z-index:10;padding:6px 9px;max-width:370px;border-radius:8px;background:#071f2cdd;border:1px solid #6fcfc677;color:#dcfaf3;font:700 11px/1.4 system-ui,sans-serif;pointer-events:auto;';
  var caption=doc.createElement('span');caption.id='gamepadInfo';status.appendChild(caption);
  rumbleButton=doc.createElement('button');
  rumbleButton.id='gamepadRumbleToggle';rumbleButton.type='button';
  rumbleButton.style.cssText='margin-left:8px;border-radius:5px;padding:3px 6px;background:#1e5164;color:#edffff;border:1px solid #93d7cc77;font:700 11px system-ui;';
  rumbleButton.addEventListener('click',function(){vibrationOn=!vibrationOn;updateToggle();});
  status.appendChild(rumbleButton);stage.appendChild(status);
 }
 status.style.display=p?'block':'none';
 if(p){
  var h=p.vibrationActuator||(p.hapticActuators&&p.hapticActuators[0]);
  var supported=!!(h&&(typeof h.playEffect==='function'||typeof h.pulse==='function'));
  doc.getElementById('gamepadInfo').textContent=
   '🎮 '+String(p.id||'GAMEPAD').slice(0,24)+' · LS 미끼 · A/RT 낚시 · LB/RB 메뉴 · START 스테이지';
  rumbleButton.disabled=!supported;
  rumbleButton.title=supported?'진동 켜기/끄기':'이 브라우저·패드 조합에서는 진동을 지원하지 않습니다';
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
function rumble(pattern,priority,kind){
 if(!vibrationOn||!canUse())return false;
 var p=current();if(!p)return false;
 var actuator=p.vibrationActuator||(p.hapticActuators&&p.hapticActuators[0]);
 if(!actuator)return false;
 var pms=Array.isArray(pattern)?pattern.reduce(function(a,b){return a+(Number(b)||0)},0):Number(pattern)||0;
 var setting=strength[kind]||[Math.max(20,pms),.30,.40];
 var duration=Math.min(400,Math.max(15,Math.round(kind==='pull'?Math.min(setting[0],pms):setting[0])));
 var now=(global.performance&&typeof global.performance.now==='function'?global.performance.now():Date.now());
 if(now<rumbleEnd&&(priority||0)<rumblePriority)return false;
 try{
  if(typeof actuator.playEffect==='function'){
   if(actuator.effects&&actuator.effects.length&&!actuator.effects.includes('dual-rumble'))return false;
   var r=actuator.playEffect('dual-rumble',{startDelay:0,duration:duration,strongMagnitude:setting[1],weakMagnitude:setting[2]});
   if(r&&typeof r.catch==='function')r.catch(function(){});
  }else if(typeof actuator.pulse==='function'){
   var x=actuator.pulse(Math.max(setting[1],setting[2]),duration);
   if(x&&typeof x.catch==='function')x.catch(function(){});
  }else return false;
  rumbleEnd=now+duration;rumblePriority=priority||0;
  return true;
 }catch(e){return false;}
}
function init(callbacks){api=callbacks||{};return{poll:poll,rumble:rumble};}
global.HumanFishingGamepad={init:init,poll:poll,rumble:rumble,getConnected:current};
})(window);
