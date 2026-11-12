'use strict';
// Actual live catalogue + spawned fish selection audit.
// Every extra sprite registered in the codex must be eligible for wild
// encounters in its assigned region. No unlock, catch-rate or save edits.
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=__dirname,html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/i)?.[1];
assert(script);new vm.Script(script);
const raw=script.slice(script.indexOf('var raw=['),script.indexOf('var humans=['));
const names=[...raw.matchAll(/'([^'|]+)\|([^']+)'/g)].flatMap(x=>x[2].split(','));
assert.equal(names.length,240);
const species=names.map((name,i)=>({
 id:'F'+String(i+1).padStart(3,'0'),name,habitat:Math.floor(i/20),index:i%20,
 rarity:i%20===19?'MYTHIC':i%20===18?'LEGEND':i%20===17?'EPIC':i%20>=15?'RARE':i%20>=11?'UNCOMMON':'COMMON'
}));
const batches=['fish-bitmap-catalog.js','fish-expansion-catalog.js',
 ...[23,4,6,7,8,9,10,11,12].map(n=>'fish-expansion-catalog-'+String(n).padStart(3,'0')+'.js')];
const win={HumanFishingFishAssetsReady:true,HumanFishingSpecialAssetsReady:true,HumanFishingFishExpansionAssetsReady:true};
for(const n of [23,4,6,7,8,9,10,11,12])
 win['HumanFishingFishExpansion'+String(n).padStart(3,'0')+'Ready']=true;
const Image=function(){};
for(let i=0;i<batches.length;i++){
 const source=fs.readFileSync(path.join(root,batches[i]),'utf8');
 vm.runInNewContext(source,{window:win,Image,Promise});
 const api=i===0?win.HumanFishingArt:i===1?win.HumanFishingFishExpansion:
  win['HumanFishingFishExpansion'+batches[i].match(/(\d{3})/)[1]];
 assert(api&&api.enabled,'Batch not activated: '+batches[i]);
 api.extend(species);
}
const visible=species.filter(sp=>!sp.archivedVisualDuplicate);
const added=visible.filter(sp=>sp.artVariant||sp.expansionSpecies||sp.specialCreature);
assert.equal(visible.length,367,'Unexpected live fish catalogue size');
assert.equal(added.length,128,'All additional original fish must be active');
for(const sp of visible){
 const dir=sp.specialCreature?'assets/special-creatures':'assets/fish/individual';
 assert(fs.existsSync(path.join(root,dir,sp.id+'.png')),'Missing live original artwork: '+sp.id);
}
// Execute the REAL game feature-selection and spawn integration in isolation.
const start=script.indexOf('var ECO_FEATURE_INTERVAL=');
const end=script.indexOf('function spawnWildHuman(){',start);
assert(start>0&&end>start,'Fish encounter rotation missing');
const code=script.slice(start,end);
const W=1280,env={Math,window:{HumanFishingArt:{enabled:true}},species,fish:[],
 zone:0,W,eco:{t:0,next:0,school:0},
 rnd:(a,b)=>(a+b)/2,clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),
 ecoDistinctSpawnSpecies:sp=>sp,chooseWildSpecies:()=>species[0],
 ecoVisualRepresentative:()=>null,ecoCanSchool:()=>false,
 fishVisualProfile:()=>({category:'MEDIUM'}),ecoPairSpace:()=>({x:50,y:50}),
 ecoSafeDepth:(f,y)=>y,makeWildFish:(sp,x,y,dir)=>({sp,x,y,dir,size:1})
};
vm.createContext(env);
vm.runInContext(code,env);
const tiers=['UNCOMMON','RARE','EPIC','LEGEND','MYTHIC'];
const eligible=[];
for(let zone=0;zone<12;zone++){
 env.zone=zone;env.eco.t=0;env.fish=[];
 env.ecoResetFeature();
 for(const rarity of tiers){
  const expected=added.filter(sp=>sp.habitat===zone&&sp.rarity===rarity);
  if(!expected.length)continue;
  const seen=new Set();
  for(let step=0;step<expected.length;step++){
   // Exercise the actual spawnWildFish path, not a mocked selection result.
   env.fish=[];env.eco.t+=30;
   for(const other of tiers)env.eco.featureNext[other]=Infinity;
   env.eco.featureNext[rarity]=env.eco.t;
   env.eco.featureLast=-1e9;
   const before=env.eco.featureSeen;
   assert.equal(env.spawnWildFish(false,true,null),1,'Real world arrival must spawn '+zone+'/'+rarity);
   const selected=env.fish[0].sp;
   assert(env.ecoFeatureEligible(selected),'Spawned pending/archived/wrong region: '+selected.id);
   assert.equal(selected.habitat,zone,'Wrong region');
   assert.equal(selected.rarity,rarity,'Encounter tier must remain unchanged');
   assert(!seen.has(selected.id),'Repeat before full regional extra roster: '+selected.id);
   seen.add(selected.id);eligible.push(selected.id);
   assert.equal(before[selected.id],1,'Actual sightings must advance only after spawn');
  }
  assert.equal(seen.size,expected.length,'Unreachable added species '+zone+'/'+rarity);
 }
}
// Confirm that usual random spawns remain active between rotations.
env.zone=0;env.eco.t=0;env.fish=[];env.ecoResetFeature();
env.fish=[];assert.equal(env.spawnWildFish(false,true,null),1);
assert.equal(env.fish[0].sp.id,'F001','Normal common-tier spawn must stay intact');
// Aquarium is not allowed to receive featured strangers.
assert.match(html,/if\(aquariumFishingActive\)\{/);
assert.match(html,/if\(eco\.fishTimer>interval\)\{eco\.fishTimer=0;spawnWildFish\(false\)\}/);
assert.match(html,/ecoResetFeature\(\)/);
assert.match(html,/if\(added\)ecoRecordFeatureSpawn\(sp,!!featured&&sp\.id===featured\.id\)/);
assert(!code.includes('save.owned['),'Visibility must not modify catch/save records');
assert(!code.includes('catchProbability'),'New appearances must not change catch difficulty');
console.log('PASS: all '+eligible.length+' additional registered species reachable in assigned habitats; no repeated featured fish until all tier-mates appear; real spawn path and art coverage validated.');
