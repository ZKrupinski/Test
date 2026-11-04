// Dependency-free runtime smoke test. Run: node human-fishing/qa-smoke.cjs
'use strict';
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync(require('node:path').join(__dirname,'index.html'),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/i)?.[1];
assert.ok(script,'Inline game script is missing');
new vm.Script(script,{filename:'human-fishing.js'});
const finalSuccess=script.slice(script.lastIndexOf('function success(){'),script.indexOf('function startCast()',script.lastIndexOf('function success(){')));
assert.match(finalSuccess,/playCatchFx\(/,'Success must trigger in-world capture visual');
assert.doesNotMatch(finalSuccess,/announce\(/,'Successful catch must not display old center banner');
assert.match(script,/function drawCatchFx\(dt\)/,'In-world capture VFX must be implemented');
const listeners={};
const elements=new Map();
const memory=new Map();
const style=()=>({});
const gradient=()=>({addColorStop(){}});
let lastTranslate=null;
const ctx=new Proxy({createLinearGradient:gradient,createRadialGradient:gradient,translate(x,y){lastTranslate={x,y}}}, {
  get(obj,k){return Object.hasOwn(obj,k)?obj[k]:function(){}},
  set(obj,k,v){obj[k]=v;return true;}
});
function element(id){
  if(elements.has(id))return elements.get(id);
  const classes=new Set();
  const obj={id,style:style(),dataset:{},value:'',textContent:'',innerHTML:'',
    classList:{
      add(k){classes.add(k)},remove(k){classes.delete(k)},
      toggle(k,v){if(v===undefined)v=!classes.has(k);v?classes.add(k):classes.delete(k);return v},
      contains(k){return classes.has(k)}
    },onclick:null,onchange:null,oninput:null,
    addEventListener(k,cb){listeners[k]=cb},
    appendChild(){},getContext(){return ctx},
    setPointerCapture(){},getBoundingClientRect(){return{left:0,top:0,width:1280,height:720}},
    querySelectorAll(){return[]}
  };
  obj.parentElement=obj;
  elements.set(id,obj);
  return obj;
}
const document={
  getElementById:element,
  createElement:element,
  querySelectorAll(selector){
    // Return mock controls for catalog category tabs so that handlers get wired.
    if(selector==='[data-shop-tab]'){
      return [...element('panelBody').innerHTML.matchAll(/data-shop-tab="([^"]+)"/g)].map(m=>({dataset:{shopTab:m[1]},onclick:null}));
    }
    if(selector==='[data-gear-action]'){
      return [...element('panelBody').innerHTML.matchAll(/data-gear-action="([^"]+)" data-gear-id="([^"]+)"/g)]
        .map(m=>({dataset:{gearAction:m[1],gearId:m[2]},onclick:null}));
    }
    return [];
  }
};
let clock=300, frame=null;
const mock={document,window:{addEventListener(){}},navigator:{vibrate(){}},console,Math,performance:{now(){return clock}},
 localStorage:{getItem(k){return memory.get(k)||null},setItem(k,v){memory.set(k,v)}},
 requestAnimationFrame(cb){frame=cb}
};
vm.runInNewContext(script,mock,{filename:'human-fishing.js',timeout:4000});
assert.equal(typeof frame,'function','Animation must start');
assert.ok(typeof element('navShop').onclick==='function','Shop navigation is missing');
assert.ok(typeof listeners.pointerdown==='function','Pointer input is missing');
function step(n){for(let i=0;i<n;i++){clock+=16.7;const current=frame;current(clock);}}
function pointer(type,x,y){
 const e={pointerId:1,pointerType:'touch',clientX:x,clientY:y,preventDefault(){}};
 listeners[type](e);
}
const stick=element('virtualJoystick');
// Air phase: a touch must NOT summon a joystick before splashdown.
step(57); // 0.95 seconds, still airborne
pointer('pointerdown',1060,350);
assert.equal(stick.classList.contains('visible'),false,'Joystick should be locked in air');
pointer('pointerup',1060,350);
// After water entry (at ~1.4s), allow input well before the full 3.25s descent.
step(46); // 1.72 seconds total
const before={...lastTranslate};
pointer('pointerdown',1070,360); // far away from lure (~640, 295), should still work
assert.equal(stick.classList.contains('visible'),true,'Any underwater touch should open the joystick');
assert.equal(element('virtualKnob').style.left,'50%','Knob should start centered');
step(2);
assert.ok(lastTranslate.x<750,'Touching distant water must not teleport the lure');
// Releasing an unmoved stick should not catch.
pointer('pointerup',1070,360);
assert.equal(stick.classList.contains('visible'),false,'Joystick should close on touch release');
const still={...lastTranslate};
step(2);
assert.ok(Math.abs(lastTranslate.x-still.x)<25,'Tap-only gesture should leave bait in place');
// Control from arbitrary screen position and move bait while held.
pointer('pointerdown',1120,360);
pointer('pointermove',1190,360);
step(18);
assert.ok(lastTranslate.x>before.x+24,'Rightward joystick tilt must move the lure');
assert.ok(lastTranslate.x<900,'Joystick must move relative to bait, never teleport to touch position');
assert.equal(stick.classList.contains('visible'),true,'Joystick must remain visible during drag');
pointer('pointerup',1190,360);
assert.equal(stick.classList.contains('visible'),false,'Joystick must hide on release');
step(10);
assert.equal(typeof frame,'function');
// Shop catalog must render all 4 tabs and allow changing the sort field.
element('navShop').onclick();
const catalog=element('panelBody').innerHTML;
for(const name of ['낚싯대','미끼','어망','조력자'])assert.ok(catalog.includes(name),name+' missing');
assert.ok(catalog.includes('data-shop-tab="rod"'),'Rod tab missing');
assert.ok(catalog.includes('data-shop-tab="bait"'),'Bait tab missing');
assert.ok(catalog.includes('data-shop-tab="net"'),'Net tab missing');
assert.ok(catalog.includes('data-shop-tab="helper"'),'Helper tab missing');
assert.ok(catalog.includes('가격 낮은순'),'Sort control missing');
const sort=element('shopSort');assert.equal(typeof sort.onchange,'function');
sort.value='level';sort.onchange();step(12);
assert.ok(element('panelBody').innerHTML.includes('shop-card'),'Shop should remain rendered');
console.log('PASS: 240 species, joystick after splash, non-blocking in-world capture FX, 24-gear shop');
