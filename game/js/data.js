// Game data: heroes, moves, enemies, stages.
// Move = { dur, cancel?, invuln?, air?, grav?, events: [...] }
// Events fire on frame `f`. Hit boxes are relative to the owner's feet, facing right.

const H = (f, box, o = {}) => ({ f, t: 'hit', box, dmg: 1, kx: 3, ky: 0, stun: 18, ...o });
const P = (f, o) => ({ f, t: 'proj', ...o });
const S = (f, name) => ({ f, t: 'sfx', name });
const V = (f, vx, vy) => ({ f, t: 'vel', vx, vy });
const FN = (f, fn) => ({ f, t: 'fn', fn });
const SH = (f, amt, len = 10) => ({ f, t: 'shake', amt, len });
const FX = (f, kind, o = {}) => ({ f, t: 'fx', kind, ...o });

// ---------------------------------------------------------------- HEROES
export const HEROES = {
  knight: {
    name: 'Kael', role: 'Knight', weapon: 'sword',
    desc: 'Balanced na swordsman. Malakas ang combo at depensa.',
    colors: { hair: '#b8322a', body: '#c9413a', trim: '#f2c94c', skin: '#ffd9b3', leg: '#3b3f58' },
    base: { hp: 600, atk: 30, def: 14 }, speed: 3.4, jump: 12.6,
    combo: [
      { dur: 20, cancel: 9, events: [V(1, 2.2, null), S(3, 'swing'), H(6, { x: 0, y: -78, w: 78, h: 70 }, { dmg: 1.0, kx: 2.5 })], swing: 1 },
      { dur: 20, cancel: 9, events: [V(1, 2.2, null), S(3, 'swing'), H(6, { x: 0, y: -78, w: 78, h: 70 }, { dmg: 1.0, kx: 2.5 })], swing: -1 },
      { dur: 22, cancel: 10, events: [V(1, 2.6, null), S(3, 'swing'), H(7, { x: 0, y: -84, w: 84, h: 76 }, { dmg: 1.15, kx: 3 })], swing: 1 },
      { dur: 34, events: [V(2, 4, null), S(8, 'swing'), H(10, { x: -6, y: -96, w: 100, h: 92 }, { dmg: 1.7, kx: 6, ky: -9, stun: 30 }), SH(10, 4, 6)], swing: 2 },
    ],
    dashAtk: { dur: 28, events: [V(0, 7, null), S(2, 'swing'), H(6, { x: 0, y: -80, w: 90, h: 70 }, { dmg: 1.4, kx: 7, ky: -5 })], swing: 1 },
    jumpAtk: { dur: 20, air: true, events: [S(2, 'swing'), H(5, { x: -10, y: -60, w: 80, h: 80 }, { dmg: 1.1, kx: 2, ky: 4 })], swing: 2 },
    skills: [
      { name: 'Mega Slash', dur: 44, invuln: true, swing: 2, events: [FX(0, 'charge'), V(10, 6, null), S(12, 'skill'), H(14, { x: -10, y: -130, w: 170, h: 130 }, { dmg: 3.2, kx: 10, ky: -10, stun: 40 }), FX(14, 'slash', { w: 170 }), SH(14, 8, 12)] },
      { name: 'Critical X', dur: 66, invuln: true, swing: 3, events: [FX(0, 'charge'), S(6, 'skill'),
        H(10, { x: -60, y: -110, w: 200, h: 110 }, { dmg: 1.3, kx: 1, ky: -2, stun: 25 }), S(10, 'swing'),
        H(20, { x: -60, y: -110, w: 200, h: 110 }, { dmg: 1.3, kx: 1, ky: -2, stun: 25 }), S(20, 'swing'),
        H(30, { x: -60, y: -110, w: 200, h: 110 }, { dmg: 1.3, kx: 1, ky: -2, stun: 25 }), S(30, 'swing'),
        H(40, { x: -60, y: -110, w: 200, h: 110 }, { dmg: 1.3, kx: 1, ky: -2, stun: 25 }), S(40, 'swing'),
        H(52, { x: -40, y: -140, w: 220, h: 140 }, { dmg: 2.6, kx: 8, ky: -12, stun: 40 }), SH(52, 10, 14), FX(52, 'ring', { r: 140 })] },
      { name: 'Sword Fire', dur: 76, invuln: true, swing: 2, events: [FX(0, 'charge'), FX(0, 'flash'), S(22, 'boom'),
        P(24, { kind: 'wave', dx: 30, dy: -90, vx: 10, vy: 0, w: 120, h: 170, dmg: 6.5, pierce: 99, life: 70, kx: 10, ky: -12, stun: 50 }), SH(24, 12, 20)] },
    ],
  },
  archer: {
    name: 'Ryn', role: 'Archer', weapon: 'bow',
    desc: 'Long range. Mabilis tumalon, delikado sa malayo.',
    colors: { hair: '#7bd36a', body: '#2f9e57', trim: '#e7f5c8', skin: '#ffe0c2', leg: '#5a3e2b' },
    base: { hp: 480, atk: 27, def: 9 }, speed: 3.7, jump: 13.4,
    combo: [
      { dur: 16, cancel: 8, events: [S(4, 'arrow'), P(5, { kind: 'arrow', dx: 30, dy: -52, vx: 15, vy: 0, dmg: 0.9, life: 50 })], aim: 1 },
      { dur: 16, cancel: 8, events: [S(4, 'arrow'), P(5, { kind: 'arrow', dx: 30, dy: -52, vx: 15, vy: 0, dmg: 0.9, life: 50 })], aim: 1 },
      { dur: 16, cancel: 8, events: [S(4, 'arrow'), P(5, { kind: 'arrow', dx: 30, dy: -52, vx: 15, vy: 0, dmg: 0.95, life: 50 })], aim: 1 },
      { dur: 30, events: [V(2, -3, null), S(8, 'arrow'), P(9, { kind: 'arrow', dx: 30, dy: -60, vx: 16, vy: -1, dmg: 1.1, life: 55, ky: -6 }), P(11, { kind: 'arrow', dx: 30, dy: -46, vx: 16, vy: 1, dmg: 1.1, life: 55, kx: 5 })], aim: 1 },
    ],
    dashAtk: { dur: 30, events: [V(0, -6, -7), S(6, 'arrow'), P(8, { kind: 'arrow', dx: 20, dy: -50, vx: 15, vy: 2, dmg: 1.3, life: 50, kx: 6 })], aim: 1, air: true },
    jumpAtk: { dur: 18, air: true, grav: 0.4, events: [S(3, 'arrow'), P(4, { kind: 'arrow', dx: 20, dy: -40, vx: 11, vy: 9, dmg: 1.0, life: 45, ky: 2 })], aim: 1 },
    skills: [
      { name: 'Triple Arrow', dur: 36, invuln: true, aim: 1, events: [FX(0, 'charge'), S(10, 'arrow'),
        P(12, { kind: 'arrowBig', dx: 30, dy: -56, vx: 16, vy: -3, dmg: 1.7, pierce: 2, life: 60 }),
        P(12, { kind: 'arrowBig', dx: 30, dy: -52, vx: 17, vy: 0, dmg: 1.7, pierce: 2, life: 60 }),
        P(12, { kind: 'arrowBig', dx: 30, dy: -48, vx: 16, vy: 3, dmg: 1.7, pierce: 2, life: 60 })] },
      { name: 'Arrow Rain', dur: 60, invuln: true, aim: 1, events: [FX(0, 'charge'), S(6, 'skill'), P(8, { kind: 'arrow', dx: 20, dy: -60, vx: 4, vy: -16, dmg: 0, life: 25 }),
        FN(20, (o, g) => { for (let i = 0; i < 16; i++) g.later(i * 3, () => g.spawnProj(o, { kind: 'arrowDown', x: o.x + o.face * (60 + Math.random() * 460), y: -20 - Math.random() * 60, vx: o.face * 1.5, vy: 17, dmg: 1.05, life: 60, stun: 22, ky: 1, sfx: i % 3 === 0 ? 'arrow' : null })); })] },
      { name: 'Storm Arrow', dur: 70, invuln: true, aim: 1, events: [FX(0, 'charge'), FX(0, 'flash'), S(26, 'boom'),
        P(28, { kind: 'stormArrow', dx: 40, dy: -64, vx: 19, vy: 0, w: 150, h: 46, dmg: 7.2, pierce: 99, life: 60, kx: 9, ky: -10, stun: 45 }), V(28, -5, null), SH(28, 10, 16)] },
    ],
  },
  mage: {
    name: 'Mira', role: 'Mage', weapon: 'staff',
    desc: 'Malalakas na spells at area damage, pero manipis ang HP.',
    colors: { hair: '#8e6cf0', body: '#6c3fc9', trim: '#ffcf5a', skin: '#ffe3cc', leg: '#2c2350' },
    base: { hp: 440, atk: 33, def: 8 }, speed: 3.3, jump: 12.4,
    combo: [
      { dur: 20, cancel: 9, events: [S(4, 'magic'), H(6, { x: 30, y: -80, w: 80, h: 70 }, { dmg: 0.95, kx: 2 }), FX(6, 'spark', { dx: 70, dy: -45 })], aim: 1 },
      { dur: 20, cancel: 9, events: [S(4, 'magic'), H(6, { x: 30, y: -80, w: 80, h: 70 }, { dmg: 0.95, kx: 2 }), FX(6, 'spark', { dx: 70, dy: -45 })], aim: 1 },
      { dur: 22, cancel: 10, events: [S(5, 'magic'), P(7, { kind: 'orb', dx: 30, dy: -50, vx: 9, vy: 0, dmg: 1.25, life: 50 })], aim: 1 },
      { dur: 34, events: [S(10, 'boom'), H(12, { x: 20, y: -110, w: 130, h: 110 }, { dmg: 1.8, kx: 6, ky: -10, stun: 30 }), FX(12, 'explode', { dx: 85, dy: -50, r: 70 }), SH(12, 5, 8)], aim: 1 },
    ],
    dashAtk: { dur: 26, events: [V(0, 5, null), S(4, 'magic'), H(6, { x: 0, y: -70, w: 80, h: 60 }, { dmg: 1.3, kx: 6, ky: -4 }), FX(6, 'spark', { dx: 50, dy: -40 })], aim: 1 },
    jumpAtk: { dur: 22, air: true, grav: 0.3, events: [S(3, 'magic'), P(5, { kind: 'orb', dx: 20, dy: -40, vx: 7, vy: 7, dmg: 1.1, life: 40 })], aim: 1 },
    skills: [
      { name: 'Fireball', dur: 40, invuln: true, aim: 1, events: [FX(0, 'charge'), S(12, 'magic'),
        P(14, { kind: 'fireball', dx: 36, dy: -56, vx: 9, vy: 0, w: 48, h: 48, dmg: 1.2, life: 70, explode: { r: 100, dmg: 3.4, ky: -9, kx: 7 } })] },
      { name: 'Ice Storm', dur: 70, invuln: true, aim: 1, events: [FX(0, 'charge'), S(8, 'skill'), FX(10, 'ice', { r: 170 }),
        ...[12, 22, 32, 42, 52].map((f) => H(f, { x: -170, y: -150, w: 340, h: 160 }, { dmg: 0.9, kx: 0, ky: 0, stun: 70, freeze: true, group: 'ice' + f })),
        S(12, 'magic'), S(32, 'magic'), S(52, 'magic')] },
      { name: 'Meteor', dur: 80, invuln: true, aim: 1, events: [FX(0, 'charge'), FX(0, 'flash'), S(10, 'skill'),
        FN(16, (o, g) => { for (let i = 0; i < 7; i++) g.later(i * 7, () => g.spawnProj(o, { kind: 'meteor', x: o.x + o.face * (40 + i * 85), y: -60, vx: o.face * 2.5, vy: 13, w: 56, h: 56, dmg: 0.5, life: 80, explode: { r: 95, dmg: 2.7, ky: -8, kx: 4 } })); })] },
    ],
  },
  thief: {
    name: 'Vex', role: 'Thief', weapon: 'dagger',
    desc: 'Super bilis na combos at evasion. Critical master.',
    colors: { hair: '#3a3f4b', body: '#2c3e50', trim: '#e74c3c', skin: '#f6d1b0', leg: '#1f2733' },
    base: { hp: 500, atk: 25, def: 10, crit: 0.2 }, speed: 4.1, jump: 13.0,
    combo: [
      { dur: 13, cancel: 6, events: [V(1, 2, null), S(2, 'swing'), H(4, { x: 0, y: -70, w: 62, h: 60 }, { dmg: 0.75, kx: 1.5, stun: 16 })], swing: 1 },
      { dur: 13, cancel: 6, events: [V(1, 2, null), S(2, 'swing'), H(4, { x: 0, y: -70, w: 62, h: 60 }, { dmg: 0.75, kx: 1.5, stun: 16 })], swing: -1 },
      { dur: 13, cancel: 6, events: [V(1, 2, null), S(2, 'swing'), H(4, { x: 0, y: -70, w: 62, h: 60 }, { dmg: 0.8, kx: 1.5, stun: 16 })], swing: 1 },
      { dur: 13, cancel: 6, events: [V(1, 2, null), S(2, 'swing'), H(4, { x: 0, y: -70, w: 62, h: 60 }, { dmg: 0.8, kx: 1.5, stun: 16 })], swing: -1 },
      { dur: 26, events: [V(2, 3, -4), S(5, 'swing'), H(7, { x: -5, y: -100, w: 80, h: 100 }, { dmg: 1.5, kx: 4, ky: -10, stun: 30 })], swing: 2, air: true },
    ],
    dashAtk: { dur: 22, events: [V(0, 9, null), S(2, 'swing'), H(4, { x: 0, y: -70, w: 80, h: 60 }, { dmg: 1.2, kx: 5, ky: -3, group: 'd' }), H(9, { x: 0, y: -70, w: 80, h: 60 }, { dmg: 0.8, kx: 4, ky: -5, group: 'd2' })], swing: 1 },
    jumpAtk: { dur: 16, air: true, events: [S(2, 'swing'), H(4, { x: -10, y: -60, w: 74, h: 74 }, { dmg: 0.9, kx: 2, ky: 3 }), H(10, { x: -10, y: -60, w: 74, h: 74 }, { dmg: 0.9, kx: 2, ky: 3, group: 'j2' })], swing: 2 },
    skills: [
      { name: 'Shadow Step', dur: 34, invuln: true, swing: 1, events: [FX(0, 'charge'), S(6, 'dash'), V(8, 17, 0), FX(8, 'afterimage'),
        H(10, { x: -200, y: -80, w: 260, h: 80 }, { dmg: 2.8, kx: 5, ky: -7, stun: 40 }), V(20, 2, null)] , grav: 0 },
      { name: 'Blade Fan', dur: 42, invuln: true, aim: 1, events: [FX(0, 'charge'), S(12, 'swing'),
        ...[-6, -4, -2, 0, 2, 4, 6].map((vy) => P(14, { kind: 'knife', dx: 20, dy: -55, vx: 15, vy, dmg: 1.05, pierce: 1, life: 45 }))] },
      { name: 'Phantom Strike', dur: 90, invuln: true, events: [FX(0, 'charge'), FX(0, 'flash'), S(10, 'skill'),
        FN(14, (o, g) => { for (let i = 0; i < 7; i++) g.later(i * 7, () => { g.hitAllOnScreen(o, { dmg: i === 6 ? 3.2 : 1.1, kx: i === 6 ? 7 : 0, ky: i === 6 ? -10 : -1, stun: 30 }); g.audio('crit'); }); }),
        FN(14, (o) => { o.hidden = 56; })] },
    ],
  },
};

export const HERO_ORDER = ['knight', 'archer', 'mage', 'thief'];

// ---------------------------------------------------------------- ENEMIES
// ai: 'melee' | 'ranged' | 'flyer' | 'boss'
export const ENEMIES = {
  goblin: {
    name: 'Goblin', hp: 70, atk: 11, def: 2, speed: 1.6, w: 34, h: 52, exp: 8, gold: 6, ai: 'melee', range: 52, cd: 70, look: 'goblin',
    colors: { skin: '#6dbb4a', cloth: '#7a5230' },
    attacks: [{ dur: 44, windup: 22, events: [S(22, 'swing'), H(24, { x: 0, y: -50, w: 54, h: 44 }, { dmg: 1, kx: 4, ky: -2 })] }],
  },
  goblinArcher: {
    name: 'Goblin Archer', hp: 55, atk: 10, def: 1, speed: 1.4, w: 34, h: 52, exp: 10, gold: 7, ai: 'ranged', range: 420, cd: 110, look: 'goblin', bow: true,
    colors: { skin: '#87b34a', cloth: '#3f6d2a' },
    attacks: [{ dur: 50, windup: 26, events: [S(26, 'arrow'), P(28, { kind: 'arrowE', dx: 20, dy: -36, vx: 8, vy: 0, dmg: 1, life: 90, aim: true })] }],
  },
  wolf: {
    name: 'Wild Wolf', hp: 80, atk: 13, def: 2, speed: 2.6, w: 56, h: 36, exp: 11, gold: 6, ai: 'melee', range: 140, cd: 90, look: 'wolf',
    colors: { fur: '#8a8f99', dark: '#5c6069' },
    attacks: [{ dur: 46, windup: 18, events: [V(18, 9, -4), H(20, { x: -10, y: -40, w: 60, h: 40 }, { dmg: 1.1, kx: 5, ky: -3, group: 'b' }), H(26, { x: -10, y: -40, w: 60, h: 40 }, { dmg: 1.1, kx: 5, ky: -3, group: 'b' })] }],
  },
  harpy: {
    name: 'Harpy', hp: 75, atk: 12, def: 2, speed: 2.2, w: 44, h: 46, exp: 12, gold: 8, ai: 'flyer', range: 220, cd: 100, look: 'harpy',
    colors: { wing: '#c77dff', body: '#f2c6ff' },
    attacks: [{ dur: 60, windup: 20, events: [FN(20, (o, g) => g.swoop(o)), ...[24, 30, 36, 42].map((f) => H(f, { x: -20, y: -50, w: 70, h: 56 }, { dmg: 1.1, kx: 4, ky: -4, group: 's' }))] }],
  },
  orc: {
    name: 'Orc Warrior', hp: 210, atk: 18, def: 6, speed: 1.15, w: 50, h: 76, exp: 24, gold: 16, ai: 'melee', range: 70, cd: 95, look: 'orc', poise: 60,
    colors: { skin: '#5f8f4e', cloth: '#7a2f2f' },
    attacks: [{ dur: 60, windup: 32, events: [S(32, 'swing'), H(34, { x: -10, y: -90, w: 90, h: 90 }, { dmg: 1.4, kx: 7, ky: -6 }), SH(34, 3, 6)] }],
  },
  skeleton: {
    name: 'Skeleton', hp: 120, atk: 16, def: 5, speed: 1.9, w: 36, h: 60, exp: 16, gold: 10, ai: 'melee', range: 58, cd: 60, look: 'skeleton',
    colors: { bone: '#ece6d6', cloth: '#4b2d5c' },
    attacks: [{ dur: 38, windup: 16, events: [S(16, 'swing'), H(18, { x: 0, y: -60, w: 62, h: 50 }, { dmg: 1, kx: 3 })] }],
  },
  darkMage: {
    name: 'Dark Mage', hp: 95, atk: 15, def: 3, speed: 1.3, w: 36, h: 62, exp: 18, gold: 12, ai: 'ranged', range: 380, cd: 120, look: 'darkMage',
    colors: { robe: '#2b1d3f', glow: '#b84dff' },
    attacks: [{ dur: 56, windup: 30, events: [S(30, 'magic'), P(32, { kind: 'darkOrb', dx: 20, dy: -44, vx: 6, vy: 0, w: 26, h: 26, dmg: 1.2, life: 110, aim: true })] }],
  },

  // ------------------------------------------------------------ BOSSES
  goblinChief: {
    name: 'Goblin Chief Grukk', boss: true, hp: 1100, atk: 16, def: 5, speed: 1.5, w: 70, h: 100, exp: 160, gold: 160, ai: 'boss', range: 90, cd: 70, look: 'goblin', scale: 1.9, poise: 120,
    colors: { skin: '#4f9b3a', cloth: '#9b2d20' },
    attacks: [
      { dur: 64, windup: 34, events: [S(34, 'swing'), H(36, { x: -10, y: -130, w: 140, h: 130 }, { dmg: 1.5, kx: 8, ky: -8 }), SH(36, 6, 10)] },
      { dur: 70, windup: 24, range: 400, events: [S(24, 'dash'), V(24, 10, null), ...[26, 32, 38, 44].map((f) => H(f, { x: -20, y: -110, w: 110, h: 110 }, { dmg: 1.2, kx: 8, ky: -5, group: 'c' }))] },
      { dur: 60, windup: 30, range: 9999, events: [FN(32, (o, g) => { g.spawnEnemy('goblin', o.x - 160); g.spawnEnemy('goblin', o.x + 160); }), S(32, 'skill')], once: 3 },
    ],
  },
  golem: {
    name: 'Stone Golem', boss: true, hp: 1900, atk: 20, def: 10, speed: 0.9, w: 100, h: 140, exp: 320, gold: 300, ai: 'boss', range: 120, cd: 80, look: 'golem', poise: 9999,
    colors: { rock: '#8b8579', dark: '#5f5a50', glow: '#ffb347' },
    attacks: [
      { dur: 70, windup: 38, events: [S(38, 'boom'), H(40, { x: -40, y: -150, w: 200, h: 150 }, { dmg: 1.6, kx: 9, ky: -9 }), SH(40, 10, 14),
        P(40, { kind: 'shock', dx: 60, dy: -40, vx: 7, vy: 0, w: 50, h: 40, dmg: 1.2, life: 90, pierce: 99 }), P(40, { kind: 'shock', dx: -60, dy: -40, vx: -7, vy: 0, w: 50, h: 40, dmg: 1.2, life: 90, pierce: 99 })] },
      { dur: 64, windup: 30, range: 9999, events: [S(30, 'swing'), P(32, { kind: 'rock', dx: 30, dy: -140, vx: 7, vy: -10, grav: 0.45, w: 46, h: 46, dmg: 1.5, life: 140, aim: 'arc' })] },
      { dur: 56, windup: 26, events: [S(26, 'swing'), H(28, { x: 0, y: -110, w: 140, h: 90 }, { dmg: 1.3, kx: 10, ky: -4 })] },
    ],
  },
  harpyQueen: {
    name: 'Harpy Queen Sylphe', boss: true, hp: 1700, atk: 20, def: 6, speed: 2.4, w: 80, h: 80, exp: 450, gold: 400, ai: 'boss', fly: true, range: 300, cd: 70, look: 'harpy', scale: 1.8, poise: 160,
    colors: { wing: '#7b2cbf', body: '#e0aaff' },
    attacks: [
      { dur: 60, windup: 26, range: 9999, events: [S(26, 'arrow'), ...[-1, 0, 1].map((a) => P(28, { kind: 'feather', dx: 0, dy: -40, vx: 8, vy: a * 2, w: 28, h: 12, dmg: 1.1, life: 120, aim: true, spread: a * 0.25 }))] },
      { dur: 74, windup: 26, events: [FN(26, (o, g) => g.swoop(o, 1.5)), ...[30, 36, 42, 48, 54].map((f) => H(f, { x: -30, y: -80, w: 120, h: 90 }, { dmg: 1.3, kx: 6, ky: -6, group: 's' }))] },
      { dur: 50, windup: 26, range: 9999, events: [FN(26, (o, g) => { g.spawnEnemy('harpy', o.x - 120, 200); g.spawnEnemy('harpy', o.x + 120, 200); }), S(26, 'skill')], once: 2 },
    ],
  },
  orcLord: {
    name: 'Orc Lord Gorvash', boss: true, hp: 2800, atk: 26, def: 12, speed: 1.4, w: 90, h: 130, exp: 650, gold: 600, ai: 'boss', range: 120, cd: 60, look: 'orc', scale: 1.7, poise: 260,
    colors: { skin: '#4c7a3d', cloth: '#3d1515' },
    attacks: [
      { dur: 90, windup: 24, events: [S(24, 'skill'), V(24, 3, null), ...[28, 36, 44, 52, 60, 68].map((f) => H(f, { x: -90, y: -140, w: 240, h: 140 }, { dmg: 0.9, kx: 6, ky: -4, group: 'sp' + f })), FX(28, 'ring', { r: 120 })] },
      { dur: 70, windup: 30, range: 500, events: [S(30, 'dash'), V(30, 11, null), ...[32, 38, 44, 50].map((f) => H(f, { x: -20, y: -130, w: 120, h: 130 }, { dmg: 1.4, kx: 9, ky: -7, group: 'c' }))] },
      { dur: 70, windup: 36, events: [S(36, 'boom'), H(38, { x: -150, y: -60, w: 390, h: 60 }, { dmg: 1.5, ky: -12, kx: 3 }), SH(38, 12, 16), FX(38, 'ring', { r: 200 })] },
    ],
  },
  darkKnight: {
    name: 'Dark Knight Vargas', boss: true, hp: 3600, atk: 30, def: 14, speed: 2.4, w: 60, h: 110, exp: 1000, gold: 1000, ai: 'boss', range: 110, cd: 50, look: 'darkKnight', scale: 1.35, poise: 220,
    colors: { armor: '#24212e', trim: '#b02e3c', glow: '#ff4d6d' },
    attacks: [
      { dur: 50, windup: 18, events: [S(18, 'dash'), V(18, 12, null), H(20, { x: -20, y: -110, w: 130, h: 110 }, { dmg: 1.4, kx: 8, ky: -6, group: 'd' }), H(26, { x: -20, y: -110, w: 130, h: 110 }, { dmg: 1.4, kx: 8, ky: -6, group: 'd' })], range: 450 },
      { dur: 60, windup: 26, range: 9999, events: [S(26, 'boom'), P(28, { kind: 'darkWave', dx: 40, dy: -100, vx: 9, vy: 0, w: 70, h: 130, dmg: 1.8, pierce: 99, life: 90 })] },
      { dur: 64, windup: 30, range: 9999, events: [FN(20, (o, g) => g.teleportBehind(o)), S(30, 'swing'), H(32, { x: -20, y: -120, w: 140, h: 120 }, { dmg: 1.7, kx: 9, ky: -9 }), SH(32, 6, 8)] },
      { dur: 80, windup: 30, range: 9999, events: [S(30, 'skill'), FN(32, (o, g) => { for (let i = 0; i < 6; i++) g.later(i * 8, () => { const t = g.nearestPlayer(o); if (t) g.spawnProj(o, { kind: 'darkOrb', x: t.x + (Math.random() - 0.5) * 200, y: -40, vx: 0, vy: 10, w: 34, h: 34, dmg: 1.3, life: 80, explode: { r: 60, dmg: 1.2 } }); }); })] },
    ],
  },
};

// ---------------------------------------------------------------- STAGES
// room: { w, plat: [[x, y, w]], waves: [[ [type, x, y?], ... ], ...] }
export const STAGES = [
  {
    id: 'forest', name: 'Serene Forest', theme: 'forest', lvl: 1, boss: 'goblinChief',
    rooms: [
      { w: 1500, plat: [[520, 360, 240], [900, 300, 220]], waves: [[['goblin', 900], ['goblin', 1150]], [['goblin', 1300], ['goblin', 700], ['goblin', 1100]]] },
      { w: 1800, plat: [[300, 350, 220], [700, 270, 260], [1200, 350, 260]], waves: [[['goblin', 800], ['goblinArcher', 760, 270], ['goblin', 1300]], [['goblin', 1500], ['goblin', 400], ['goblinArcher', 1300, 350]]] },
      { w: 1500, plat: [[250, 340, 200], [1050, 340, 200]], waves: [[['goblinChief', 1100]]] },
    ],
  },
  {
    id: 'gorge', name: 'Gorge of Oaths', theme: 'gorge', lvl: 2, boss: 'golem',
    rooms: [
      { w: 1800, plat: [[400, 340, 260], [900, 260, 200], [1300, 340, 260]], waves: [[['wolf', 1000], ['goblin', 1300], ['goblinArcher', 980, 260]], [['wolf', 400], ['wolf', 1500], ['goblin', 1200]]] },
      { w: 2000, plat: [[350, 360, 300], [800, 280, 250], [1300, 200, 220], [1600, 340, 250]], waves: [[['goblinArcher', 860, 280], ['goblinArcher', 1380, 200], ['wolf', 1200]], [['orc', 1500], ['goblin', 700], ['wolf', 1700]]] },
      { w: 1600, plat: [[200, 330, 220], [1180, 330, 220]], waves: [[['golem', 1150]]] },
    ],
  },
  {
    id: 'cliffs', name: 'Harpy Cliffs', theme: 'cliffs', lvl: 3, boss: 'harpyQueen',
    rooms: [
      { w: 1900, plat: [[300, 330, 240], [750, 250, 240], [1250, 330, 240], [1550, 230, 200]], waves: [[['harpy', 900, 220], ['harpy', 1200, 200], ['goblinArcher', 1300, 330]], [['harpy', 500, 200], ['wolf', 1500], ['harpy', 1600, 180]]] },
      { w: 2000, plat: [[400, 340, 280], [900, 260, 280], [1400, 340, 280]], waves: [[['orc', 1100], ['harpy', 1000, 180], ['goblinArcher', 960, 260]], [['harpy', 300, 200], ['harpy', 1700, 200], ['wolf', 1200], ['wolf', 800]]] },
      { w: 1700, plat: [[250, 320, 260], [1200, 320, 260], [720, 230, 260]], waves: [[['harpyQueen', 1200, 200]]] },
    ],
  },
  {
    id: 'temple', name: 'Orc Temple', theme: 'temple', lvl: 4, boss: 'orcLord',
    rooms: [
      { w: 2000, plat: [[350, 350, 260], [850, 280, 300], [1450, 350, 260]], waves: [[['orc', 1000], ['goblin', 1300], ['goblin', 800]], [['orc', 400], ['orc', 1600], ['goblinArcher', 900, 280]]] },
      { w: 2100, plat: [[300, 340, 240], [700, 260, 240], [1150, 200, 240], [1600, 300, 300]], waves: [[['skeleton', 1200], ['skeleton', 900], ['darkMage', 1250, 200]], [['orc', 1700], ['orc', 500], ['darkMage', 760, 260], ['wolf', 1400]]] },
      { w: 1700, plat: [[200, 330, 220], [1260, 330, 220]], waves: [[['orcLord', 1200]]] },
    ],
  },
  {
    id: 'castle', name: 'Kastilyo ng Dilim', theme: 'castle', lvl: 5, boss: 'darkKnight',
    rooms: [
      { w: 2000, plat: [[350, 340, 260], [850, 260, 260], [1400, 340, 260]], waves: [[['skeleton', 1000], ['skeleton', 1200], ['darkMage', 900, 260]], [['orc', 1500], ['skeleton', 500], ['darkMage', 1450, 340], ['harpy', 1100, 180]]] },
      { w: 2200, plat: [[300, 350, 280], [750, 270, 260], [1200, 200, 260], [1700, 300, 300]], waves: [[['darkMage', 800, 270], ['darkMage', 1260, 200], ['skeleton', 1500], ['skeleton', 1700]], [['orc', 400], ['orc', 1900], ['wolf', 1000], ['wolf', 1300], ['harpy', 1200, 150]]] },
      { w: 1800, plat: [[220, 320, 240], [1340, 320, 240], [780, 230, 240]], waves: [[['darkKnight', 1300]]] },
    ],
  },
];

export const DIFFS = [
  { name: 'Normal', hp: 1, atk: 1, reward: 1, color: '#7bd36a' },
  { name: 'Hard', hp: 2.4, atk: 1.9, reward: 2.2, color: '#f2c94c' },
  { name: 'Hell', hp: 5.5, atk: 3.6, reward: 4.5, color: '#ff4d6d' },
];

export function heroStats(id, prog) {
  const h = HEROES[id];
  const lv = prog.lv;
  return {
    maxHp: Math.round(h.base.hp * (1 + 0.13 * (lv - 1)) + prog.acc * 70),
    atk: Math.round(h.base.atk * (1 + 0.11 * (lv - 1)) + prog.wpn * 7),
    def: Math.round(h.base.def + lv * 1.2 + prog.arm * 5),
    crit: (h.base.crit || 0.1) + prog.acc * 0.01,
  };
}

export function upgradeCost(level) {
  return Math.round(120 * Math.pow(level + 1, 1.7));
}

export const MAX_UPGRADE = 10;
export const POTION_COST = 60;
export const MAX_POTIONS = 9;
