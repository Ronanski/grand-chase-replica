// Procedural art (original designs, no copyrighted sprites).
import { roundRect } from './core.js';

function limb(ctx, x, y, len, ang, w, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.fillStyle = color;
  roundRect(ctx, -w / 2, 0, w, len, w / 2);
  ctx.fill();
  ctx.restore();
}

export function drawShadow(ctx, x, y, w) {
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(x, y, w, w * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
}

// anim: { state, t, swing (-1..1 progress-based), moveT (0..1), weapon, aim }
export function drawHero(ctx, x, y, face, hero, anim, flash) {
  const c = hero.colors;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face, 1);
  const t = anim.t;
  const run = anim.state === 'run' ? Math.sin(t * 0.35) : 0;
  const air = anim.state === 'jump' || anim.state === 'fall';
  const bob = anim.state === 'run' ? Math.abs(Math.sin(t * 0.35)) * 3 : anim.state === 'idle' ? Math.sin(t * 0.08) * 1.5 : 0;
  const down = anim.state === 'down';
  if (down) {
    ctx.rotate(-Math.PI / 2 * 0.95);
    ctx.translate(-10, 0);
  }
  if (anim.state === 'dash') ctx.rotate(0.25);
  if (anim.state === 'hurt') ctx.rotate(-0.2);

  // legs
  const legA = air ? -0.5 : run * 0.7;
  const legB = air ? 0.3 : -run * 0.7;
  limb(ctx, -6, -26, 26, legA, 10, c.leg);
  limb(ctx, 6, -26, 26, legB, 10, c.leg);

  ctx.translate(0, -bob);
  // back arm
  let armAng = run * -0.6;
  let swingAng = null;
  if (anim.moveT != null) {
    const p = anim.moveT;
    if (anim.swing) {
      const k = Math.min(1, p * 2.2);
      swingAng = anim.swing > 0 ? -2.4 + k * 3.6 : 1.2 - k * 3.6;
      if (anim.swing >= 2) swingAng = -2.6 + k * 4.2;
      if (anim.swing === 3) swingAng = t * 0.6;
    } else {
      swingAng = -Math.PI / 2 + (anim.aimUp || 0);
    }
  }
  limb(ctx, -8, -50, 20, armAng + 0.4, 8, shade(c.body, -30));

  // body
  ctx.fillStyle = c.body;
  roundRect(ctx, -13, -56, 26, 32, 8);
  ctx.fill();
  ctx.fillStyle = c.trim;
  ctx.fillRect(-13, -30, 26, 5);
  if (hero.weapon === 'staff') { // robe
    ctx.fillStyle = c.body;
    ctx.beginPath(); ctx.moveTo(-14, -30); ctx.lineTo(14, -30); ctx.lineTo(18, -8); ctx.lineTo(-18, -8); ctx.closePath(); ctx.fill();
  }
  if (hero.weapon === 'dagger') { // scarf
    ctx.fillStyle = c.trim;
    ctx.beginPath(); ctx.moveTo(-6, -58); ctx.lineTo(-30 - Math.sin(t * 0.3) * 4, -52 + run * 3); ctx.lineTo(-26, -46); ctx.lineTo(-4, -52); ctx.fill();
  }

  // head
  ctx.fillStyle = c.skin;
  ctx.beginPath(); ctx.arc(0, -74, 17, 0, Math.PI * 2); ctx.fill();
  // hair
  ctx.fillStyle = c.hair;
  ctx.beginPath();
  ctx.arc(-1, -78, 18, Math.PI * 0.95, Math.PI * 2.1);
  ctx.lineTo(18, -72);
  ctx.quadraticCurveTo(4, -84, -16, -66);
  ctx.closePath();
  ctx.fill();
  if (hero.weapon === 'bow' || hero.weapon === 'staff') { // ponytail / long hair
    ctx.beginPath(); ctx.moveTo(-14, -80); ctx.quadraticCurveTo(-34, -66 + run * 2, -26, -44); ctx.lineTo(-14, -60); ctx.fill();
  }
  if (hero.weapon === 'staff') { // hat
    ctx.fillStyle = shade(c.body, -20);
    ctx.beginPath(); ctx.moveTo(-24, -86); ctx.lineTo(24, -86); ctx.lineTo(4, -122); ctx.closePath(); ctx.fill();
    ctx.fillStyle = c.trim; ctx.fillRect(-20, -90, 40, 5);
  }
  if (hero.weapon === 'sword') { // headband
    ctx.fillStyle = c.trim; ctx.fillRect(-16, -86, 32, 4);
  }
  if (hero.weapon === 'dagger') { // mask
    ctx.fillStyle = c.trim; ctx.fillRect(-2, -72, 19, 7);
  }
  // eye
  ctx.fillStyle = '#222';
  if (down) ctx.fillRect(7, -76, 6, 2);
  else { ctx.fillRect(8, -79, 4, 7); ctx.fillStyle = '#fff'; ctx.fillRect(9, -78, 2, 2); }

  // front arm + weapon
  const fa = swingAng != null ? swingAng : armAng * -1 + 0.3;
  ctx.save();
  ctx.translate(8, -50);
  ctx.rotate(fa);
  ctx.fillStyle = c.skin;
  roundRect(ctx, -4, 0, 8, 20, 4); ctx.fill();
  ctx.translate(0, 20);
  drawWeapon(ctx, hero.weapon, c, anim);
  ctx.restore();

  ctx.restore();
  if (flash) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(x, y - 55, 24, 50, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
}

function drawWeapon(ctx, w, c, anim) {
  if (w === 'sword') {
    ctx.fillStyle = c.trim; ctx.fillRect(-7, -2, 14, 4);
    ctx.fillStyle = '#dfe6ee';
    ctx.beginPath(); ctx.moveTo(-4, 2); ctx.lineTo(4, 2); ctx.lineTo(3, 50); ctx.lineTo(0, 58); ctx.lineTo(-3, 50); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(-1, 4, 2, 46);
  } else if (w === 'bow') {
    ctx.rotate(-Math.PI / 2);
    ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(-6, 0, 26, -1.2, 1.2); ctx.stroke();
    ctx.strokeStyle = '#eee'; ctx.lineWidth = 1;
    const pull = anim.moveT != null && anim.moveT < 0.4 ? 10 : 0;
    ctx.beginPath(); ctx.moveTo(-6 + Math.cos(-1.2) * 26, Math.sin(-1.2) * 26); ctx.lineTo(-pull - 6, 0); ctx.lineTo(-6 + Math.cos(1.2) * 26, Math.sin(1.2) * 26); ctx.stroke();
  } else if (w === 'staff') {
    ctx.fillStyle = '#6b4423'; ctx.fillRect(-2, -30, 5, 66);
    ctx.fillStyle = c.trim; ctx.beginPath(); ctx.arc(0, 40, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,220,120,.4)'; ctx.beginPath(); ctx.arc(0, 40, 13, 0, Math.PI * 2); ctx.fill();
  } else if (w === 'dagger') {
    ctx.fillStyle = '#333'; ctx.fillRect(-3, -2, 6, 8);
    ctx.fillStyle = '#e8eef5';
    ctx.beginPath(); ctx.moveTo(-3, 6); ctx.lineTo(3, 6); ctx.lineTo(0, 30); ctx.closePath(); ctx.fill();
  }
}

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
}

// ---------------------------------------------------------------- enemies
export function drawEnemy(ctx, e) {
  const d = e.def, c = d.colors, s = d.scale || 1;
  const t = e.t;
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.scale(e.face * s, s);
  if (e.state === 'down') ctx.rotate(-1.4);
  else if (e.state === 'hurt' || e.state === 'air') ctx.rotate(-0.25);
  const wind = e.move && e.move.t < (e.move.def.windup || 0);
  const atk = e.move ? Math.min(1, e.move.t / Math.max(1, e.move.def.windup || 1)) : 0;
  const walk = e.state === 'walk' ? Math.sin(t * 0.25) : 0;
  const look = d.look;
  if (look === 'goblin' || look === 'orc') {
    const big = look === 'orc';
    const W = big ? 1.35 : 1;
    limb(ctx, -7 * W, -22 * W, 22 * W, walk * 0.6, 9 * W, shade(c.skin, -30));
    limb(ctx, 7 * W, -22 * W, 22 * W, -walk * 0.6, 9 * W, shade(c.skin, -30));
    ctx.fillStyle = c.cloth; roundRect(ctx, -15 * W, -48 * W, 30 * W, 30 * W, 8); ctx.fill();
    ctx.fillStyle = c.skin; ctx.beginPath(); ctx.arc(2, -60 * W, 15 * W, 0, Math.PI * 2); ctx.fill();
    // ears
    ctx.beginPath(); ctx.moveTo(-10 * W, -64 * W); ctx.lineTo(-26 * W, -74 * W); ctx.lineTo(-8 * W, -56 * W); ctx.fill();
    ctx.fillStyle = '#ffeb3b'; ctx.fillRect(7 * W, -66 * W, 5 * W, 4 * W);
    if (big) { ctx.fillStyle = '#fff'; ctx.fillRect(4 * W, -52 * W, 3 * W, 5 * W); ctx.fillRect(10 * W, -52 * W, 3 * W, 5 * W); }
    // weapon arm
    ctx.save(); ctx.translate(8 * W, -42 * W);
    let ang = 0.6 + walk * 0.3;
    if (e.move) ang = wind ? -2.2 * atk : 1.4;
    ctx.rotate(ang);
    ctx.fillStyle = c.skin; roundRect(ctx, -4 * W, 0, 8 * W, 18 * W, 4); ctx.fill();
    if (d.bow) {
      ctx.strokeStyle = '#7a4b22'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 22 * W, 16, -2.6, -0.5); ctx.stroke();
    } else if (big) {
      ctx.fillStyle = '#6b4423'; ctx.fillRect(-2, 14 * W, 5, 40 * W);
      ctx.fillStyle = '#aab'; ctx.beginPath(); ctx.moveTo(2, 40 * W); ctx.lineTo(24 * W, 34 * W); ctx.lineTo(24 * W, 58 * W); ctx.lineTo(2, 54 * W); ctx.fill();
    } else {
      ctx.fillStyle = '#8a5a2b'; roundRect(ctx, -4, 14, 9, 30, 4); ctx.fill();
    }
    ctx.restore();
    if (e.def.boss && look === 'goblin') { // crown
      ctx.fillStyle = '#f2c94c'; ctx.beginPath(); ctx.moveTo(-12, -74); ctx.lineTo(-8, -86); ctx.lineTo(-2, -78); ctx.lineTo(4, -90); ctx.lineTo(8, -78); ctx.lineTo(14, -86); ctx.lineTo(16, -74); ctx.fill();
    }
    if (e.def.boss && look === 'orc') {
      ctx.fillStyle = '#c0392b'; ctx.fillRect(-20, -88, 44, 8);
      ctx.fillStyle = '#ddd'; ctx.beginPath(); ctx.moveTo(-16, -84); ctx.lineTo(-30, -104); ctx.lineTo(-10, -88); ctx.fill();
      ctx.beginPath(); ctx.moveTo(18, -84); ctx.lineTo(32, -104); ctx.lineTo(12, -88); ctx.fill();
    }
  } else if (look === 'wolf') {
    const lunge = e.move && !wind ? 0.3 : 0;
    ctx.rotate(-lunge);
    limb(ctx, -18, -18, 18, walk * 0.8, 7, c.dark); limb(ctx, 16, -18, 18, -walk * 0.8, 7, c.dark);
    ctx.fillStyle = c.fur; ctx.beginPath(); ctx.ellipse(0, -24, 30, 13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(28, -34, 13, 10, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(24, -42); ctx.lineTo(28, -54); ctx.lineTo(32, -42); ctx.fill();
    ctx.beginPath(); ctx.moveTo(36, -36); ctx.lineTo(48, -30); ctx.lineTo(36, -26); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-28, -28); ctx.quadraticCurveTo(-44, -40 + walk * 4, -46, -26); ctx.lineTo(-28, -22); ctx.fill();
    ctx.fillStyle = '#ff5252'; ctx.fillRect(30, -38, 4, 3);
  } else if (look === 'harpy') {
    const flap = Math.sin(t * 0.3);
    ctx.fillStyle = c.wing;
    ctx.beginPath(); ctx.moveTo(-4, -40); ctx.quadraticCurveTo(-40, -70 - flap * 20, -50, -30 - flap * 18); ctx.quadraticCurveTo(-26, -34, -4, -26); ctx.fill();
    ctx.fillStyle = c.body; roundRect(ctx, -10, -46, 20, 28, 8); ctx.fill();
    ctx.beginPath(); ctx.arc(2, -56, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = c.wing; ctx.beginPath(); ctx.arc(0, -60, 12, Math.PI, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-10, -60); ctx.lineTo(-24, -50); ctx.lineTo(-8, -52); ctx.fill();
    ctx.fillStyle = '#ffd166'; limb(ctx, -4, -20, 14, 0.3, 5, '#e09f3e'); limb(ctx, 4, -20, 14, -0.3, 5, '#e09f3e');
    ctx.fillStyle = '#222'; ctx.fillRect(6, -59, 3, 4);
    ctx.fillStyle = shade(c.wing, 30);
    ctx.beginPath(); ctx.moveTo(4, -40); ctx.quadraticCurveTo(34, -70 - flap * 20, 44, -30 - flap * 18); ctx.quadraticCurveTo(22, -34, 4, -26); ctx.fill();
    if (d.boss) { ctx.fillStyle = '#f2c94c'; ctx.beginPath(); ctx.moveTo(-8, -70); ctx.lineTo(-4, -80); ctx.lineTo(0, -72); ctx.lineTo(4, -80); ctx.lineTo(8, -70); ctx.fill(); }
  } else if (look === 'skeleton') {
    limb(ctx, -6, -24, 24, walk * 0.6, 5, c.bone); limb(ctx, 6, -24, 24, -walk * 0.6, 5, c.bone);
    ctx.fillStyle = c.cloth; ctx.fillRect(-10, -30, 20, 8);
    ctx.fillStyle = c.bone;
    for (let i = 0; i < 4; i++) ctx.fillRect(-10, -50 + i * 6, 20, 3);
    ctx.fillRect(-2, -54, 4, 30);
    ctx.beginPath(); ctx.arc(2, -64, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111'; ctx.fillRect(4, -68, 5, 5); ctx.fillRect(-3, -68, 4, 5);
    ctx.save(); ctx.translate(6, -48); ctx.rotate(e.move ? (wind ? -2 * atk : 1.3) : 0.5);
    ctx.fillStyle = c.bone; ctx.fillRect(-2, 0, 4, 18);
    ctx.fillStyle = '#9aa'; ctx.fillRect(-2, 16, 4, 30); ctx.restore();
  } else if (look === 'darkMage') {
    ctx.fillStyle = c.robe;
    ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(16, 0); ctx.lineTo(8, -56); ctx.lineTo(-8, -56); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-14, -50); ctx.lineTo(14, -50); ctx.lineTo(2, -80); ctx.closePath(); ctx.fill();
    ctx.fillStyle = c.glow; ctx.fillRect(2, -58, 4, 3); ctx.fillRect(-4, -58, 4, 3);
    ctx.save(); ctx.translate(8, -40); ctx.rotate(e.move ? -1.2 : 0.3);
    ctx.fillStyle = '#4a3020'; ctx.fillRect(-2, -10, 4, 50);
    ctx.fillStyle = c.glow; ctx.beginPath(); ctx.arc(0, -14, 6 + (wind ? atk * 6 : 0), 0, Math.PI * 2); ctx.fill(); ctx.restore();
  } else if (look === 'golem') {
    ctx.fillStyle = c.dark;
    roundRect(ctx, -40, -40, 26, 40, 6); ctx.fill(); roundRect(ctx, 14, -40, 26, 40, 6); ctx.fill();
    ctx.fillStyle = c.rock; roundRect(ctx, -50, -120, 100, 84, 18); ctx.fill();
    ctx.fillStyle = c.dark; roundRect(ctx, -22, -150, 50, 36, 10); ctx.fill();
    ctx.fillStyle = c.glow; ctx.fillRect(10, -138, 10, 6);
    ctx.fillStyle = 'rgba(255,179,71,.6)'; ctx.fillRect(-20, -90, 30, 4); ctx.fillRect(-6, -76, 26, 4);
    ctx.save(); ctx.translate(36, -104);
    ctx.rotate(e.move ? (wind ? -2.4 * atk : 1.3) : 0.3 + walk * 0.2);
    ctx.fillStyle = c.dark; roundRect(ctx, -14, 0, 28, 60, 10); ctx.fill();
    ctx.fillStyle = c.rock; roundRect(ctx, -18, 52, 36, 32, 10); ctx.fill(); ctx.restore();
  } else if (look === 'darkKnight') {
    limb(ctx, -8, -34, 34, walk * 0.6, 12, c.armor); limb(ctx, 8, -34, 34, -walk * 0.6, 12, c.armor);
    ctx.fillStyle = c.trim; ctx.beginPath(); ctx.moveTo(-10, -80); ctx.quadraticCurveTo(-40, -50 + walk * 4, -36, -10); ctx.lineTo(-10, -40); ctx.fill();
    ctx.fillStyle = c.armor; roundRect(ctx, -18, -82, 36, 50, 10); ctx.fill();
    ctx.fillStyle = c.trim; ctx.fillRect(-18, -44, 36, 5);
    ctx.fillStyle = c.armor; ctx.beginPath(); ctx.arc(2, -96, 16, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-10, -106); ctx.lineTo(-18, -128); ctx.lineTo(-2, -110); ctx.fill();
    ctx.fillStyle = c.glow; ctx.fillRect(4, -100, 12, 4);
    ctx.save(); ctx.translate(12, -74);
    ctx.rotate(e.move ? (wind ? -2.5 * atk : 1.5) : 0.6);
    ctx.fillStyle = c.armor; roundRect(ctx, -5, 0, 10, 26, 5); ctx.fill();
    ctx.fillStyle = '#3a0d14'; ctx.fillRect(-3, 22, 6, 6);
    ctx.fillStyle = c.glow; ctx.beginPath(); ctx.moveTo(-5, 28); ctx.lineTo(5, 28); ctx.lineTo(3, 96); ctx.lineTo(0, 104); ctx.lineTo(-3, 96); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  // telegraph
  if (wind && e.move.t > 4) {
    ctx.fillStyle = e.def.boss ? '#ff4d6d' : '#ffeb3b';
    const hy = e.y - e.def.h * s - 18;
    ctx.font = 'bold 22px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('!', e.x, hy);
  }
  if (e.frozen > 0) {
    ctx.fillStyle = 'rgba(150,220,255,0.45)';
    roundRect(ctx, e.x - e.def.w * s / 2 - 6, e.y - e.def.h * s - 6, e.def.w * s + 12, e.def.h * s + 8, 8); ctx.fill();
  }
  if (e.hitFlash > 0) {
    ctx.save(); ctx.globalAlpha = 0.5; ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(e.x, e.y - e.def.h * s / 2, e.def.w * s * 0.6, e.def.h * s * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// ---------------------------------------------------------------- projectiles
export function drawProj(ctx, p, t) {
  ctx.save();
  ctx.translate(p.x, p.y);
  const ang = Math.atan2(p.vy, p.vx);
  switch (p.kind) {
    case 'arrow': case 'arrowE': case 'arrowDown': case 'arrowBig': {
      ctx.rotate(ang);
      const L = p.kind === 'arrowBig' ? 44 : 34;
      ctx.strokeStyle = p.kind === 'arrowE' ? '#6b4423' : '#f5e6c8'; ctx.lineWidth = p.kind === 'arrowBig' ? 4 : 3;
      ctx.beginPath(); ctx.moveTo(-L / 2, 0); ctx.lineTo(L / 2, 0); ctx.stroke();
      ctx.fillStyle = p.kind === 'arrowBig' ? '#7bd36a' : '#ccc';
      ctx.beginPath(); ctx.moveTo(L / 2 + 8, 0); ctx.lineTo(L / 2 - 2, -5); ctx.lineTo(L / 2 - 2, 5); ctx.fill();
      ctx.fillStyle = p.kind === 'arrowE' ? '#c0392b' : '#2f9e57'; ctx.fillRect(-L / 2, -4, 8, 8);
      if (p.kind === 'arrowBig') { ctx.globalAlpha = 0.4; ctx.fillStyle = '#b6ff9e'; ctx.fillRect(-L, -3, L, 6); }
      break;
    }
    case 'stormArrow': {
      ctx.rotate(ang);
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(-90, 0, 80, 0);
      g.addColorStop(0, 'rgba(120,255,160,0)'); g.addColorStop(1, 'rgba(180,255,200,0.95)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-100, -20); ctx.lineTo(70, -10); ctx.lineTo(95, 0); ctx.lineTo(70, 10); ctx.lineTo(-100, 20); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(-60, -3, 140, 6);
      break;
    }
    case 'orb': case 'fireball': case 'meteor': case 'darkOrb': {
      const r = p.kind === 'orb' ? 10 : p.kind === 'darkOrb' ? p.w / 2 : p.w / 2;
      const col = p.kind === 'darkOrb' ? ['#2a0040', '#b84dff'] : p.kind === 'orb' ? ['#5ad1ff', '#e0f7ff'] : ['#ff5a1f', '#ffe08a'];
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = col[0]; ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.arc(-p.vx * 1.2, -p.vy * 1.2, r * 1.1, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      const g = ctx.createRadialGradient(0, 0, 1, 0, 0, r * 1.4);
      g.addColorStop(0, '#fff'); g.addColorStop(0.35, col[1]); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 1.4, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'wave': {
      ctx.globalCompositeOperation = 'lighter';
      ctx.scale(Math.sign(p.vx) || 1, 1);
      const g = ctx.createLinearGradient(-60, 0, 60, 0);
      g.addColorStop(0, 'rgba(255,90,30,0)'); g.addColorStop(0.7, 'rgba(255,140,40,.85)'); g.addColorStop(1, 'rgba(255,240,160,1)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(-60, -85); ctx.quadraticCurveTo(70, -60 + Math.sin(t) * 6, 60, 0); ctx.quadraticCurveTo(70, 60, -60, 85); ctx.quadraticCurveTo(10, 0, -60, -85); ctx.fill();
      break;
    }
    case 'darkWave': {
      ctx.globalCompositeOperation = 'lighter';
      ctx.scale(Math.sign(p.vx) || 1, 1);
      ctx.fillStyle = 'rgba(255,60,100,.7)';
      ctx.beginPath(); ctx.moveTo(-30, -65); ctx.quadraticCurveTo(40, 0, -30, 65); ctx.quadraticCurveTo(0, 0, -30, -65); ctx.fill();
      ctx.fillStyle = 'rgba(80,0,40,.8)'; ctx.fillRect(-40, -50, 14, 100);
      break;
    }
    case 'knife': {
      ctx.rotate(ang);
      ctx.fillStyle = '#e8eef5'; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-6, -4); ctx.lineTo(-6, 4); ctx.fill();
      ctx.fillStyle = '#e74c3c'; ctx.fillRect(-12, -2, 6, 4);
      break;
    }
    case 'shock': {
      ctx.fillStyle = '#a58b5c';
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-20 + i * 14, 20); ctx.lineTo(-12 + i * 14, -20 - (i === 1 ? 14 : 0)); ctx.lineTo(-4 + i * 14, 20); ctx.fill(); }
      break;
    }
    case 'rock': {
      ctx.rotate(t * 0.2);
      ctx.fillStyle = '#7d766a'; roundRect(ctx, -22, -20, 44, 40, 10); ctx.fill();
      ctx.fillStyle = '#5f5a50'; ctx.fillRect(-10, -8, 12, 6);
      break;
    }
    case 'feather': {
      ctx.rotate(ang);
      ctx.fillStyle = '#c77dff'; ctx.beginPath(); ctx.ellipse(0, 0, 16, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(16, 0); ctx.stroke();
      break;
    }
    default:
      ctx.fillStyle = '#fff'; ctx.fillRect(-4, -4, 8, 8);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- backgrounds
const THEMES = {
  forest: { sky: ['#7ec8f2', '#d9f2ff'], far: '#7fb27a', mid: '#4f8a4a', ground: '#6b4a2b', grass: '#5fae45', plat: '#8b5a2b', deco: 'tree' },
  gorge: { sky: ['#f6b26b', '#ffe3b8'], far: '#c58f5b', mid: '#9c6a3c', ground: '#7a5230', grass: '#a67c52', plat: '#6e5038', deco: 'rock' },
  cliffs: { sky: ['#5ea3d6', '#c9e7ff'], far: '#9fb4c7', mid: '#6f8798', ground: '#5d6d7a', grass: '#9ad07a', plat: '#7a8a96', deco: 'cloud' },
  temple: { sky: ['#3b2a1e', '#8a5a33'], far: '#5a3d26', mid: '#6e4a2e', ground: '#4a3220', grass: '#7a5a3a', plat: '#8c6a45', deco: 'pillar' },
  castle: { sky: ['#140b1f', '#4a1f3d'], far: '#2a1a35', mid: '#3a2448', ground: '#251a2e', grass: '#5a3d6b', plat: '#4b3a5a', deco: 'tower' },
};

export function themeOf(name) { return THEMES[name] || THEMES.forest; }

export function drawBackground(ctx, theme, camX, W, H, roomW, t) {
  const th = themeOf(theme);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (theme === 'castle') { // moon
    ctx.fillStyle = 'rgba(255,230,240,.85)'; ctx.beginPath(); ctx.arc(W * 0.8 - camX * 0.02, 90, 40, 0, Math.PI * 2); ctx.fill();
  } else if (theme !== 'temple') {
    ctx.fillStyle = 'rgba(255,255,220,.8)'; ctx.beginPath(); ctx.arc(W * 0.15 - camX * 0.02, 80, 34, 0, Math.PI * 2); ctx.fill();
  }
  // far layer
  ctx.fillStyle = th.far;
  const off1 = -camX * 0.2;
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = -100; x <= W + 100; x += 40) {
    const wx = x - off1;
    ctx.lineTo(x, 300 - Math.sin(wx * 0.006) * 60 - Math.sin(wx * 0.017) * 20);
  }
  ctx.lineTo(W, H); ctx.fill();
  // mid layer deco
  ctx.fillStyle = th.mid;
  const off2 = -camX * 0.5;
  const spacing = 180;
  const start = Math.floor(-off2 / spacing) - 1;
  for (let i = start; i < start + W / spacing + 3; i++) {
    const x = i * spacing + off2;
    const h = 120 + ((i * 7919) % 5) * 22;
    if (th.deco === 'tree') {
      ctx.fillRect(x + 36, 470 - h * 0.5, 16, h * 0.5);
      ctx.beginPath(); ctx.arc(x + 44, 470 - h * 0.6, 50, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 14, 470 - h * 0.45, 34, 0, Math.PI * 2); ctx.fill();
    } else if (th.deco === 'rock') {
      ctx.beginPath(); ctx.moveTo(x, 470); ctx.lineTo(x + 30, 470 - h); ctx.lineTo(x + 90, 470 - h * 0.8); ctx.lineTo(x + 130, 470); ctx.fill();
    } else if (th.deco === 'cloud') {
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      const cy = 120 + ((i * 31) % 4) * 40;
      ctx.beginPath(); ctx.arc(x, cy, 30, 0, Math.PI * 2); ctx.arc(x + 34, cy - 10, 36, 0, Math.PI * 2); ctx.arc(x + 70, cy, 28, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = th.mid;
      ctx.fillRect(x + 20, 470 - h * 0.7, 60, h * 0.7);
    } else if (th.deco === 'pillar') {
      ctx.fillRect(x + 30, 470 - h * 1.4, 40, h * 1.4);
      ctx.fillRect(x + 20, 470 - h * 1.4, 60, 14);
      ctx.fillStyle = 'rgba(255,170,60,.5)'; ctx.beginPath(); ctx.arc(x + 50, 470 - h * 1.4 - 12 + Math.sin(t * 0.2 + i) * 2, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = th.mid;
    } else if (th.deco === 'tower') {
      ctx.fillRect(x + 30, 470 - h * 1.6, 50, h * 1.6);
      ctx.beginPath(); ctx.moveTo(x + 22, 470 - h * 1.6); ctx.lineTo(x + 55, 470 - h * 1.6 - 50); ctx.lineTo(x + 88, 470 - h * 1.6); ctx.fill();
      ctx.fillStyle = 'rgba(255,200,90,.6)'; ctx.fillRect(x + 50, 470 - h * 1.2, 10, 14);
      ctx.fillStyle = th.mid;
    }
  }
}

export function drawGround(ctx, theme, camX, W, H, roomW, plats, groundY) {
  const th = themeOf(theme);
  ctx.fillStyle = th.ground;
  ctx.fillRect(-camX, groundY, roomW, H - groundY);
  ctx.fillStyle = th.grass;
  ctx.fillRect(-camX, groundY, roomW, 10);
  ctx.fillStyle = 'rgba(0,0,0,.15)';
  for (let x = Math.floor(camX / 60) * 60; x < camX + W; x += 60) ctx.fillRect(x - camX + 10, groundY + 26 + ((x / 60) % 3) * 12, 26, 6);
  for (const p of plats) {
    const x = p.x - camX;
    if (x > W || x + p.w < 0) continue;
    ctx.fillStyle = th.plat; roundRect(ctx, x, p.y, p.w, 18, 6); ctx.fill();
    ctx.fillStyle = th.grass; roundRect(ctx, x, p.y, p.w, 6, 3); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(x + 6, p.y + 18, p.w - 12, 5);
  }
  // room bounds walls
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.fillRect(-camX - 40, 0, 40, H);
  ctx.fillRect(roomW - camX, 0, 40, H);
}

export function drawPortrait(ctx, hero, x, y, r) {
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.closePath();
  ctx.fillStyle = '#1d2033'; ctx.fill();
  ctx.clip();
  drawHero(ctx, x - 2, y + r * 2.2, 1, hero, { state: 'idle', t: 0 }, false);
  ctx.restore();
  ctx.strokeStyle = hero.colors.trim; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
}
