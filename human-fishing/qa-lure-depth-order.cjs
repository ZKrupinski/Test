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
const fever=where('drawFeverFx(dt);');
assert.ok(stateUpdate<hero&&hero<=rod&&rod<line&&line<ordinaryBack&&ordinaryBack<bait,
 'Purple protagonist and rod/line MUST be rendered UNDER the red bait');
assert.match(source,/function drawBaitAbovePlayer\(now\)\{\s*if\(hook\)return drawRedLure\(now,bob\.x,bob\.y,64\);\s*return drawBob\(\);\s*\}/,
 'Normal and individually reeled bait must use the same foreground-over-player pass');
assert.ok(bait<ambient&&ambient<human&&human<hookedFish,
 'Normal red bait must stay ABOVE line but BEHIND ambient and singly reeled fish');
assert.ok(fever>hookedFish&&fever>ambient,
 'Fever renders on top of all caught and wild creatures');
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
const held=feverCode.indexOf("drawFeverTossCreature(entity,fx,i,time,'attached')");
const launched=feverCode.indexOf("drawFeverTossCreature(entity,fx,i,time,'released')");
const feverImage=feverCode.indexOf('ctx.drawImage(octoSprite(fx.tier,reel.frame,reel.folding)');
assert.ok(held>=0&&launched>held&&feverImage>launched,
 'During OCTO FEVER the octopus must be ABOVE held AND lifted/released fish');
assert.equal(feverCode.split("drawFeverTossCreature(entity,fx,i,time,'released')").length-1,1,
 'Fever launched fish must be drawn once, behind the octopus');
console.log('PASS: rod < string < normal red bait < fish; Fever bait above all fish during ascent; no duplicate line/lure.');
