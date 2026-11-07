'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('human-fishing/index.html','utf8');
const source=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(source,'Game script missing');
assert.match(html,/id="catchShowcase"/,'Missing catch showcase container');
assert.match(html,/#catchShowcase\{position:absolute;left:572px;top:68px/,
 'Showcase should be above the rod in the vacant area right of the hero');
assert.match(html,/\.catch-card-thumb img\{width:100%;height:100%;object-fit:contain/,
 'Fish thumbnail must use uncut original image with object-fit:contain');
assert.match(html,/@keyframes catchCardFever/,
 'Fever catch must animate through fast rightward fade');
assert.match(html,/100%\{opacity:0;transform:translate\(122px,-7px\)/,
 'Fever fish thumbnails must exit rightward');
const a=source.indexOf('// CATCH_SHOWCASE_BEGIN'),
 b=source.indexOf('// CATCH_SHOWCASE_END',a);
assert.ok(a>0&&b>a,'Catch showcase implementation missing');
let root={innerHTML:''},sounds=[];
const sp={id:'F007',name:'홍염 금붕어',artSizeClass:'LARGE'};
const sandbox={
 $:id=>id==='catchShowcase'?root:null,
 fishVisualProfile:fish=>({category:fish.artSizeClass||'MEDIUM'}),
 humans:['인간 하나'],humanTier:()=> 'ELITE',
 escapeHtml:s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;'),
 encodeURIComponent,Math,
 playFoley:cue=>{sounds.push(cue)},
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
assert.deepEqual(sounds,['catchFanfare']);
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
assert.match(root.innerHTML,/animation-delay:0\.16s/);
assert.match(root.innerHTML,/animation-delay:0\.32s/);
assert.equal(sounds.at(-1),'catchFanfareFever',
 'Fever event should play one celebratory brass fanfare for the group');
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
console.log('PASS: actual fish PNG thumbs, size/new/quantity, single and rapid staggered Fever cards, real acquisition filtering, brass fanfare cues.');
