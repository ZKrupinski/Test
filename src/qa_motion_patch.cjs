const fs=require('fs'), vm=require('vm'), assert=require('assert');
const src=fs.readFileSync(__dirname+'/crimson_bow_motion_aim_patch_v2.js','utf8');
class Element {
 constructor(id){this.id=id;this.listeners={};this.style={};this.parentElement=null;this.disabled=false;this.innerHTML='';}
 addEventListener(type,handler,capture){(this.listeners[type]??=[]).push({handler,capture});}
 emit(type,o={}){for(const {handler} of (this.listeners[type]||[])) handler(Object.assign({type,pointerId:1,clientX:550,clientY:360,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;}},o));}
 append(...els){this.children??=[];this.children.push(...els);}
 appendChild(e){this.append(e);}
 setAttribute(k,v){this[k]=v;}
 setPointerCapture(_){}
}
const canvas=new Element('game'), shell=new Element('shell'), head=new Element('head'), doc=new Element('doc');canvas.parentElement=shell;
const docElements={shell,game:canvas};
const document=Object.assign(doc,{head,getElementById(id){return docElements[id]||null;},createElement(tag){return new Element(tag);}});
let aimAudio=false, shots=0, origUpdate=0, origReset=0;
const game={started:true,level:2,turn:6,hitStop:0,aimAngle:.34,aimSpeed:850,
 projectiles:[],platforms:[{x:675,y:514,w:245,h:37},{x:908,y:432,w:260,h:40},{x:805,y:581,w:390,h:94}],
 enemies:[{id:0,x:760,foot:514,kind:0,live:true},{id:1,x:1033,foot:432,kind:1,live:true},{id:2,x:924,foot:581,kind:2,live:true}]};
const sandbox={
 window:{},document,console:{info(){},error(s){throw Error(s);}},W:1200,origin:{x:233,y:447},C:canvas,game,
 performance:{now(){return 20}},audio:{setAim(v){aimAudio=v;},s(){}},
 touchXY(ev){return {x:ev.clientX,y:ev.clientY};},
 reset(){origReset++;game.level=1;game.turn=1;game.projectiles=[];},
 update(dt){origUpdate++;if(game.hitStop>0)game.hitStop=Math.max(0,game.hitStop-dt);if(game.projectiles.length){for(const p of game.projectiles)p.life+=dt;}},
 arrowShot(angle=game.aimAngle,speed=game.aimSpeed){shots++;game.projectiles.push({angle,speed,life:0});game.turn++;},
};
vm.createContext(sandbox);vm.runInContext(src,sandbox,{timeout:5000});
assert.strictEqual(sandbox.window.CrimsonBowMotionV2.version,'2.0');
function tick(dt=.04){sandbox.update(dt);}
const original=game.enemies.map(e=>({x:e.x,foot:e.foot}));
for(let i=0;i<8;i++)tick();
assert(game.enemies.some((e,i)=>Math.abs(e.x-original[i].x)>0.1),'enemies move before firing');
assert(game.enemies.some((e,i)=>Math.abs(e.foot-original[i].foot)>0.1),'elite/boss vertical motion');
assert(game.enemies.every((e,i)=>e.x>=game.platforms[i].x+27 && e.x<=game.platforms[i].x+game.platforms[i].w-27),'platform bounds');
canvas.emit('pointerdown',{clientX:420,clientY:295});
assert.strictEqual(sandbox.window.CrimsonBowMotionV2.controller.primed,true);
const a0=game.aimAngle,v0=game.aimSpeed;
canvas.emit('pointermove',{clientX:620,clientY:185});
assert.notStrictEqual(game.aimAngle,a0);assert.notStrictEqual(game.aimSpeed,v0);
canvas.emit('pointerup',{clientX:620,clientY:185});
assert.strictEqual(shots,0,'should not auto-fire on vacant click');
assert.strictEqual(aimAudio,false,'aim audio must stop on release');
assert.strictEqual(game.isAiming,true,'trajectory remains visible before firing');
sandbox.arrowShot(); assert.strictEqual(shots,1);
const pos=game.enemies.map(e=>({x:e.x,foot:e.foot}));
for(let i=0;i<8;i++)tick();
assert(game.enemies.every((e,i)=>e.x===pos[i].x&&e.foot===pos[i].foot),'enemies freeze while arrow in flight');
sandbox.arrowShot();assert.strictEqual(shots,1,'duplicate arrow must be blocked during active flight');
game.projectiles=[];tick();tick();
assert(game.enemies.some((e,i)=>e.x!==pos[i].x),'motion resumes after projectile vanishes');
const platform=game.platforms[1];game.platforms.splice(1,1);const m=game.enemies[1], p0={x:m.x,foot:m.foot};
for(let i=0;i<3;i++)tick();assert.strictEqual(m.x,p0.x);assert.strictEqual(m.foot,p0.foot);
sandbox.reset(); assert.strictEqual(origReset,1);
assert.strictEqual(sandbox.window.CrimsonBowMotionV2.controller.freeze,false,'reset clears frozen state');
assert.strictEqual(sandbox.window.CrimsonBowMotionV2.controller.primed,false,'reset clears primed state');
assert(origUpdate>10,'original update routine runs');
vm.runInContext(src,sandbox,{timeout:5000});
assert.strictEqual((canvas.listeners.pointerdown||[]).length,1,'idempotent install');
console.log('PASS 12 checks: motion tiers, platform constraints, free aim, audio release, manual fire, freeze, duplicate guard, thaw, terrain removal, reset, original loop, duplicate injection.');