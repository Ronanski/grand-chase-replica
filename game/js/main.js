import { G } from './core.js';
import { Input, initInput } from './input.js';
import { Audio } from './audio.js';
import { Save } from './save.js';
import { Scenes, showToast } from './scenes.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
G.canvas = canvas;
G.ctx = ctx;

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  G.dpr = dpr;
  const iw = window.innerWidth, ih = window.innerHeight;
  canvas.width = Math.round(iw * dpr);
  canvas.height = Math.round(ih * dpr);
  canvas.style.width = iw + 'px';
  canvas.style.height = ih + 'px';
  G.H = 540;
  G.W = Math.round(Math.min(1280, Math.max(760, (540 * iw) / Math.max(1, ih))));
  G.scale = Math.min(canvas.width / G.W, canvas.height / G.H);
  G.offX = (canvas.width - G.W * G.scale) / 2;
  G.offY = (canvas.height - G.H * G.scale) / 2;
}
addEventListener('resize', resize);
resize();

initInput(canvas);
Save.load();
Audio.setVolumes(Save.data.settings.sfx, Save.data.settings.music);
addEventListener('pointerdown', () => Audio.unlock(), { once: false });
addEventListener('keydown', () => Audio.unlock());
document.addEventListener('visibilitychange', () => (document.hidden ? Audio.suspend() : Audio.resume()));

fetch('version.json', { cache: 'no-store' })
  .then((r) => (r.ok ? r.json() : null))
  .then((v) => { if (v) G.version = v; })
  .catch(() => {});

// Android back button -> handled by scene (returns true if consumed)
window.gcOnBack = () => {
  try { return !!(G.scene && G.scene.onBack && G.scene.onBack()); } catch (e) { return false; }
};
// Native shell can show messages in-game
window.gcToast = (msg) => showToast(String(msg));
window.gcPause = () => { if (G.scene && G.scene.paused === false && !G.scene.over) G.scene.paused = true; };

window.__G = G; // debug handles (used by automated tests)
window.__I = Input;
window.__S = Scenes;
Scenes.title();

const STEP = 1000 / 60;
let last = performance.now(), acc = 0;
function frame(now) {
  acc += Math.min(100, now - last);
  last = now;
  let steps = 0;
  while (acc >= STEP && steps < 5) {
    try { G.scene.update(); } catch (e) { console.error(e); }
    Input.endFrame();
    G.frame++;
    acc -= STEP;
    steps++;
  }
  if (steps === 5) acc = 0;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(G.scale, 0, 0, G.scale, G.offX, G.offY);
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, G.W, G.H); ctx.clip();
  try { G.scene.render(ctx); } catch (e) { console.error(e); }
  ctx.restore();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
