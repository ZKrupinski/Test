'use strict';
/* QA for two new independently mapped 8-frame baby swimmers. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=__dirname,base=path.join(root,'assets','humans');
const manifest=JSON.parse(fs.readFileSync(path.join(base,'extra-babies-manifest.json'),'utf8'));
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const code=fs.readFileSync(path.join(root,'human-sprites.js'),'utf8');
const ready=fs.readFileSync(path.join(base,'extra-babies-ready.js'),'utf8');
assert.equal(ready.trim(),'window.HumanFishingExtraBabiesReady=true;');
assert(html.includes("humans.push('다이버','악마')"),'Append-only names missing');
assert(html.includes('extra-babies-ready.js?v=20261112-duo-diver-devil-v1'));
assert(html.indexOf('extra-babies-ready.js')<html.indexOf('human-sprites.js?v=20261112-duo-diver-devil-v1'));
const original=html.match(/var humans=\[([^\]]+)\];/)[1].match(/'[^']+'/g).map(s=>s.slice(1,-1));
assert.equal(original.length,35,'Original human IDs must be preserved');
assert.equal(original[8],'잠수부');assert.equal(original[17],'공주');assert.equal(original[22],'고고학자');
assert.deepEqual(manifest.actors.map(x=>x.id),[38,39]);
for(const item of manifest.actors){
 const file=fs.readFileSync(path.join(base,item.file));
 assert.equal(crypto.createHash('sha256').update(file).digest('hex'),item.sha256,'Approved PNG changed');
 assert.equal(file.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 assert.equal(file.readUInt32BE(16),1774);assert.equal(file.readUInt32BE(20),887);
 assert.equal(file[25],6,'RGBA PNG required');
}
new vm.Script(code);
class MockImage{
 constructor(){this.complete=true;this.naturalWidth=1448;this.naturalHeight=1086}
 set src(v){this._src=v;if(v.includes('male-concepts/')||v.includes('diver_new')||v.includes('devil_new')||v.includes('explorer_new')){this.naturalWidth=1774;this.naturalHeight=887}}
 get src(){return this._src}
}
const env={window:{HumanFishingBabySpritesReady:true,HumanFishingMaleBoysReady:true,HumanFishingSisterSpritesReady:true,HumanFishingExtraBabiesReady:true},Image:MockImage};
vm.runInNewContext(code,env);
const art=env.window.HumanFishingBabySprites;
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,'World scale changed '+a+' vs '+b);
const male=art.geometry({id:2,x:300,y:430,vx:20,size:1}),female=art.geometry({id:25,x:300,y:430,vx:20,size:1});
for(const id of [38,39]){
 const im=art.imageFor(id,'swim');
 assert(im.src.includes('baby_swim_'+(id===38?'diver_new':'devil_new')+'_8f.png?v=20261112-duo-diver-devil-v1'));
 const geo=art.geometry({id,x:300,y:430,vx:20,size:1});
 const ref=id===38?male:female;
 near(geo.width,ref.width);near(geo.height,geo.width);near(geo.mouth.x,ref.mouth.x);
 let ops=[],ctx={save(){},restore(){},translate(){},scale(){},drawImage(...a){ops.push(a)}};
 assert(art.render(ctx,{id,x:300,y:430,vx:20,size:1,phase:0},0,'swim'));
 assert.equal(ops.length,1);assert.equal(ops[0][0],im);
}
for(const id of [0,8,17,22,35,36,37]){
 const image=art.imageFor(id,'swim');
 assert(image&&!image.src.includes('diver_new')&&!image.src.includes('devil_new'),'Protected sprite changed '+id);
}
assert(html.includes('return 38+Math.floor(rnd(0,2))'),'New babies must be obtainable as swimming encounters');
console.log('PASS: new 8-frame diver/devil RGBA PNGs, 40 human save IDs, world sizing and codex integration');
