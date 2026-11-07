(function(){
'use strict';
// Physical Foley-only sound palette. No oscillators, pitched bleeps or UI synths.
// All bundled clips are CC0. Source map and credits: FOLEY_CREDITS.md.
var root='./assets/foley/';
var SRC={
 waterSplash:['water_splash.ogg','https://raw.githubusercontent.com/Julian-adv/OpenMMO/master/client/public/sounds/fishing-splash.ogg'],
 waterPlop:['water_plop.ogg','https://raw.githubusercontent.com/Julian-adv/OpenMMO/master/client/public/sounds/fishing-plop.ogg'],
 lineReel:['line_reel.ogg','https://raw.githubusercontent.com/Julian-adv/OpenMMO/master/client/public/sounds/fishing-reel.ogg'],
 lineSnap:['line_snap.ogg','https://raw.githubusercontent.com/Julian-adv/OpenMMO/master/client/public/sounds/fishing-snap.ogg'],
 clothA:['cloth_a.ogg','https://raw.githubusercontent.com/GeorgeQLe/assets-sfx-combat/main/assets/kenney/rpg-audio/Audio/cloth1.ogg'],
 clothB:['cloth_b.ogg','https://raw.githubusercontent.com/GeorgeQLe/assets-sfx-combat/main/assets/kenney/rpg-audio/Audio/cloth2.ogg'],
 clothC:['cloth_c.ogg','https://raw.githubusercontent.com/GeorgeQLe/assets-sfx-combat/main/assets/kenney/rpg-audio/Audio/cloth3.ogg'],
 creakA:['creak_a.ogg','https://raw.githubusercontent.com/GeorgeQLe/assets-sfx-combat/main/assets/kenney/rpg-audio/Audio/creak1.ogg'],
 creakB:['creak_b.ogg','https://raw.githubusercontent.com/GeorgeQLe/assets-sfx-combat/main/assets/kenney/rpg-audio/Audio/creak2.ogg'],
 leatherA:['leather_a.ogg','https://raw.githubusercontent.com/GeorgeQLe/assets-sfx-combat/main/assets/kenney/rpg-audio/Audio/handleSmallLeather.ogg'],
 leatherB:['leather_b.ogg','https://raw.githubusercontent.com/GeorgeQLe/assets-sfx-combat/main/assets/kenney/rpg-audio/Audio/handleSmallLeather2.ogg'],
 dropLeather:['drop_leather.ogg','https://raw.githubusercontent.com/GeorgeQLe/assets-sfx-combat/main/assets/kenney/rpg-audio/Audio/dropLeather.ogg'],
 coinsA:['coins_a.ogg','https://raw.githubusercontent.com/GeorgeQLe/assets-sfx-combat/main/assets/kenney/rpg-audio/Audio/handleCoins.ogg'],
 coinsB:['coins_b.ogg','https://raw.githubusercontent.com/GeorgeQLe/assets-sfx-combat/main/assets/kenney/rpg-audio/Audio/handleCoins2.ogg'],
 bookOpen:['book_open.ogg','https://raw.githubusercontent.com/GeorgeQLe/assets-sfx-combat/main/assets/kenney/rpg-audio/Audio/bookOpen.ogg'],
 bookClose:['book_close.ogg','https://raw.githubusercontent.com/GeorgeQLe/assets-sfx-combat/main/assets/kenney/rpg-audio/Audio/bookClose.ogg'],
 bookFlipA:['book_flip_a.ogg','https://raw.githubusercontent.com/GeorgeQLe/assets-sfx-combat/main/assets/kenney/rpg-audio/Audio/bookFlip1.ogg'],
 bookFlipB:['book_flip_b.ogg','https://raw.githubusercontent.com/GeorgeQLe/assets-sfx-combat/main/assets/kenney/rpg-audio/Audio/bookFlip2.ogg'],
 softA:['soft_a.ogg','https://raw.githubusercontent.com/GeorgeQLe/assets-sfx-combat/main/assets/kenney/impact-sounds/Audio/impactSoft_medium_000.ogg'],
 softB:['soft_b.ogg','https://raw.githubusercontent.com/GeorgeQLe/assets-sfx-combat/main/assets/kenney/impact-sounds/Audio/impactSoft_medium_002.ogg'],
 thudA:['thud_a.ogg','https://raw.githubusercontent.com/GeorgeQLe/assets-sfx-combat/main/assets/kenney/impact-sounds/Audio/impactSoft_heavy_000.ogg'],
 thudB:['thud_b.ogg','https://raw.githubusercontent.com/GeorgeQLe/assets-sfx-combat/main/assets/kenney/impact-sounds/Audio/impactSoft_heavy_003.ogg'],
 punchA:['punch_a.ogg','https://raw.githubusercontent.com/GeorgeQLe/assets-sfx-combat/main/assets/kenney/impact-sounds/Audio/impactPunch_heavy_000.ogg'],
 punchB:['punch_b.ogg','https://raw.githubusercontent.com/GeorgeQLe/assets-sfx-combat/main/assets/kenney/impact-sounds/Audio/impactPunch_heavy_003.ogg'],
 woodA:['wood_a.ogg','https://raw.githubusercontent.com/GeorgeQLe/assets-sfx-combat/main/assets/kenney/impact-sounds/Audio/impactWood_medium_000.ogg'],
 woodB:['wood_b.ogg','https://raw.githubusercontent.com/GeorgeQLe/assets-sfx-combat/main/assets/kenney/impact-sounds/Audio/impactWood_medium_003.ogg'],
 woodTap:['wood_tap.ogg','https://raw.githubusercontent.com/GeorgeQLe/assets-sfx-combat/main/assets/kenney/impact-sounds/Audio/impactWood_light_001.ogg'],
 touchTap:['touch_tap.ogg','https://raw.githubusercontent.com/GeorgeQLe/assets-sfx-combat/main/assets/kenney/impact-sounds/Audio/impactGeneric_light_002.ogg'],
 plank:['plank.ogg','https://raw.githubusercontent.com/GeorgeQLe/assets-sfx-combat/main/assets/kenney/impact-sounds/Audio/impactPlank_medium_001.ogg']
};
function layer(keys,gain,rate){return {keys:keys,gain:gain,rate:rate||1};}
var CUES={
 cast:{gap:.24,l:[layer(['clothA','clothB'],.64,.95),layer(['creakA'],.31,1.07)]},
 splash:{gap:.18,l:[layer(['waterSplash'],.88),layer(['softA','softB'],.27,.88)]},
 lureGrab:{gap:.15,l:[layer(['leatherA','leatherB'],.19,1.2)]},
 lureMove:{gap:.33,l:[layer(['waterPlop'],.13,1.06),layer(['clothC'],.10,1.1)]},
 brush:{gap:.19,l:[layer(['waterPlop'],.18,1.12)]},
 weakspot:{gap:.21,l:[layer(['waterPlop'],.37,1.05),layer(['softA','softB'],.19,1.08)]},
 bite:{gap:.12,l:[layer(['waterPlop'],.56,1.0),layer(['softA','softB'],.57,.94)]},
 miss:{gap:.17,l:[layer(['waterPlop'],.38,.85),layer(['clothA','clothB'],.23,1.24)]},
 panic:{gap:.24,l:[layer(['waterSplash'],.32,1.25),layer(['softA','softB'],.33,1.08)]},
 reel:{gap:.145,l:[layer(['lineReel'],.33,.98),layer(['creakA'],.17,.93)]},
 rodPump:{gap:.24,l:[layer(['creakA','creakB'],.56,.89),layer(['lineReel'],.34,1.13)]},
 rodSnap:{gap:.14,l:[layer(['lineSnap'],.45),layer(['woodTap'],.16,1.16)]},
 swallow:{gap:.14,l:[layer(['waterPlop'],.71,.82),layer(['thudA','thudB'],.42,1.1)]},
 catch:{gap:.18,l:[layer(['coinsA','coinsB'],.51,1.03),layer(['softA'],.25,1.04)]},
 feverReady:{gap:.9,l:[layer(['plank'],.44,1.17),layer(['coinsB'],.38,.93)]},
 fever:{gap:.7,l:[layer(['waterSplash'],.78,.8),layer(['thudA','thudB'],.88,.86),layer(['clothB'],.41,.88)]},
 feverSnap:{gap:.16,l:[layer(['punchA','punchB'],.81,.96),layer(['waterSplash'],.61,1.23),layer(['plank'],.24,1.04)]},
 feverBubbles:{gap:.26,l:[layer(['waterPlop'],.25,.9),layer(['clothA'],.17,.8)]},
 fishFlail:{gap:.24,l:[layer(['waterPlop'],.34,1.16),layer(['softA'],.25,.89)]},
 escape:{gap:.35,l:[layer(['clothC'],.55,1.06),layer(['waterSplash'],.67,.98)]},
 escapeSplash:{gap:.3,l:[layer(['waterSplash'],.7,1.14)]},
 counter:{gap:.25,l:[layer(['punchA','punchB'],.95,.89),layer(['woodA','woodB'],.72,.88)]},
 groggy:{gap:.5,l:[layer(['plank'],.50,.93),layer(['creakB'],.25,.8)]},
 menuOpen:{gap:.12,l:[layer(['bookOpen'],.43,1.13)]},
 menuClose:{gap:.12,l:[layer(['bookClose'],.37,1.05)]},
 menuTap:{gap:.075,l:[layer(['woodTap','touchTap'],.23,1.07)]},
 menuNavigate:{gap:.09,l:[layer(['bookFlipA','bookFlipB'],.22,1.3)]},
 stage:{gap:.2,l:[layer(['bookFlipA'],.46,.94),layer(['clothA'],.23,1.17)]},
 upgrade:{gap:.24,l:[layer(['woodA','woodB'],.56,1.08),layer(['coinsB'],.42,1.01)]},
 purchase:{gap:.22,l:[layer(['coinsA','coinsB'],.62,.99),layer(['woodB'],.40,.92)]},
 equip:{gap:.14,l:[layer(['dropLeather'],.47),layer(['woodTap'],.29,.88)]},
 aquarium:{gap:.16,l:[layer(['waterPlop'],.41),layer(['bookOpen'],.19,1.19)]},
 aquariumPlace:{gap:.14,l:[layer(['waterPlop'],.62,1.15),layer(['softB'],.26,.97)]},
 aquariumRemove:{gap:.15,l:[layer(['waterPlop'],.32,.91),layer(['clothC'],.23,1.03)]},
 helperIncome:{gap:.95,l:[layer(['coinsB'],.42)]},
 error:{gap:.22,l:[layer(['creakA'],.30,.76),layer(['woodTap'],.23,.88)]}
};
var context=null,output=null,decoded={},loading={},failed={},last={},master=.72;
function setup(){
 if(context)return context;
 var Native=window.AudioContext||window.webkitAudioContext;
 if(!Native)return null;
 try{context=new Native();}catch(e){return null;}
 // Physical impacts add together: a gentle shared limiter prevents
 // harsh clipping without ducking or lowering the hit versus other effects.
 if(typeof context.createDynamicsCompressor==='function'){
  output=context.createDynamicsCompressor();
  output.threshold.value=-14;output.knee.value=8;
  output.ratio.value=3;output.attack.value=.003;output.release.value=.12;
  output.connect(context.destination);
 }
 return context;
}
function fetchSound(key){
 if(decoded[key])return Promise.resolve(decoded[key]);
 if(loading[key])return loading[key];
 if(!SRC[key])return Promise.resolve(null);
 var file=SRC[key];
 function load(url){
  return fetch(url,{cache:'force-cache'}).then(function(response){
   if(!response.ok)throw Error('HTTP '+response.status);
   return response.arrayBuffer();
  });
 }
 var ac=setup();
 if(!ac)return Promise.resolve(null);
 loading[key]=load(root+file[0]).catch(function(){return load(file[1]);})
 .then(function(bytes){return ac.decodeAudioData(bytes);})
 .then(function(buffer){decoded[key]=buffer;return buffer;})
 .catch(function(){failed[key]=true;return null;});
 return loading[key];
}
function prime(){
 var tasks=Object.keys(SRC).map(fetchSound);
 return Promise.all(tasks);
}
function unlock(){
 var ac=setup();
 if(ac&&ac.state==='suspended')ac.resume().catch(function(){});
 return ac;
}
function play(key,options){
 var cfg=CUES[key],ac=unlock();
 if(!cfg||!ac)return false;
 var now=ac.currentTime;
 if(last[key]!==undefined&&now-last[key]<cfg.gap)return false;
 last[key]=now;
 var intensity=options&&Number.isFinite(options.intensity)?Math.max(.25,Math.min(1.6,options.intensity)):1;
 cfg.l.forEach(function(item){
  var available=item.keys.filter(function(name){return !!decoded[name]});
  if(!available.length){
   item.keys.forEach(function(name){if(!loading[name]&&!failed[name])fetchSound(name);});
   return;
  }
  var name=available[Math.floor(Math.random()*available.length)];
  var source=ac.createBufferSource(),gain=ac.createGain();
  source.buffer=decoded[name];
  source.playbackRate.value=item.rate*(.96+Math.random()*.08);
  gain.gain.value=Math.min(.92,item.gain*master*intensity);
  source.connect(gain);gain.connect(output||ac.destination);
  try{source.start(now);}catch(e){}
 });
 return true;
}
function uiCue(el){
 if(!el||el.disabled)return '';
 if(el.matches('[data-shop-buy]'))return 'purchase';
 if(el.matches('[data-loadout="upgrade"],[data-up]'))return 'upgrade';
 if(el.matches('[data-loadout="equip"]'))return 'equip';
 if(el.matches('[data-place],[data-aqua-place]'))return 'aquariumPlace';
 if(el.matches('[data-remove],[data-aqua-remove]'))return 'aquariumRemove';
 if(el.matches('[data-zone]'))return 'stage';
 if(el.matches('[data-shop-tab],[data-gear-slot]'))return 'menuNavigate';
 if(el.id==='closePanel'||el.id==='closeEquipment'||el.id==='closeShop')return 'menuClose';
 if(el.id==='aquaPlay'||el.id==='aquaManage')return 'aquarium';
 if(el.matches('select,option'))return 'menuNavigate';
 return 'menuTap';
}
document.addEventListener('pointerdown',function(){unlock();},{passive:true,capture:true});
document.addEventListener('keydown',function(){unlock();},{capture:true});
document.addEventListener('click',function(e){
 var el=e.target&&e.target.closest?e.target.closest('button,[role="button"],select,.nav,.tab'):null;
 if(!el||el.disabled)return;
 var key=uiCue(el);
 if(key)play(key);
},true);
document.addEventListener('change',function(e){
 if(e.target&&e.target.matches&&e.target.matches('select'))play('menuNavigate');
},true);
window.HumanFishingFoley={
 play:play,prime:prime,unlock:unlock,
 hasCue:function(key){return !!CUES[key]},
 setVolume:function(v){master=Math.max(0,Math.min(1,Number(v)||0));},
 getState:function(){return{sampleCount:Object.keys(SRC).length,loaded:Object.keys(decoded).length,cueCount:Object.keys(CUES).length,volume:master}}
};
// Start decoding during the game art loading screen. Playback remains gesture gated.
prime();
})();