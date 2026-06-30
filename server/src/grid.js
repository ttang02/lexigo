// Use the Web Crypto global (available in Cloudflare Workers and modern Node)
// instead of `node:crypto`, so this module works without Node compat mode.
/* global crypto */

const FRENCH_DIST = {
  A:9,B:2,C:2,D:3,E:15,F:2,G:2,H:2,I:8,J:1,K:1,L:5,M:3,
  N:6,O:6,P:2,Q:1,R:6,S:6,T:6,U:6,V:2,W:1,X:1,Y:1,Z:1,
};

export const FRENCH_TILE_POOL = Object.entries(FRENCH_DIST)
  .flatMap(([letter, count]) => Array(count).fill(letter));

export const BONUSES = ["DL", "TL", "DW", "TW"];
const BONUS_WEIGHTS = { DL: 0.60, TL: 0.20, DW: 0.15, TW: 0.05 };

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickBonus(rng) {
  const r = rng();
  let acc = 0;
  for (const b of BONUSES) {
    acc += BONUS_WEIGHTS[b];
    if (r <= acc) return b;
  }
  return "DL";
}

export function generateGrid({ seed } = {}) {
  const rng = seed != null ? mulberry32(seed) : Math.random;
  const pool = [...FRENCH_TILE_POOL];
  for (let i = pool.length - 1; i > pool.length - 17; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const letters = pool.slice(-16);

  const cells = letters.map((letter) => ({ letter, bonus: null }));

  const bonusCount = 3 + Math.floor(rng() * 2);
  const indices = [...Array(16).keys()];
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  for (let k = 0; k < bonusCount; k++) {
    cells[indices[k]].bonus = pickBonus(rng);
  }

  return { gridId: crypto.randomUUID(), cells, seed: seed ?? null };
}
