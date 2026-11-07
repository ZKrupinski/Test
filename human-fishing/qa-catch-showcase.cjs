'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('human-fishing/index.html','utf8');
const source=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(source,'Game script missing');
assert.match(html,/id="catchShowcase"/,'Missing catch showcase container');
assert.match(html,/#catchShowcase\{position:absolute;right:1\.8%;top:16\.4%;width:36\.2%;height:18\.4%/,
 'The collector ribbon must sit below the right-hand menus');
const stageWidth=1280,stageHeight=720,seaY=293;
const box={right:stageWidth*.018,top:stageHeight*.164,
 width:stageWidth*.362,height:stageHeight*.184};
assert.ok(box.top>=90,'Catch window must not block top-right HUD');
assert.ok(box.top+box.height<seaY-20,
 'Catch window must remain wholly above sea level with visual margin');
assert.ok(stageWidth-box.right-box.width>750,
 'Catch window must occupy the empty far-right area');
assert.match(html,/#stage:has\(\.panel\.open\) #catchShowcase/,
 'All full-screen menus must hide the catch cards');
assert.match(html,/z-index:5;pointer-events:none;overflow:hidden/,
 'Cards must be clipped to their own safe background pocket, below menus');
assert.match(html,/\.catch-card-thumb img\{display:block;width:111%;height:105%;max-width:none;max-height:none;/,
 'Original PNG must be presented as large as possible without image cropping');
assert.match(html,/object-fit:contain;object-position:center/,
 'Never crop the approved fish PNG');
assert.match(html,/@keyframes catchCardFever/,
 'Fever catch must animate through fast rightward fade');
assert.match(html,/100%\{opacity:0;transform:translateX\(126px\)/,
 'Fever fish thumbnails must glide to the right as they fade out');
assert.match(html,/\.catch-card\{position:absolute;top:0;left:0;box-sizing:border-box;width:94%/,
 'Premium prize ribbon should fill the empty right-hand sky');
assert.match(html,/\.catch-card-thumb\{position:relative;flex:0 0 49%;width:49%;height:100%/,
 'Original fish art must dominate almost half the banner');
assert.match(html,/justify-content:center;overflow:visible;border:0;\s*background:transparent;isolation:isolate/,
 'Remove screenshot problem: no nested rectangular picture frame');
assert.match(html,/\.catch-card-kicker\{display:flex/,
 'Prizes need clear title hierarchy rather than tiny uniform text');
assert.match(html,/clamp\(17px,5\.35cqw,27px\)/,
 'Fish name must have a larger responsive font relative to the card');
assert.match(html,/-webkit-line-clamp:2/,
 'Long species names should wrap onto two lines rather than squeeze fish thumbnail');
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
assert.match(root.innerHTML,/class="catch-card-info"><div class="catch-card-kicker"><span>CAPTURED<\/span><span class="catch-card-new">NEW<\/span>/,
 'Acquisition label and NEW badge must form a premium prize eyebrow');
assert.match(root.innerHTML,/class="size-label">SIZE<\/span> <b>대형<\/b> <b>×2<\/b>/,
 'Large thumbnail should be supported by a clearly grouped size label');
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
console.log('PASS: premium unframed original fish PNG, scaled responsive typography, above-water menu clearance, NEW/size, and unchanged Fever pachinko rhythm/audio.');
