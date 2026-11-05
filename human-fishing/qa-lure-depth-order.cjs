'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('human-fishing/index.html','utf8');
const source=html.match(/<script>([\s\S]*?)<\/script>/i)?.[1];
assert.ok(source,'Missing game code');
new vm.Script(source);
const active=source.slice(source.lastIndexOf('function tick(stamp){'),source.indexOf('// Alpha 0.6:',source.lastIndexOf('function tick(stamp){')));
function where(value){const p=active.indexOf(value);assert.ok(p>=0,'Missing render step '+value);return p}
const stateUpdate=where('hook.elapsed+=dt;');
const ordinaryBack=where("if(view==='fish'&&!introEntrance.active&&!feverFx){");
const bait=where('if(hook)drawRedLure(time,bob.x,bob.y,64);');
const ambient=where('fish.forEach(function(a){');
const human=where('hum.forEach(function(a){');
const hookedFish=where('drawHookSwallow(time);');
const line=where('drawLine();');
const fever=where('drawFeverFx(dt);');
assert.ok(stateUpdate<ordinaryBack&&ordinaryBack<bait,'Bait must follow motion, during normal fishing only');
assert.ok(bait<ambient&&ambient<human&&human<hookedFish&&hookedFish<line,
  'Normal red bait must be BEHIND ambient fish, humanoids and individually reeled fish');
assert.ok(fever>hookedFish&&fever>ambient,
  'Fever render must be AFTER all fish so its giant bait is foreground');
assert.equal(active.split('drawBob();').length-1,1,'Normal bait cannot be redrawn after fish');
assert.equal(active.split('drawRedLure(time,bob.x,bob.y,64)').length-1,1,
  'A hooked bait must only be drawn in the back layer');
assert.doesNotMatch(active.slice(hookedFish),/drawRedLure\(time,bob\.x,bob\.y,64\)/,
  'Hooked bait may not jump in front while reeling');
assert.doesNotMatch(active.slice(line),/drawBob\(\)/,
  'Draw line without a second foreground bait draw');
const feverCode=source.slice(source.lastIndexOf('function drawFeverFx(dt){'));
const held=feverCode.indexOf("drawFeverTossCreature(entity,fx,i,time,'attached')");
const launched=feverCode.indexOf("drawFeverTossCreature(entity,fx,i,time,'released')");
const feverImage=feverCode.indexOf('ctx.drawImage(octoSprite(fx.tier,reel.frame,reel.folding)');
assert.ok(held>=0&&launched>held&&feverImage>launched,
 'During OCTO FEVER the octopus must be ABOVE held AND lifted/released fish');
assert.equal(feverCode.split("drawFeverTossCreature(entity,fx,i,time,'released')").length-1,1,
 'Fever launched fish must be drawn once, behind the octopus');
console.log('PASS: normal/red bait behind all swimming and reeled fish; Fever bait foreground, no duplicate foreground lure.');
