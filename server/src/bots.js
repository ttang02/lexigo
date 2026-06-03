import { letterValue } from "./score.js";

const GAME_MS = 120_000;

// Average letter value of a word — proxy for "rarity" (Z/K/W beat A/E/S).
function rarity(entry) {
  let sum = 0;
  for (const ch of entry.word) sum += letterValue(ch);
  return entry.word.length ? sum / entry.word.length : 0;
}

// Each bot is an "agent" with a distinct word-selection policy over the full
// solution set, a skill (fraction of reachable words it actually finds) and a
// pace (avg ms between finds). Personalities make the live race feel alive.
export const BOT_DEFS = [
  {
    id: "glouton", name: "Glouton", emoji: "🦖", color: "#34D399",
    skill: 0.55, speedMs: 6000,
    order: (a, b) => b.word.length - a.word.length || b.score - a.score,
  },
  {
    id: "maximiseur", name: "Maximiseur", emoji: "🧮", color: "#F59E0B",
    skill: 0.45, speedMs: 7000,
    order: (a, b) => b.score - a.score || b.word.length - a.word.length,
  },
  {
    id: "sprinteur", name: "Sprinteur", emoji: "⚡", color: "#60A5FA",
    skill: 0.7, speedMs: 3500,
    order: (a, b) => a.word.length - b.word.length || b.score - a.score,
  },
  {
    id: "explorateur", name: "Explorateur", emoji: "🔭", color: "#C084FC",
    skill: 0.35, speedMs: 8000,
    order: (a, b) => rarity(b) - rarity(a) || b.score - a.score,
  },
];

// Build a timed timeline per bot. `rng` is injectable for deterministic tests.
export function buildBots(solutions, { gameMs = GAME_MS, rng = Math.random } = {}) {
  return BOT_DEFS.map((def) => {
    const ordered = [...solutions].sort(def.order);
    const take = Math.min(
      ordered.length,
      Math.max(solutions.length > 0 ? 1 : 0, Math.round(def.skill * ordered.length))
    );
    const timeline = [];
    let t = 0;
    let total = 0;
    for (let i = 0; i < take; i++) {
      // jitter pace in [0.6x, 1.4x]; rng()=0.5 -> exactly speedMs
      t += def.speedMs * (0.6 + rng() * 0.8);
      if (t > gameMs) break;
      const e = ordered[i];
      timeline.push({ word: e.word, score: e.score, atMs: Math.round(t) });
      total += e.score;
    }
    return {
      id: def.id, name: def.name, emoji: def.emoji, color: def.color,
      timeline, total,
    };
  });
}
