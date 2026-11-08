/* Expansion batch 001 — only active after verified full RGBA image import.
 * VERIFIED INSTALL SET F306/F311/F312/F314/F315/F316; others held for quality; no generated/placeholder fish are shown while uninstalled.
 */
(function(){
 'use strict';
 var installed=!!window.HumanFishingFishExpansionAssetsReady;
 var records=[{"id":"F306","name":"롱톰니들피시","scientificName":"Ablennes hians","habitat":7,"artSizeClass":"LARGE","rarity":"RARE","level":58,"index":18,"expansionSpecies":true,"behaviorProfile":{"archetype":"surface_sprint_sharp_turn","mode":"dart","speedMultiplier":1.35,"swimAmpMultiplier":0.8,"turnSeconds":8,"agilityMultiplier":1.85}},{"id":"F311","name":"달고기","scientificName":"Zeus faber","habitat":8,"artSizeClass":"MEDIUM","rarity":"RARE","level":61,"index":18,"expansionSpecies":true,"behaviorProfile":{"archetype":"upright_still_then_strike","mode":"hover","speedMultiplier":0.85,"swimAmpMultiplier":1.2,"turnSeconds":9,"agilityMultiplier":1}},{"id":"F312","name":"수리남두꺼비고기","scientificName":"Batrachoides surinamensis","habitat":7,"artSizeClass":"MEDIUM","rarity":"UNCOMMON","level":52,"index":18,"expansionSpecies":true,"behaviorProfile":{"archetype":"mudbank_low_hover_strike","mode":"hover","speedMultiplier":0.7,"swimAmpMultiplier":0.8,"turnSeconds":9,"agilityMultiplier":0.95}},{"id":"F314","name":"날치성대","scientificName":"Dactylopterus volitans","habitat":7,"artSizeClass":"MEDIUM","rarity":"RARE","level":58,"index":18,"expansionSpecies":true,"behaviorProfile":{"archetype":"pectoral_fan_display_turn","mode":"wander","speedMultiplier":0.8,"swimAmpMultiplier":1.35,"turnSeconds":8,"agilityMultiplier":0.9}},{"id":"F315","name":"그린톱가오리","scientificName":"Pristis zijsron","habitat":7,"artSizeClass":"LARGE","rarity":"LEGEND","level":70,"index":18,"expansionSpecies":true,"behaviorProfile":{"archetype":"seabed_rostrum_patrol","mode":"cruise","speedMultiplier":0.7,"swimAmpMultiplier":0.55,"turnSeconds":10,"agilityMultiplier":1.05}},{"id":"F316","name":"파이어일","scientificName":"Mastacembelus erythrotaenia","habitat":3,"artSizeClass":"LARGE","rarity":"RARE","level":46,"index":18,"expansionSpecies":true,"behaviorProfile":{"archetype":"eel_sinuous_rapid_dart","mode":"dart","speedMultiplier":1.15,"swimAmpMultiplier":1.65,"turnSeconds":14,"agilityMultiplier":1.35}}];
 var complete=false;
 function extend(species){
  if(!installed||complete)return species;
  records.forEach(function(spec){
   if(species.some(function(s){return s.id===spec.id}))return;
   species.push(Object.assign({},spec));
  });
  complete=true;
  return species;
 }
 window.HumanFishingFishExpansion={enabled:installed,extend:extend,
  count:installed?records.length:0,records:records};
})();
