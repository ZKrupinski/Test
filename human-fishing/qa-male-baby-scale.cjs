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
const fixedIds=[20,21]; // engineer and astronaut keep their already-approved 112% size
const increaseFor=id=>fixedIds.includes(id)?1.12:1.25;
assert.deepEqual(manifest.actors.map(row=>row.id),ids);
assert(html.includes('human-sprites.js?v=20261112-male17-world125-v3'), 'New renderer cache version');
assert(html.includes('male-concepts/ready.js?v=20261112-male17-swim-v1'), 'Male art ready gate unchanged');
assert(code.includes('var NEW_MALE_SWIM_WORLD_SCALE=1.25'), '15 newly installed boys grow to 125%');
assert(code.includes('var NEW_MALE_FIXED_WORLD_SCALE=1.12'), 'Engineer and astronaut stay at 112%');
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
function load(boys,worldScale=1.25,fixedScale=1.12){
 const ctx={window:{
  HumanFishingBabySpritesReady:true,
  HumanFishingMaleBoysReady:boys,
  HumanFishingSisterSpritesReady:true
 },Image:MockImage};
 const source=code.replace(
  'var NEW_MALE_SWIM_WORLD_SCALE=1.25;',
  'var NEW_MALE_SWIM_WORLD_SCALE='+worldScale+';').replace(
  'var NEW_MALE_FIXED_WORLD_SCALE=1.12;',
  'var NEW_MALE_FIXED_WORLD_SCALE='+fixedScale+';');
 vm.runInNewContext(source,ctx);
 return ctx.window.HumanFishingBabySprites;
}
// Compare each installed bitmap at 100%, then verify the engineer and astronaut
// remain at their previous 112% and all other 15 boys reach 125%.
const base=load(true,1,1),prior=load(true,1.12,1.12),actual=load(true);
const disabled=load(false);
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
 assert(!disabled.imageFor(id,'swim').src.includes('male-concepts/'),
  'Ready gate must not use an absent PNG for ID '+id);
 const before=base.geometry({id,x:500,y:400,vx:50,size:1});
 const after=actual.geometry({id,x:500,y:400,vx:50,size:1});
 near(after.width,before.width*increaseFor(id),'World width ID '+id);
 near(after.height,before.height*increaseFor(id),'World height ID '+id);
 near(after.body.rx,before.body.rx*increaseFor(id),'Body collision X ID '+id);
 near(after.body.ry,before.body.ry*increaseFor(id),'Body collision Y ID '+id);
 near(after.mouth.x-500,(before.mouth.x-500)*increaseFor(id),'Mouth position ID '+id);
 near(after.mouth.y-400+8,(before.mouth.y-400+8)*increaseFor(id),'Mouth Y ID '+id);
 assert.equal(after.mouth.rx,before.mouth.rx,'Do not enlarge hidden weakspot X '+id);
 assert.equal(after.mouth.ry,before.mouth.ry,'Do not enlarge hidden weakspot Y '+id);
 const oldDraw=spritePixels(base,id),newDraw=spritePixels(actual,id);
 near(newDraw.w,oldDraw.w*increaseFor(id),'Rendered width ID '+id);
 near(newDraw.h,oldDraw.h*increaseFor(id),'Rendered height ID '+id);
 if(fixedIds.includes(id)){
  const beforeFixed=prior.geometry({id,x:500,y:400,vx:50,size:1});
  near(after.width,beforeFixed.width,'Engineer/astronaut unchanged ID '+id);
  const priorDraw=spritePixels(prior,id);
  near(newDraw.w,priorDraw.w,'Engineer/astronaut render unchanged ID '+id);
 }
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
// The dragon-knight repair changes no animation frame count or bitmap dimensions.
// Checksumming the replacement also guards against lost helmet/cape pixels.
const crypto=require('node:crypto');
const dragon=fs.readFileSync(path.join(root,'assets/humans/male-concepts/baby_swim_boy_dragon_knight_8f.png'));
assert.equal(crypto.createHash('sha256').update(dragon).digest('hex'),
 'c57d77521bdbc4fcebd73a703a83003fe412f80d0b01a58771367268d98dd05e');
assert.equal(dragon.readUInt32BE(16),1774);
assert.equal(dragon.readUInt32BE(20),887);
assert.equal(dragon[25],6,'Keep straight RGBA PNG');
assert.equal(manifest.actors.find(x=>x.id===23).sha256,
 'c57d77521bdbc4fcebd73a703a83003fe412f80d0b01a58771367268d98dd05e');
assert.equal(manifest.actors.find(x=>x.id===23).gitBlob,
 'da1ed2a4e194517466abc56d9fd56102bb54b95a');
assert(actual.imageFor(23,'swim').src.includes('20261112-dragon-alpha-repair-v2'),'Dragon-only fresh cache URL');
console.log('PASS: 15 new boys +25%; engineer/astronaut +12% preserved; dragon 8-frame helmet/cape alpha corrected; other characters unchanged');
