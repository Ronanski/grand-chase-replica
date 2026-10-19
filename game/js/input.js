import { G } from './core.js';

// Keyboard map -> logical actions.
const KEYMAP = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
  KeyZ: 'attack', KeyJ: 'attack',
  KeyX: 'jump', Space: 'jump', KeyK: 'jump',
  ShiftLeft: 'dash', ShiftRight: 'dash', KeyL: 'dash',
  KeyA: 's1', KeyS: 's2', KeyD: 's3', Digit1: 's1', Digit2: 's2', Digit3: 's3',
  KeyC: 'potion', KeyQ: 'potion',
  Escape: 'pause', KeyP: 'pause',
  Enter: 'confirm', Backspace: 'back',
};

const held = new Set();
const pressed = new Set();
const lastTap = { left: 0, right: 0 };

// Touch state
const pointers = new Map(); // id -> {x,y,target}
const vHeld = new Set();
const taps = [];
let usingTouch = matchMedia('(pointer: coarse)').matches;

export const Stick = { active: false, cx: 0, cy: 0, x: 0, y: 0, id: null };

export const Input = {
  touchControls: false, // set by gameplay scene
  get usingTouch() { return usingTouch; },
  held(a) { return held.has(a) || vHeld.has(a); },
  pressed(a) { return pressed.has(a); },
  consumeTaps() { return taps.splice(0, taps.length); },
  endFrame() { pressed.clear(); },
  press(a) { pressed.add(a); },
  buttons() { return touchButtons(); },
  stickBase() { return { x: 120, y: G.H - 115, r: 72 }; },
  clear() { held.clear(); vHeld.clear(); pressed.clear(); pointers.clear(); Stick.active = false; },
};

export function touchButtons() {
  const W = G.W, H = G.H;
  return [
    { a: 'attack', x: W - 95, y: H - 95, r: 54, label: 'ATK' },
    { a: 'jump', x: W - 210, y: H - 70, r: 42, label: 'JUMP' },
    { a: 'dash', x: W - 85, y: H - 215, r: 36, label: 'DASH' },
    { a: 's1', x: W - 300, y: H - 50, r: 30, label: 'S1' },
    { a: 's2', x: W - 300, y: H - 130, r: 30, label: 'S2' },
    { a: 's3', x: W - 215, y: H - 165, r: 30, label: 'S3' },
    { a: 'potion', x: W - 175, y: H - 250, r: 26, label: 'POT' },
    { a: 'pause', x: W - 40, y: 40, r: 26, label: 'II' },
  ];
}

function toGame(e) {
  const r = G.canvas.getBoundingClientRect();
  const px = (e.clientX - r.left) * G.dpr;
  const py = (e.clientY - r.top) * G.dpr;
  return { x: (px - G.offX) / G.scale, y: (py - G.offY) / G.scale };
}

function updateStick(p) {
  const b = Input.stickBase();
  let dx = p.x - b.x, dy = p.y - b.y;
  const d = Math.hypot(dx, dy);
  if (d > b.r) { dx = (dx / d) * b.r; dy = (dy / d) * b.r; }
  Stick.x = dx; Stick.y = dy;
  const wasL = vHeld.has('left'), wasR = vHeld.has('right'), wasU = vHeld.has('up');
  vHeld.delete('left'); vHeld.delete('right'); vHeld.delete('down'); vHeld.delete('up');
  if (dx < -b.r * 0.35) { vHeld.add('left'); if (!wasL) dirTap('left'); }
  if (dx > b.r * 0.35) { vHeld.add('right'); if (!wasR) dirTap('right'); }
  if (dy > b.r * 0.55) vHeld.add('down');
  if (dy < -b.r * 0.6) { vHeld.add('up'); if (!wasU) pressed.add('up'); }
}

function releaseStick() {
  Stick.active = false; Stick.id = null; Stick.x = Stick.y = 0;
  vHeld.delete('left'); vHeld.delete('right'); vHeld.delete('down'); vHeld.delete('up');
}

function dirTap(dir) {
  const now = performance.now();
  if (now - lastTap[dir] < 260) pressed.add('dash');
  lastTap[dir] = now;
}

export function initInput(canvas) {
  addEventListener('keydown', (e) => {
    const a = KEYMAP[e.code];
    if (!a) return;
    e.preventDefault();
    if (e.repeat) return;
    usingTouch = false;
    held.add(a);
    pressed.add(a);
    if (a === 'left' || a === 'right') dirTap(a);
    if (a === 'attack' || a === 'jump') pressed.add('confirm');
  });
  addEventListener('keyup', (e) => {
    const a = KEYMAP[e.code];
    if (a) held.delete(a);
  });
  addEventListener('blur', () => Input.clear());

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (e.pointerType === 'touch') usingTouch = true;
    canvas.setPointerCapture?.(e.pointerId);
    const p = toGame(e);
    let target = null;
    if (Input.touchControls && usingTouch) {
      for (const b of touchButtons()) {
        if (Math.hypot(p.x - b.x, p.y - b.y) < b.r + 14) { target = b.a; break; }
      }
      if (!target && p.x < G.W * 0.42 && p.y > G.H * 0.3 && !Stick.active) {
        target = 'stick';
        Stick.active = true; Stick.id = e.pointerId;
        updateStick(p);
      }
      if (target && target !== 'stick') { vHeld.add(target); pressed.add(target); }
    }
    if (!target) taps.push(p);
    pointers.set(e.pointerId, { ...p, target });
  });
  canvas.addEventListener('pointermove', (e) => {
    const ptr = pointers.get(e.pointerId);
    if (!ptr) return;
    const p = toGame(e);
    ptr.x = p.x; ptr.y = p.y;
    if (ptr.target === 'stick') updateStick(p);
  });
  const up = (e) => {
    const ptr = pointers.get(e.pointerId);
    if (!ptr) return;
    pointers.delete(e.pointerId);
    if (ptr.target === 'stick') releaseStick();
    else if (ptr.target) {
      // only release if no other pointer holds the same button
      let still = false;
      for (const o of pointers.values()) if (o.target === ptr.target) still = true;
      if (!still) vHeld.delete(ptr.target);
    }
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}
