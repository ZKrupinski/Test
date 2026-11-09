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
   data=Buffer.from(data.toString().replace('})();\n</script>',`window.__sceneQA={state:()=>({time,view,zone}),own:()=>{save.owned.F001=2;save.owned.F021=1;save.owned.F201=1;}};})();\n</script>`));
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
  page.on('pageerror',e=>errors.push(e.message));
  let holdResolve,held=false;
  await page.route('**/F021.png*',async route=>{held=true;await new Promise(r=>holdResolve=r);await route.continue();});
  await page.goto(`http://127.0.0.1:${server.address().port}/human-fishing/`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#bootStart').textContent==='터치하여 시작',{},{timeout:60000});
  await page.click('#bootStart');
  const ready=()=>page.waitForFunction(()=>document.querySelector('#bootOverlay').hidden&&!window.HumanFishingBoot.busy,{},{timeout:60000});
  await ready();
  await page.click('#navFish');await ready();
  await page.click('[data-zone="1"]');
  await page.waitForFunction(()=>window.HumanFishingBoot.busy);
  for(let i=0;i<100&&!held;i++)await page.waitForTimeout(20);assert.equal(held,true);
  const before=await page.evaluate(()=>window.__sceneQA.state());
  await page.waitForTimeout(250);assert.deepEqual(await page.evaluate(()=>window.__sceneQA.state()),before,'Loading pauses simulation');
  await page.evaluate(()=>document.querySelector('#navTank').click());
  assert.equal((await page.evaluate(()=>window.__sceneQA.state())).view,'fish','Navigation blocked during loading');
  holdResolve();await page.unroute('**/F021.png*');await ready();
  let fail=true;
  await page.route('**/F050.png*',route=>fail?route.fulfill({status:503,body:'test failure'}):route.continue());
  await page.click('#navBook');
  await page.waitForFunction(()=>document.querySelector('#bootStart').textContent==='다시 불러오기'&&!document.querySelector('#bootStart').hidden);
  assert.equal(await page.evaluate(()=>window.HumanFishingBoot.busy),true);
  fail=false;await page.click('#bootStart');await ready();
  assert.ok(await page.locator('.book-fish-thumb img').count()>300);
  assert.equal(await page.locator('.book-fish-thumb img').evaluateAll(ims=>ims.every(im=>im.complete&&im.naturalWidth>0)),true);
  await page.evaluate(()=>window.__sceneQA.own());
  for(const id of ['navTank','aquaPlay','aquaPlay','navShop','navGear','navBook','closePanel']){await page.click('#'+id);await ready();}
  for(let zone=0;zone<12;zone++){
   await page.click('#navFish');await ready();await page.click(`[data-zone="${zone}"]`);await ready();
   assert.equal((await page.evaluate(()=>window.__sceneQA.state())).zone,zone);
  }
  await page.setViewportSize({width:390,height:844});await page.click('#navBook');await ready();
  assert.equal(await page.locator('img[src]').evaluateAll(ims=>ims.every(im=>im.complete&&im.naturalWidth>0)),true);
  assert.deepEqual(errors,[]);
  console.log('PASS browser: delayed stage holds simulation/input, failed codex retries, all thumbnails ready, aquarium/play/exhibit/shop/gear, 12 habitats, portrait layout, no runtime errors');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
