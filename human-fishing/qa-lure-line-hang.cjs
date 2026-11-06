'use strict';
// Ensure the REAL vector fishing line meets the center of the RED octopus bait
// and the dangling sprite follows rope slant with a strict angular slew limit.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('human-fishing/index.html','utf8');
const source=html.match(/<script>([\s\S]*?)<\/script>/i)?.[1];
assert.ok(source,'Missing game script');
const begin=source.indexOf('var lureHangState=');
const end=source.indexOf("['open','gulp','fail'].forEach(function(action){",begin);
assert.ok(begin>0&&end>begin,'Lure rotation controller missing');
const env={
 selectedGear:()=>({id:'baby',tier:0}),gearLevel:()=>0,
 Math,console,bob:{x:590,y:460},
 clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),
 vibrationOffset:()=>({x:2.4,y:-1.5}),
 redLureAtlas:{open:{ready:true,naturalWidth:640,naturalHeight:640}},
 redLurePose:()=>({action:'open',frame:0}),
 rodTip:()=>({x:705,y:146})
};
const recorded={};
const ctx={
 save(){},restore(){},
 translate(x,y){recorded.translate=[x,y]},
 rotate(a){recorded.rotate=a},
 drawImage(...args){recorded.blit=args}
};
env.ctx=ctx;
vm.createContext(env);
vm.runInContext(source.slice(begin,end),env,{filename:'lure-hang.js'});
// Same anchor should be shared by string and bitmap (including hit shake).
const pos=env.lureLineAnchor();
assert.equal(pos.x,592.4);
assert.equal(pos.y,458.5);
const tip={x:705,y:146};
assert.equal(env.updateLureHang(0,tip,pos),0);
let previous=0;
for(let i=1;i<=90;i++){
 const t=i/60;
 const endPos={x:592.4+Math.sin(t*2.7)*150,y:458.5+Math.cos(t)*4};
 const angle=env.updateLureHang(t,tip,endPos);
 assert.ok(Number.isFinite(angle));
 assert.ok(Math.abs(angle)<=.72+1e-8,'Excessive body rotation');
 assert.ok(Math.abs(angle-previous)<=1.8/60+1e-7,'Rotation snapped rather than easing');
 assert.equal(env.updateLureHang(t,tip,endPos),angle,'Multiple draws in a frame must not turn twice');
 previous=angle;
}
const near=env.lureLineAnchor();
const before=env.lureHangState.angle;
env.bob.x-=380; // Abrupt mobile joystick movement
const jumpPos=env.lureLineAnchor();
const after=env.updateLureHang(91/60,tip,jumpPos);
assert.ok(Math.abs(after-before)<=1.8/60+1e-7,'Sudden lateral move snapped bait rotation');
// Even when lure velocity stops, rope angle should recover gently, not oscillate.
for(let i=92;i<160;i++){
 const angle=env.updateLureHang(i/60,tip,jumpPos);
 assert.ok(Number.isFinite(angle)&&Math.abs(angle)<=.72);
}
// Check the actual sprite draw path is pivoted at the string's endpoint.
const dBegin=source.indexOf('function drawRedLure(now,x,y,diameter){');
const dEnd=source.indexOf('// Bait uses the already existing rod gear',dBegin);
assert.ok(dBegin>0&&dEnd>dBegin);
vm.runInContext(source.slice(dBegin,dEnd),env,{filename:'lure-draw.js'});
assert.equal(env.drawRedLure(3,env.bob.x,env.bob.y,76),true);
assert.deepEqual(recorded.translate,[env.bob.x+2.4,env.bob.y-1.5],
 'Bait bitmap rotation pivot must equal the string endpoint');
assert.equal(recorded.rotate,env.lureHangState.angle,'The bait uses its eased pendulum angle');
assert.equal(recorded.blit[5],-76/2,'Horizontal bait center must equal the string endpoint');
assert.equal(recorded.blit[6],-76*.55,'The bait visual center must equal the string endpoint vertically');
// Final active line renderer may not refer to the obsolete fish/head offset.
const lineBegin=source.lastIndexOf('function drawLine(){');
const lineEnd=source.indexOf('function drawBob(){',lineBegin);
const drawLine=source.slice(lineBegin,lineEnd);
assert.match(drawLine,/end=lureLineAnchor\(\)/,'The string endpoint must share the bait pivot');
assert.match(drawLine,/controlX=end\.x-Math\.sin\(angle\)\*lead/,
 'String tangent must follow the eased body angle');
assert.doesNotMatch(drawLine,/hook\.obj\.y-18|bob\.y-37/,
 'Remove the prior string endpoint floating above the bait');
// Render a simulated line and verify actual Bezier endpoint on the bait center.
let curve=null;
env.time=3;
env.hook=null;env.feverFx=null;env.cast={active:false};env.drag=false;env.mix=(a,b,p)=>a+(b-a)*p;
ctx.beginPath=function(){};
ctx.moveTo=function(){};
ctx.bezierCurveTo=function(...a){curve=a};
ctx.stroke=function(){};
vm.runInContext(drawLine,env,{filename:'fishing-line.js'});
env.drawLine();
assert.ok(curve,'The vector fishing line must still be drawn');
assert.equal(curve[4],env.bob.x+2.4,'Line X endpoint != bait center');
assert.equal(curve[5],env.bob.y-1.5,'Line Y endpoint != bait center');
// Compare all grades on identical physical trajectories; highest grade still moves.
function amplitude(tier,level,idle){
 env.selectedGear=()=>({id:'test',tier});env.gearLevel=()=>level;
 env.lureHangState={angle:0,angularVelocity:0,lastTime:null,lastX:null,lastY:null};
 let peak=0;
 for(let i=0;i<600;i++){
  const t=i/60,pos={x:tip.x+(idle?0:Math.sin(t*2)*220),y:460};
  const a=env.updateLureHang(t,tip,pos);
  if(i>120)peak=Math.max(peak,Math.abs(a));
 }
 return peak;
}
let last=Infinity;
for(let tier=0;tier<6;tier++){
 const a=amplitude(tier,0,false);
 assert.ok(a<last,'Each octopus grade must swing less on the same rope movement');last=a;
}
assert.ok(amplitude(0,0,false)>.38,'Starter octopus should visibly lean more than before');
assert.ok(amplitude(5,10,true)>.01,'Fully upgraded octopus must retain idle movement');
assert.ok(amplitude(5,10,false)<amplitude(5,0,false),'Levels should also improve stability');
console.log('PASS: continuous rope attachment, bounded spring motion, decreasing tier sway and nonzero max-tier idle');
