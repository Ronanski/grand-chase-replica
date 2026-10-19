// Shared runtime state + small helpers.
export const G = {
  W: 960,
  H: 540,
  scale: 1,
  offX: 0,
  offY: 0,
  dpr: 1,
  canvas: null,
  ctx: null,
  scene: null,
  frame: 0,
  version: { game: 'dev', channel: 'local' },
  setScene(s) {
    if (G.scene && G.scene.exit) G.scene.exit();
    G.scene = s;
    if (s.enter) s.enter();
  },
};

export const GROUND_Y = 470;
export const GRAV = 0.62;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => a + Math.random() * (b - a);
export const randi = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const rectsOverlap = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export function fmt(n) {
  return Math.floor(n).toLocaleString('en-US');
}

export function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function text(ctx, str, x, y, opt = {}) {
  ctx.font = `${opt.weight || 'bold'} ${opt.size || 18}px ${opt.font || 'system-ui, sans-serif'}`;
  ctx.textAlign = opt.align || 'left';
  ctx.textBaseline = opt.base || 'alphabetic';
  if (opt.stroke) {
    ctx.lineWidth = opt.strokeW || 4;
    ctx.strokeStyle = opt.stroke;
    ctx.lineJoin = 'round';
    ctx.strokeText(str, x, y);
  }
  ctx.fillStyle = opt.color || '#fff';
  ctx.fillText(str, x, y);
}
