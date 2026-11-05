/* Pixel-geometry regression for the EXACT approved 16-frame octopus WebP sheets. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('human-fishing/index.html','utf8');
const begin=html.indexOf('var playerOctoSources={'),end=html.indexOf('function playerOctoPose(now){',begin);
assert.ok(begin>0&&end>begin,'Player image loader/geometry definitions are missing');
const operations=[];
class FakeImage{
 constructor(){this.naturalWidth=1254;this.naturalHeight=1254;this.ready=false}
 set src(x){this.url=x;if(this.onload)this.onload()}
}
const env={
 Image:FakeImage,Math,console,
 document:{createElement(tag){
  assert.equal(tag,'canvas');
  return {width:0,height:0,getContext(){
   return {drawImage(...args){operations.push({kind:'draw',args})},
      clearRect(...args){operations.push({kind:'clear',args})}}
  }}
 }}
};
vm.runInNewContext(html.slice(begin,end),env,{filename:'player-octopus-geometry.js'});
// Production now downloads only the small swim atlas before the entrance;
// the rest become available as the entrance begins. Simulate that phase before
// checking every old original frame's integer crop geometry.
assert.ok(env.playerOctoAtlas.swim.ready,'The illustrated intro must load first');
env.loadRemainingPlayerAtlases();
const meta=env.playerOctoFrameMeta;
assert.equal(Object.keys(meta).length,8);
assert.equal(Object.keys(env.playerOctoSources).length,8);
let framesChecked=0,bottomCorrections=0;
for(const [action,frames] of Object.entries(meta)){
 assert.equal(frames.length,16,action+' must have 16 measured cells');
 for(let i=0;i<16;i++){
  const sourceFrame=action==='idle_alt'?env.playerIdleGazeFrames[i]:i;
  // Curated Idle intentionally reuses original source cells. Flush each
  // source cache entry in this pixel-cut test so every viewport mapping
  // independently demonstrates an integer, seamless crop.
  delete env.playerOctoTiles[action+':'+sourceFrame];
  operations.length=0;
  const tile=env.playerOctoTile(action,i);
  assert.ok(tile&&tile.image,action+' '+i+' failed to create isolated tile');
  const draw=operations.find(o=>o.kind==='draw');
  assert.ok(draw,'source frame was not copied');
  const [src,x,y,w,h,dx,dy,dw,dh]=draw.args;
  const col=sourceFrame%4,row=Math.floor(sourceFrame/4);
  assert.equal(x,Math.round(col*1254/4));
  assert.equal(y,Math.round(row*1254/4));
  assert.equal(w,Math.round((col+1)*1254/4)-x);
  assert.equal(h,Math.round((row+1)*1254/4)-y);
  assert.ok([x,y,w,h,dx,dy,dw,dh].every(Number.isInteger),'Fractional cutting reappeared');
  assert.equal(tile.image.width,w+6);
  assert.equal(tile.image.height,h+6);
  assert.ok(tile.foot>=0&&tile.foot<=h);
  if((action==='gorge'||action==='victory')&&(i===3||i===4)){
   assert.ok(operations.filter(o=>o.kind==='clear').length>=2,'Known bottom seam must be suppressed');
   assert.ok(tile.foot<310,'False foot anchor must be corrected');
   bottomCorrections++;
  }
  framesChecked++;
 }
}
assert.equal(framesChecked,128);
assert.equal(bottomCorrections,4);
assert.ok(Object.keys(env.playerOctoTiles).length<=32,'Sprite cache must be bounded on mobile');
assert.match(html,/dy=244-tile\.foot\*scale/,'Player baseline must follow measured sole');
assert.match(html,/dx=140-tile\.centerX\*scale/,'Player frame center must be normalized');
console.log('PASS: 128 isolated frames, integer crop sampling, 3px gutter, four bottom-row leak corrections, common foot and bounded cache');
