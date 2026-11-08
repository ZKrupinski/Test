/* HUMAN FISHING original-raster fish collection (2026-11-06)
 * 240 stable base catalog IDs, plus 64 separately named illustrated color morphs.
 * Never sample from a sprite-sheet rectangle: every fish uses its own tightly
 * alpha-masked PNG. The ready.js switch is installed LAST by the import action,
 * preventing partial uploads from replacing safe procedural fallbacks.
 */
(function(){
 'use strict';
 var groups=[
  {habitat:0,names:['레드베일 베타','로즈베일 베타','코발트팬 베타','루비팬 베타','오로라팬 베타','오렌지팬 구피','스카이블루 구피','코이팬 구피'],sizes:['SMALL','SMALL','SMALL','SMALL','SMALL','SMALL','SMALL','SMALL']},
  {habitat:5,names:['황금비늘 잉어','삼색 비단잉어','청동 비늘잉어','흑무늬 배스','골든 배스','붉은꼬리 퍼치','청등 블루길','황금점 파이크'],sizes:['LARGE','LARGE','MEDIUM','LARGE','MEDIUM','MEDIUM','MEDIUM','LARGE']},
  {habitat:4,names:['핑크라인 송어','황금 브라운송어','붉은송어','은빛 아틱차','실버 연어','파스텔 연어','주홍 홍연어','스모크 송어'],sizes:['MEDIUM','MEDIUM','MEDIUM','MEDIUM','LARGE','LARGE','LARGE','MEDIUM']},
  {habitat:6,names:['흰동가리 레드라인형','흰동가리 오렌지형','코발트 블루탱','옐로탱 황금형','파우더블루탱 밝은형','사파이어 황제엔젤','황금점 프렌치엔젤','코발트 황제엔젤'],sizes:['SMALL','SMALL','MEDIUM','MEDIUM','MEDIUM','MEDIUM','MEDIUM','MEDIUM']},
  {habitat:9,names:['청은 참다랑어','황금꼬리 황다랑어','실버 눈다랑어','청백 날개다랑어','줄무늬 가다랑어','줄무늬 고등어','은청 고등어','청백 줄무늬 원양어'],sizes:['LARGE','LARGE','LARGE','LARGE','MEDIUM','MEDIUM','MEDIUM','MEDIUM']},
  {habitat:8,names:['황갈색 대구','실버 명태','흑점 대구','빙백 대구','연안 줄무늬 대구','은빛 연안어','녹회색 연안대구','해안 점박이 대구'],sizes:['MEDIUM','MEDIUM','MEDIUM','MEDIUM','MEDIUM','MEDIUM','MEDIUM','MEDIUM']},
  {habitat:10,names:['구리빛 심해아귀','사파이어 심해아귀','블랙 크라운아귀','갈색 송곳니고기','암흑 펠리컨장어','에메랄드 배럴아이','붉은빛 바이퍼피시','청색발광 해치피시'],sizes:['SPECIAL','SPECIAL','SPECIAL','MEDIUM','SPECIAL','SPECIAL','MEDIUM','SMALL']},
  {habitat:7,names:['황금 가시해마','청금 해마','루비 해마','노랑 피그미해마','바이올렛 시드래곤','올리브 리피시드래곤','백가시 복어','황금점 복어'],sizes:['SPECIAL','SPECIAL','SPECIAL','SMALL','SPECIAL','SPECIAL','SPECIAL','SPECIAL']}
 ];
 var groupTiers=[
  ['EPIC','RARE','EPIC','EPIC','EPIC','UNCOMMON','UNCOMMON','UNCOMMON'],
  ['RARE','RARE','UNCOMMON','COMMON','UNCOMMON','UNCOMMON','UNCOMMON','RARE'],
  ['UNCOMMON','UNCOMMON','RARE','UNCOMMON','UNCOMMON','UNCOMMON','RARE','UNCOMMON'],
  ['UNCOMMON','UNCOMMON','RARE','UNCOMMON','UNCOMMON','EPIC','RARE','EPIC'],
  ['RARE','RARE','RARE','RARE','UNCOMMON','UNCOMMON','UNCOMMON','UNCOMMON'],
  ['UNCOMMON','COMMON','UNCOMMON','COMMON','UNCOMMON','COMMON','UNCOMMON','UNCOMMON'],
  ['RARE','LEGEND','LEGEND','RARE','EPIC','EPIC','EPIC','RARE'],
  ['RARE','RARE','EPIC','RARE','EPIC','LEGEND','EPIC','RARE']
 ];
 var baseTierFix={"제브라다니오":"COMMON","드워프구라미":"COMMON","허니구라미":"UNCOMMON","오토싱클루스":"UNCOMMON","파이어피시":"UNCOMMON","블루그린크로미스":"COMMON","만다린피시":"RARE","식스라인래스":"UNCOMMON","클리너래스":"UNCOMMON","뱅가이카디널피시":"UNCOMMON","파자마카디널피시":"UNCOMMON","코넷피시":"UNCOMMON","트럼펫피시":"UNCOMMON","만타가오리":"LEGEND","푸른점가오리":"UNCOMMON","점박이매가오리":"RARE","참가자미":"COMMON","쥐치":"COMMON","볼락":"COMMON","조피볼락":"COMMON","양태":"COMMON","고래상어":"MYTHIC","귀상어":"EPIC","백철갑상어":"LEGEND","나일퍼치":"EPIC","모토로민물가오리":"EPIC","아시안아로와나":"MYTHIC","쿠키커터상어":"RARE","주름상어":"MYTHIC","고블린상어":"LEGEND","은상어":"EPIC","식스길상어":"EPIC","연어상어":"RARE","그린란드상어":"MYTHIC","늑대장어":"UNCOMMON","샌드랜스":"COMMON","카펠린":"COMMON","럼프피시":"UNCOMMON","대서양늑대고기":"RARE","그린란드넙치":"COMMON","북대서양홍어":"UNCOMMON"};

 // Curated near-identical/recolored images: preserve all original PNGs and IDs for saves,
 // but never count these as separate visible collectible species.
 var visualAliases={"F241":"F061","F242":"F061","F243":"F061","F244":"F061","F246":"F001","F247":"F001","F248":"F001","F251":"F249","F253":"F252","F262":"F261","F284":"F282","F298":"F297","F299":"F297"};
 function migrateSave(save){
  if(!save||typeof save!=='object')return false;
  var changed=false,owned=save.owned;
  if(owned&&typeof owned==='object'){
   Object.keys(visualAliases).forEach(function(id){
    if(!Object.prototype.hasOwnProperty.call(owned,id))return;
    var canonical=visualAliases[id],quantity=Math.max(0,Number(owned[id])||0);
    if(quantity)owned[canonical]=(Math.max(0,Number(owned[canonical])||0)+quantity);
    delete owned[id];changed=true;
   });
  }
  if(Array.isArray(save.placed)){
   save.placed=save.placed.map(function(id){
    var canonical=visualAliases[id];
    if(canonical){changed=true;return canonical}
    return id;
   });
  }
  if(save.fishMotionOverrides&&typeof save.fishMotionOverrides==='object'){
   Object.keys(visualAliases).forEach(function(id){
    if(!Object.prototype.hasOwnProperty.call(save.fishMotionOverrides,id))return;
    var canonical=visualAliases[id];
    if(!Object.prototype.hasOwnProperty.call(save.fishMotionOverrides,canonical))
     save.fishMotionOverrides[canonical]=save.fishMotionOverrides[id];
    delete save.fishMotionOverrides[id];changed=true;
   });
  }
  return changed;
 }
 var installed=false,loaded=Object.create(null),preload=Object.create(null),created={};
 var enabled=!!window.HumanFishingFishAssetsReady;
 var specialEnabled=!!window.HumanFishingSpecialAssetsReady;
 function imageFor(id){
  if(!enabled||(!/^F\d{3}$/.test(id)&&!(specialEnabled&&id==='S001')))return null;
  if(!Object.prototype.hasOwnProperty.call(loaded,id)){
   var img=new Image();img.decoding='async';loaded[id]=null;created[id]=img;
   img.onload=function(){
    // All 304 individual PNG fish face right; old procedural fish face left.
    // Rendering uses this source orientation to mirror only when required.
    img._hfFacingRight=true;
    img._hfScale=Math.min(224/img.naturalWidth,144/img.naturalHeight);
    loaded[id]=img;
   };
   img.onerror=function(){loaded[id]=false;};
   img.src=id==='S001'?'./assets/special-creatures/S001.png?v=20261108-s001':'./assets/fish/individual/'+id+'.png?v='+(Number(id.slice(1))>=342?'20261108-batch007':(Number(id.slice(1))>304?(Number(id.slice(1))<=328?'20261108-direct17':'20261108-original-expansion'):'20261106-fish304'));
  }
  return loaded[id]||null;
 }
 function listZone(list,z){return list.filter(function(sp){return sp.habitat===z});}
 function waitImage(id){
  var a=imageFor(id);if(a||loaded[id]===false)return Promise.resolve();
  var img=created[id];if(!img)return Promise.resolve();
  return new Promise(function(resolve){
   if(img.complete){resolve();return;}
   img.addEventListener('load',resolve,{once:true});
   img.addEventListener('error',resolve,{once:true});
  });
 }
 function primeHabitat(z,list){
  if(!enabled)return Promise.resolve();
  var ids=listZone(list,z).map(function(x){return x.id});
  var key=String(z);
  if(!preload[key])preload[key]=Promise.all(ids.map(waitImage)).then(function(){return true;});
  return preload[key];
 }
 function extend(list){
  if(!enabled||installed)return list;
  list.forEach(function(sp){if(baseTierFix[sp.name])sp.rarity=baseTierFix[sp.name];});
  groups.forEach(function(group,g){
   group.names.forEach(function(name,j){
    var id='F'+String(241+g*8+j).padStart(3,'0');
    if(visualAliases[id]||list.some(function(x){return x.id===id}))return;
    list.push({id:id,name:name,habitat:group.habitat,index:11+j,
      rarity:groupTiers[g][j],level:Math.min(75,12+group.habitat*3+j*3),
      artSizeClass:group.sizes[j],artVariant:true});
   });
  });
  if(specialEnabled&&!list.some(function(x){return x.id==='S001'}))
   list.push({id:'S001',name:'뱀파이어오징어',scientificName:'Vampyroteuthis infernalis',
    creatureType:'CEPHALOPOD',specialCreature:true,realSpecies:true,
    habitat:10,index:17,rarity:'EPIC',level:65,artSizeClass:'SPECIAL',
    behaviorArchetype:'low-oxygen-hover-webbed-cloak-flash-escape'});
  installed=true;
  return list;
 }
 function variantsFor(list,z,rarity){return list.filter(function(s){return s.artVariant&&s.habitat===z&&s.rarity===rarity});}
 window.HumanFishingArt={
  enabled:enabled,specialEnabled:specialEnabled,specialCount:specialEnabled?1:0,
  extend:extend,bitmap:imageFor,primeHabitat:primeHabitat,
  visualAliases:visualAliases,migrateSave:migrateSave,
  variantsFor:variantsFor,originalCount:240,variantCount:64-Object.keys(visualAliases).length,archivedVariantCount:64,
  assetPath:'./assets/fish/individual/'
 };
})();