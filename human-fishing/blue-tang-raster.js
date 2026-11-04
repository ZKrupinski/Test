/* HUMAN FISHING — Blue Tang raster animation integration.
   14 actions × eight bitmap frames. Six existing artwork sheets are loaded and
   resized once for mobile; all missing actions are pixel-based pose retargets.
   No generation services or procedural vector fish are used for the Blue Tang.
*/
(function(){
  'use strict';
  var prefix='https://d8j0ntlcm91z4.cloudfront.net/user_3KlCHKRIJO34SPkOC5UMUPo7vEp/';
  var filenames={
    idle:'hf_20261104_100641_3c527397-1343-4e2b-b02f-fb725b4ba0a1.png',
    burst:'hf_20261104_100640_81173288-35ec-4a45-b315-8ab6d65b925d.png',
    uturn:'hf_20261104_100640_c3aabcfa-9b29-4b5d-a631-d9b50a539448.png',
    inspect:'hf_20261104_102226_494fe4f5-7b18-4bd8-9251-58f913f0bfcf.png',
    bite:'hf_20261104_102155_2a21a582-2d75-40aa-8c31-dbf6479ad701.png',
    hooked:'hf_20261104_102227_4da929b1-c5d7-4bd2-8f60-5e0f2917a075.png'
  };
  var sources={idle:'idle',swim:'idle',burst:'burst',uturn:'uturn',
    notice:'idle',inspect:'inspect',graze:'burst',bite:'bite',hooked:'hooked',
    lift:'hooked',last_resist:'hooked',slip:'burst',reentry:'burst',flee:'burst'};
  var ms={idle:132,swim:90,burst:66,uturn:80,notice:115,inspect:112,
    graze:50,bite:60,hooked:72,lift:80,last_resist:55,slip:65,reentry:65,flee:53};
  var nonLoop={uturn:1,notice:1,graze:1,bite:1,lift:1,slip:1,reentry:1};
  var sheets={},status={};
  var loading=false,queue=['idle','inspect','bite','hooked','burst','uturn'];
  var sheetSize=1024,cellW=512,cellH=256;
  function loadNext(){
    if(loading||!queue.length)return;
    var kind=queue.shift(),image=new Image();
    loading=true;status[kind]='loading';
    image.onload=function(){
      // Cache a much smaller bitmap atlas; discard the full-resolution decode.
      // This keeps six 4K source sheets from occupying excessive mobile RAM.
      try{
        var c=document.createElement('canvas');
        c.width=sheetSize;c.height=sheetSize;
        var g=c.getContext('2d',{alpha:true});
        g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
        g.drawImage(image,0,0,sheetSize,sheetSize);
        sheets[kind]=c;status[kind]='ready';
      }catch(e){status[kind]='error'}
      image.onload=null;image.onerror=null;image.src='';
      loading=false;loadNext();
    };
    image.onerror=function(){status[kind]='error';loading=false;loadNext()};
    image.decoding='async';
    image.src=prefix+filenames[kind];
  }
  loadNext();
  function clamp(x,min,max){return Math.max(min,Math.min(max,x))}
  function targetAction(a,now,near){
    if(a.spriteAction&&sources[a.spriteAction])return a.spriteAction;
    if(a.shakeUntil>now)return 'graze';
    if((a.panicUntil||0)>now||a.behavior==='flee')return 'flee';
    if(a.behavior==='hunt'||a.behavior==='fight'||a.swimMode==='dart')return 'burst';
    if(near>0&&near<76)return 'inspect';
    if(near>=76&&near<144)return 'notice';
    if(a.behavior==='hover'||a.swimMode==='hover')return 'idle';
    return 'swim';
  }
  function poseFrame(a,now,action){
    if(Number.isFinite(a.spriteFrame))return clamp(a.spriteFrame|0,0,7);
    if(!Number.isFinite(a._btStart)||a._btAction!==action){
      a._btAction=action;a._btStart=now;
    }
    var n=Math.max(0,Math.floor((now-a._btStart)*1000/ms[action]));
    return nonLoop[action]?Math.min(7,n):(n%8);
  }
  function transform(action,i,now){
    var sine=Math.sin(i*Math.PI/4),cos=Math.cos(i*Math.PI/4);
    switch(action){
      case 'swim':return {rot:sine*.045,x:cos*1.2,y:0,sx:1+sine*.035,sy:1};
      case 'burst':return {rot:sine*.035,x:cos*2,y:0,sx:1+sine*.03,sy:1};
      case 'notice':return {rot:[0,0,.02,.05,.08,.065,.03,0][i],x:0,y:0,sx:1,sy:1};
      case 'graze':return {rot:[0,-.07,-.27,-.40,-.15,.14,.05,0][i],x:[0,-3,-8,-12,-4,3,2,0][i],y:0,sx:[1,1,.94,.90,.96,1,1,1][i],sy:1};
      case 'hooked':return {rot:sine*.20,x:cos*4,y:sine*2,sx:1,sy:1+cos*.035};
      case 'lift':return {rot:[0,.16,.30,.47,.65,.82,1.0,1.14][i],x:0,y:0,sx:1,sy:1};
      case 'last_resist':return {rot:[-.26,.2,.39,-.41,.29,-.13,-.43,.21][i],x:cos*5,y:sine*3,sx:1,sy:1};
      case 'slip':return {rot:[.33,.49,.12,-.36,-.51,-.17,.16,0][i],x:[0,4,8,13,12,7,4,0][i],y:[0,-2,0,4,8,4,1,0][i],sx:1,sy:1};
      case 'reentry':return {rot:[-1.0,-.9,-.77,-.63,-.46,-.27,-.12,0][i],x:0,y:0,sx:1,sy:1};
      case 'flee':return {rot:sine*.07,x:cos*3,y:0,sx:1+sine*.05,sy:1};
      default:return {rot:0,x:0,y:0,sx:1,sy:1};
    }
  }
  function draw(ctx,a,now,alpha,near){
    if(!a||!a.sp||a.sp.name!=='블루탱')return false;
    if(!sheets.idle)return false;
    var action=targetAction(a,now,near||0),direction=(a.vx||0)<0?-1:1;
    if(a._btDirection!==undefined&&direction!==a._btDirection&&!a.spriteAction){
      a._btTurnStart=now;a._btTurnFrom=a._btDirection;
    }
    a._btDirection=direction;
    if(!a.spriteAction&&Number.isFinite(a._btTurnStart)&&now-a._btTurnStart<.64)action='uturn';
    var key=sources[action],sheet=sheets[key];
    if(!sheet){action='swim';sheet=sheets.idle}
    if(!sheet)return false;
    var i=poseFrame(a,now,action),transformInfo=transform(action,i,now);
    var ix=i%2,iy=Math.floor(i/2);
    // The original hooked atlas had cropped poses. Select only two intact
    // rendered poses, then animate its bends, shake and roll with bitmap
    // transforms instead of displaying the damaged crop boundaries.
    if(key==='hooked') {ix=(i%2)?1:1;iy=i%4<2?0:1}
    var sz=.5*(a.size||1),drawW=240*sz,drawH=120*sz;
    ctx.save();
    if(alpha!==undefined)ctx.globalAlpha*=clamp(alpha,0,1);
    var bobY=Math.sin(now*2+(a.phase||0))*Math.min(3,1.8+sz);
    ctx.translate(a.x,a.y+bobY);
    if(a.shakeUntil>now){
      var fade=clamp((a.shakeUntil-now)/.14,0,1),power=(a.shakePower||1.4)*fade;
      ctx.translate(Math.sin(now*63+(a.phase||0))*power,Math.cos(now*83+(a.phase||0))*power*.6);
    }
    var flip=direction<0?-1:1;
    if(action==='uturn'){
      // Source U-turn runs RIGHT → LEFT; invert only for LEFT → RIGHT.
      flip=a._btTurnFrom===-1?-1:1;
    }
    ctx.scale(flip,1);
    ctx.translate(transformInfo.x,transformInfo.y);
    ctx.rotate(transformInfo.rot);
    ctx.scale(transformInfo.sx,transformInfo.sy);
    ctx.drawImage(sheet,ix*cellW,iy*cellH,cellW,cellH,
      -drawW/2,-drawH/2,drawW,drawH);
    ctx.restore();
    return true;
  }
  window.BlueTangSprites={
    draw:draw,
    ready:function(){return !!sheets.idle},
    status:function(){return Object.assign({},status)},
    actions:Object.keys(sources),
    loadedSources:function(){return Object.keys(sheets)}
  };
})();