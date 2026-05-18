import { computeScore } from "./score.js";

const COLS = 4;
const ROWS = 4;

function neighbors(idx) {
  const r = Math.floor(idx / COLS);
  const c = idx % COLS;
  const result = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
        result.push(nr * COLS + nc);
      }
    }
  }
  return result;
}

export function solve({ cells, trie }) {
  const best = new Map(); // word → { path, score }

  function dfs(idx, path, visited, word) {
    if (!trie.hasPrefix(word)) return;
    if (word.length >= 2 && trie.hasWord(word)) {
      const score = computeScore({ path, cells });
      const existing = best.get(word);
      if (!existing || score > existing.score) {
        best.set(word, { path: [...path], score });
      }
    }
    for (const next of neighbors(idx)) {
      if (!visited.has(next)) {
        visited.add(next);
        path.push(next);
        dfs(next, path, visited, word + cells[next].letter);
        path.pop();
        visited.delete(next);
      }
    }
  }

  for (let i = 0; i < cells.length; i++) {
    const visited = new Set([i]);
    dfs(i, [i], visited, cells[i].letter);
  }

  return Array.from(best.entries())
    .map(([word, { path, score }]) => ({ word, path, score }))
    .sort((a, b) => b.score - a.score);
}
