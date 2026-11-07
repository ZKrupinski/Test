/* Human Fishing environmental soundscape. 12 distinct ABOVE-water habitats;
   one COMMON submerged diver mix, with smooth low-pass crossfades.
   All clips are locally bundled original pre-rendered OGG loops. */
(function(){
'use strict';
var THEMES=['freshwater_planted','amazon','african_lake','asian_wetland',
 'alpine_lake','east_asia','tropical','seagrass','harbor','open_ocean',
 'moonlight','polar_ice'];
var root='./assets/ambience/',context=null,output=null,decoded={},
 loading={},failed={},active={surface:null,underwater:null};
var requested={zone:0,submerged:false,enabled:false};
var mainGain=.42,readyToPlay=false;

function getContext(){
 if(context)return context;
 var Native=window.AudioContext||window.webkitAudioContext;
 if(!Native)return null;
 try{context=new Native();}catch(e){return null;}
 output=context.createGain();
 output.gain.value=mainGain;
 output.connect(context.destination);
 return context;
}
function zoneNumber(z){
 z=Number(z);
 return Number.isFinite(z)?Math.max(0,Math.min(11,Math.floor(z))):0;
}
function load(name){
 if(decoded[name])return Promise.resolve(decoded[name]);
 if(loading[name])return loading[name];
 if(failed[name])return Promise.resolve(null);
 var ac=getContext();
 if(!ac)return Promise.resolve(null);
 loading[name]=fetch(root+name+'.ogg',{cache:'force-cache'})
  .then(function(response){
   if(!response.ok)throw Error('Ambient file '+name+': '+response.status);
   return response.arrayBuffer();
  })
  .then(function(bytes){return ac.decodeAudioData(bytes)})
  .then(function(buffer){
   decoded[name]=buffer;
   sync();
   return buffer;
  }).catch(function(e){
   failed[name]=true;
   if(window.console&&window.console.warn)
    window.console.warn('Human Fishing ambient unavailable:',name,e.message);
   return null;
  });
 return loading[name];
}
function prime(zone){
 var z=zoneNumber(zone);
 return Promise.all([load(THEMES[z]),load('underwater')]);
}
function makeTrack(name,kind){
 var ac=getContext(),buffer=decoded[name];
 if(!ac||!buffer)return null;
 var source=ac.createBufferSource();
 source.buffer=buffer;source.loop=true;
 var filter=ac.createBiquadFilter();
 filter.type='lowpass';
 filter.frequency.value=kind==='underwater'?580:10500;
 if(filter.Q)filter.Q.value=.55;
 var gain=ac.createGain();
 gain.gain.value=0;
 source.connect(filter);
 filter.connect(gain);
 gain.connect(output);
 source.start(0);
 return {name:name,kind:kind,source:source,filter:filter,gain:gain,level:0};
}
function ramp(track,target,seconds){
 if(!track||track.level===target)return;
 var now=context.currentTime,param=track.gain.gain;
 param.cancelScheduledValues(now);
 param.setValueAtTime(param.value,now);
 param.linearRampToValueAtTime(target,now+seconds);
 track.level=target;
}
function remove(track){
 if(!track)return;
 ramp(track,0,.82);
 try{track.source.stop(context.currentTime+.92);}catch(e){}
}
function sync(){
 if(!context||context.state==='suspended'||!readyToPlay)return;
 var next=THEMES[requested.zone],sub=requested.submerged,enabled=requested.enabled;
 if(!active.surface||active.surface.name!==next){
  if(decoded[next]){
   remove(active.surface);
   active.surface=makeTrack(next,'surface');
  }
 }
 if(!active.underwater&&decoded.underwater)
  active.underwater=makeTrack('underwater','underwater');
 // Keep both buses active with quiet loops; only their volume and filters
 // change. The water crossing never stops/restarts the ambience abruptly.
 if(active.surface){
  var hz=active.surface.filter.frequency,now=context.currentTime;
  hz.cancelScheduledValues(now);
  hz.setValueAtTime(hz.value,now);
  hz.linearRampToValueAtTime(sub?380:10500,now+(sub?.75:1.05));
  ramp(active.surface,enabled&&!sub?.62:0,sub?.83:1.12);
 }
 if(active.underwater)
  ramp(active.underwater,enabled&&sub?.73:0,sub?.95:1.15);
}
function update(zone,submerged,enabled){
 var z=zoneNumber(zone),changed=z!==requested.zone||
  !!submerged!==requested.submerged||!!enabled!==requested.enabled;
 requested={zone:z,submerged:!!submerged,enabled:!!enabled};
 if(changed){
  prime(z);
  sync();
 }
 // Allows ambient playback to recover if decoding finishes after input
 // or browser initially suspended audio. No new track per frame.
 if(readyToPlay)sync();
}
function unlock(){
 var ac=getContext();
 if(!ac)return;
 function ready(){readyToPlay=true;sync();}
 if(ac.state==='suspended')ac.resume().then(ready).catch(function(){});
 else ready();
}
function setVolume(v){
 mainGain=Math.max(0,Math.min(.8,Number(v)||0));
 if(output)output.gain.value=mainGain;
}
function getState(){
 return{zone:requested.zone,theme:THEMES[requested.zone],
  underwater:requested.submerged,enabled:requested.enabled,
  loaded:Object.keys(decoded).length,totalThemes:THEMES.length,
  surface:active.surface&&active.surface.name,
  underwaterPlaying:!!active.underwater,
  surfaceGain:active.surface&&active.surface.level,
  waterGain:active.underwater&&active.underwater.level,
  volume:mainGain};
}
document.addEventListener('pointerdown',unlock,{passive:true,capture:true});
document.addEventListener('keydown',unlock,{capture:true});
document.addEventListener('visibilitychange',function(){
 if(document.visibilityState==='hidden'){
  requested.enabled=false;
  sync();
 }else if(readyToPlay)sync();
});
window.HumanFishingAmbient={
 update:update,prime:prime,unlock:unlock,setVolume:setVolume,getState:getState
};
// The common diver mix and initial forest are decoded during art loading.
prime(0);
})();