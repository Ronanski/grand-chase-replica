// Tiny synthesized SFX + chiptune BGM (no audio files needed, keeps patches small).
let ac = null, sfxGain = null, musGain = null, noiseBuf = null;
let sfxVol = 0.8, musVol = 0.45;
let track = null, nextNoteTime = 0, step = 0, timer = null;

function ensure() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ac = new AC();
    sfxGain = ac.createGain(); sfxGain.gain.value = sfxVol; sfxGain.connect(ac.destination);
    musGain = ac.createGain(); musGain.gain.value = musVol; musGain.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ac.state === 'suspended') ac.resume();
  return true;
}

function tone(type, f0, f1, dur, vol, out = sfxGain, t = ac.currentTime) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(out);
  o.start(t); o.stop(t + dur + 0.02);
}

function noise(dur, vol, freq = 1200, q = 1, type = 'bandpass', out = sfxGain, t = ac.currentTime) {
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noiseBuf;
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(out);
  s.start(t); s.stop(t + dur + 0.02);
}

const SFX = {
  swing: () => noise(0.12, 0.35, 2500, 0.8, 'highpass'),
  hit: () => { noise(0.1, 0.6, 900, 1.2); tone('square', 180, 60, 0.08, 0.15); },
  crit: () => { noise(0.14, 0.7, 1400, 1); tone('square', 520, 120, 0.12, 0.2); },
  hurt: () => { tone('sawtooth', 300, 90, 0.2, 0.25); noise(0.1, 0.4, 600); },
  jump: () => tone('square', 260, 520, 0.1, 0.12),
  dash: () => noise(0.18, 0.3, 700, 0.6, 'lowpass'),
  arrow: () => { noise(0.08, 0.3, 4000, 2, 'highpass'); tone('triangle', 900, 400, 0.08, 0.1); },
  magic: () => { tone('sine', 600, 1200, 0.18, 0.18); tone('triangle', 900, 1800, 0.18, 0.1); },
  boom: () => { noise(0.45, 0.9, 200, 0.7, 'lowpass'); tone('sine', 120, 35, 0.4, 0.4); },
  skill: () => { tone('square', 330, 660, 0.25, 0.12); tone('square', 495, 990, 0.25, 0.08); },
  coin: () => { tone('square', 988, 988, 0.06, 0.1); tone('square', 1319, 1319, 0.14, 0.1, sfxGain, ac.currentTime + 0.06); },
  select: () => tone('square', 660, 880, 0.07, 0.1),
  back: () => tone('square', 440, 330, 0.07, 0.1),
  levelup: () => [523, 659, 784, 1047].forEach((f, i) => tone('square', f, f, 0.15, 0.12, sfxGain, ac.currentTime + i * 0.09)),
  potion: () => { tone('sine', 400, 900, 0.3, 0.2); },
  clear: () => [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone('square', f, f, 0.18, 0.12, sfxGain, ac.currentTime + i * 0.12)),
  gameover: () => [392, 330, 262, 196].forEach((f, i) => tone('triangle', f, f, 0.3, 0.2, sfxGain, ac.currentTime + i * 0.22)),
};

// --- music: simple 2-voice step sequencer -------------------------------
const N = (s) => (s == null ? null : 220 * Math.pow(2, s / 12)); // semitone offset from A3
const TRACKS = {
  title: { bpm: 112, bass: [0, null, 0, null, -4, null, -4, null, -2, null, -2, null, -5, null, -5, null],
    mel: [12, 15, 19, 15, 17, 15, 12, null, 10, 14, 17, 14, 15, 12, 10, null] },
  lobby: { bpm: 100, bass: [-9, null, -5, null, -7, null, -2, null],
    mel: [3, 7, 10, 7, 5, 8, 12, 8, 3, 7, 10, 14, 12, 10, 7, null] },
  stage: { bpm: 140, bass: [0, 0, 12, 0, -2, -2, 10, -2, -4, -4, 8, -4, -5, -5, 7, -5],
    mel: [12, null, 15, 17, 19, null, 17, 15, 14, null, 15, 14, 12, null, 10, null, 12, 15, 19, 22, 24, null, 22, 19, 20, 19, 17, 15, 14, null, null, null] },
  boss: { bpm: 156, bass: [0, 0, 1, 0, 0, 0, 3, 0, 0, 0, 1, 0, -1, -1, -2, -1],
    mel: [12, 13, 12, null, 15, null, 13, 12, 10, null, 12, 13, 15, 16, 15, 13] },
};

function schedule() {
  if (!track || !ac) return;
  const spb = 60 / track.bpm / 2; // eighth notes
  while (nextNoteTime < ac.currentTime + 0.2) {
    const b = track.bass[step % track.bass.length];
    const m = track.mel[step % track.mel.length];
    if (b != null) tone('triangle', N(b - 12), N(b - 12), spb * 0.9, 0.22, musGain, nextNoteTime);
    if (m != null) tone('square', N(m), N(m), spb * 0.8, 0.06, musGain, nextNoteTime);
    if (step % 2 === 0) noise(0.03, 0.08, 6000, 1, 'highpass', musGain, nextNoteTime);
    nextNoteTime += spb;
    step++;
  }
}

export const Audio = {
  unlock() { ensure(); if (track && !timer) Audio.music(track.name, true); },
  play(name) {
    if (!ac || sfxVol <= 0) return;
    try { SFX[name] && SFX[name](); } catch (e) { /* ignore */ }
  },
  music(name, force) {
    const t = TRACKS[name];
    if (!force && track && track.name === name) return;
    track = t ? { ...t, name } : null;
    step = 0;
    if (!ac) return;
    nextNoteTime = ac.currentTime + 0.05;
    if (!timer) timer = setInterval(schedule, 50);
  },
  setVolumes(s, m) {
    sfxVol = s; musVol = m;
    if (sfxGain) sfxGain.gain.value = s;
    if (musGain) musGain.gain.value = m;
  },
  suspend() { if (ac && ac.state === 'running') ac.suspend(); },
  resume() { if (ac && ac.state === 'suspended') ac.resume(); },
};
