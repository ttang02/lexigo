import { computeScore } from "./score.js";

const COLS = 4;
const ROWS = 4;

// Precompute the 8-neighborhood of every cell once at module load.
// Frozen static table — no per-DFS-node array allocation.
const NEIGHBORS = (() => {
  const table = [];
  for (let idx = 0; idx < COLS * ROWS; idx++) {
    const r = Math.floor(idx / COLS);
    const c = idx % COLS;
    const list = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
          list.push(nr * COLS + nc);
        }
      }
    }
    table.push(Object.freeze(list));
  }
  return Object.freeze(table);
})();

export function solve({ cells, trie }) {
  const best = new Map(); // word → { path, score }
  // Track visited cells with a boolean array (faster than Set for 16 cells).
  const visited = new Array(cells.length).fill(false);
  const path = [];
  const letters = []; // parallel to path; join only when a word is confirmed

  // dfs carries the current trie node so each step is a single child lookup
  // instead of re-walking the prefix from root (was 2 walks/node).
  function dfs(idx, node) {
    const letter = cells[idx].letter;
    const next = trie.childOf(node, letter);
    if (!next) return; // dead prefix — prune

    path.push(idx);
    letters.push(letter);
    visited[idx] = true;

    if (path.length >= 2 && next.terminal) {
      const word = letters.join("");
      const existing = best.get(word);
      if (!existing) {
        best.set(word, { path: [...path], score: computeScore({ path, cells }) });
      } else {
        const score = computeScore({ path, cells });
        if (score > existing.score) best.set(word, { path: [...path], score });
      }
    }

    const adj = NEIGHBORS[idx];
    for (let k = 0; k < adj.length; k++) {
      const n = adj[k];
      if (!visited[n]) dfs(n, next);
    }

    path.pop();
    letters.pop();
    visited[idx] = false;
  }

  for (let i = 0; i < cells.length; i++) {
    dfs(i, trie.root);
  }

  return Array.from(best.entries())
    .map(([word, { path, score }]) => ({ word, path, score }))
    .sort((a, b) => b.score - a.score);
}
