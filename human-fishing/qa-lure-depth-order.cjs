'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('human-fishing/index.html','utf8');
const source=html.match(/<script>([\s\S]*?)<\/script>/i)?.[1];
assert.ok(source,'Missing game code');
new vm.Script(source);
const active=source.slice(source.lastIndexOf('function tick(stamp){'),source.indexOf('// Alpha 0.6:',source.lastIndexOf('function tick(stamp){')));
function where(value){const p=active.indexOf(value);assert.ok(p>=0,'Missing render step '+value);return p}
const stateUpdate=where('hook.elapsed+=dt;');
const rod=where('drawRod(time);drawHelpers(time);');
const line=where("if(view==='fish'&&!introEntrance.active)drawLine();");
const ordinaryBack=where("if(view==='fish'&&!introEntrance.active&&!feverFx){");
const bait=where('drawBaitAbovePlayer(time);');
const hero=where('drawOcto(time);drawRod(time);drawHelpers(time);');
const ambient=where('fish.forEach(function(a){');
const human=where('hum.forEach(function(a){');
const hookedFish=where('drawHookSwallow(time);');
const fever=where("if(view==='fish'&&!introEntrance.active&&feverFx)drawFeverFx(dt);");
assert.ok(stateUpdate<hero&&hero<=rod&&rod<line&&line<fever&&fever<ordinaryBack&&ordinaryBack<bait,
 'Both normal and FEVER bait MUST render above the rod/line, beneath fish');
assert.match(source,/function drawBaitAbovePlayer\(now\)\{\s*if\(hook\)return drawRedLure\(now,bob\.x,bob\.y,64\);\s*return drawBob\(\);\s*\}/,
 'Normal and individually reeled bait must use the same foreground-over-player pass');
assert.ok(bait<ambient&&ambient<human&&human<hookedFish,
 'Normal red bait must stay ABOVE line but BEHIND ambient and singly reeled fish');
assert.ok(fever<ambient&&fever<human&&fever<hookedFish,
 'Fever now follows the SAME layer as normal bait, beneath all swimming and reeled fish');
assert.equal(active.split('drawLine();').length-1,1,'Fishing line cannot be drawn over the bait again');
assert.equal(active.split('drawBaitAbovePlayer(time);').length-1,1,
 'Dedicated foreground-over-player bait pass must run exactly once');
assert.doesNotMatch(active.slice(hookedFish),/drawRedLure\(|drawBaitAbovePlayer\(/,
 'Hooked bait must not jump in front of the fish while reeling');
assert.doesNotMatch(active.slice(bait+1),/drawLine\(\)/,
 'Fishing line must not be drawn over the bait');
assert.doesNotMatch(active.slice(bait+1),/drawOcto\(time\)/,
 'Purple protagonist must NEVER be redrawn on top of red bait');
const feverCode=source.slice(source.lastIndexOf('function drawFeverFx(dt){'));
const spritePaint=feverCode.indexOf('drawFeverMouthSprite(fx,reel);');
const held=active.indexOf("drawFeverTossCreature(entity,fx,i,time,'attached')");
const launched=active.indexOf("drawFeverTossCreature(entity,fx,i,time,'released')");
assert.ok(spritePaint>=0&&held>ambient&&held>fever&&launched>held,
 'Fever bitmap must stay behind all held and released creatures even when reeling');
assert.equal(active.split("drawFeverTossCreature(entity,fx,i,time,'released')").length-1,1,
 'Fever launched fish must be drawn once in front of its bait');
assert.doesNotMatch(feverCode,/drawImage\(octoSprite\(|feverFlingStreakSprite\(/,
 'Old vector tentacle-burst artwork may not return in the Fever renderer');
assert.ok(source.includes('red_lure_fever_natural_v2.webp'),
 'Fever must use the new natural-size illustrated red bait atlas');
assert.ok(source.includes('octofever_vortex_soft_v2.webp'),
 'Fever must load a separate soft circular suction atlas');
assert.ok(source.includes('var opacity=.95*Math.min(appear,disappear);'),
 'Keep already-translucent bitmap visible without double-dimming');
assert.ok(source.includes('var scale=.385+.015*Math.sin'),
 'Fever character must match normal bait scale');
assert.match(source,/function feverMouthSpriteFrame\(fx\)/,
 'Fever mouth must explicitly sequence opening, suction hold and closure');
assert.ok(source.includes('if(fx.elapsed<.22)return Math.min(4'), 'Open immediately at release');
assert.ok(source.includes('if(fx.elapsed<fx.suctionEnd)return 5+'), 'Hold until final catch enters bait');
assert.ok(source.includes('(fx.elapsed-fx.suctionEnd)/.28*4'), 'Close before retrieving bait');
assert.equal(active.split('drawFeverFx(dt);').length-1,1,
 'Fever must not render a second foreground copy after fish');
console.log('PASS: rod < line < BOTH ordinary/FEVER bitmap bait < fish; original giant-mouth 16f suction and closure; no vector tentacles.');

