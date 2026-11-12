// Real browser regression suite; npm install playwright, then node this file.
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost'),p=path.resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!p.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 let file=p.endsWith(path.sep)?p+'index.html':p;
 try{
  if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  let data=fs.readFileSync(file);
  if(file===path.join(__dirname,'index.html')){
   data=Buffer.from(data.toString().replace('})();\n</script>',`var introRigFrames=0,introRigAttached=true,introRigOffsets=[];
var originalIntroRig=drawIntroRig;
drawIntroRig=function(now){
 var parked=readyBaitPosition(now);
 introRigAttached=introRigAttached&&Math.abs(bob.x-parked.x)<.001&&
  Math.abs(bob.y-parked.y)<.001;
 if(introRigOffsets.length<5)introRigOffsets.push(introEntrance.offset);
 introRigFrames++;
 return originalIntroRig(now);
};
window.__sceneQA={state:()=>({time,view,zone}),introRig:()=>({
 frames:introRigFrames,attached:introRigAttached,offsets:introRigOffsets,
 ready:introEntrance.visualReady,rod:rodBitmapSprites[selectedGear('rod').id].ready,
 lure:polishedRedLureArt.idle.ready,hook:hangingBaitAtlas.ready
}),own:()=>{save.owned.F001=2;save.owned.F021=1;save.owned.F201=1;},
exhibit:()=>({active:aquariumFishingActive,preserve:aquariumPreserveReturn,
 fish:aquariumFishActors.map(a=>({id:a.sp&&a.sp.id,x:a.x,y:a.y,speed:a.speed})),
 humans:aquariumHumanActors.map(h=>({id:h.id,slot:h.aquariumSlot,
  x:h.x,y:h.y,laneX:h.swimLaneX,laneY:h.swimLaneY,
  anim:h.swimAnimationClock,mode:h.swimMode}))
})};
})();\n</script>`));
  }
  const type={'.html':'text/html','.js':'application/javascript','.png':'image/png','.webp':'image/webp','.wav':'audio/wav','.ogg':'audio/ogg','.mp3':'audio/mpeg'}[path.extname(file)]||'application/octet-stream';
  res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'}).end(data);
 }catch(e){res.writeHead(404).end();}
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1536,height:864}}),errors=[];
  page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR:',e.message);});
  page.on('response',r=>{if(r.status()>=400)console.log('HTTP',r.status(),r.url());});
  let holdResolve,held=false;
  const holdGate=new Promise(resolve=>{holdResolve=resolve;});
  await page.route('**/F021.png*',async route=>{held=true;await holdGate;await route.continue();});
  await page.goto(`http://127.0.0.1:${server.address().port}/human-fishing/`,{waitUntil:'domcontentloaded'});
  try{await page.waitForFunction(()=>!document.querySelector('#bootStart').hidden||document.querySelector('#bootOverlay').hidden,{},{timeout:45000});}
  catch(e){console.error('BOOT STATE',await page.locator('#bootStatus').textContent(),errors);throw e;}
  console.log('BOOT STATE',await page.locator('#bootStatus').textContent());
  if(!await page.locator('#bootOverlay').evaluate(el=>el.hidden))await page.click('#bootStart');
  console.log('STARTED');
  const ready=async()=>{
   try{await page.waitForFunction(()=>document.querySelector('#bootOverlay').hidden&&!window.HumanFishingBoot.busy,{},{timeout:45000});}
   catch(e){console.error('GATE STATE',await page.locator('#bootStatus').textContent(),await page.locator('img[src]').evaluateAll(ims=>ims.filter(im=>!im.complete||!im.naturalWidth).map(im=>im.src)));throw e;}
  };
  await ready();
  // The real game must render its red octopus, hooked bait and line while
  // the hero is still entering. This catches first-cast "pop in" regressions.
  await page.waitForFunction(()=>window.__sceneQA.introRig().frames>0,{},{timeout:8000});
  const introRig=await page.evaluate(()=>window.__sceneQA.introRig());
  assert.equal(introRig.attached,true,'Entrance bait must follow the same physical rod tip');
  assert.equal(introRig.ready,true,'Entrance may begin only after rod+lure artwork loads');
  assert.equal(introRig.rod,true);
  assert.equal(introRig.lure,true);
  assert.equal(introRig.hook,true);
  assert.ok(introRig.offsets.some(v=>v<0),'Line and bait must join the left-to-right entrance');
  console.log('INTRO RIG',introRig);
  await page.click('#navFish');await ready();console.log('STAGE SELECT');
  await page.click('[data-zone="1"]');
  await page.waitForFunction(()=>window.HumanFishingBoot.busy);
  for(let i=0;i<100&&!held;i++)await page.waitForTimeout(20);assert.equal(held,true);
  const before=await page.evaluate(()=>window.__sceneQA.state());
  await page.waitForTimeout(250);assert.deepEqual(await page.evaluate(()=>window.__sceneQA.state()),before,'Loading pauses simulation');
  await page.evaluate(()=>document.querySelector('#navTank').click());
  assert.equal((await page.evaluate(()=>window.__sceneQA.state())).view,'fish','Navigation blocked during loading');
  holdResolve();await ready();await page.unroute('**/F021.png*');
  let failureCount=0;
  await page.route('**/F050.png*',route=>++failureCount===1?
   route.fulfill({status:503,body:'synthetic transient load failure'}):route.continue());
  await page.click('#navBook');
  await page.waitForFunction(()=>document.querySelector('#bootStatus').textContent.includes('자동 재시도'));
  assert.equal(await page.locator('#bootStart').isVisible(),false,'No separate retry dialog/button');
  assert.equal(await page.evaluate(()=>window.HumanFishingBoot.busy),true,'Scene must stay frozen');
  await ready();
  assert.ok(failureCount>=2,'Failed fish PNG must be re-fetched automatically');
  assert.ok(await page.locator('.book-fish-thumb img').count()>300);
  const specialCount=await page.locator('.book-fish-thumb img[src*="special-creatures"]').count();
  assert.match(await page.locator('#panelDesc').textContent(),new RegExp('특수 생물 0/'+specialCount+' ·'));
  assert.equal(await page.locator('.book-fish-thumb img').evaluateAll(ims=>ims.every(im=>im.complete&&im.naturalWidth>0)),true);
  await page.evaluate(()=>window.__sceneQA.own());
  for(const id of ['navTank','aquaPlay','aquaPlay','navShop','navGear','navBook','closePanel']){await page.click('#'+id);await ready();if(await page.locator('#aquaSaleClose').isVisible())await page.click('#aquaSaleClose');}
  // Repeated real UI navigation must never leave tank creatures piled up
  // on the edges, or produce non-finite human animation clocks.
  const assertTank=async(label)=>{
   await page.waitForFunction(()=>{
    const v=window.__sceneQA.exhibit();
    return window.__sceneQA.state().view==='tank'&&v.fish.length>=8&&v.humans.length>=4;
   },{},{timeout:10000});
   await page.waitForTimeout(150);
   const v=await page.evaluate(()=>window.__sceneQA.exhibit());
   assert(v.fish.every(a=>Number.isFinite(a.x)&&Number.isFinite(a.y)&&
    a.x>=80&&a.x<=1200&&a.y>=330&&a.y<=635),
    label+' fish must be spread inside the water, not outside either edge');
   assert(v.humans.every(a=>Number.isFinite(a.x)&&Number.isFinite(a.y)&&
    a.x>=90&&a.x<=1190&&Number.isFinite(a.laneX)&&
    Number.isFinite(a.laneY)&&Number.isFinite(a.anim)),
    label+' human swim animation or exhibit lane must never become NaN');
   assert(new Set(v.fish.map(a=>Math.floor(a.x/200))).size>=3,
    label+' multiple fish may not all cluster on one side');
  };
  for(const destination of ['navBook','navShop','navGear']){
   await page.click('#navTank');await ready();await assertTank('before '+destination);
   await page.click('#'+destination);await ready();
  }
  // Move from the tank into its fishing interaction, abandon the session
  // through a different menu, then reopen the aquarium.
  await page.click('#navTank');await ready();await assertTank('first exhibition');
  await page.click('#aquaPlay');await ready();
  assert.equal((await page.evaluate(()=>window.__sceneQA.exhibit())).active,true,
   'Entering aquarium Play must set fishing session active');
  await page.click('#navBook');await ready();
  await page.click('#navTank');await ready();await assertTank('abandoned Play -> tank');
  // Explicit Play -> Exhibit return follows the independent preservation path.
  await page.click('#aquaPlay');await ready();
  await page.click('#aquaPlay');await ready();await assertTank('Play -> Exhibit');
  await page.click('#navBook');await ready();
  for(let zone=0;zone<12;zone++){
   await page.click('#navFish');await ready();await page.click(`[data-zone="${zone}"]`);await ready();
   assert.equal((await page.evaluate(()=>window.__sceneQA.state())).zone,zone);
  }
  await page.evaluate(async()=>{
   if(document.fullscreenElement)await document.exitFullscreen();
   document.documentElement.requestFullscreen=()=>Promise.reject(new Error('Portrait viewport QA'));
  });
  await page.setViewportSize({width:390,height:844});
  await page.waitForFunction(()=>document.querySelector('.wrap').style.transform.includes('rotate(0deg)'));await page.click('#navBook');await ready();
  assert.equal(await page.locator('img[src]').evaluateAll(ims=>ims.every(im=>im.complete&&im.naturalWidth>0)),true);
  assert.deepEqual(errors,[]);
  console.log('PASS browser: delayed stage holds simulation/input, automatic 503 recovery with hidden button, all thumbnails ready, aquarium/gear, 12 habitats, portrait layout');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
