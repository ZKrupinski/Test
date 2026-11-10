'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('human-fishing/index.html','utf8');
const source=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(source,'Game script missing');
assert.match(html,/id="catchShowcase"/,'Missing catch showcase container');
assert.match(html,/#catchShowcase\{position:absolute;right:16px;top:16\.4%;width:33\.4%;height:18\.4%/,
 'Catch banner right edge must align with the header buttons at 16px');
assert.match(html,/header\{position:absolute;z-index:20;[^}]*padding:12px 16px/,
 'Header button right gutter must remain 16px');
const stageWidth=1536,stageHeight=864,seaY=293/720*stageHeight;
const box={right:16,top:stageHeight*.164,
 width:stageWidth*.334,height:stageHeight*.184};
assert.equal(box.right,16,'The prize should align precisely with the top navigation');
assert.ok(box.top>=120,'Catch window must not block top-right HUD');
assert.ok(box.top+box.height<seaY-20,
 'Catch window must remain wholly above sea level with visual margin');
assert.ok(stageWidth-box.right-box.width>950,
 'Catch window must occupy the empty far-right area');
assert.match(html,/#stage:has\(\.panel\.open\) #catchShowcase/,
 'All full-screen menus must hide the catch cards');
assert.match(html,/z-index:5;pointer-events:none;overflow:visible;container-type:inline-size/,
 'Full original fish and shadow must remain visible beyond the showcase boundary');
assert.match(html,/\.catch-card-thumb img\{display:block;width:111%;height:105%;max-width:none;max-height:none;/,
 'Original PNG must be presented as large as possible without image cropping');
assert.match(html,/object-fit:contain;object-position:center/,
 'Never crop the approved fish PNG');
assert.match(html,/@keyframes catchCardFever/,
 'Fever catch must animate through fast rightward fade');
assert.match(html,/100%\{opacity:0;transform:translateX\(126px\)/,
 'Fever fish thumbnails must glide to the right as they fade out');
assert.match(html,/\.catch-card\{position:absolute;top:0;left:0;box-sizing:border-box;width:100%/,
 'Card must fill the showcase width with no hidden 6% right gutter');
assert.match(html,/\.catch-card-thumb\{position:relative;flex:0 0 52%;width:52%;height:100%/,
 'Preserve large art by reserving 52% of the now narrower banner for the fish');
const previousBanner=stageWidth*.362*.94;
const previousText=previousBanner*.51;
const currentText=box.width*.48;
assert.ok(currentText<previousText*.94,
 'Text region must be noticeably narrower after the refinement');
const previousFish=previousBanner*.49;
const currentFish=box.width*.52;
assert.ok(currentFish>=previousFish*.99,
 'Do not make the fish PNG thumbnail smaller when narrowing text');
assert.match(html,/justify-content:center;overflow:visible;border:0;\s*background:transparent;isolation:isolate/,
 'Remove screenshot problem: no nested rectangular picture frame');
assert.match(html,/\.catch-card-kicker\{display:flex/,
 'Prizes need clear title hierarchy rather than tiny uniform text');
assert.match(html,/clamp\(17px,5\.35cqw,27px\)/,
 'Fish name must have a larger responsive font relative to the card');
assert.match(html,/flex-direction:column;justify-content:center;align-items:flex-end;text-align:right/,
 'All text in the prize info column must be right-aligned');
assert.match(html,/gap:clamp\(4px,1\.3cqw,7px\);padding:0 14px 0 8px/,
 'Right-aligned prize text needs a small inset from the outer edge');
assert.match(html,/\.catch-card-kicker\{display:flex;align-items:center;justify-content:flex-end;width:100%/,
 'CAPTURED and NEW must align to the right side');
assert.match(html,/\.catch-card-title\{display:flex;align-items:center;justify-content:flex-end;width:100%;min-width:0;max-width:100%;text-align:right/,
 'Long fish name must remain right-aligned');
assert.match(html,/\.catch-card-size\{display:flex;align-items:baseline;justify-content:flex-end;width:100%/,
 'Fish size must align with right edge of name and badge');
assert.match(html,/-webkit-line-clamp:2/,
 'Long species names should wrap onto two lines rather than squeeze fish thumbnail');
const a=source.indexOf('// CATCH_SHOWCASE_BEGIN'),
 b=source.indexOf('// CATCH_SHOWCASE_END',a);
assert.ok(a>0&&b>a,'Catch showcase implementation missing');
let root={innerHTML:''},sounds=[];
const sp={id:'F007',name:'홍염 금붕어',artSizeClass:'LARGE'};
const sandbox={
 window:{},view:'fish',time:10,
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
assert.deepEqual(sounds.map(s=>s.cue),['catchNew'],
 'Newly discovered fish must play the rich dedicated treasure flourish');
assert.ok(sounds[0].intensity>=.7&&sounds[0].intensity<=.8,
 'Treasure reward must be audible but approximately one third quieter than previous 1.14 intensity');
assert.match(source,/shown\.some\(function\(p\)\{return p\.fresh\}\)\?'catchNew':'catchFanfare'/,
 'A normal acquired fish must still have its own clear rising reward chime');
const aquarium=sandbox.catchShowcaseFish(sp,1,true,true);
sandbox.showCatchShowcase([aquarium],false);
assert.doesNotMatch(root.innerHTML,/class="catch-card-new"/,
 'Aquarium sale does not create new owned species');
assert.match(root.innerHTML,/판매/);
assert.deepEqual(sounds.map(s=>s.cue),['catchNew','catchFanfare'],
 'Regular and first-time species acquisitions must have separate jingles');
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
assert.ok(sounds.at(-1).intensity>=.6&&sounds.at(-1).intensity<=.72,
 'Fever item ticks must be reduced from their formerly intrusive .88-.96 intensity');
sandbox.time=11.50;sandbox.updateCatchShowcaseAudio();
assert.equal(sounds.at(-1).cue,'feverFinish',
 'Finishing the sequence should use a soft, distinct reward tail');
assert.ok(sounds.at(-1).intensity<=.7,
 'Fever finishing chord must also be quieter');
assert.equal(sandbox.catchShowcaseSequence,null,
 'The Fever sequence must stop cleanly when it finishes');
assert.equal(sounds.filter(s=>s.cue==='catchFanfare').length,1,
 'Fever prizes must not repeat the solo chest-opening melody');
assert.equal(sounds.filter(s=>s.cue==='catchNew').length,1,
 'Fever must not trigger a second first-discovery fanfare');
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

// Regression: prize DOM must not survive after the visible animation ends.
// Expired CSS-hidden children would otherwise restart when a panel toggled.
sandbox.time=20;
sandbox.showCatchShowcase([prize],false);
assert.ok(root.innerHTML.includes('홍염 금붕어'));
sandbox.time=22.36;sandbox.updateCatchShowcaseAudio();
assert.equal(root.innerHTML,'','Solo reward must be removed at the end of its 2.35s animation');
assert.equal(sandbox.catchShowcaseExpiresAt,-1,'Expired reward must reset its timer');
sandbox.time=30;
sandbox.showCatchShowcase(batch,true);
assert.ok(root.innerHTML.includes('다랑어'));
sandbox.time=31.90;sandbox.updateCatchShowcaseAudio();
assert.equal(root.innerHTML,'','Fever rewards must also expire after their last staggered card');
sandbox.time=40;
sandbox.showCatchShowcase([prize],false);
sandbox.showCatchShowcase([],true);
assert.equal(root.innerHTML,'','Zero confirmed Fever catches cannot leave old species visible');
sandbox.time=50;
sandbox.showCatchShowcase([prize],false);
sandbox.stopCatchShowcase();
assert.equal(root.innerHTML,'','Starting a new gesture or failed attempt must clear the previous trophy');
assert.match(source,/function onBaitPointerDown\(e\)\{[\s\S]*?stopCatchShowcase\(\);[\s\S]*?joystick\.active=true/,
 'Starting a new active bait gesture must erase stale trophies');
assert.match(source,/release=function\(\)\{[\s\S]*?stopCatchShowcase\(\);[\s\S]*?if\(save\.fever\.ready\)/,
 'A new release, including failure, must erase any previous trophy');
const brushBody=source.slice(source.indexOf('function checkBaitBrush(){'),source.indexOf('// The weakspot uses'));
assert.doesNotMatch(brushBody,/showCatchShowcase|save\.owned\[/,
 'Brushing a fish is haptic-only feedback; it must not award or display a species');
// Regression: Fever cards cannot be erased by early recasts, touch movement,
 // or a new normal reward. Future rewards queue and play only after all
 // existing Fever cards have finished.
sandbox.time=60;
sandbox.showCatchShowcase(batch,true);
sandbox.time=60.18;sandbox.stopCatchShowcase();
assert.equal((root.innerHTML.match(/class="catch-card fever"/g)||[]).length,3,
 'Continuing to fish must NOT clear an unfinished three-fish Fever');
sandbox.showCatchShowcase([prize],false);
assert.equal(sandbox.catchShowcasePending.length,1,
 'Newly caught fish must queue behind an active Fever');
sandbox.time=61.91;sandbox.updateCatchShowcaseAudio();
assert.doesNotMatch(root.innerHTML,/class="catch-card fever"/,
 'Queued normal reward must start after last Fever card has finished');
assert.match(root.innerHTML,/홍염 금붕어/);
sandbox.time=64.30;sandbox.updateCatchShowcaseAudio();
assert.equal(root.innerHTML,'','The queued normal prize should expire cleanly');
sandbox.time=70;sandbox.showCatchShowcase(batch,true);
sandbox.stopCatchShowcase(true);
assert.equal(root.innerHTML,'','Explicit menu transitions may close Fever awards');
console.log('PASS: Fever awards survive recasting and chain with queued later catches.');
console.log('PASS: trophy cards expire and clear across new attempts, misses and empty Fever; brushes cannot award fish.');
