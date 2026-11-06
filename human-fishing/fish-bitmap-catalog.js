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
 var tiers=['UNCOMMON','UNCOMMON','UNCOMMON','RARE','RARE','EPIC','EPIC','LEGEND'];
 var installed=false,loaded=Object.create(null),preload=Object.create(null),created={};
 var enabled=!!window.HumanFishingFishAssetsReady;
 function imageFor(id){
  if(!enabled||!/^F\d{3}$/.test(id))return null;
  if(!Object.prototype.hasOwnProperty.call(loaded,id)){
   var img=new Image();img.decoding='async';loaded[id]=null;created[id]=img;
   img.onload=function(){img._hfScale=Math.min(224/img.naturalWidth,144/img.naturalHeight);loaded[id]=img;};
   img.onerror=function(){loaded[id]=false;};
   img.src='./assets/fish/individual/'+id+'.png?v=20261106-fish304';
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
  groups.forEach(function(group,g){
   group.names.forEach(function(name,j){
    var id='F'+String(241+g*8+j).padStart(3,'0');
    if(list.some(function(x){return x.id===id}))return;
    list.push({id:id,name:name,habitat:group.habitat,index:11+j,
      rarity:tiers[j],level:Math.min(75,12+group.habitat*3+j*3),
      artSizeClass:group.sizes[j],artVariant:true});
   });
  });
  installed=true;
  return list;
 }
 function variantsFor(list,z,rarity){return list.filter(function(s){return s.artVariant&&s.habitat===z&&s.rarity===rarity});}
 window.HumanFishingArt={
  enabled:enabled,extend:extend,bitmap:imageFor,primeHabitat:primeHabitat,
  variantsFor:variantsFor,originalCount:240,variantCount:64,
  assetPath:'./assets/fish/individual/'
 };
})();