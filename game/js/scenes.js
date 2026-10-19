// Menu scenes: Title, Lobby (heroes + shop), Stage select, Result, Settings.
import { G, text, roundRect, fmt, clamp } from './core.js';
import { Input } from './input.js';
import { Audio } from './audio.js';
import { Save, expToNext, MAX_LV } from './save.js';
import { Shell } from './shell.js';
import { HEROES, HERO_ORDER, STAGES, DIFFS, heroStats, upgradeCost, MAX_UPGRADE, POTION_COST, MAX_POTIONS } from './data.js';
import { drawHero, drawBackground, drawPortrait } from './draw.js';
import { Menu, panel, bar, dim } from './ui.js';
import { Battle } from './battle.js';

export const Scenes = {
  title() { G.setScene(new Title()); },
  lobby() { G.setScene(new Lobby()); },
  map() { G.setScene(new StageSelect()); },
  battle(stageIdx, diffIdx) { G.setScene(new Battle(stageIdx, diffIdx, Save.data.selected)); },
  result(r) { G.setScene(new Result(r)); },
  settings(back) { G.setScene(new Settings(back)); },
};

let toast = null;
export function showToast(msg) { toast = { msg, t: 150 }; }
export function renderToast(ctx) {
  if (!toast) return;
  toast.t--;
  if (toast.t <= 0) { toast = null; return; }
  ctx.globalAlpha = Math.min(1, toast.t / 20);
  ctx.font = 'bold 16px system-ui';
  const w = ctx.measureText(toast.msg).width + 40;
  ctx.fillStyle = 'rgba(10,12,24,.9)';
  roundRect(ctx, G.W / 2 - w / 2, G.H - 70, w, 40, 20); ctx.fill();
  text(ctx, toast.msg, G.W / 2, G.H - 44, { size: 16, align: 'center' });
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- Title
class Title {
  constructor() { this.t = 0; }
  enter() { Audio.music('title'); }
  onBack() { Shell.exit(); return true; }
  update() {
    this.t++;
    const taps = Input.consumeTaps();
    if (this.t > 20 && (taps.length || Input.pressed('confirm'))) {
      Audio.unlock();
      Audio.play('select');
      Scenes.lobby();
    }
  }
  render(ctx) {
    const W = G.W, H = G.H;
    drawBackground(ctx, 'forest', this.t * 0.8, W, H, 99999, this.t);
    ctx.fillStyle = 'rgba(10,14,40,.35)'; ctx.fillRect(0, 0, W, H);
    // heroes lineup
    HERO_ORDER.forEach((id, i) => {
      const x = W / 2 - 240 + i * 160;
      drawHero(ctx, x, H - 70 + Math.sin(this.t * 0.05 + i) * 3, i < 2 ? 1 : -1, HEROES[id], { state: 'idle', t: this.t + i * 20 }, false);
    });
    const bob = Math.sin(this.t * 0.04) * 4;
    ctx.save();
    ctx.translate(W / 2, 150 + bob);
    text(ctx, 'GRAND CHASE', 0, 0, { size: 78, align: 'center', color: '#ffd54a', stroke: '#5b2a00', strokeW: 10, font: 'Georgia, serif' });
    text(ctx, 'R E P L I C A', 0, 46, { size: 26, align: 'center', color: '#fff', stroke: '#1a2a5a', strokeW: 6 });
    ctx.restore();
    if (Math.floor(this.t / 30) % 2 === 0) text(ctx, 'I-TAP PARA MAGSIMULA', W / 2, H / 2 + 50, { size: 22, align: 'center', stroke: '#000', strokeW: 4 });
    const info = Shell.info();
    const ver = info ? `App ${info.appVersion} · Patch ${info.gameVersion} · ${info.channel.toUpperCase()}` : `Web build ${G.version.game} (${G.version.channel})`;
    text(ctx, ver, 12, H - 12, { size: 12, color: 'rgba(255,255,255,.8)', stroke: '#000', strokeW: 3 });
    text(ctx, 'Fan-made tribute. Original art & code.', W - 12, H - 12, { size: 12, align: 'right', color: 'rgba(255,255,255,.7)', stroke: '#000', strokeW: 3 });
  }
}

// ---------------------------------------------------------------- Lobby
class Lobby {
  constructor() { this.t = 0; this.menu = new Menu(); }
  enter() { Audio.music('lobby'); }
  onBack() { Scenes.title(); return true; }
  build() {
    const W = G.W, H = G.H, d = Save.data, sel = d.selected, prog = Save.hero(sel);
    const items = [];
    HERO_ORDER.forEach((id, i) => {
      items.push({ x: 16, y: 70 + i * 92, w: 170, h: 82, label: '', hero: id, selected: id === sel, color: '#2a3358',
        onClick: () => { d.selected = id; Save.save(); } });
    });
    const sx = W - 300;
    const up = (key, label) => {
      const lv = prog[key];
      const cost = upgradeCost(lv);
      const maxed = lv >= MAX_UPGRADE;
      items.push({ x: sx, y: 0, w: 284, h: 56, label: `${label} +${lv}`, sub: maxed ? 'MAX' : `Upgrade: ${fmt(cost)}g`, color: '#4b3a8f', disabled: maxed || d.gold < cost,
        onClick: () => { d.gold -= cost; prog[key]++; Save.save(); Audio.play('levelup'); showToast(`${label} upgraded to +${prog[key]}!`); } });
    };
    up('wpn', 'Weapon'); up('arm', 'Armor'); up('acc', 'Accessory');
    items.push({ x: sx, y: 0, w: 284, h: 56, label: `HP Potion (${d.potions}/${MAX_POTIONS})`, sub: `Bili: ${POTION_COST}g`, color: '#9b3a6a', disabled: d.gold < POTION_COST || d.potions >= MAX_POTIONS,
      onClick: () => { d.gold -= POTION_COST; d.potions++; Save.save(); Audio.play('coin'); } });
    items.slice(-4).forEach((it, i) => { it.y = 92 + i * 66; });
    items.push({ x: sx, y: H - 84, w: 284, h: 68, label: 'MAGLARO ▶', size: 26, color: '#d9480f', onClick: () => Scenes.map() });
    items.push({ x: 16, y: H - 74, w: 170, h: 52, label: '⚙ Settings', color: '#4a5068', onClick: () => Scenes.settings('lobby') });
    this.menu.set(items);
  }
  update() {
    this.t++;
    this.build();
    this.menu.update(Input.consumeTaps());
    if (Input.pressed('back')) this.onBack();
  }
  render(ctx) {
    const W = G.W, H = G.H, d = Save.data, sel = d.selected, hero = HEROES[sel], prog = Save.hero(sel);
    drawBackground(ctx, 'temple', 200 + this.t * 0.3, W, H, 99999, this.t);
    ctx.fillStyle = 'rgba(10,10,30,.45)'; ctx.fillRect(0, 0, W, H);
    text(ctx, 'LOBBY', 20, 44, { size: 28, color: '#ffd54a', stroke: '#000', strokeW: 4 });
    text(ctx, `💰 ${fmt(d.gold)}`, W - 20, 44, { size: 22, align: 'right', color: '#ffd54a', stroke: '#000', strokeW: 4 });
    this.menu.draw(ctx);
    // hero cards content
    for (const it of this.menu.items) {
      if (!it.hero) continue;
      const h = HEROES[it.hero], p = Save.hero(it.hero);
      drawPortrait(ctx, h, it.x + 40, it.y + 41, 30);
      text(ctx, h.name, it.x + 80, it.y + 36, { size: 18 });
      text(ctx, `${h.role} · Lv.${p.lv}`, it.x + 80, it.y + 58, { size: 13, color: '#cfd8ff' });
    }
    // center preview
    const cx = (200 + (W - 310)) / 2;
    panel(ctx, 200, 70, W - 520, H - 90, 0.55);
    ctx.save();
    ctx.translate(cx, 300);
    ctx.scale(2, 2);
    drawHero(ctx, 0, 0, 1, hero, { state: 'idle', t: this.t }, false);
    ctx.restore();
    text(ctx, `${hero.name} — ${hero.role}`, cx, 104, { size: 24, align: 'center', color: hero.colors.trim, stroke: '#000', strokeW: 4 });
    wrap(ctx, hero.desc, cx, 128, W - 560, 15);
    const st = heroStats(sel, prog);
    const by = 330;
    text(ctx, `Lv. ${prog.lv}`, 220, by, { size: 18, color: '#ffd54a' });
    const need = expToNext(prog.lv);
    bar(ctx, 290, by - 14, W - 640, 14, prog.lv >= MAX_LV ? 1 : prog.exp / need, '#9be7ff');
    text(ctx, prog.lv >= MAX_LV ? 'MAX' : `${fmt(prog.exp)}/${fmt(need)}`, 290 + (W - 640) / 2, by - 3, { size: 11, align: 'center' });
    const stats = [['HP', st.maxHp], ['ATK', st.atk], ['DEF', st.def], ['CRIT', Math.round(st.crit * 100) + '%']];
    stats.forEach(([k, v], i) => {
      const x = 220 + (i % 2) * ((W - 560) / 2), y = by + 30 + Math.floor(i / 2) * 26;
      text(ctx, k, x, y, { size: 15, color: '#9aa6d6' });
      text(ctx, String(v), x + 60, y, { size: 16 });
    });
    text(ctx, 'Skills: ' + hero.skills.map((s, i) => `${'★'.repeat(i + 1)} ${s.name}`).join('   '), cx, H - 40, { size: 13, align: 'center', color: '#cfd8ff' });
    text(ctx, 'SHOP', W - 158, 82, { size: 16, align: 'center', color: '#ffd54a' });
    renderToast(ctx);
  }
}

function wrap(ctx, str, x, y, maxW, size) {
  ctx.font = `600 ${size}px system-ui, sans-serif`;
  const words = str.split(' ');
  let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) {
      text(ctx, line, x, y, { size, align: 'center', weight: '600', color: '#e8ecff' });
      line = w; y += size + 4;
    } else line = t;
  }
  if (line) text(ctx, line, x, y, { size, align: 'center', weight: '600', color: '#e8ecff' });
}

// ---------------------------------------------------------------- Stage select
class StageSelect {
  constructor() {
    this.t = 0; this.menu = new Menu();
    const d = Save.data;
    this.sel = 0;
    for (let i = 0; i < STAGES.length; i++) if (this.unlocked(i)) this.sel = i;
    this.diff = 0;
  }
  unlocked(i) { return i === 0 || Save.data.cleared[STAGES[i - 1].id] != null; }
  diffUnlocked(i, di) { return di === 0 || (Save.data.cleared[STAGES[i].id] ?? -1) >= di - 1; }
  enter() { Audio.music('lobby'); }
  onBack() { Scenes.lobby(); return true; }
  nodePos(i) {
    const W = G.W;
    const xs = [0.12, 0.3, 0.5, 0.68, 0.86];
    const ys = [330, 230, 300, 190, 260];
    return { x: W * xs[i], y: ys[i] };
  }
  build() {
    const W = G.W, H = G.H;
    const items = [];
    STAGES.forEach((s, i) => {
      const p = this.nodePos(i);
      items.push({ x: p.x - 46, y: p.y - 46, w: 92, h: 92, label: '', noNav: true, hidden: true, onClick: () => { if (this.unlocked(i)) { this.sel = i; this.diff = 0; } else showToast('I-clear muna ang naunang stage!'); } });
    });
    DIFFS.forEach((df, di) => {
      const ok = this.diffUnlocked(this.sel, di);
      items.push({ x: W / 2 - 330 + di * 150, y: H - 82, w: 140, h: 56, label: df.name, sub: ok ? `x${df.reward} rewards` : 'Locked', color: ok ? '#33415e' : '#555', selected: this.diff === di, disabled: !ok, noNav: true,
        onClick: () => { this.diff = di; } });
    });
    items.push({ x: W / 2 + 130, y: H - 86, w: 200, h: 64, label: 'START ▶', size: 24, color: '#d9480f', noNav: true, onClick: () => Scenes.battle(this.sel, this.diff) });
    items.push({ x: 16, y: 16, w: 110, h: 44, label: '◀ Back', color: '#4a5068', noNav: true, onClick: () => Scenes.lobby() });
    this.menu.set(items);
  }
  update() {
    this.t++;
    if (Input.pressed('left') && this.sel > 0) { this.sel--; this.diff = 0; Audio.play('select'); }
    if (Input.pressed('right') && this.sel < STAGES.length - 1 && this.unlocked(this.sel + 1)) { this.sel++; this.diff = 0; Audio.play('select'); }
    if (Input.pressed('up') && this.diffUnlocked(this.sel, this.diff + 1) && this.diff < 2) { this.diff++; Audio.play('select'); }
    if (Input.pressed('down') && this.diff > 0) { this.diff--; Audio.play('select'); }
    this.build();
    const taps = Input.consumeTaps();
    // keyboard: confirm starts
    if (Input.pressed('confirm')) { Audio.play('select'); Scenes.battle(this.sel, this.diff); return; }
    if (Input.pressed('back')) { this.onBack(); return; }
    this.menu.update(taps);
  }
  render(ctx) {
    const W = G.W, H = G.H;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#2b5876'); g.addColorStop(1, '#4e4376');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // land mass
    ctx.fillStyle = '#5f8f4e';
    ctx.beginPath(); ctx.ellipse(W / 2, 270, W * 0.47, 170, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7fb27a';
    ctx.beginPath(); ctx.ellipse(W / 2, 260, W * 0.44, 150, 0, 0, Math.PI * 2); ctx.fill();
    // path
    ctx.strokeStyle = 'rgba(255,240,200,.7)'; ctx.lineWidth = 6; ctx.setLineDash([12, 10]);
    ctx.beginPath();
    STAGES.forEach((s, i) => { const p = this.nodePos(i); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
    ctx.stroke(); ctx.setLineDash([]);
    const themeCol = { forest: '#2f9e57', gorge: '#c58f5b', cliffs: '#6f8798', temple: '#8a5a33', castle: '#4a1f3d' };
    STAGES.forEach((s, i) => {
      const p = this.nodePos(i), un = this.unlocked(i), sel = i === this.sel;
      const r = sel ? 40 + Math.sin(this.t * 0.1) * 3 : 34;
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(p.x, p.y + r * 0.8, r, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = un ? themeCol[s.theme] : '#555';
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = sel ? 5 : 3; ctx.strokeStyle = sel ? '#ffd54a' : '#fff'; ctx.stroke();
      text(ctx, un ? String(i + 1) : '🔒', p.x, p.y + 2, { size: 26, align: 'center', base: 'middle', stroke: '#000', strokeW: 4 });
      text(ctx, s.name, p.x, p.y + r + 22, { size: 14, align: 'center', stroke: '#000', strokeW: 4 });
      const c = Save.data.cleared[s.id];
      if (c != null) text(ctx, '★'.repeat(c + 1), p.x, p.y - r - 8, { size: 16, align: 'center', color: '#ffd54a', stroke: '#000', strokeW: 3 });
    });
    const s = STAGES[this.sel];
    panel(ctx, W / 2 - 220, 14, 440, 64, 0.7);
    text(ctx, `${this.sel + 1}. ${s.name}`, W / 2, 42, { size: 22, align: 'center', color: '#ffd54a' });
    const best = Save.data.best[`${s.id}_${this.diff}`];
    text(ctx, `Rec. Lv ${1 + (s.lvl - 1) * 4 + this.diff * 12}+  ·  Best: ${best || '-'}`, W / 2, 66, { size: 14, align: 'center', color: '#cfd8ff' });
    this.menu.draw(ctx);
    renderToast(ctx);
  }
}

// ---------------------------------------------------------------- Result
class Result {
  constructor(r) {
    this.r = r; this.t = 0; this.menu = new Menu();
    const d = Save.data, prog = Save.hero(r.heroId);
    this.startLv = prog.lv;
    d.gold += r.gold;
    prog.exp += r.exp;
    this.levels = 0;
    while (prog.lv < MAX_LV && prog.exp >= expToNext(prog.lv)) { prog.exp -= expToNext(prog.lv); prog.lv++; this.levels++; }
    if (prog.lv >= MAX_LV) prog.exp = 0;
    if (r.cleared) {
      const id = STAGES[r.stageIdx].id;
      d.cleared[id] = Math.max(d.cleared[id] ?? -1, r.diffIdx);
      const key = `${id}_${r.diffIdx}`, order = 'CBAS';
      if (!d.best[key] || order.indexOf(r.rank) > order.indexOf(d.best[key])) d.best[key] = r.rank;
    }
    Save.save();
  }
  enter() { Audio.music('lobby'); if (this.levels) setTimeout(() => Audio.play('levelup'), 600); }
  onBack() { Scenes.map(); return true; }
  update() {
    this.t++;
    const W = G.W, H = G.H;
    this.menu.set([
      { x: W / 2 - 230, y: H - 90, w: 220, h: 58, label: 'Ulitin', color: '#33415e', onClick: () => Scenes.battle(this.r.stageIdx, this.r.diffIdx) },
      { x: W / 2 + 10, y: H - 90, w: 220, h: 58, label: 'Tuloy ▶', color: '#d9480f', onClick: () => Scenes.map() },
    ]);
    if (this.t > 30) this.menu.update(Input.consumeTaps()); else Input.consumeTaps();
  }
  render(ctx) {
    const W = G.W, H = G.H, r = this.r, hero = HEROES[r.heroId], prog = Save.hero(r.heroId);
    drawBackground(ctx, STAGES[r.stageIdx].theme, 0, W, H, 9999, this.t);
    dim(ctx, 0.55);
    panel(ctx, W / 2 - 330, 30, 660, H - 140, 0.75);
    text(ctx, r.cleared ? 'RESULTA' : 'UMATRAS', W / 2, 74, { size: 32, align: 'center', color: r.cleared ? '#ffd54a' : '#ff8a8a', stroke: '#000', strokeW: 4 });
    ctx.save(); ctx.translate(W / 2 - 200, 260); ctx.scale(1.6, 1.6);
    drawHero(ctx, 0, 0, 1, hero, { state: 'idle', t: this.t }, false); ctx.restore();
    if (r.rank) {
      const k = clamp(this.t / 25, 0, 1);
      ctx.save(); ctx.translate(W / 2 + 200, 190); ctx.scale(2.6 - k * 1.6, 2.6 - k * 1.6); ctx.globalAlpha = k;
      const col = { S: '#ffd54a', A: '#ff8a5c', B: '#7bd3ff', C: '#c0c0c0' }[r.rank];
      text(ctx, r.rank, 0, 30, { size: 96, align: 'center', color: col, stroke: '#000', strokeW: 8, font: 'Georgia, serif' });
      ctx.restore();
      text(ctx, 'RANK', W / 2 + 200, 250, { size: 16, align: 'center', color: '#cfd8ff' });
    }
    const secs = Math.floor(r.time / 60);
    const rows = [
      ['Oras', `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`],
      ['Max Combo', r.maxCombo],
      ['Tinamaan', r.hitsTaken],
      ['EXP', '+' + fmt(r.exp)],
      ['Gold', '+' + fmt(r.gold)],
    ];
    rows.forEach(([k, v], i) => {
      if (this.t < 10 + i * 8) return;
      text(ctx, k, W / 2 - 60, 130 + i * 30, { size: 17, color: '#9aa6d6' });
      text(ctx, String(v), W / 2 + 100, 130 + i * 30, { size: 18, align: 'right' });
    });
    const need = expToNext(prog.lv);
    text(ctx, `Lv. ${prog.lv}`, W / 2 - 300, H - 160, { size: 18, color: '#ffd54a' });
    bar(ctx, W / 2 - 230, H - 174, 520, 16, prog.lv >= MAX_LV ? 1 : prog.exp / need, '#9be7ff');
    if (this.levels && Math.floor(this.t / 20) % 2 === 0) {
      text(ctx, `LEVEL UP! Lv.${this.startLv} → Lv.${prog.lv}`, W / 2, H - 196, { size: 22, align: 'center', color: '#7bff9e', stroke: '#000', strokeW: 4 });
    }
    this.menu.draw(ctx);
  }
}

// ---------------------------------------------------------------- Settings
class Settings {
  constructor(back) { this.back = back; this.menu = new Menu(); this.confirmReset = 0; this.t = 0; }
  onBack() { this.goBack(); return true; }
  goBack() { Scenes[this.back] ? Scenes[this.back]() : Scenes.lobby(); }
  update() {
    this.t++;
    if (this.confirmReset > 0) this.confirmReset--;
    const W = G.W, s = Save.data.settings;
    const info = Shell.info();
    const x1 = W / 2 - 300, x2 = W / 2 + 10;
    const items = [
      { x: x1, y: 110, w: 290, h: 52, label: `Sound FX: ${s.sfx > 0 ? 'ON' : 'OFF'}`, color: '#4a5068', onClick: () => { s.sfx = s.sfx > 0 ? 0 : 0.8; this.apply(); } },
      { x: x1, y: 172, w: 290, h: 52, label: `Music: ${s.music > 0 ? 'ON' : 'OFF'}`, color: '#4a5068', onClick: () => { s.music = s.music > 0 ? 0 : 0.45; this.apply(); } },
      { x: x1, y: 234, w: 290, h: 52, label: `Screen Shake: ${s.shake ? 'ON' : 'OFF'}`, color: '#4a5068', onClick: () => { s.shake = !s.shake; this.apply(); } },
      { x: x1, y: 296, w: 290, h: 52, label: this.confirmReset ? 'Sigurado? Tap ulit!' : 'Reset Save Data', color: '#8f2d2d',
        onClick: () => { if (this.confirmReset) { Save.reset(); this.confirmReset = 0; showToast('Na-reset ang save data.'); } else this.confirmReset = 180; } },
    ];
    if (info) {
      items.push(
        { x: x2, y: 172, w: 290, h: 52, label: `Channel: ${info.channel === 'beta' ? 'BETA' : 'STABLE'}`, sub: 'Tap para palitan', color: info.channel === 'beta' ? '#b35c00' : '#2f7d4f',
          onClick: () => { Shell.setChannel(info.channel === 'beta' ? 'stable' : 'beta'); } },
        { x: x2, y: 234, w: 290, h: 52, label: 'Check for Updates', color: '#3a6df0', onClick: () => { Shell.checkUpdates(); showToast('Naghahanap ng updates...'); } },
        { x: x2, y: 296, w: 290, h: 52, label: 'Update Settings', sub: 'Auto-patch, channel, atbp.', color: '#5a4bb3', onClick: () => Shell.openUpdates() },
      );
    }
    items.push({ x: W / 2 - 110, y: G.H - 80, w: 220, h: 54, label: '◀ Bumalik', color: '#d9480f', onClick: () => this.goBack() });
    this.menu.set(items);
    this.menu.update(Input.consumeTaps());
    if (Input.pressed('back')) this.goBack();
  }
  apply() { Audio.setVolumes(Save.data.settings.sfx, Save.data.settings.music); Save.save(); }
  render(ctx) {
    const W = G.W, H = G.H;
    drawBackground(ctx, 'cliffs', 300, W, H, 9999, this.t);
    dim(ctx, 0.6);
    text(ctx, 'SETTINGS', W / 2, 60, { size: 32, align: 'center', color: '#ffd54a', stroke: '#000', strokeW: 4 });
    text(ctx, 'Laro', W / 2 - 155, 98, { size: 16, align: 'center', color: '#cfd8ff' });
    const info = Shell.info();
    text(ctx, 'Updates', W / 2 + 155, 98, { size: 16, align: 'center', color: '#cfd8ff' });
    if (info) {
      text(ctx, `App v${info.appVersion} (${info.appVersionCode})`, W / 2 + 155, 128, { size: 15, align: 'center' });
      text(ctx, `Game patch #${info.gameVersion}${info.autoPatch ? ' · auto-patch ON' : ''}`, W / 2 + 155, 152, { size: 14, align: 'center', color: '#cfd8ff' });
    } else {
      text(ctx, `Web build ${G.version.game} (${G.version.channel})`, W / 2 + 155, 140, { size: 15, align: 'center' });
      text(ctx, 'Laging latest ang web version.', W / 2 + 155, 166, { size: 13, align: 'center', color: '#cfd8ff' });
    }
    this.menu.draw(ctx);
    renderToast(ctx);
  }
}
