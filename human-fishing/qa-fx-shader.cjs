'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=__dirname;
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const fx=fs.readFileSync(path.join(root,'fx-shader.js'),'utf8');
new vm.Script(fx);
assert.ok(html.includes('<script src="./fx-shader.js?v=20261110-fxgl-v1"></script>'),'Standalone FX module not included');
assert.ok(html.indexOf('<script src="./fx-shader.js')<html.indexOf('<script>'),'FX module must initialize before the game script');
assert.match(fx,/#version 300 es/,'WebGL2-only GLSL programs required');
assert.match(fx,/getContext\('webgl2'/,'Real independent WebGL2 context required');
assert.match(fx,/UNPACK_FLIP_Y_WEBGL/,'FX texture orientation must be corrected');
assert.match(fx,/0\.227027/,'Five-tap separable Gaussian must use normalized weights');
assert.match(fx,/smoothstep\(0\.43,0\.92,y\)/,'Bloom should extract only luminous FX details');
assert.match(fx,/lowPower\?6:4/,'Mobile must render low-resolution bloom');
assert.match(fx,/premultipliedAlpha:false/,'Transparent output must composite with predictable alpha');
assert.match(fx,/webglcontextlost/,'Device context loss fallback missing');
assert.match(fx,/webglcontextrestored/,'GPU recovery path missing');
assert.match(fx,/globalCompositeOperation='lighter'/,'Actual additive blend must be applied');
assert.match(fx,/worldCtx\.globalAlpha=add/,'Independent adjustable ADD strength required');
assert.match(fx,/worldCtx\.globalAlpha=bloom/,'Independent adjustable Bloom strength required');
const after=(x,after)=>html.lastIndexOf(x)>html.lastIndexOf(after);
assert.ok(after('fxShader.composite(ctx)','waterFx.drawEvents(ctx,time,WATER_SURFACE_Y,W,H)'),'Bloom must follow normal world and splash effects');
assert.ok(after('waterFx.surface(ctx,time,WATER_SURFACE_Y,W)','drawFish(a,time)'),'Original foreground wave must draw above fish');
assert.ok(after('fxShader.composite(ctx)','waterFx.surface(ctx,time,WATER_SURFACE_Y,W)'),'ADD/Bloom must illuminate the original foreground wave');
assert.match(html,/waterFx\.surface\(fxLightContext\(\),time,WATER_SURFACE_Y,W\)/,'Wave bitmap must also enter FX light buffer');
assert.ok(after('fxShader.composite(ctx)','drawFeverSuctionParticles(feverFx,time)'),'Fever FX should be present before compositing');
assert.match(html,/if\(fxLightContext\(\)\)drawFishRankTag\(a,fxLightContext\(\)\)/,'Rare glints must use FX pass');
assert.match(html,/drawFish\(a,time\);drawFishRankTag\(a\);/,'Normal fish rendering must remain on world pass');
assert.match(html,/drawFeverVortex\(feverFx,feverReelState\(feverFx,time\),fxLightContext\(\)\)/,'Only Fever vortex graphics must receive shader');
assert.match(html,/if\(fxLightContext\(\)\)waterFx\.ambient\(fxLightContext\(\),time,WATER_SURFACE_Y,W,H\)/,'Underwater bitmap FX must receive shader');
assert.match(html,/if\(fxLightContext\(\)\)waterFx\.drawEvents\(fxLightContext\(\),time,WATER_SURFACE_Y,W,H\)/,'Splash sprites must receive shader');
assert.match(html,/waterFx\.surface\(ctx,time,WATER_SURFACE_Y,W\)/,'The original 100%-opacity surface must remain in the normal 2D foreground');
assert.doesNotMatch(html,/drawFish\(a,time,fxLightContext\(\)\)/,'Fish silhouettes must never enter shader');
const noop=function(){};
function surface(){
 return {width:0,height:0,
  getContext(type){if(type==='webgl2')return null;return {
   globalAlpha:1,setTransform:noop,clearRect:noop,save:noop,restore:noop,translate:noop,scale:noop,
   beginPath:noop,arc:noop,fill:noop,drawImage:noop};}};
}
const sandbox={window:{},navigator:{hardwareConcurrency:2,deviceMemory:2,userAgent:'Android'},
 matchMedia:()=>({matches:true}),document:{createElement:surface},Math};
vm.runInNewContext(fx,sandbox,{filename:'fx-shader.js'});
const api=sandbox.window.HumanFishingFXShader;
assert.equal(api.version,'20261110-fxgl-v1');
const fallback=api.create({width:1280,height:720,addStrength:.30,bloomStrength:.35,radius:10});
assert.equal(fallback.available,false,'WebGL2 absent must not claim shader enabled');
assert.equal(fallback.context,null,'No shader buffer should be sent to world when GPU is unavailable');
assert.equal(fallback.beginFrame(),false,'Fallback must skip without altering original sprites');
assert.equal(fallback.composite({}),false,'Fallback must not hide the normal 2D renderer');
assert.equal(fallback.lowPower,true,'Low-power mobile hardware must be recognized');
assert.equal(fallback.scale,6,'Low-end hardware uses 1/6-resolution bloom');
assert.equal(fallback.settings.addStrength,.30);
assert.equal(fallback.settings.bloomStrength,.35);
assert.equal(fallback.settings.radius,10);
const desktop={window:{},navigator:{hardwareConcurrency:12,deviceMemory:16,userAgent:'Desktop'},
 matchMedia:()=>({matches:false}),document:{createElement:surface},Math};
vm.runInNewContext(fx,desktop);
const full=desktop.window.HumanFishingFXShader.create({width:1280,height:720});
assert.equal(full.lowPower,false);assert.equal(full.scale,4,'Desktop bloom uses quarter resolution');
assert.equal(full.settings.addStrength,.30);assert.equal(full.settings.bloomStrength,.35);
assert.equal(full.settings.radius,10);
console.log('PASS: WebGL2 shader, ADD 30%, Bloom 35%/10px, glowing foreground surface, excluded fish/HUD, low-end 1/6 and Canvas2D fallback.');