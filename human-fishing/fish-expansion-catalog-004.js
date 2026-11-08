/* Fourth fish expansion batch F329–F333. Never show fish without all five validated RGBA PNGs. */
(function(){
 'use strict';
 var enabled=!!window.HumanFishingFishExpansion004Ready,installed=false;
 var records=[{"id":"F329","scientificName":"Lepisosteus osseus","name":"롱노즈가아","habitat":4,"artSizeClass":"LARGE","rarity":"RARE","level":49,"behaviorProfile":{"archetype":"ambush_stillness_surface_lunge","mode":"dart","speedMultiplier":0.87,"swimAmpMultiplier":1.05,"agilityMultiplier":1.4,"turnSeconds":13},"expansionSpecies":true,"artBatch":"004","index":18},{"id":"F330","scientificName":"Heterotis niloticus","name":"아프리카보니텅","habitat":2,"artSizeClass":"LARGE","rarity":"EPIC","level":60,"behaviorProfile":{"archetype":"wide_turn_watercolumn_glide","mode":"cruise","speedMultiplier":0.74,"swimAmpMultiplier":0.9,"agilityMultiplier":0.56,"turnSeconds":12},"expansionSpecies":true,"artBatch":"004","index":18},{"id":"F331","scientificName":"Macrourus holotrachys","name":"거친머리그레나디어","habitat":10,"artSizeClass":"MEDIUM","rarity":"EPIC","level":67,"behaviorProfile":{"archetype":"deep_hover_brief_escape","mode":"hover","speedMultiplier":0.55,"swimAmpMultiplier":0.7,"agilityMultiplier":0.83,"turnSeconds":9},"expansionSpecies":true,"artBatch":"004","index":18},{"id":"F332","scientificName":"Cetorhinus maximus","name":"돌묵상어","habitat":9,"artSizeClass":"LARGE","rarity":"LEGEND","level":74,"behaviorProfile":{"archetype":"huge_slow_filter_feeding_patrol","mode":"cruise","speedMultiplier":0.38,"swimAmpMultiplier":0.62,"agilityMultiplier":0.44,"turnSeconds":15},"expansionSpecies":true,"artBatch":"004","index":18},{"id":"F333","scientificName":"Aluterus monoceros","name":"유니콘쥐치","habitat":6,"artSizeClass":"MEDIUM","rarity":"RARE","level":53,"behaviorProfile":{"archetype":"cautious_reef_hover_short_side_turn","mode":"hover","speedMultiplier":0.72,"swimAmpMultiplier":1.35,"agilityMultiplier":1.12,"turnSeconds":9},"expansionSpecies":true,"artBatch":"004","index":18}];
 function extend(species){
  if(!enabled||installed)return species;
  records.forEach(function(sp){
   if(species.some(function(x){return x.id===sp.id||(x.scientificName&&x.scientificName===sp.scientificName)}))return;
   species.push(Object.assign({},sp));
  });
  installed=true;
  return species;
 }
 window.HumanFishingFishExpansion004={enabled:enabled,count:enabled?records.length:0,
  records:records,extend:extend};
})();
