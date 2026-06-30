/* global localStorage */
// Web Audio API tones — no asset files needed. Muted state persists in localStorage.
const MUTE_KEY = "lexigo-muted";
let ctx = null;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function isSoundMuted() {
  return localStorage.getItem(MUTE_KEY) === "1";
}

export function setSoundMuted(muted) {
  localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
}

function tone(freq, duration, type = "sine", gainPeak = 0.12) {
  if (isSoundMuted() || typeof window === "undefined") return;
  try {
    const audioCtx = getCtx();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(gainPeak, audioCtx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch {
    /* AudioContext unavailable — fail silently */
  }
}

export function playClick() {
  tone(440, 0.05, "square", 0.04);
}

export function playValid() {
  tone(660, 0.1, "sine", 0.1);
  setTimeout(() => tone(880, 0.1, "sine", 0.1), 60);
}

export function playError() {
  tone(160, 0.15, "sawtooth", 0.07);
}

export function playVictory() {
  [523, 659, 784, 1046].forEach((freq, i) => {
    setTimeout(() => tone(freq, 0.2, "sine", 0.1), i * 90);
  });
}
