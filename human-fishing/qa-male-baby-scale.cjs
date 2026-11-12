/* Targeted visual-readability scaling for the 17 installed boy swimmers. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=__dirname;
const code=fs.readFileSync(path.join(root,'human-sprites.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/humans/male-concepts/installed-manifest.json'),'utf8'));
const ids=[2,3,4,6,7,9,10,11,12,13,14,15,16,19,20,21,23];
const stableIds=[0,1,5,8,17,18,22,24,25,26,29,34,35,36,37];
assert.deepEqual(manifest.actors.map(row=>row.id),ids);
assert(html.includes('human-sprites.js?v=20261112-male17-world112-v2'), 'New renderer cache version');
assert(html.includes('male-concepts/ready.js?v=20261112-male17-swim-v1'), 'Male art ready gate unchanged');
assert(code.includes('var NEW_MALE_SWIM_WORLD_SCALE=1.12'), 'Exact 12% increase required');
new vm.Script(code);
class MockImage{
 constructor(){this.complete=true;this.naturalWidth=1448;this.naturalHeight=1086}
 set src(v){
  this._src=v;
  if(v.includes('male-concepts/')){this.naturalWidth=1774;this.naturalHeight=887}
  else if(v.includes('sister_rabbit')){this.naturalWidth=2172;this.naturalHeight=724}
  else if(/sister_shark|sister_cat|explorer_new|scientist|pirate|nurse|athlete|idol|chef|detective|wizard|angel/.test(v)){
   this.naturalWidth=1774;this.naturalHeight=887;
  }else if(v.includes('hooked')){this.naturalWidth=1776;this.naturalHeight=888}
 }
 get src(){return this._src}
}
function load(boys){
 const ctx={window:{
  HumanFishingBabySpritesReady:true,
  HumanFishingMaleBoysReady:boys,
  HumanFishingSisterSpritesReady:true
 },Image:MockImage};
 vm.runInNewContext(code,ctx);
 return ctx.window.HumanFishingBabySprites;
}
const base=load(false),actual=load(true);
const near=(a,b,msg)=>assert(Math.abs(a-b)<1e-7,msg+': '+a+' vs '+b);
function spritePixels(art,id,now=0){
 const ops=[],canvas={
  save(){},restore(){},translate(){},scale(){},
  drawImage(...args){ops.push(args)}
 };
 const actor={id,x:500,y:400,vx:50,size:1,phase:0};
 assert(art.render(canvas,actor,now,'swim'), 'Sprite fails to render for ID '+id);
 const draw=ops.at(-1);
 assert(draw,'Missing drawing for ID '+id);
 return {w:draw.at(-2),h:draw.at(-1),ops:ops.length};
}
for(const id of ids){
 const before=base.geometry({id,x:500,y:400,vx:50,size:1});
 const after=actual.geometry({id,x:500,y:400,vx:50,size:1});
 near(after.width,before.width*1.12,'World width ID '+id);
 near(after.height,before.height*1.12,'World height ID '+id);
 near(after.body.rx,before.body.rx*1.12,'Body collision X ID '+id);
 near(after.body.ry,before.body.ry*1.12,'Body collision Y ID '+id);
 near(after.mouth.x-500,(before.mouth.x-500)*1.12,'Mouth position ID '+id);
 near(after.mouth.y-400+8,(before.mouth.y-400+8)*1.12,'Mouth Y ID '+id);
 assert.equal(after.mouth.rx,before.mouth.rx,'Do not enlarge hidden weakspot X '+id);
 assert.equal(after.mouth.ry,before.mouth.ry,'Do not enlarge hidden weakspot Y '+id);
 const oldDraw=spritePixels(base,id),newDraw=spritePixels(actual,id);
 near(newDraw.w,oldDraw.w*1.12,'Rendered width ID '+id);
 near(newDraw.h,oldDraw.h*1.12,'Rendered height ID '+id);
 assert(newDraw.ops===1,'Only the approved 8-frame atlas should render');
 assert(actual.imageFor(id,'hooked').src.includes('male-concepts/'),'Keep per-character swim-only art ID '+id);
}
for(const id of stableIds){
 const before=base.geometry({id,x:500,y:400,vx:50,size:1});
 const after=actual.geometry({id,x:500,y:400,vx:50,size:1});
 near(after.width,before.width,'Protected world width ID '+id);
 near(after.height,before.height,'Protected world height ID '+id);
 near(after.mouth.x,before.mouth.x,'Protected mouth X ID '+id);
 near(after.body.rx,before.body.rx,'Protected body collision ID '+id);
}
// World and aquarium both call the shared bitmap renderer; thumbnails have
// independent alpha-tight crops and must not inherit world scale.
assert(html.includes('function paintHumanUiThumb(canvas,crop,locked)'));
assert(html.includes('var humanUiThumbCache=new WeakMap();'));
console.log('PASS: all 17 new boy swimmers +12% world/render/collision scale; old boys and all girls/sisters unchanged');
