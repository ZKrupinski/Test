'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('human-fishing/index.html','utf8');
const source=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(source,'Game script missing');
assert.match(html,/id="catchShowcase"/,'Missing catch showcase container');
assert.match(html,/#catchShowcase\{position:absolute;left:39\.4%;top:23\.7%;width:36%/,
 'Cards must sit in the clear sky RIGHT of the hero, responsively within 16:9');
assert.match(html,/#stage:has\(\.panel\.open\) #catchShowcase/,
 'All full-screen menus must hide the catch cards');
assert.match(html,/z-index:5;pointer-events:none;overflow:hidden/,
 'Cards must be clipped to their own safe background pocket, below menus');
assert.match(html,/\.catch-card-thumb img\{width:100%;height:100%;object-fit:contain/,
 'Fish thumbnail must use uncut original image with object-fit:contain');
assert.match(html,/@keyframes catchCardFever/,
 'Fever catch must animate through fast rightward fade');
assert.match(html,/100%\{opacity:0;transform:translateX\(126px\)/,
 'Fever fish thumbnails must glide to the right as they fade out');
assert.match(html,/#catchShowcase\{position:absolute;left:39\.4%;top:23\.7%/,
 'Card placement must not cover player or top navigation');
const a=source.indexOf('// CATCH_SHOWCASE_BEGIN'),
 b=source.indexOf('// CATCH_SHOWCASE_END',a);
assert.ok(a>0&&b>a,'Catch showcase implementation missing');
let root={innerHTML:''},sounds=[];
const sp={id:'F007',name:'홍염 금붕어',artSizeClass:'LARGE'};
const sandbox={
 view:'fish',time:10,
 $:id=>id==='catchShowcase'?root:
  ({classList:{contains:()=>false}}),
 fishVisualProfile:fish=>({category:fish.artSizeClass||'MEDIUM'}),
 humans:['인간 하나'],humanTier:()=> 'ELITE',
 escapeHtml:s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;'),
 encodeURIComponent,Math,
 playFoley:(cue,intensity,pitch)=>{sounds.push({cue,intensity,pitch})},
 console
};
vm.createContext(sandbox);
vm.runInContext(source.slice(a,b),sandbox,{filename:'catch-showcase.js'});
const prize=sandbox.catchShowcaseFish(sp,2,true,false);
assert.equal(prize.name,sp.name);
assert.equal(prize.size,'대형');
assert.equal(prize.quantity,2);
assert.equal(prize.fresh,true);
sandbox.showCatchShowcase([prize],false);
assert.match(root.innerHTML,/F007\.png\?v=20261106-fish304/);
assert.match(root.innerHTML,/>홍염 금붕어</);
assert.match(root.innerHTML,/class="catch-card-new">NEW</);
assert.match(root.innerHTML,/SIZE · 대형 <b>×2<\/b>/);
assert.match(root.innerHTML,/animation-delay:0s/);
assert.deepEqual(sounds.map(s=>s.cue),['catchFanfare']);
assert.ok(sounds[0].intensity<=.7,
 'Single catch accent must be restrained and less loud than before');
const aquarium=sandbox.catchShowcaseFish(sp,1,true,true);
sandbox.showCatchShowcase([aquarium],false);
assert.doesNotMatch(root.innerHTML,/class="catch-card-new"/,
 'Aquarium sale does not create new owned species');
assert.match(root.innerHTML,/판매/);
const batch=[sp,{id:'F008',name:'다랑어',artSizeClass:'MEDIUM'},
 {id:'F009',name:'해마',artSizeClass:'SPECIAL'}].map((fish,i)=>
 sandbox.catchShowcaseFish(fish,1,i===0,false));
sandbox.showCatchShowcase(batch,true);
assert.equal((root.innerHTML.match(/class="catch-card fever"/g)||[]).length,3,
 'Every successfully caught fish gets one compact Fever card');
assert.match(root.innerHTML,/animation-delay:0\.00s/);
assert.match(root.innerHTML,/animation-delay:0\.52s/);
assert.match(root.innerHTML,/animation-delay:1\.04s/);
assert.equal(sounds.at(-1).cue,'feverCard',
 'Fever must start with its OWN quiet short sample, not a solo fanfare');
sandbox.time=10.52;sandbox.updateCatchShowcaseAudio();
sandbox.time=11.04;sandbox.updateCatchShowcaseAudio();
assert.deepEqual(sounds.slice(-3).map(s=>s.cue),
 ['feverCard','feverCard','feverCard'],
 'Exactly one rhythmic pluck must play for EACH Fever fish');
assert.ok(sounds.at(-1).pitch>sounds.at(-2).pitch,
 'Per-fish Fever ticks should ascend gently instead of repeat mechanically');
sandbox.time=11.50;sandbox.updateCatchShowcaseAudio();
assert.equal(sounds.at(-1).cue,'feverFinish',
 'Finishing the sequence should use a soft, distinct reward tail');
assert.equal(sandbox.catchShowcaseSequence,null,
 'The Fever sequence must stop cleanly when it finishes');
assert.equal(sounds.filter(s=>s.cue==='catchFanfare').length,2,
 'Fever wins must never repeat the loud solo win sound');
assert.match(source,/var freshCatch=captured&&!aquariumFishingActive&&!save\.owned\[f\.sp\.id\]/,
 'Fever NEW must be recorded before modifying ownership');
assert.match(source,/showcaseFresh:freshCatch,showcaseSale:!!aquariumFishingActive/,
 'Each successful Fever fish must carry its new/species and sale metadata');
assert.match(source,/feverFx\.caught\.filter\(function\(c\)\{return !c\.willEscape\}\)/,
 'Resisted escaping fish must be absent from victory cards');
assert.match(source,/showCatchShowcase\(prizes,true\)/,
 'Fever cards must be scheduled at the protagonist mouth, not at cast start');
assert.match(source,/showCatchShowcase\(\[human\?catchShowcaseHuman/,
 'Regular single catch must show showcase at the swallow-success moment');
assert.doesNotMatch(root.innerHTML,/data:image\/svg\+xml|<svg/,
 'No vector or generated image substituted for original PNG art');
console.log('PASS: clear responsive sky placement; real PNG thumbs/new/size; 0.52s pachinko fades and a distinct quiet reward tick for EACH Fever fish.');
