// Gameplay scene: side-scrolling beat-'em-up dungeon run.
import { G, GROUND_Y, GRAV, clamp, rand, randi, rectsOverlap, roundRect, text, fmt } from './core.js';
import { Input, Stick } from './input.js';
import { Audio } from './audio.js';
import { Save } from './save.js';
import { Shell } from './shell.js';
import { HEROES, ENEMIES, STAGES, DIFFS, heroStats } from './data.js';
import { drawHero, drawEnemy, drawProj, drawBackground, drawGround, drawShadow, drawPortrait } from './draw.js';
import { Menu, panel, bar, dim } from './ui.js';
import { Scenes, renderToast } from './scenes.js';

const MP_BAR = 100;

export class Battle {
  constructor(stageIdx, diffIdx, heroId) {
    this.stageIdx = stageIdx;
    this.stage = STAGES[stageIdx];
    this.diffIdx = diffIdx;
    this.diff = DIFFS[diffIdx];
    this.heroId = heroId;
    this.hero = HEROES[heroId];
    const st = heroStats(heroId, Save.hero(heroId));
    this.player = {
      kind: 'player', x: 120, y: GROUND_Y, vx: 0, vy: 0, face: 1, w: 30, h: 90,
      hp: st.maxHp, maxHp: st.maxHp, atk: st.atk, dfn: st.def, crit: st.crit,
      mp: 0, state: 'idle', t: 0, move: null, comboIdx: 0, jumps: 0, airAtk: false,
      invuln: 0, hurtT: 0, downT: 0, dashT: 0, dropT: 0, hidden: 0, onGround: true, dead: false,
    };
    this.roomIdx = 0;
    this.enemies = []; this.projs = []; this.parts = []; this.texts = []; this.coins = []; this.timers = [];
    this.rings = []; this.ghosts = [];
    this.camX = 0; this.shakeAmt = 0; this.shakeT = 0; this.hitstop = 0; this.flashT = 0;
    this.combo = 0; this.comboT = 0; this.maxCombo = 0;
    this.time = 0; this.hitsTaken = 0;
    this.earnedExp = 0; this.earnedGold = 0;
    this.banner = null; this.skillBanner = null;
    this.paused = false; this.over = null; // 'clear' | 'dead'
    this.overT = 0;
    this.menu = new Menu();
    this.lvlMul = 1 + 0.45 * (this.stage.lvl - 1);
    this.atkMul = 1 + 0.3 * (this.stage.lvl - 1);
  }

  enter() {
    Input.touchControls = true;
    this.loadRoom(0);
    Audio.music('stage');
  }
  exit() { Input.touchControls = false; }

  onBack() {
    if (this.over) return true;
    this.paused = !this.paused;
    return true;
  }

  // ------------------------------------------------------------ rooms & waves
  loadRoom(i) {
    this.roomIdx = i;
    const r = this.stage.rooms[i];
    this.room = { w: r.w, plats: r.plat.map(([x, y, w]) => ({ x, y, w })), waves: r.waves, wave: -1, waveDelay: 50, cleared: false };
    const p = this.player;
    p.x = 100; p.y = GROUND_Y; p.vx = 0; p.vy = 0; p.face = 1;
    this.enemies = []; this.projs = []; this.coins = [];
    this.portal = null;
    this.camX = 0;
    const last = i === this.stage.rooms.length - 1;
    this.banner = { text: last ? 'BOSS STAGE' : `${this.stage.name}  ${i + 1}-${this.stage.rooms.length}`, t: 110 };
    if (last) Audio.music('boss');
  }

  nextWave() {
    const rm = this.room;
    rm.wave++;
    if (rm.wave >= rm.waves.length) {
      rm.cleared = true;
      if (this.roomIdx < this.stage.rooms.length - 1) {
        this.portal = { x: rm.w - 70, y: GROUND_Y };
        this.banner = { text: 'GO! →', t: 90 };
      }
      return;
    }
    for (const [type, x, y] of rm.waves[rm.wave]) this.spawnEnemy(type, x, y);
  }

  spawnEnemy(type, x, y) {
    const d = ENEMIES[type];
    const isBoss = !!d.boss;
    const e = {
      kind: 'enemy', type, def: d, x: clamp(x, 40, this.room.w - 40), y: y != null ? y : GROUND_Y,
      vx: 0, vy: 0, face: -1, t: 0, state: 'idle', move: null,
      hp: Math.round(d.hp * this.lvlMul * this.diff.hp), atk: d.atk * this.atkMul * this.diff.atk, dfn: d.def * this.lvlMul,
      cd: rand(40, 90), invuln: 0, hurtT: 0, downT: 0, frozen: 0, hitFlash: 0, onGround: false, dead: false, deadT: 0,
      poise: d.poise || 0, fly: d.ai === 'flyer' || !!d.fly, spawnT: 40, uses: {}, hoverY: y != null ? y : 200,
    };
    e.maxHp = e.hp;
    if (e.fly && y == null) e.y = 200;
    this.enemies.push(e);
    if (isBoss) {
      this.boss = e;
      this.banner = { text: d.name, t: 130, boss: true };
    }
    this.burst(e.x, e.y - 30, '#b28dff', 14, 4);
    return e;
  }

  later(frames, fn) { this.timers.push({ t: frames, fn }); }
  audio(name) { Audio.play(name); }

  // ------------------------------------------------------------ main update
  update() {
    const taps = Input.consumeTaps();
    if (this.over) return this.updateOver(taps);
    if (Input.pressed('pause')) { this.paused = !this.paused; Audio.play('select'); }
    if (this.paused) return this.updatePause(taps);
    if (this.hitstop > 0) { this.hitstop--; return; }

    this.time++;
    for (let i = this.timers.length - 1; i >= 0; i--) {
      const tm = this.timers[i];
      if (--tm.t <= 0) { this.timers.splice(i, 1); tm.fn(); }
    }

    const rm = this.room;
    if (!rm.cleared) {
      const alive = this.enemies.some((e) => !e.dead);
      if (!alive) {
        if (rm.waveDelay-- <= 0) { this.nextWave(); rm.waveDelay = 60; }
      }
    }

    this.updatePlayer();
    for (const e of this.enemies) this.updateEnemy(e);
    this.enemies = this.enemies.filter((e) => !(e.dead && e.deadT > 60));
    this.updateProjs();
    this.updateCoins();
    this.updateFx();

    if (this.comboT > 0 && --this.comboT === 0) this.combo = 0;

    // portal
    const p = this.player;
    if (this.portal && Math.abs(p.x - this.portal.x) < 40 && p.onGround) {
      Audio.play('select');
      this.loadRoom(this.roomIdx + 1);
    }

    // camera
    const W = G.W;
    let target = p.x - W / 2 + p.face * 60;
    if (rm.w <= W) this.camX = (rm.w - W) / 2;
    else this.camX += (clamp(target, 0, rm.w - W) - this.camX) * 0.12;
    if (this.shakeT > 0) this.shakeT--;
    if (this.flashT > 0) this.flashT--;
    if (this.banner && --this.banner.t <= 0) this.banner = null;
    if (this.skillBanner && --this.skillBanner.t <= 0) this.skillBanner = null;
  }

  // ------------------------------------------------------------ physics
  physics(o, gs = 1) {
    const prevY = o.y;
    o.vy = Math.min(o.vy + GRAV * gs, 15);
    o.x += o.vx; o.y += o.vy;
    o.onGround = false;
    if (o.vy >= 0) {
      if (o.y >= GROUND_Y) { o.y = GROUND_Y; o.vy = 0; o.onGround = true; }
      else if (!(o.dropT > 0)) {
        for (const pl of this.room.plats) {
          if (prevY <= pl.y + 0.5 && o.y >= pl.y && o.x > pl.x - 6 && o.x < pl.x + pl.w + 6) {
            o.y = pl.y; o.vy = 0; o.onGround = true; break;
          }
        }
      }
    }
    o.x = clamp(o.x, 20, this.room.w - 20);
    if (o.dropT > 0) o.dropT--;
  }

  onPlatform(o) { return o.onGround && o.y < GROUND_Y - 1; }

  // ------------------------------------------------------------ player
  updatePlayer() {
    const p = this.player, hero = this.hero;
    p.t++;
    if (p.invuln > 0) p.invuln--;
    if (p.hidden > 0) p.hidden--;
    p.mp = Math.min(MP_BAR * 3, p.mp + 0.06);
    if (p.dead) { this.physics(p); p.vx *= 0.9; return; }

    const L = Input.held('left'), R = Input.held('right'), D = Input.held('down');
    const jumpP = Input.pressed('jump') || Input.pressed('up');
    const atkP = Input.pressed('attack');

    if (p.state === 'down') {
      p.downT--; p.vx *= 0.85; this.physics(p);
      if (p.downT <= 0) { p.state = 'idle'; p.invuln = 50; }
      return;
    }
    if (p.state === 'hurt') {
      p.hurtT--; p.vx *= p.onGround ? 0.85 : 0.98; this.physics(p);
      if (p.hurtT <= 0 && p.onGround) p.state = 'idle';
      if (p.airHit && p.onGround) { p.state = 'down'; p.downT = 36; p.airHit = false; }
      return;
    }

    // skills can be used any time we're not stunned (cancels combos)
    for (let s = 0; s < 3; s++) {
      if (Input.pressed('s' + (s + 1))) {
        const cost = MP_BAR * (s + 1);
        const canCancel = !p.move || (p.move.kind === 'combo' && p.move.t >= (p.move.def.cancel || 6));
        if (p.mp >= cost && canCancel) {
          p.mp -= cost;
          const sk = hero.skills[s];
          if (L) p.face = -1; else if (R) p.face = 1;
          this.startMove(p, sk, 'skill');
          this.skillBanner = { text: sk.name, t: 60, lvl: s + 1 };
          Shell.vibrate(30);
        } else if (p.mp < cost) {
          this.popup(p.x, p.y - 110, 'Kulang MP!', '#8ecbff');
        }
      }
    }

    if (Input.pressed('potion')) this.usePotion();

    if (p.move) {
      const m = p.move;
      if (atkP && m.kind === 'combo') p.comboBuf = true;
      if (p.comboBuf && m.kind === 'combo' && m.t >= (m.def.cancel || m.def.dur) && p.comboIdx < hero.combo.length - 1) {
        p.comboBuf = false;
        p.comboIdx++;
        if (L) p.face = -1; else if (R) p.face = 1;
        this.startMove(p, hero.combo[p.comboIdx], 'combo');
      }
      this.runMove(p);
      return;
    }

    let dir = (R ? 1 : 0) - (L ? 1 : 0);
    if (Input.pressed('dash') && p.dashT <= 0) {
      if (dir) p.face = dir;
      p.dashT = 16; p.state = 'dash';
      Audio.play('dash');
      this.dust(p.x, p.y);
      if (!p.onGround) p.vy = Math.min(p.vy, -2);
    }
    if (p.dashT > 0) {
      p.dashT--;
      p.vx = p.face * (p.dashT > 4 ? 9 : 5);
      if (atkP) { p.dashT = 0; this.startMove(p, hero.dashAtk, 'dash'); this.runMove(p); return; }
      if (jumpP && p.onGround) { p.vy = -hero.jump; p.jumps = 1; Audio.play('jump'); p.dashT = 0; }
      this.physics(p, p.onGround ? 1 : 0.35);
      if (p.dashT <= 0) p.state = 'idle';
      return;
    }

    p.vx = dir * hero.speed;
    if (dir) p.face = dir;

    if (p.onGround) { p.jumps = 0; p.airAtk = false; }
    if (jumpP) {
      if (p.onGround && D && this.onPlatform(p)) {
        p.dropT = 14; p.onGround = false; p.y += 2;
      } else if (p.onGround) {
        p.vy = -hero.jump; p.jumps = 1; Audio.play('jump'); this.dust(p.x, p.y);
      } else if (p.jumps < 2) {
        p.vy = -hero.jump * 0.85; p.jumps = 2; Audio.play('jump');
        this.burst(p.x, p.y, '#ffffff', 6, 2);
      }
    }

    if (atkP) {
      if (!p.onGround && !p.airAtk) {
        p.airAtk = true;
        this.startMove(p, hero.jumpAtk, 'air');
      } else if (p.onGround) {
        p.comboIdx = 0; p.comboBuf = false;
        this.startMove(p, hero.combo[0], 'combo');
      }
      if (p.move) { this.runMove(p); return; }
    }

    this.physics(p);
    p.state = p.onGround ? (p.vx ? 'run' : 'idle') : p.vy < 0 ? 'jump' : 'fall';
  }

  usePotion() {
    const p = this.player;
    if (Save.data.potions <= 0) { this.popup(p.x, p.y - 110, 'Walang potion', '#ff8a8a'); return; }
    if (p.hp >= p.maxHp) return;
    Save.data.potions--;
    Save.save();
    const heal = Math.round(p.maxHp * 0.45);
    p.hp = Math.min(p.maxHp, p.hp + heal);
    this.popup(p.x, p.y - 110, '+' + heal, '#6dff8a');
    this.burst(p.x, p.y - 50, '#6dff8a', 16, 3);
    Audio.play('potion');
  }

  startMove(o, def, kind) {
    o.move = { def, t: 0, hits: {}, kind };
    o.state = 'move';
    o.dashT = 0;
    if (def.invuln) o.moveInvuln = true;
    if (kind === 'skill') Audio.play('skill');
  }

  runMove(o) {
    const m = o.move, d = m.def;
    for (let i = 0; i < d.events.length; i++) {
      const ev = d.events[i];
      if (ev.f === m.t) this.runEvent(o, ev, m, i);
    }
    m.t++;
    const gs = d.grav != null ? d.grav : 1;
    if (o.fly) {
      o.x += o.vx; o.y += o.vy; o.vx *= 0.95; o.vy *= 0.9;
      o.y = clamp(o.y, 60, GROUND_Y); o.x = clamp(o.x, 20, this.room.w - 20);
    } else {
      if (gs === 0) o.vy = 0;
      this.physics(o, gs);
      if (o.onGround || !d.air) o.vx *= 0.86;
    }
    if (m.t >= d.dur) {
      o.move = null; o.moveInvuln = false; o.state = 'idle';
      if (o.kind === 'player') o.comboBuf = false;
    }
  }

  runEvent(o, ev, m, i) {
    switch (ev.t) {
      case 'hit': this.melee(o, ev, m, ev.group || i); break;
      case 'proj': {
        this.spawnProj(o, { ...ev, x: o.x + o.face * (ev.dx || 0), y: o.y + (ev.dy || 0), vx: (ev.vx || 0) * o.face, vy: ev.vy || 0 });
        break;
      }
      case 'sfx': Audio.play(ev.name); break;
      case 'vel':
        if (ev.vx != null) o.vx = ev.vx * o.face;
        if (ev.vy != null) { o.vy = ev.vy; if (ev.vy < 0) o.onGround = false; }
        break;
      case 'fn': ev.fn(o, this); break;
      case 'shake': this.shake(ev.amt, ev.len); break;
      case 'fx': this.fx(ev.kind, o, ev); break;
    }
  }

  // ------------------------------------------------------------ combat
  hurtbox(t) {
    const s = t.def ? t.def.scale || 1 : 1;
    const w = (t.def ? t.def.w : t.w) * s, h = (t.def ? t.def.h : t.h) * s;
    return { x: t.x - w / 2, y: t.y - h, w, h };
  }

  melee(o, ev, m, key) {
    const b = ev.box;
    const box = { x: o.face > 0 ? o.x + b.x : o.x - b.x - b.w, y: o.y + b.y, w: b.w, h: b.h };
    const set = m.hits[key] || (m.hits[key] = new Set());
    const targets = o.kind === 'player' ? this.enemies : [this.player];
    for (const t of targets) {
      if (t.dead || set.has(t)) continue;
      if (rectsOverlap(box, this.hurtbox(t))) {
        set.add(t);
        this.damage(o, t, ev, o.face);
      }
    }
  }

  hitAllOnScreen(o, opts) {
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (e.x > this.camX - 20 && e.x < this.camX + G.W + 20) {
        this.damage(o, e, opts, Math.sign(e.x - o.x) || 1);
        this.fx('slash', e, { w: 80 });
      }
    }
  }

  damage(src, tgt, o, dir) {
    if (tgt.dead || tgt.invuln > 0 || tgt.moveInvuln || tgt.hidden > 0) return false;
    if (tgt.kind === 'enemy' && (tgt.spawnT > 0 || (tgt.state === 'down' && tgt.downT < 20))) return false;
    const isP = src.kind === 'player';
    const crit = isP && Math.random() < src.crit;
    const base = isP ? src.atk : src.atk * 3.2;
    let dmg = base * (o.dmg || 1) * rand(0.9, 1.1) * (crit ? 1.6 : 1) * (100 / (100 + tgt.dfn * 2));
    dmg = Math.max(1, Math.round(dmg));
    tgt.hp -= dmg;
    const hb = this.hurtbox(tgt);
    this.texts.push({ x: tgt.x + rand(-10, 10), y: hb.y - 4, v: dmg, t: 0, crit, enemy: !isP });
    this.burst(tgt.x - dir * 6, hb.y + hb.h * 0.45, crit ? '#ffe066' : isP ? '#ffffff' : '#ff6b6b', crit ? 12 : 7, crit ? 5 : 3.5);
    Audio.play(crit ? 'crit' : 'hit');
    this.hitstop = Math.max(this.hitstop, crit ? 5 : 3);
    const kx = o.kx != null ? o.kx : 3, ky = o.ky || 0, stun = o.stun || 18;

    if (isP) {
      src.mp = Math.min(MP_BAR * 3, src.mp + 3.2);
      this.combo++; this.comboT = 100; this.maxCombo = Math.max(this.maxCombo, this.combo);
    }

    if (tgt.kind === 'enemy') {
      tgt.hitFlash = 6;
      if (o.freeze) tgt.frozen = Math.max(tgt.frozen, stun);
      let react = true;
      if (tgt.def.poise) {
        tgt.poise -= stun;
        if (tgt.poise > 0) react = false; else tgt.poise = tgt.def.poise;
      }
      if (react && !tgt.frozen) {
        tgt.move = null;
        tgt.vx = dir * kx;
        if (ky < 0 || !tgt.onGround) {
          tgt.vy = ky < 0 ? ky : ky > 0 ? ky * 2 : Math.min(tgt.vy, -3.2);
          tgt.state = 'air'; tgt.onGround = false;
          tgt.juggle = (tgt.juggle || 0) + 1;
        } else {
          tgt.state = 'hurt'; tgt.hurtT = stun;
        }
      }
      if (tgt.hp <= 0) this.kill(tgt, dir);
    } else {
      this.hitsTaken++;
      this.combo = 0;
      tgt.mp = Math.min(MP_BAR * 3, tgt.mp + 6);
      Shell.vibrate(crit ? 60 : 35);
      this.shake(3, 6);
      tgt.move = null; tgt.moveInvuln = false; tgt.dashT = 0;
      tgt.vx = dir * kx;
      if (ky < 0 || !tgt.onGround || dmg > tgt.maxHp * 0.12) {
        tgt.vy = ky < 0 ? ky : -5; tgt.onGround = false; tgt.airHit = true;
      }
      tgt.state = 'hurt'; tgt.hurtT = stun;
      tgt.invuln = 20;
      Audio.play('hurt');
      if (tgt.hp <= 0) {
        tgt.hp = 0; tgt.dead = true; tgt.state = 'down';
        Audio.play('gameover');
        this.later(70, () => { this.over = 'dead'; this.overT = 0; });
      }
    }
    return true;
  }

  kill(e, dir) {
    e.dead = true; e.hp = 0; e.move = null;
    e.state = 'air'; e.vy = -7; e.vx = dir * 4; e.fly = false;
    const exp = Math.round(e.def.exp * this.lvlMul * this.diff.reward);
    this.earnedExp += exp;
    this.popup(e.x, e.y - 90, `+${exp} EXP`, '#9be7ff');
    const gold = Math.round(e.def.gold * this.lvlMul * this.diff.reward);
    const n = Math.min(6, 1 + Math.floor(gold / 10));
    for (let i = 0; i < n; i++) {
      this.coins.push({ x: e.x, y: e.y - 30, vx: rand(-4, 4), vy: rand(-9, -5), v: Math.ceil(gold / n), t: 0, onGround: false });
    }
    if (e.def.boss) {
      this.boss = null;
      this.shake(14, 30);
      this.flashT = 20;
      for (const o of this.enemies) if (!o.dead) this.kill(o, 1);
      this.later(10, () => { Audio.play('boom'); this.burst(e.x, e.y - 60, '#ffd166', 40, 8); });
      this.later(100, () => this.stageClear());
    }
  }

  stageClear() {
    if (this.over) return;
    for (const c of this.coins) this.earnedGold += c.v;
    this.coins = [];
    this.over = 'clear'; this.overT = 0;
    Audio.music(null);
    Audio.play('clear');
  }

  shake(amt, len) {
    if (!Save.data.settings.shake) return;
    this.shakeAmt = Math.max(this.shakeT > 0 ? this.shakeAmt : 0, amt); this.shakeT = Math.max(this.shakeT, len);
  }

  nearestPlayer() { return this.player.dead ? null : this.player; }

  swoop(o, mult = 1) {
    const t = this.player;
    o.face = Math.sign(t.x - o.x) || o.face;
    const dx = t.x - o.x, dy = t.y - 30 - o.y;
    const d = Math.max(1, Math.hypot(dx, dy));
    o.vx = (dx / d) * 11 * mult; o.vy = (dy / d) * 11 * mult;
  }

  teleportBehind(o) {
    const t = this.player;
    this.burst(o.x, o.y - 50, '#ff4d6d', 16, 4);
    o.x = clamp(t.x - t.face * 90, 40, this.room.w - 40);
    o.face = Math.sign(t.x - o.x) || 1;
    this.burst(o.x, o.y - 50, '#ff4d6d', 16, 4);
    Audio.play('dash');
  }

  // ------------------------------------------------------------ enemies
  updateEnemy(e) {
    e.t++;
    if (e.hitFlash > 0) e.hitFlash--;
    if (e.invuln > 0) e.invuln--;
    if (e.spawnT > 0) { e.spawnT--; if (!e.fly) this.physics(e); return; }
    if (e.dead) { e.deadT++; this.physics(e); e.vx *= 0.95; return; }
    if (e.frozen > 0) { e.frozen--; if (!e.fly || e.state === 'air') this.physics(e); return; }

    if (e.state === 'hurt') {
      e.hurtT--; e.vx *= 0.85;
      if (e.fly) { e.x += e.vx; e.x = clamp(e.x, 20, this.room.w - 20); } else this.physics(e);
      if (e.hurtT <= 0) e.state = 'idle';
      return;
    }
    if (e.state === 'air') {
      const juggleG = 0.8 + Math.min(1, (e.juggle || 0) * 0.08);
      this.physics(e, juggleG); e.vx *= 0.98;
      if (e.onGround) {
        e.juggle = 0;
        if (e.fly) { e.state = 'hurt'; e.hurtT = 30; }
        else { e.state = 'down'; e.downT = 50; this.dust(e.x, e.y); }
      }
      return;
    }
    if (e.state === 'down') {
      e.downT--; e.vx *= 0.8; this.physics(e);
      if (e.downT <= 0) { e.state = 'idle'; e.invuln = 30; }
      return;
    }
    if (e.move) { this.runMove(e); return; }

    // --- AI
    const d = e.def, t = this.player;
    if (e.cd > 0) e.cd--;
    if (t.dead) { e.vx = 0; e.state = 'idle'; if (!e.fly) this.physics(e); return; }
    const dx = t.x - e.x, dist = Math.abs(dx), dy = t.y - e.y;
    e.face = dx >= 0 ? 1 : -1;
    let want = 0;

    if (e.fly) {
      const hx = t.x - e.face * 140, hy = clamp(t.y - 150, 90, GROUND_Y - 120);
      e.vx += clamp(hx - e.x, -1, 1) * 0.25; e.vy += clamp(hy - e.y, -1, 1) * 0.25;
      e.vx = clamp(e.vx, -d.speed, d.speed); e.vy = clamp(e.vy, -d.speed, d.speed);
      e.x += e.vx; e.y += e.vy;
      e.x = clamp(e.x, 20, this.room.w - 20);
      e.state = 'walk';
      if (e.cd <= 0 && dist < (d.boss ? 600 : d.range + 60)) this.enemyAttack(e, dist);
      return;
    }

    if (d.ai === 'ranged') {
      if (dist < 170) want = -e.face;
      else if (dist > d.range) want = e.face;
      if (e.cd <= 0 && dist <= d.range && Math.abs(dy) < 160) { this.enemyAttack(e, dist); return; }
    } else {
      if (dist > d.range * 0.75) want = e.face;
      if (e.cd <= 0 && dist <= d.range + 10 && Math.abs(dy) < 90) { this.enemyAttack(e, dist); return; }
      if (d.ai === 'boss' && e.cd <= 0) {
        const far = d.attacks.filter((a) => (a.range || 0) >= dist && this.canUse(e, a));
        if (far.length && Math.random() < 0.03) { this.startEnemyMove(e, far[randi(0, far.length - 1)]); return; }
      }
    }
    // hop onto platforms to chase
    if (e.onGround && dy < -60 && dist < 140 && t.onGround && Math.random() < 0.03 && !d.boss) { e.vy = -12.5; e.onGround = false; }
    if (e.onGround && dy > 60 && this.onPlatform(e) && Math.random() < 0.02) { e.dropT = 14; e.y += 2; }
    e.vx = want * d.speed;
    e.state = want ? 'walk' : 'idle';
    this.physics(e);
  }

  canUse(e, a) { return !a.once || (e.uses[a.dur + '_' + a.windup] || 0) < a.once; }

  enemyAttack(e, dist) {
    const d = e.def;
    const opts = d.attacks.filter((a) => ((a.range || d.range) + 20 >= dist) && this.canUse(e, a));
    if (!opts.length) return;
    this.startEnemyMove(e, opts[randi(0, opts.length - 1)]);
  }

  startEnemyMove(e, a) {
    if (a.once) { const k = a.dur + '_' + a.windup; e.uses[k] = (e.uses[k] || 0) + 1; }
    e.vx = 0;
    this.startMove(e, a, 'enemy');
    const enraged = e.def.boss && e.hp < e.maxHp * 0.4;
    e.cd = e.def.cd * rand(0.8, 1.3) * (enraged ? 0.6 : 1);
  }

  // ------------------------------------------------------------ projectiles
  spawnProj(owner, o) {
    const p = {
      owner, kind: o.kind, x: o.x, y: o.y, vx: o.vx || 0, vy: o.vy || 0,
      w: o.w || 26, h: o.h || 14, dmg: o.dmg != null ? o.dmg : 1, pierce: o.pierce || 0, life: o.life || 60,
      grav: o.grav || 0, kx: o.kx, ky: o.ky, stun: o.stun, explode: o.explode, hit: new Set(), t: 0, player: owner.kind === 'player',
    };
    if (o.aim && owner.kind === 'enemy') {
      const t = this.player;
      if (o.aim === 'arc') {
        const T = (2 * Math.abs(p.vy)) / Math.max(0.1, p.grav) + 10;
        p.vx = clamp((t.x - p.x) / T, -9, 9);
      } else {
        const sp = Math.hypot(p.vx, p.vy) || 6;
        let ang = Math.atan2(t.y - 45 - p.y, t.x - p.x) + (o.spread || 0);
        p.vx = Math.cos(ang) * sp; p.vy = Math.sin(ang) * sp;
      }
    }
    if (o.sfx) Audio.play(o.sfx);
    if (p.dmg > 0 || p.explode) this.projs.push(p);
    return p;
  }

  updateProjs() {
    for (const p of this.projs) {
      p.t++;
      p.vy += p.grav;
      p.x += p.vx; p.y += p.vy;
      p.life--;
      if (p.kind === 'fireball' || p.kind === 'meteor') this.trail(p, '#ff9a3c');
      if (p.kind === 'darkOrb') this.trail(p, '#b84dff');
      if (p.kind === 'wave' || p.kind === 'stormArrow') this.trail(p, p.kind === 'wave' ? '#ff7b2c' : '#8dffb0');
      const box = { x: p.x - p.w / 2, y: p.y - p.h / 2, w: p.w, h: p.h };
      const targets = p.player ? this.enemies : [this.player];
      for (const t of targets) {
        if (t.dead || p.hit.has(t) || p.life <= 0) continue;
        if (rectsOverlap(box, this.hurtbox(t))) {
          p.hit.add(t);
          const ok = this.damage(p.owner, t, p, Math.sign(p.vx) || p.owner.face);
          if (ok || !p.player) {
            if (p.explode) { this.explode(p); p.life = 0; }
            else if (p.pierce-- <= 0) p.life = 0;
          }
        }
      }
      const groundHit = p.y >= GROUND_Y - 4 && p.vy >= 0 && p.kind !== 'shock';
      if (groundHit && p.life > 0) {
        if (p.explode) this.explode(p);
        p.life = 0;
        if (p.kind === 'rock') { this.shake(4, 6); this.dust(p.x, GROUND_Y); }
      }
      if (p.x < -100 || p.x > this.room.w + 100) p.life = 0;
    }
    this.projs = this.projs.filter((p) => p.life > 0);
  }

  explode(p) {
    const r = p.explode.r;
    this.fx('explode', { x: p.x, y: p.y, face: 1 }, { r, dx: 0, dy: 0 });
    Audio.play('boom');
    this.shake(6, 10);
    const box = { x: p.x - r, y: p.y - r, w: r * 2, h: r * 2 };
    const targets = p.player ? this.enemies : [this.player];
    for (const t of targets) {
      if (t.dead) continue;
      if (rectsOverlap(box, this.hurtbox(t))) this.damage(p.owner, t, { dmg: p.explode.dmg, kx: p.explode.kx || 5, ky: p.explode.ky || -6, stun: 35 }, Math.sign(t.x - p.x) || 1);
    }
  }

  updateCoins() {
    const pl = this.player;
    for (const c of this.coins) {
      c.t++;
      if (!c.onGround) {
        c.vy += GRAV; c.x += c.vx; c.y += c.vy;
        if (c.y >= GROUND_Y - 6) { c.y = GROUND_Y - 6; c.vy *= -0.4; c.vx *= 0.6; if (Math.abs(c.vy) < 1) c.onGround = true; }
      }
      const dx = pl.x - c.x, dy = pl.y - 40 - c.y, d = Math.hypot(dx, dy);
      if (c.t > 30 && d < 160 && !pl.dead) { c.x += (dx / d) * 8; c.y += (dy / d) * 8; c.onGround = true; }
      if (d < 26 && c.t > 20) { c.got = true; this.earnedGold += c.v; Audio.play('coin'); }
    }
    this.coins = this.coins.filter((c) => !c.got);
  }

  // ------------------------------------------------------------ fx
  popup(x, y, s, color) { this.texts.push({ x, y, s, color, t: 0 }); }

  burst(x, y, color, n, sp) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = rand(0.3, 1) * sp;
      this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, life: randi(14, 26), max: 26, color, size: rand(2, 4.5), g: 0.12 });
    }
  }
  dust(x, y) {
    for (let i = 0; i < 6; i++) this.parts.push({ x: x + rand(-10, 10), y: y - 2, vx: rand(-1.5, 1.5), vy: rand(-1.2, -0.2), life: 20, max: 20, color: 'rgba(220,210,190,.8)', size: rand(3, 6), g: 0 });
  }
  trail(p, color) {
    if (p.t % 2) return;
    this.parts.push({ x: p.x + rand(-6, 6), y: p.y + rand(-6, 6), vx: 0, vy: -0.3, life: 16, max: 16, color, size: rand(3, 7), g: 0, add: true });
  }

  fx(kind, o, ev) {
    const x = o.x + (o.face || 1) * (ev.dx || 0), y = o.y + (ev.dy || 0);
    switch (kind) {
      case 'spark': this.burst(x, y, '#c9b6ff', 10, 4); break;
      case 'charge':
        for (let i = 0; i < 18; i++) {
          const a = (i / 18) * Math.PI * 2;
          this.parts.push({ x: o.x + Math.cos(a) * 70, y: o.y - 50 + Math.sin(a) * 70, vx: -Math.cos(a) * 4, vy: -Math.sin(a) * 4, life: 16, max: 16, color: '#ffe680', size: 3.5, g: 0, add: true });
        }
        break;
      case 'flash': this.flashT = 14; break;
      case 'slash': this.rings.push({ x: o.x + (o.face || 1) * ((ev.w || 100) / 2), y: o.y - 60, r: (ev.w || 100) * 0.5, t: 0, max: 14, color: '#fff6c7', slash: o.face || 1 }); break;
      case 'ring': this.rings.push({ x: o.x, y: o.y - 40, r: 10, R: ev.r || 120, t: 0, max: 22, color: '#ffd166' }); break;
      case 'explode':
        this.rings.push({ x, y, r: 10, R: ev.r || 80, t: 0, max: 18, color: '#ff9a3c', fill: true });
        this.burst(x, y, '#ffb347', 18, 6);
        break;
      case 'ice':
        this.rings.push({ x: o.x, y: o.y - 50, r: 20, R: ev.r || 160, t: 0, max: 50, color: '#9be7ff', fill: true });
        for (let i = 0; i < 30; i++) this.parts.push({ x: o.x + rand(-170, 170), y: o.y - rand(0, 150), vx: rand(-1, 1), vy: rand(0.5, 2), life: 40, max: 40, color: '#dff6ff', size: rand(2, 5), g: 0, add: true });
        break;
      case 'afterimage':
        for (let i = 0; i < 8; i++) this.later(i * 2, () => this.ghosts.push({ x: o.x, y: o.y, face: o.face, t: 0 }));
        break;
    }
  }

  updateFx() {
    for (const p of this.parts) { p.x += p.vx; p.y += p.vy; p.vy += p.g; p.life--; }
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const t of this.texts) t.t++;
    this.texts = this.texts.filter((t) => t.t < 50);
    for (const r of this.rings) r.t++;
    this.rings = this.rings.filter((r) => r.t < r.max);
    for (const g of this.ghosts) g.t++;
    this.ghosts = this.ghosts.filter((g) => g.t < 16);
  }

  // ------------------------------------------------------------ pause / end
  updatePause(taps) {
    const W = G.W, H = G.H;
    this.menu.set([
      { x: W / 2 - 130, y: H / 2 - 70, w: 260, h: 52, label: 'Ituloy (Resume)', onClick: () => { this.paused = false; } },
      { x: W / 2 - 130, y: H / 2 - 6, w: 260, h: 52, label: 'Sound: ' + (Save.data.settings.sfx > 0 ? 'ON' : 'OFF'), color: '#5a5f7a',
        onClick: () => { const on = Save.data.settings.sfx > 0; Save.data.settings.sfx = on ? 0 : 0.8; Save.data.settings.music = on ? 0 : 0.45; Audio.setVolumes(Save.data.settings.sfx, Save.data.settings.music); Save.save(); } },
      { x: W / 2 - 130, y: H / 2 + 58, w: 260, h: 52, label: 'Umatras (Retreat)', color: '#b8322a', onClick: () => { this.finish(false); } },
    ]);
    this.menu.update(taps);
  }

  updateOver(taps) {
    this.overT++;
    this.updateFx();
    const W = G.W, H = G.H;
    if (this.over === 'dead') {
      const cost = 150 * this.stage.lvl * (this.diffIdx + 1);
      this.menu.set([
        { x: W / 2 - 250, y: H / 2 + 50, w: 240, h: 56, label: 'Revive', sub: `${fmt(cost)} gold`, color: '#2f9e57', disabled: Save.data.gold < cost,
          onClick: () => {
            Save.data.gold -= cost; Save.save();
            const p = this.player;
            p.dead = false; p.hp = p.maxHp; p.mp = MP_BAR * 3; p.state = 'idle'; p.invuln = 120;
            this.over = null; this.burst(p.x, p.y - 50, '#fff', 30, 6); Audio.play('levelup');
          } },
        { x: W / 2 + 10, y: H / 2 + 50, w: 240, h: 56, label: 'Sumuko', sub: 'Babalik sa map (50% rewards)', color: '#b8322a', onClick: () => this.finish(false) },
      ]);
      this.menu.update(taps);
    } else if (this.over === 'clear' && this.overT > 90) {
      if (taps.length || Input.pressed('confirm')) this.finish(true);
    }
  }

  finish(cleared) {
    const rank = cleared ? this.calcRank() : null;
    const mult = cleared ? 1 : 0.5;
    const bonusExp = cleared ? Math.round(60 * this.stage.lvl * this.lvlMul * this.diff.reward) : 0;
    const bonusGold = cleared ? Math.round(80 * this.stage.lvl * this.diff.reward) : 0;
    Scenes.result({
      cleared, rank, heroId: this.heroId, stageIdx: this.stageIdx, diffIdx: this.diffIdx,
      exp: Math.round(this.earnedExp * mult) + bonusExp, gold: Math.round(this.earnedGold * mult) + bonusGold,
      time: this.time, maxCombo: this.maxCombo, hitsTaken: this.hitsTaken,
    });
  }

  calcRank() {
    const secs = this.time / 60;
    let score = 100;
    score -= Math.max(0, secs - 90 - this.stage.lvl * 20) * 0.25;
    score -= this.hitsTaken * 2;
    score += Math.min(20, this.maxCombo * 0.5);
    return score >= 95 ? 'S' : score >= 80 ? 'A' : score >= 60 ? 'B' : 'C';
  }

  // ------------------------------------------------------------ render
  render(ctx) {
    const W = G.W, H = G.H;
    let sx = 0, sy = 0;
    if (this.shakeT > 0) { sx = rand(-1, 1) * this.shakeAmt; sy = rand(-1, 1) * this.shakeAmt * 0.6; }
    const cam = Math.round(this.camX);
    drawBackground(ctx, this.stage.theme, cam, W, H, this.room.w, this.time);
    ctx.save();
    ctx.translate(sx, sy);
    drawGround(ctx, this.stage.theme, cam, W, H, this.room.w, this.room.plats, GROUND_Y);
    ctx.translate(-cam, 0);

    // portal
    if (this.portal) {
      const p = this.portal, k = this.time * 0.1;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = `rgba(120,200,255,${0.6 - i * 0.15})`; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.ellipse(p.x, p.y - 60, 30 + i * 6 + Math.sin(k + i) * 3, 62 + i * 6, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
      text(ctx, 'GO', p.x, p.y - 140 + Math.sin(k) * 5, { align: 'center', size: 22, stroke: '#000' });
    }

    // shadows
    const groundUnder = (o) => {
      if (o.y >= GROUND_Y - 1) return GROUND_Y;
      let best = GROUND_Y;
      for (const pl of this.room.plats) if (o.x > pl.x && o.x < pl.x + pl.w && pl.y >= o.y - 1 && pl.y < best) best = pl.y;
      return best;
    };
    for (const e of this.enemies) drawShadow(ctx, e.x, groundUnder(e), e.def.w * (e.def.scale || 1) * 0.6);
    const pl = this.player;
    drawShadow(ctx, pl.x, groundUnder(pl), 22);

    for (const c of this.coins) {
      ctx.fillStyle = '#ffd54a'; ctx.beginPath(); ctx.ellipse(c.x, c.y, 7 * Math.abs(Math.cos(c.t * 0.15)) + 1, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 1.5; ctx.stroke();
    }

    for (const e of this.enemies) {
      ctx.save();
      if (e.dead) ctx.globalAlpha = Math.max(0, 1 - e.deadT / 60);
      if (e.spawnT > 0) ctx.globalAlpha = 1 - e.spawnT / 40;
      if (e.invuln > 0 && e.t % 4 < 2) ctx.globalAlpha *= 0.5;
      drawEnemy(ctx, e);
      ctx.restore();
      if (!e.def.boss && !e.dead && e.hp < e.maxHp) {
        bar(ctx, e.x - 24, e.y - e.def.h * (e.def.scale || 1) - 12, 48, 6, e.hp / e.maxHp, '#ff5a5a');
      }
    }

    // ghosts (afterimages)
    for (const g of this.ghosts) {
      ctx.save(); ctx.globalAlpha = 0.35 * (1 - g.t / 16);
      drawHero(ctx, g.x, g.y, g.face, this.hero, { state: 'dash', t: 0 }, false);
      ctx.restore();
    }

    if (!(pl.hidden > 0)) {
      ctx.save();
      if (pl.invuln > 0 && pl.t % 6 < 3 && !pl.dead) ctx.globalAlpha = 0.5;
      const m = pl.move;
      const anim = {
        state: pl.dead ? 'down' : pl.state === 'move' ? (pl.onGround ? 'idle' : 'jump') : pl.state, t: pl.t,
        moveT: m ? m.t / m.def.dur : null, swing: m ? m.def.swing : 0, aimUp: 0,
      };
      if (pl.state === 'down') anim.state = 'down';
      drawHero(ctx, pl.x, pl.y, pl.face, this.hero, anim, pl.moveInvuln && m && m.kind === 'skill' && pl.t % 4 < 2);
      ctx.restore();
    }

    for (const p of this.projs) drawProj(ctx, p, this.time);

    // rings
    for (const r of this.rings) {
      const k = r.t / r.max;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - k;
      if (r.slash) {
        ctx.strokeStyle = r.color; ctx.lineWidth = 14 * (1 - k) + 2;
        const a0 = r.slash > 0 ? -1.2 : Math.PI - 1.2;
        ctx.beginPath(); ctx.arc(r.x - r.slash * r.r * 0.6, r.y, r.r, a0, a0 + 2.4); ctx.stroke();
      } else {
        const rad = r.R ? r.r + (r.R - r.r) * Math.sqrt(k) : r.r;
        if (r.fill) { ctx.fillStyle = r.color; ctx.globalAlpha = 0.45 * (1 - k); ctx.beginPath(); ctx.arc(r.x, r.y, rad, 0, Math.PI * 2); ctx.fill(); }
        ctx.strokeStyle = r.color; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(r.x, r.y, rad, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    }

    for (const p of this.parts) {
      ctx.globalAlpha = p.life / p.max;
      if (p.add) ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;

    for (const t of this.texts) {
      const a = 1 - Math.max(0, (t.t - 30) / 20);
      ctx.globalAlpha = a;
      const y = t.y - t.t * 0.9;
      if (t.s) text(ctx, t.s, t.x, y, { align: 'center', size: 16, color: t.color, stroke: '#000', strokeW: 3 });
      else text(ctx, (t.crit ? 'CRIT ' : '') + t.v, t.x, y, { align: 'center', size: t.crit ? 26 : t.enemy ? 22 : 20, color: t.enemy ? '#ff5a5a' : t.crit ? '#ffe066' : '#fff', stroke: '#000', strokeW: 4 });
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    if (this.flashT > 0) { ctx.fillStyle = `rgba(255,255,255,${this.flashT / 20})`; ctx.fillRect(0, 0, W, H); }
    if (pl.move && pl.move.kind === 'skill' && pl.move.t < 16) { ctx.fillStyle = `rgba(0,0,20,${0.35 * (1 - pl.move.t / 16)})`; ctx.fillRect(0, 0, W, H); }

    this.renderHud(ctx);
    if (Input.usingTouch && !this.over && !this.paused) this.renderTouch(ctx);
    if (this.paused) this.renderPause(ctx);
    if (this.over) this.renderOver(ctx);
    renderToast(ctx);
  }

  renderHud(ctx) {
    const W = G.W, p = this.player;
    panel(ctx, 10, 10, 300, 82, 0.6);
    drawPortrait(ctx, this.hero, 50, 51, 32);
    text(ctx, `Lv.${Save.hero(this.heroId).lv} ${this.hero.name}`, 92, 32, { size: 15 });
    bar(ctx, 92, 40, 205, 14, p.hp / p.maxHp, p.hp / p.maxHp < 0.3 ? '#ff4d4d' : '#4cd964');
    text(ctx, `${Math.max(0, Math.ceil(p.hp))}/${p.maxHp}`, 194, 52, { size: 11, align: 'center' });
    for (let i = 0; i < 3; i++) {
      const f = clamp((p.mp - i * MP_BAR) / MP_BAR, 0, 1);
      bar(ctx, 92 + i * 70, 60, 64, 10, f, f >= 1 ? '#4da3ff' : '#2b5c99');
    }
    text(ctx, `POT x${Save.data.potions}`, 92, 86, { size: 12, color: '#ffb3c6' });
    text(ctx, `${fmt(this.earnedGold)}g`, 300, 86, { size: 12, color: '#ffd54a', align: 'right' });

    const right = Input.usingTouch ? W - 80 : W - 16;
    text(ctx, `${this.stage.name} · ${this.diff.name}`, right, 30, { size: 15, align: 'right', stroke: '#000', strokeW: 3 });
    const s = Math.floor(this.time / 60);
    text(ctx, `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`, right, 52, { size: 14, align: 'right', stroke: '#000', strokeW: 3 });

    if (this.combo >= 3) {
      text(ctx, `${this.combo}`, W - 30, 130, { size: 44, align: 'right', color: '#ffd54a', stroke: '#000', strokeW: 5 });
      text(ctx, 'COMBO', W - 30, 152, { size: 16, align: 'right', stroke: '#000', strokeW: 3 });
    }

    if (this.boss && !this.boss.dead) {
      const b = this.boss, bw = Math.min(520, W - 420);
      text(ctx, b.def.name, W / 2, 112, { size: 15, align: 'center', stroke: '#000', strokeW: 3, color: '#ffd1dc' });
      bar(ctx, W / 2 - bw / 2, 118, bw, 14, b.hp / b.maxHp, '#e0245e');
    }

    if (this.banner) {
      const b = this.banner, a = Math.min(1, b.t / 20);
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, 190, W, 70);
      text(ctx, b.text, W / 2, 238, { size: b.boss ? 34 : 30, align: 'center', color: b.boss ? '#ff6b8b' : '#ffe680', stroke: '#000', strokeW: 5 });
      ctx.globalAlpha = 1;
    }
    if (this.skillBanner) {
      const b = this.skillBanner, k = Math.min(1, (60 - b.t) / 8);
      ctx.globalAlpha = Math.min(1, b.t / 12);
      const x = -300 + k * 320;
      ctx.fillStyle = 'rgba(20,30,70,.8)'; ctx.fillRect(x, 150, 320, 46);
      ctx.fillStyle = '#ffd54a'; ctx.fillRect(x, 150, 6, 46);
      text(ctx, `${'★'.repeat(b.lvl)} ${b.text}`, x + 20, 181, { size: 22, color: '#fff' });
      ctx.globalAlpha = 1;
    }
  }

  renderTouch(ctx) {
    const b = Input.stickBase();
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(b.x + Stick.x, b.y + Stick.y, 30, 0, Math.PI * 2); ctx.fill();
    for (const btn of Input.buttons()) {
      let col = 'rgba(255,255,255,.18)';
      let ready = true;
      if (btn.a[0] === 's') {
        const lv = +btn.a[1];
        ready = this.player.mp >= lv * MP_BAR;
        col = ready ? 'rgba(77,163,255,.55)' : 'rgba(80,80,90,.35)';
      }
      if (btn.a === 'attack') col = 'rgba(255,90,90,.45)';
      if (btn.a === 'potion') col = Save.data.potions > 0 ? 'rgba(255,120,170,.4)' : 'rgba(80,80,90,.35)';
      ctx.globalAlpha = Input.held(btn.a) ? 0.95 : 0.7;
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(btn.x, btn.y, btn.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; ctx.stroke();
      text(ctx, btn.label, btn.x, btn.y + 1, { size: btn.r > 40 ? 18 : 13, align: 'center', base: 'middle', color: ready ? '#fff' : '#aaa' });
    }
    ctx.restore();
  }

  renderPause(ctx) {
    dim(ctx, 0.6);
    text(ctx, 'PAUSED', G.W / 2, G.H / 2 - 100, { size: 36, align: 'center', stroke: '#000' });
    this.menu.draw(ctx);
  }

  renderOver(ctx) {
    const W = G.W, H = G.H;
    if (this.over === 'dead') {
      dim(ctx, 0.65);
      text(ctx, 'GAME OVER', W / 2, H / 2 - 40, { size: 48, align: 'center', color: '#ff5a5a', stroke: '#000', strokeW: 6 });
      text(ctx, `Gold mo: ${fmt(Save.data.gold)}`, W / 2, H / 2 + 10, { size: 16, align: 'center' });
      this.menu.draw(ctx);
    } else {
      const k = Math.min(1, this.overT / 30);
      dim(ctx, 0.4 * k);
      ctx.save();
      ctx.translate(W / 2, H / 2 - 30);
      ctx.scale(0.5 + k * 0.5, 0.5 + k * 0.5);
      text(ctx, 'STAGE CLEAR!', 0, 0, { size: 60, align: 'center', color: '#ffe066', stroke: '#6b3e00', strokeW: 8 });
      ctx.restore();
      if (this.overT > 90) text(ctx, 'Tap / Enter para tumuloy', W / 2, H / 2 + 50, { size: 18, align: 'center', color: '#fff', stroke: '#000', strokeW: 3 });
    }
  }
}

