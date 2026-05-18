const COLS = 4;

function rc(i) { return { r: Math.floor(i / COLS), c: i % COLS }; }

export function isPathValid(path, cells) {
  if (!Array.isArray(path) || path.length < 2 || path.length > 16) return false;
  const seen = new Set();
  for (let k = 0; k < path.length; k++) {
    const idx = path[k];
    if (!Number.isInteger(idx) || idx < 0 || idx >= cells.length) return false;
    if (seen.has(idx)) return false;
    seen.add(idx);
    if (k > 0) {
      const a = rc(path[k-1]);
      const b = rc(idx);
      if (Math.abs(a.r - b.r) > 1 || Math.abs(a.c - b.c) > 1) return false;
      if (a.r === b.r && a.c === b.c) return false;
    }
  }
  return true;
}

export function wordFromPath(path, cells) {
  return path.map((i) => cells[i].letter).join("");
}
