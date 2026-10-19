// Minimal canvas button menu (tap + keyboard navigation).
import { G, roundRect, text } from './core.js';
import { Input } from './input.js';
import { Audio } from './audio.js';

export class Menu {
  constructor() { this.items = []; this.focus = 0; this.showFocus = false; }
  set(items) {
    this.items = items;
    if (this.focus >= items.length) this.focus = 0;
    return this;
  }
  update(taps) {
    const nav = this.items.filter((i) => !i.noNav);
    if (nav.length) {
      let dir = 0;
      if (Input.pressed('down') || Input.pressed('right')) dir = 1;
      if (Input.pressed('up') || Input.pressed('left')) dir = -1;
      if (dir) {
        this.showFocus = true;
        this.focus = (this.focus + dir + nav.length) % nav.length;
        Audio.play('select');
      }
      if (this.showFocus && Input.pressed('confirm')) {
        const it = nav[this.focus];
        if (it && !it.disabled) { Audio.play('select'); it.onClick(); return true; }
      }
    }
    for (const t of taps) {
      for (const it of this.items) {
        if (t.x >= it.x && t.x <= it.x + it.w && t.y >= it.y && t.y <= it.y + it.h) {
          if (it.disabled) { Audio.play('back'); return true; }
          Audio.play('select');
          it.onClick();
          return true;
        }
      }
    }
    return false;
  }
  draw(ctx) {
    const nav = this.items.filter((i) => !i.noNav);
    for (const it of this.items) {
      if (it.hidden) continue;
      const focused = this.showFocus && nav[this.focus] === it;
      drawButton(ctx, it, focused);
    }
  }
}

export function drawButton(ctx, it, focused) {
  const col = it.disabled ? '#555b66' : it.color || '#3a6df0';
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  roundRect(ctx, it.x + 2, it.y + 4, it.w, it.h, 12); ctx.fill();
  const g = ctx.createLinearGradient(0, it.y, 0, it.y + it.h);
  g.addColorStop(0, lighten(col)); g.addColorStop(1, col);
  ctx.fillStyle = g;
  roundRect(ctx, it.x, it.y, it.w, it.h, 12); ctx.fill();
  ctx.lineWidth = focused || it.selected ? 4 : 2;
  ctx.strokeStyle = focused ? '#fff' : it.selected ? '#ffd54a' : 'rgba(255,255,255,.35)';
  ctx.stroke();
  const cy = it.y + it.h / 2;
  if (it.sub) {
    text(ctx, it.label, it.x + it.w / 2, cy - 4, { align: 'center', size: it.size || 18, stroke: 'rgba(0,0,0,.4)', strokeW: 3 });
    text(ctx, it.sub, it.x + it.w / 2, cy + 16, { align: 'center', size: 12, weight: '600', color: 'rgba(255,255,255,.85)' });
  } else {
    text(ctx, it.label, it.x + it.w / 2, cy + 1, { align: 'center', base: 'middle', size: it.size || 18, stroke: 'rgba(0,0,0,.4)', strokeW: 3 });
  }
  ctx.restore();
}

function lighten(c) {
  if (c[0] !== '#') return c;
  const n = parseInt(c.slice(1), 16);
  const f = (v) => Math.min(255, v + 40);
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

export function panel(ctx, x, y, w, h, alpha = 0.78) {
  ctx.fillStyle = `rgba(14,18,34,${alpha})`;
  roundRect(ctx, x, y, w, h, 16); ctx.fill();
  ctx.strokeStyle = 'rgba(255,215,90,.55)'; ctx.lineWidth = 2; ctx.stroke();
}

export function bar(ctx, x, y, w, h, frac, col, back = 'rgba(0,0,0,.55)') {
  ctx.fillStyle = back; roundRect(ctx, x, y, w, h, h / 2); ctx.fill();
  if (frac > 0) {
    ctx.fillStyle = col; roundRect(ctx, x, y, Math.max(h, w * Math.min(1, frac)), h, h / 2); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1.5; roundRect(ctx, x, y, w, h, h / 2); ctx.stroke();
}

export function dim(ctx, a = 0.6) {
  ctx.fillStyle = `rgba(0,0,0,${a})`;
  ctx.fillRect(0, 0, G.W, G.H);
}
