/* 열혈강호 – 궁 | Work→Chat continuity: Free Aim & Living Enemies patch v2
 * Supported source: independent v2.3 sound playtest (not the published v42 site).
 * Load immediately AFTER the source game's inline <script>, before </body>.
 * Original headshot / skills / destructible terrain / SFX routines are untouched.
 */
(function installCrimsonBowMotionV2() {
  'use strict';
  const MARK = 'CrimsonBowMotionV2';
  if (window[MARK]) return; // no double listeners on accidental second include
  if (typeof game === 'undefined' || typeof C === 'undefined' ||
      typeof reset !== 'function' || typeof update !== 'function' ||
      typeof arrowShot !== 'function' || typeof touchXY !== 'function' ||
      typeof origin === 'undefined' || !game.enemies || !game.platforms) {
    console.error('[CrimsonBowMotionV2] Unsupported game API; original game left intact.');
    return;
  }

  const base = { reset, update, arrowShot };
  const clampTo = (v, min, max) => Math.max(min, Math.min(max, v));
  const motion = {
    clock: 0, level: game.level, pointer: null, enemyPointer: null,
    freeze: false, freezeAt: 0, primed: false, moved: false,
    lastBadge: '', initialized: true
  };
  const isBusy = () => (game.projectiles || []).length > 0 || game.hitStop > 0;
  const rankOf = e => {
    const name = String(e.rank || e.tier || '').toLowerCase();
    if (/boss|보스/.test(name)) return 'boss';
    if (/elite|정예/.test(name)) return 'elite';
    // v2.3's kind fields denote demo tiers; the original game has no real tier property.
    return e.kind === 2 ? 'boss' : e.kind === 1 ? 'elite' : 'normal';
  };
  const supportOf = (e) => (game.platforms || []).find(p =>
    p.x <= e.x && e.x <= p.x + p.w && Math.abs(p.y - e.foot) <= 36);

  function beginEnemy(e) {
    const support = supportOf(e);
    e._cbm2 = { x: e.x, foot: e.foot, tier: rankOf(e),
      phase: (Number(e.id) || 0) * 1.618 + .3, support,
      bornAt: motion.clock };
    return e._cbm2;
  }
  function resetMotion() {
    motion.clock = 0;
    motion.level = game.level;
    motion.pointer = null;
    motion.enemyPointer = null;
    motion.freeze = false;
    motion.freezeAt = 0;
    motion.primed = false;
    motion.moved = false;
    (game.enemies || []).forEach(e => beginEnemy(e));
    if (typeof audio !== 'undefined' && audio.setAim) audio.setAim(false);
    showAim();
  }
  function difficulty() {
    return clampTo(.72 + Math.max(0, game.level - 1) * .12 +
      Math.max(0, game.turn - 1) * .035, .72, 1.85);
  }
  function moveEnemies(dt) {
    const d = difficulty();
    motion.clock += dt;
    for (const e of game.enemies || []) {
      if (!e.live || e.falling) continue;
      const m = e._cbm2 || beginEnemy(e);
      let deltaX = 0, deltaY = 0;
      const t = motion.clock - m.bornAt, p = m.phase;
      if (m.tier === 'normal') {
        // Small, legible patrol with a predictably repeated reversal.
        deltaX = (17 + 14 * d) * Math.sin(t * (.67 + .13 * d) + p);
      } else if (m.tier === 'elite') {
        // Wider patrol plus a squat, discrete hopping arc.
        deltaX = (24 + 17 * d) * Math.sin(t * (.72 + .13 * d) + p);
        deltaY = -Math.pow(Math.max(0, Math.sin(t * (1.2 + .14 * d) + p)), 2) * (16 + 10 * d);
      } else {
        // Floating wuxia step: broad side-to-side traversal + capped air phase.
        deltaX = (39 + 27 * d) * Math.sin(t * (.89 + .12 * d) + p) + 9 * Math.sin(t * 1.63 + p);
        deltaY = -(15 + 22 * d) * Math.pow(Math.max(0, Math.sin(t * (.76 + .1 * d) + p)), 2);
      }
      if (m.support && !game.platforms.includes(m.support)) {
        // Destructible support removed: never resurrect, relocate or hover the enemy.
        // Let existing collapse/falling logic own its body until the stage resets.
        continue;
      }
      const left = m.support ? m.support.x + 27 : origin.x + 140;
      const right = m.support ? m.support.x + m.support.w - 27 : W - 45;
      const lo = Math.min(left, right), hi = Math.max(left, right);
      e.x = clampTo(m.x + deltaX, lo, hi);
      e.foot = m.foot + deltaY;
    }
  }

  // Patch existing lexical bindings so the original main loop/skills keep running.
  reset = function (...args) {
    const value = base.reset.apply(this, args);
    resetMotion();
    return value;
  };
  update = function (dt) {
    // Keep the original collision/physics timing. During arrow travel enemies stay still.
    const priorStop = game.hitStop > 0;
    const value = base.update.call(this, dt);
    if (game.level !== motion.level) resetMotion();
    if (motion.freeze && !isBusy()) motion.freeze = false;
    if (game.started && !motion.freeze && !priorStop && !isBusy()) moveEnemies(dt);
    showAim();
    return value;
  };
  arrowShot = function (...args) {
    if (!game.started || (motion.freeze && isBusy())) return;
    const before = (game.projectiles || []).length;
    const value = base.arrowShot.apply(this, args);
    if ((game.projectiles || []).length > before) {
      motion.freeze = true;
      motion.freezeAt = performance.now();
      motion.primed = false;
      if (typeof audio !== 'undefined' && audio.setAim) audio.setAim(false);
    }
    showAim();
    return value;
  };

  const shell = document.getElementById('shell') || C.parentElement;
  if (!shell) {
    console.error('[CrimsonBowMotionV2] Missing canvas parent; restoring original functions.');
    reset = base.reset; update = base.update; arrowShot = base.arrowShot;
    return;
  }
  const style = document.createElement('style');
  style.textContent = `
    .cbm2-controls {position:absolute;bottom:18px;right:18px;z-index:10;display:flex;align-items:center;gap:10px;pointer-events:none;font-family:system-ui,sans-serif}
    .cbm2-aim {font-size:12px;line-height:1.5;padding:8px 12px;border:1px solid #cda46a;border-radius:8px;background:#141922e8;color:#ffe4ad;text-align:right;text-shadow:0 1px 2px #000;box-shadow:0 6px 16px #000a}
    .cbm2-fire {pointer-events:auto;touch-action:manipulation;min-width:78px;min-height:78px;padding:12px;border:2px solid #ffe0a0;border-radius:50%;background:radial-gradient(circle at 30% 20%,#efa85a,#a74725 75%);font-size:16px;font-weight:900;color:#fff4d6;text-shadow:0 2px 3px #3f180c;box-shadow:0 0 0 4px #3d2a20b8,0 7px 20px #000a}
    .cbm2-fire:active {transform:scale(.95)}.cbm2-fire:disabled {opacity:.55;cursor:default}
    @media(max-width:760px){.cbm2-controls{right:7px;bottom:6px;gap:6px}.cbm2-aim{font-size:9px;padding:5px 6px}.cbm2-fire{min-width:54px;min-height:54px;padding:6px;font-size:12px}}
  `;
  document.head.appendChild(style);
  const controls = document.createElement('div'); controls.className = 'cbm2-controls';
  const badge = document.createElement('div'); badge.className = 'cbm2-aim';
  const fire = document.createElement('button');fire.className='cbm2-fire';fire.type='button';
  fire.textContent='발사';fire.setAttribute('aria-label','화살 발사');
  controls.append(badge, fire);shell.appendChild(controls);
  function showAim() {
    if (!badge) return;
    const degrees = Math.round((game.aimAngle || 0) * 180 / Math.PI);
    const power = Math.round(clampTo(((game.aimSpeed || 680) - 680) / 430,0,1) * 100);
    const line = motion.freeze ? '비행 중 · 적 위치 고정' :
      motion.pointer !== null ? '조준 중' : motion.primed ? '발사 준비' : '적 실시간 이동';
    const next = `${line}<br>각도 ${degrees}° · 장력 ${power}%`;
    if (motion.lastBadge !== next) {badge.innerHTML=next;motion.lastBadge=next;}
    fire.disabled = !game.started || motion.freeze;
  }
  function point(e) { return touchXY(e); }
  function onEnemy(p) { return (game.enemies || []).some(e =>
    e.live && Math.abs(p.x-e.x) < 74 && p.y > e.foot - 170 && p.y < e.foot + 35);
  }
  function aimAt(e) {
    const p = point(e), dx = p.x - origin.x, dy = origin.y - p.y;
    game.aimAngle = clampTo(Math.atan2(dy, Math.max(16,dx)), .06, 1.42);
    game.aimSpeed = clampTo(680 + Math.hypot(dx,dy) * .57, 680, 1110);
    motion.primed = true;
    game.isAiming = true; // draws original trajectory with no renderer replacement
    if (motion.pointer !== null && typeof audio !== 'undefined' && audio.setAim) audio.setAim(true);
    showAim();
  }
  C.addEventListener('pointerdown', e => {
    if (!game.started || motion.freeze) return;
    if (onEnemy(point(e))) { motion.enemyPointer = e.pointerId; return; } // legacy tap-to-shoot
    e.preventDefault();e.stopImmediatePropagation();
    motion.pointer=e.pointerId;motion.moved=false;
    try {C.setPointerCapture(e.pointerId);} catch (_) {}
    if (typeof audio !== 'undefined' && audio.s) audio.s('bow_draw',.43);
    aimAt(e);
  },true);
  C.addEventListener('pointermove', e => {
    if (e.pointerId !== motion.pointer) return;
    e.preventDefault();e.stopImmediatePropagation();
    motion.moved = true;aimAt(e);
  },true);
  function endAim(e) {
    if (e.pointerId === motion.enemyPointer) {motion.enemyPointer=null;return;}
    if (e.pointerId !== motion.pointer) return;
    e.preventDefault();e.stopImmediatePropagation();
    if(e.type==='pointerup') aimAt(e);
    motion.pointer=null;
    if (typeof audio !== 'undefined' && audio.setAim) audio.setAim(false);
    if (e.type==='pointercancel') { motion.primed=false;game.isAiming=false; }
    showAim();
  }
  C.addEventListener('pointerup', endAim, true);
  C.addEventListener('pointercancel', endAim, true);
  fire.addEventListener('click', e => {
    e.stopPropagation();
    if (!game.started || motion.freeze) return;
    arrowShot(game.aimAngle, game.aimSpeed);
  });
  // Escape/Clear prevents a lingering draw; original reset button calls patched reset.
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && game.started && motion.primed) {
      motion.primed=false;motion.pointer=null;game.isAiming=false;
      if (typeof audio!=='undefined' && audio.setAim) audio.setAim(false);
      showAim();
    }
  });
  resetMotion();
  window[MARK] = Object.freeze({ controller:motion, difficulty, resetMotion, version:'2.0', supported:'v2.3-playtest' });
  console.info('[CrimsonBowMotionV2] Free aim + living enemies enabled for v2.3 playtest.');
})();