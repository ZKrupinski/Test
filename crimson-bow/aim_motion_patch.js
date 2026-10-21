/* 열혈강호 – 궁 | 자유 조준 + 실시간 적 이동 패치
 * 적용 대상: 독립 v2.3 사운드 플레이테스트.
 * 원본 게임 <script> 뒤에 독립 <script>로 삽입한다.
 * 정식 chatgpt.site 사이트 v42의 원본에 대한 적용은 검증되지 않았다.
 */
(function CrimsonBowFreeAimLivingEnemies(){
  'use strict';
  const VERSION='cb-aim-motion-v3';
  if(window.__CRIMSON_AIM_MOTION_V3__)return;
  if(typeof game==='undefined'||typeof C==='undefined'||typeof origin==='undefined'||
     typeof reset!=='function'||typeof update!=='function'||typeof arrowShot!=='function'||
     typeof touchXY!=='function'||!Array.isArray(game.enemies)||!Array.isArray(game.platforms)){
    console.error('[CrimsonBow] 원본 인터페이스 불일치. 변경을 적용하지 않았습니다.');
    return;
  }
  const original={reset,update,arrowShot};
  const state={time:0,level:game.level,freeze:false,pointer:null,enemyPointer:null,primed:false,stamp:''};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const busy=()=>!!(game.projectiles&&game.projectiles.length>0)||game.hitStop>0;
  const tier=e=>{
    const n=String(e.rank||e.tier||'').toLowerCase();
    return /boss|보스/.test(n)?'boss':/elite|정예/.test(n)?'elite':
           e.kind===2?'boss':e.kind===1?'elite':'normal';
  };
  const platformOf=e=>game.platforms.find(p=>e.x>=p.x&&e.x<=p.x+p.w&&Math.abs(p.y-e.foot)<=36);
  function initEnemy(e){
    const p=platformOf(e);
    return e._crimsonMotion={x:e.x,foot:e.foot,platform:p,tier:tier(e),
      phase:(Number(e.id)||0)*1.618+.3,born:state.time};
  }
  function difficulty(){
    return clamp(.72+Math.max(0,game.level-1)*.12+Math.max(0,game.turn-1)*.035,.72,1.85);
  }
  function animate(dt){
    state.time+=dt;
    const d=difficulty();
    for(const e of game.enemies){
      if(!e.live||e.falling)continue;
      const m=e._crimsonMotion||initEnemy(e);
      if(m.platform&&!game.platforms.includes(m.platform))continue;
      const t=state.time-m.born,ph=m.phase;
      let dx=0,dy=0;
      if(m.tier==='normal'){
        dx=(17+14*d)*Math.sin(t*(.67+.13*d)+ph);
      }else if(m.tier==='elite'){
        dx=(24+17*d)*Math.sin(t*(.72+.13*d)+ph);
        dy=-Math.pow(Math.max(0,Math.sin(t*(1.2+.14*d)+ph)),2)*(16+10*d);
      }else{
        dx=(39+27*d)*Math.sin(t*(.89+.12*d)+ph)+9*Math.sin(t*1.63+ph);
        dy=-(15+22*d)*Math.pow(Math.max(0,Math.sin(t*(.76+.1*d)+ph)),2);
      }
      const lo=m.platform?m.platform.x+27:origin.x+140;
      const hi=m.platform?m.platform.x+m.platform.w-27:W-45;
      e.x=clamp(m.x+dx,Math.min(lo,hi),Math.max(lo,hi));
      e.foot=m.foot+dy;
    }
  }
  let badge=null,fire=null;
  function show(){
    if(!badge||!fire)return;
    const degrees=Math.round((game.aimAngle||0)*180/Math.PI);
    const power=Math.round(clamp(((game.aimSpeed||680)-680)/430,0,1)*100);
    const status=state.freeze?'화살 비행 · 적 이동 정지':
       state.pointer!==null?'조준 중':state.primed?'발사 준비':'적 이동 중';
    const html=status+'<br>각도 '+degrees+'° · 장력 '+power+'%';
    if(html!==state.stamp){badge.innerHTML=html;state.stamp=html;}
    fire.disabled=!game.started||state.freeze;
  }
  function clearAiming(){
    state.pointer=null;state.enemyPointer=null;state.primed=false;
    game.isAiming=false;
    if(typeof audio!=='undefined'&&audio.setAim)audio.setAim(false);
  }
  function resetState(){
    state.time=0;state.level=game.level;state.freeze=false;
    clearAiming();
    for(const e of game.enemies)initEnemy(e);
    show();
  }
  reset=function(...args){
    const val=original.reset.apply(this,args);
    resetState();
    return val;
  };
  update=function(dt){
    const stop=game.hitStop>0;
    const val=original.update.call(this,dt);
    if(game.level!==state.level)resetState();
    if(state.freeze&&!busy())state.freeze=false;
    if(game.started&&!state.freeze&&!stop&&!busy())animate(dt);
    show();
    return val;
  };
  arrowShot=function(...args){
    if(!game.started||(state.freeze&&busy()))return;
    const n=(game.projectiles||[]).length;
    const val=original.arrowShot.apply(this,args);
    if((game.projectiles||[]).length>n){
      state.freeze=true;
      state.primed=false;
      if(typeof audio!=='undefined'&&audio.setAim)audio.setAim(false);
    }
    show();
    return val;
  };
  const shell=document.getElementById('shell')||C.parentElement;
  if(!shell){
    reset=original.reset;update=original.update;arrowShot=original.arrowShot;
    console.error('[CrimsonBow] shell/container 불일치. 롤백했습니다.');
    return;
  }
  const css=document.createElement('style');
  css.textContent=(
    '.cb-aim-widget{position:absolute;right:16px;bottom:18px;z-index:30;display:flex;'+
    'align-items:center;gap:9px;pointer-events:none;font-family:system-ui,sans-serif}'+
    '.cb-aim-readout{font-size:12px;line-height:1.5;background:#111823eb;color:#ffe6bd;'+
    'padding:8px 12px;border:1px solid #ca9a65;border-radius:8px;text-align:right;'+
    'text-shadow:0 1px #000}'+
    '.cb-aim-fire{pointer-events:auto;touch-action:manipulation;min-width:74px;min-height:74px;'+
    'border-radius:50%;border:2px solid #ffe3b0;background:radial-gradient(circle at 30% 20%,#eda553,#9c3d25 78%);'+
    'color:#fff3dc;font-weight:900;font-size:16px;box-shadow:0 0 0 4px #3e2d24b0,0 7px 20px #0009}'+
    '.cb-aim-fire:disabled{opacity:.55}'+
    '@media(max-width:760px){.cb-aim-widget{right:6px;bottom:5px;gap:6px}'+
    '.cb-aim-fire{min-width:54px;min-height:54px;font-size:12px}'+
    '.cb-aim-readout{font-size:9px;padding:5px 6px}}'
  );
  document.head.appendChild(css);
  const ui=document.createElement('div');ui.className='cb-aim-widget';
  badge=document.createElement('div');badge.className='cb-aim-readout';
  fire=document.createElement('button');fire.className='cb-aim-fire';fire.type='button';
  fire.textContent='발사';fire.setAttribute('aria-label','화살 발사');
  ui.append(badge,fire);shell.appendChild(ui);
  function point(ev){return touchXY(ev);}
  function isEnemy(p){
    return game.enemies.some(e=>e.live&&Math.abs(p.x-e.x)<74&&p.y>e.foot-170&&p.y<e.foot+35);
  }
  function aim(ev){
    const p=point(ev),dx=p.x-origin.x,dy=origin.y-p.y;
    game.aimAngle=clamp(Math.atan2(dy,Math.max(16,dx)),.06,1.42);
    game.aimSpeed=clamp(680+Math.hypot(dx,dy)*.57,680,1110);
    game.isAiming=true;state.primed=true;show();
  }
  C.addEventListener('pointerdown',ev=>{
    if(!game.started||state.freeze)return;
    if(isEnemy(point(ev))){state.enemyPointer=ev.pointerId;return;}
    ev.preventDefault();ev.stopImmediatePropagation();
    state.pointer=ev.pointerId;
    try{C.setPointerCapture(ev.pointerId);}catch(_){}
    if(typeof audio!=='undefined'&&audio.s)audio.s('bow_draw',.43);
    if(typeof audio!=='undefined'&&audio.setAim)audio.setAim(true);
    aim(ev);
  },true);
  C.addEventListener('pointermove',ev=>{
    if(ev.pointerId!==state.pointer)return;
    ev.preventDefault();ev.stopImmediatePropagation();aim(ev);
  },true);
  function end(ev){
    if(ev.pointerId===state.enemyPointer){state.enemyPointer=null;return;}
    if(ev.pointerId!==state.pointer)return;
    ev.preventDefault();ev.stopImmediatePropagation();
    if(ev.type==='pointerup')aim(ev);
    state.pointer=null;
    if(typeof audio!=='undefined'&&audio.setAim)audio.setAim(false);
    if(ev.type==='pointercancel'){state.primed=false;game.isAiming=false;}
    show();
  }
  C.addEventListener('pointerup',end,true);
  C.addEventListener('pointercancel',end,true);
  fire.addEventListener('click',ev=>{
    ev.stopPropagation();
    if(!game.started||state.freeze)return;
    arrowShot(game.aimAngle,game.aimSpeed);
  });
  document.addEventListener('keydown',ev=>{
    if(ev.key==='Escape'&&game.started&&state.primed){clearAiming();show();}
  });
  resetState();
  window.__CRIMSON_AIM_MOTION_V3__=Object.freeze({version:VERSION,state,difficulty,resetState});
  console.info('[CrimsonBow] Free aim + living enemies ready (standalone v2.3 only).');
})();