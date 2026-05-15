import { useCallback, useState } from "react";

const COLS = 4;

function isAdjacent(a, b) {
  const ar = Math.floor(a / COLS), ac = a % COLS;
  const br = Math.floor(b / COLS), bc = b % COLS;
  if (a === b) return false;
  return Math.abs(ar - br) <= 1 && Math.abs(ac - bc) <= 1;
}

export function usePathSelection() {
  const [path, setPath] = useState([]);

  const tap = useCallback((idx) => {
    setPath((p) => {
      if (p.length === 0) return [idx];
      const last = p[p.length - 1];
      if (idx === last) return p;
      if (p.length >= 3 && idx === p[p.length - 2]) return p.slice(0, -1);
      if (p.includes(idx)) return p;
      if (!isAdjacent(last, idx)) return p;
      return [...p, idx];
    });
  }, []);

  const reset = useCallback(() => setPath([]), []);

  return { path, tap, reset };
}
