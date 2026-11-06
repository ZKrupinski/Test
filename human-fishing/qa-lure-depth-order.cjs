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
const ordinaryBack=where("if(view==='fish'&&!introEntrance.active&&(!feverFx||lureRecovery.active)){");
// During Fever's mouth-return phase the normal red lure must replace the
// giant-mouth atlas in the same foreground-over-player, behind-fish pass.
assert.match(source,/if\(!lureRecovery\.active\)drawFeverMouthSprite\(fx,reel\)/,
 'Fever mouth atlas must yield to the dropping normal lure after arrival');
const bait=where('drawBaitAbovePlayer(time);');
const hero=where('drawOcto(time);drawRod(time);drawHelpers(time);');
const ambient=where('fish.forEach(function(a){');
const human=where('hum.forEach(function(a){');
const hookedFish=where('drawHookSwallow(time);');
const fever=where("if(view==='fish'&&!introEntrance.active&&feverFx)drawFeverFx(dt);");
assert.ok(stateUpdate<hero&&hero<=rod&&rod<line&&line<fever&&fever<ordinaryBack&&ordinaryBack<bait,
 'Both normal and FEVER bait MUST render above the rod/line, beneath fish');
const pass=source.slice(source.indexOf('function drawBaitAbovePlayer(now){'),source.indexOf('function drawLine(){',source.indexOf('function drawBaitAbovePlayer(now){')));
assert.ok(pass.indexOf('drawDanglingBait(now)')<pass.indexOf('drawRedLure(now'),
 'Hook eyelet must be occluded by the octopus legs');
assert.ok(source.includes('jointX=bob.x-Math.sin(bodyAngle)*jointDepth')&&
 source.includes('jointY=bob.y-jointDepth+Math.cos(bodyAngle)*jointDepth'),
 'Hook joint must follow rotating body center beneath the head pivot');
assert.ok(source.includes('var center={x:bob.x,y:bob.y};'),
 'OCTO FEVER still targets the red octopus body center, never the small hanging bait');
const baitAtlas='human-fishing/assets/octopus/bait/hanging_baits10_v2.webp';
const baitBytes=fs.readFileSync(baitAtlas);
assert.equal(baitBytes.toString('ascii',0,4),'RIFF','Hook-bait sprite atlas missing/invalid');
assert.equal(baitBytes.toString('ascii',8,12),'WEBP','Hook-bait atlas must have transparent WebP format');
assert.ok(source.includes('hanging_baits10_v2.webp'),
 'Game must load all ten original hooked bait art cells');
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
assert.ok(feverCode.indexOf('drawDanglingBait(time)')<spritePaint,'Fever legs must occlude hook eyelet');
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
// Extra OCTO FEVER suction sprites must be real binary WebP sheets and
// remain in the repo, not temporary external preview URLs.
for(const name of ['octofever_suction_A_16f.webp',
 'octofever_suction_B_16f.webp','octofever_suction_drops_16f.webp']){
 const filename='human-fishing/assets/octopus/bait/'+name;
 assert.ok(fs.existsSync(filename),'Missing painted suction atlas: '+name);
 const bytes=fs.readFileSync(filename);
 assert.equal(bytes.toString('ascii',0,4),'RIFF','Not a valid RIFF WebP asset: '+name);
 assert.equal(bytes.toString('ascii',8,12),'WEBP','Invalid WebP header: '+name);
 assert.ok(source.includes(name),'Game must load the real atlas: '+name);
}
const drops=active.indexOf('drawFeverSuctionParticles(feverFx,time);');
const lastFx=active.indexOf('drawCatchFx(dt);drawEscapeFx(dt);drawGroggyFx(dt);');
assert.ok(drops>launched&&drops>lastFx,
 'Water droplet bitmap overlay must render after ALL fish and other canvas effects');
assert.equal(active.split('drawFeverSuctionParticles(feverFx,time);').length-1,1,
 'Fever droplet sprites must have exactly one final overlay pass');
assert.ok(source.includes('feverSuctionArt.dropsVisible=makeFeverDropletsVisible(im)')&&
 source.includes('Math.round(a*5.4+14)'),
 'Displayed drops must aggressively brighten approved 256px bitmap cells');
assert.ok(source.includes('var im=feverSuctionArt.dropsVisible||feverSuctionArt.drops'),
 'Drop renderer must use the brighter display-only source with raw fallback');
assert.ok(source.includes('var rotationTravel=turn+(mass<1.35?Math.PI*2:0);')&&
 source.includes('var arc=Math.sin(Math.PI*q)*Math.min(21,startRadius*.11)'),
 'Gathered fish should follow a short curved snap, not a slow full orbit');
assert.ok(source.includes('var waveA=.5-.5*Math.cos(t*9.1);')&&
 source.includes('var waveB=.5-.5*Math.cos(t*7.4-1.27);'),
 'Both vortex bitmap layers must breathe smoothly instead of jumping on loop reset');
assert.ok(source.includes('var alpha=appear*fade*(.54+.46*Math.sin(Math.PI*flow))'),
 'Suction droplets need a nonzero alpha floor on dark and bright backgrounds');
assert.ok(source.includes('function feverGripSlot(fx,index)')&&
 source.includes('radius=[0,64,70,79,88,100,111][n]+ring*111'),
 'Inhaled fish must retain separate concentric grip slots around the center');

assert.ok(source.includes('makeFeverVortexOpaque(im)'),
 'Fever bitmap must boost original low-alpha paint without editing source art');
assert.ok(source.includes('var opacity=1-.10*castEasing((t-.10)/.17);'),
 'Fever vortex must start fully opaque and settle to 90% underwater');
assert.ok(source.includes('if(t>=fx.surfaceAt)opacity=.80;'),
 'Fever vortex must stay at 80% after leaving the surface');
assert.ok(source.includes('opacity*=1-castEasing((t-arrivalAt)/.16);'),
 'Vortex must fade quickly only at player mouth arrival');
assert.ok(source.includes('center=swallowPoint('),
 'Vortex must follow the catch to the player mouth after release');
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

