/* HUMAN FISHING: small cheering companion octopuses.
 * Uses the ACTUAL approved transparent sprite-sheet frames, never artificial
 * wiggle/scale/rotation effects. Walking/swimming sheet is excluded.
 * Red source: 8 action rows x 12 columns (1254x1254).
 * Integer-pixel frame extraction + 3px transparent gutters prevent frame bleed.
 * All actions share the exact same visible foot baseline (y=242).
 * Purple source: 7 atlases of 4x4 frames (640x640).
 */
(function(){
 'use strict';
 var BASE='./assets/octopus/';
 var ATLAS=BASE+'atlases/';
 var ACTIONS=['idle','bait','open','eat','chew','fail','celebrate'];
 var RED_ROWS={idle:0,bait:2,open:3,eat:4,chew:5,fail:6,celebrate:7};
 var friends=[
  {name:'보라 문어',kind:'purple',x:112,y:132,w:124,h:124,footY:242,seed:17},
  {name:'빨간 문어',kind:'red',x:210,y:108,w:100,h:150,footY:242,seed:71}
 ];
 var portraits={},purple={},red=null;
 // Cut tiles on whole source pixels, not fractional canvas sampling.
 // Every frame gets its own 3px transparent gutter and a consistent foot line.
 function packAtlas(img,columns,rows){
  var w=img.naturalWidth,h=img.naturalHeight;
  if(!w||!h||typeof document==='undefined')return null;
  var baseW=Math.ceil(w/columns),baseH=Math.ceil(h/rows),pad=3;
  var anchor=Math.round(baseH*.92),tiles=[],minFoot=baseH;
  var source=document.createElement('canvas');source.width=w;source.height=h;
  var sc=source.getContext('2d',{willReadFrequently:true});
  if(!sc)return null;
  sc.drawImage(img,0,0);
  for(var r=0;r<rows;r++)for(var c=0;c<columns;c++){
   var x0=Math.round(c*w/columns),x1=Math.round((c+1)*w/columns);
   var y0=Math.round(r*h/rows),y1=Math.round((r+1)*h/rows);
   var sw=x1-x0,sh=y1-y0,data=sc.getImageData(x0,y0,sw,sh);
   var foot=-1,required=Math.max(3,Math.ceil(sw*.027));
   for(var y=sh-1;y>=0;y--){
    var solid=0;
    for(var x=0;x<sw;x++){
     if(data.data[(y*sw+x)*4+3]>64)solid++;
     if(solid>=required)break;
    }
    if(solid>=required){foot=y;break}
   }
   if(foot<0)foot=Math.round(sh*.83);
   minFoot=Math.min(minFoot,foot);
   tiles.push({data:data,foot:foot,col:c,row:r});
  }
  var unitW=baseW+pad*2,unitH=baseH+(anchor-minFoot)+pad*2;
  var atlas=document.createElement('canvas');
  atlas.width=unitW*columns;atlas.height=unitH*rows;
  var ac=atlas.getContext('2d');
  if(!ac)return null;
  tiles.forEach(function(tile){
   // putImageData copies pixels exactly without blending neighbor cells.
   // The extra transparent height retains every bottom pixel after alignment.
   ac.putImageData(tile.data,tile.col*unitW+pad,
     tile.row*unitH+pad+anchor-tile.foot);
  });
  source.width=1;source.height=1;
  return {image:atlas,cols:columns,rows:rows,unitW:unitW,unitH:unitH,
   pad:pad,anchor:anchor,baseW:w/columns,baseH:h/rows};
 }
 function load(url,columns,rows){
  var img=new Image();
  img.decoding='async';
  img.onload=function(){
   img.ready=true;
   if(columns&&rows){
    try{img.packed=packAtlas(img,columns,rows)}
    catch(error){img.packed=null;console.warn('Octopus atlas fallback',error)}
   }
  };
  img.onerror=function(){img.ready=false};
  img.ready=false;img.src=url;
  return img;
 }

 // Companions retain their original seven purple and eight-row red atlases.
 // New 16-frame hero artwork is intentionally NOT routed through this module.
 var ALIAS={idle_alt:'idle',excited:'open',toss:'bait',gorge:'eat',
   snack:'chew',victory:'celebrate',fail_alt:'fail',swim:'celebrate'};
 var RED_ACTION={idle_alt:'idle',excited:'open',toss:'bait',gorge:'eat',
   snack:'chew',victory:'celebrate',fail_alt:'fail',swim:'swim'};
 RED_ROWS.swim=1;
 var assetsVersion='v=20261105-sidekicks-restore';
 ACTIONS.forEach(function(name){purple[name]=load(ATLAS+'purple_'+name+'.webp?'+assetsVersion,4,4)});
 red=load(ATLAS+'red_all.webp?'+assetsVersion,12,8);
 var passive={lure:false,near:false,hook:false,fever:false,casting:false,view:'fish'};
 friends.forEach(function(f){
  portraits[f.kind]=load(BASE+f.kind+'_companion.webp');
  f.randomSeed=f.seed>>>0;
  f.bags={};f.last={};f.current=null;f.seg=null;f.seq=null;
  f.seqStart=-1;f.seqEnd=-1;f.idleEnd=0;f.lastNear=-100;
  f.priority=0;f.state='idle';f.debugAction='idle';f.debugFrame=0;
 });
 function rnd(f){
  f.randomSeed=(Math.imul(f.randomSeed,1664525)+1013904223)>>>0;
  return f.randomSeed/4294967296;
 }
 // Every action in a category plays before repeats; consecutive duplicate
 // actions are avoided even at a shuffle-bag boundary.
 function take(f,kind,items){
  var bag=f.bags[kind];
  if(!bag||!bag.length){
   bag=items.slice();
   for(var i=bag.length-1;i>0;i--){
    var j=Math.floor(rnd(f)*(i+1)),tmp=bag[i];bag[i]=bag[j];bag[j]=tmp;
   }
   if(bag.length>1&&bag[bag.length-1]===f.last[kind]){
    var swap=bag[0];bag[0]=bag[bag.length-1];bag[bag.length-1]=swap;
   }
   f.bags[kind]=bag;
  }
  var choice=bag.pop();f.last[kind]=choice;return choice;
 }
 function chooseEnding(f){
  return take(f,'success',['victory','celebrate','toss','excited']);
 }
 function chooseEat(f){
  return take(f,'eat',['gorge','eat']);
 }
 function chooseChew(f){
  return take(f,'chew',['snack','chew']);
 }
 function begin(f,state,steps,now,priority){
  f.state=state;f.seq=steps;f.seqStart=now;f.priority=priority;
  f.seqEnd=now+steps.reduce(function(sum,x){return sum+x.seconds},0);
 }
 function stepsOf(f,type,detail){
  // First launch: travel with the protagonist instead of popping in place.
  // Purple 'swim' maps to its original cheerful action; red uses its
  // existing swimming row, no character artwork is changed.
  if(type==='entrance')return [{name:'swim',seconds:1.78},
   {name:'idle_alt',seconds:.30}];
  if(type==='cast')return [{name:take(f,'cast',['toss','bait']),seconds:1.28}];
  if(type==='bite')return [{name:take(f,'surprise',['excited','open']),seconds:.62},
    {name:'open',seconds:.56}];
  if(type==='near')return [{name:take(f,'near',['excited','open']),seconds:.76}];
  if(type==='miss')return [{name:'fail',seconds:.85}];
  if(type==='fail')return [{name:'excited',seconds:.35},
    {name:take(f,'fail',['fail_alt','fail']),seconds:1.4}];
  if(type==='fever')return [{name:'swim',seconds:.78},
    {name:'excited',seconds:.65},{name:chooseEnding(f),seconds:.88}];
  if(type==='catch')return [
   {name:'open',seconds:.50},
   {name:chooseEat(f),seconds:.89},
   {name:chooseChew(f),seconds:.75},
   {name:detail&&detail.rare?'victory':chooseEnding(f),seconds:.82}
  ];
  return [];
 }
 function signal(type,now,detail){
  if(!Number.isFinite(now))return;
  var priority={entrance:9,cast:2,near:1,bite:4,miss:4,fever:6,catch:7,fail:8}[type]||1;
  friends.forEach(function(f,i){
   // The two companions are offset by a few frames instead of being clones.
   if(f.seq&&now<f.seqEnd&&priority<f.priority)return;
   if(type==='near'&&now-f.lastNear<4.2)return;
   if(type==='near')f.lastNear=now;
   var steps=stepsOf(f,type,detail);
   if(steps.length)begin(f,type,steps,now+i*.055,priority);
  });
 }
 function observe(s,now){
  if(!s||!Number.isFinite(now))return;
  var next={
   lure:!!s.lure,near:!!s.near,hook:!!s.hook,fever:!!s.fever,
   casting:!!s.casting,view:s.view||'fish'
  };
  if(next.view==='fish'){
   if(next.fever&&!passive.fever)signal('fever',now);
   else if(next.hook&&!passive.hook)signal('bite',now);
   else if(next.casting&&!passive.casting)signal('cast',now);
   else if(next.near&&!passive.near&&!next.hook)signal('near',now);
  }
  passive=next;
 }
 function idleSteps(f,now){
  var mode='idle',list;
  if(passive.view!=='fish'){list=['idle','idle_alt','bait'];mode='idle'}
  else if(passive.lure){list=['bait','toss','bait'];mode='lure'}
  else if(passive.near){list=['idle','excited','open'];mode='watch'}
  else{list=['idle','idle_alt','bait'];mode='idle'}
  var picked=take(f,mode,list);
  // Do not use the special reaction sequences as idle.
  begin(f,mode,[{name:picked,seconds:1.25+rnd(f)*.65}],now,0);
 }
 function segmentAt(f,now){
  if(!f.seq||now>=f.seqEnd){
   idleSteps(f,now);
  }
  var elapsed=Math.max(0,now-f.seqStart);
  for(var i=0;i<f.seq.length;i++){
   var x=f.seq[i];
   if(elapsed<x.seconds||i===f.seq.length-1){
    return{name:x.name,progress:Math.max(0,Math.min(.999,elapsed/x.seconds)),
      special:f.priority>0,state:f.state};
   }
   elapsed-=x.seconds;
  }
  return{name:'idle',progress:0,special:false,state:'idle'};
 }
 function resolveImage(f,action){
  if(f.kind==='red')return {image:red,actual:RED_ACTION[action]||action};
  var alias=ALIAS[action]||action;
  return{image:purple[alias],actual:alias};
 }
 function renderTile(ctx,f,action,frame){
  var found=resolveImage(f,action),image=found.image,actual=found.actual;
  if(!image||!image.ready){
   image=f.kind==='red'?red:purple.idle;actual='idle';frame=0;
  }
  if(image&&image.ready){
   var p=image.packed;
   if(p){
    var sx=(f.kind==='red'?frame:frame%4)*p.unitW;
    var row=f.kind==='red'?RED_ROWS[actual]:Math.floor(frame/4);
    var sy=row*p.unitH;
    var scaleX=f.w/p.baseW,scaleY=f.h/p.baseH;
    ctx.drawImage(p.image,sx,sy,p.unitW,p.unitH,
      f.x-p.pad*scaleX,f.footY-(p.pad+p.anchor)*scaleY,
      p.unitW*scaleX,p.unitH*scaleY);
   }else if(f.kind==='purple'){
    var cw=image.naturalWidth/4,ch=image.naturalHeight/4;
    ctx.drawImage(image,(frame%4)*cw,Math.floor(frame/4)*ch,cw,ch,f.x,f.y,f.w,f.h);
   }else{
    var rw=image.naturalWidth/12,rh=image.naturalHeight/8;
    ctx.drawImage(image,frame*rw,(RED_ROWS[actual]||0)*rh,rw,rh,f.x,f.y,f.w,f.h);
   }
  }else{
   var photo=portraits[f.kind];
   if(photo&&photo.ready)ctx.drawImage(photo,f.x,f.y,f.w,f.h);
  }
  f.debugActual=actual;f.debugSource=image&&image.ready?'sprite':'portrait';
 }
 function draw(ctx,now){
  friends.forEach(function(f){
   var current=segmentAt(f,now),count=f.kind==='red'?12:16;
   var frame=Math.min(count-1,Math.floor(current.progress*count));
   // Actual frame number, never a CSS transform of a still portrait.
   renderTile(ctx,f,current.name,frame);
   f.debugAction=current.name;f.debugFrame=frame;
   f.debugSpecial=current.special;f.debugState=current.state;
  });
 }
 window.drawOctopusSidekicks=draw;
 window.octoSidekicksSignal=signal;
 window.octoSidekicksObserve=observe;
 // Backwards compatibility with older released HTML.
 window.octoSidekicksEat=function(now){signal('catch',now)};
 window.octoSidekicksCatch=function(now,detail){signal('catch',now,detail)};
 window.octoSidekicksFail=function(now){signal('fail',now)};
 window.octoSidekicksInfo=function(){return friends.map(function(f){
  return {name:f.name,kind:f.kind,x:f.x,y:f.y,w:f.w,h:f.h,
   state:f.debugState,action:f.debugAction,frame:f.debugFrame,
   actual:f.debugActual,source:f.debugSource,
   reacting:!!f.debugSpecial,
   atlasReady:f.kind==='red'?!!(red&&red.ready):
      ACTIONS.filter(function(a){return purple[a]&&purple[a].ready}).length,
   extraReady:0,
   atlasTotal:f.kind==='red'?1:7};
 })};
})();
