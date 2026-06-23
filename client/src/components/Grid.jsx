import { memo, useCallback, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Tile } from "./Tile.jsx";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion.js";

const COLS = 4;
const ROWS = 4;

const gridVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.018 } },
};

function trailOpacity(posInPath, stepIndex) {
  const depth = stepIndex - 1 - posInPath;
  if (depth === 0) return 1;
  if (depth === 1) return 0.65;
  if (depth === 2) return 0.4;
  return 0.15;
}

function GridImpl({
  cells,
  path,
  robotPath = [],
  stepIndex = 0,
  isHolding = false,
  flashPath = [],
  onTap,
}) {
  const reduced = usePrefersReducedMotion();
  const containerRef = useRef(null);
  const [focused, setFocused] = useState(0);

  const selected = useMemo(() => new Set(path), [path]);
  const flashing = useMemo(() => new Set(flashPath), [flashPath]);
  // Map tile index -> position in robot path (O(1) lookup vs indexOf per tile).
  const robotPos = useMemo(() => {
    const m = new Map();
    for (let i = 0; i < robotPath.length; i++) m.set(robotPath[i], i);
    return m;
  }, [robotPath]);
  const isClearing = stepIndex > robotPath.length;

  const focusTile = useCallback((idx) => {
    setFocused(idx);
    containerRef.current
      ?.querySelector(`[data-index="${idx}"]`)
      ?.focus();
  }, []);

  // Roving focus: arrow keys move within the 4x4 grid; Enter/Space select
  // (native button behavior). Keyboard nav itself is not animated.
  const onKeyDown = useCallback(
    (e) => {
      const r = Math.floor(focused / COLS);
      const c = focused % COLS;
      let next = null;
      switch (e.key) {
        case "ArrowRight": next = r * COLS + Math.min(COLS - 1, c + 1); break;
        case "ArrowLeft": next = r * COLS + Math.max(0, c - 1); break;
        case "ArrowDown": next = Math.min(ROWS - 1, r + 1) * COLS + c; break;
        case "ArrowUp": next = Math.max(0, r - 1) * COLS + c; break;
        case "Home": next = 0; break;
        case "End": next = cells.length - 1; break;
        default: return;
      }
      e.preventDefault();
      if (next !== focused) focusTile(next);
    },
    [focused, focusTile, cells.length]
  );

  const onFocusCapture = useCallback((e) => {
    const idx = e.target?.dataset?.index;
    if (idx != null) setFocused(Number(idx));
  }, []);

  return (
    <motion.div
      ref={containerRef}
      className="relative grid grid-cols-4 gap-2 w-full max-w-[480px] aspect-square mx-auto p-2 rounded-2xl bg-surface/40"
      role="group"
      aria-label="Grille Lexigo — flèches pour naviguer, Entrée pour sélectionner une lettre"
      onKeyDown={onKeyDown}
      onFocusCapture={onFocusCapture}
      variants={reduced ? undefined : gridVariants}
      initial={reduced ? false : "hidden"}
      animate="visible"
    >
      {cells.map((c, i) => {
        const pos = robotPos.has(i) ? robotPos.get(i) : -1;
        const revealed = pos !== -1 && pos < stepIndex && !isClearing;
        const robotTrailOpacity = revealed
          ? isHolding
            ? 1
            : trailOpacity(pos, stepIndex)
          : 0;
        const robotPulsing = revealed && isHolding;

        return (
          <Tile
            key={i}
            letter={c.letter}
            bonus={c.bonus}
            index={i}
            reduced={reduced}
            tabIndex={i === focused ? 0 : -1}
            selected={selected.has(i)}
            robotTrailOpacity={robotTrailOpacity}
            robotPulsing={robotPulsing}
            flashing={flashing.has(i)}
            onTap={onTap}
          />
        );
      })}
      {path.length >= 2 && !reduced && (
        <svg
          aria-hidden="true"
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 480 480"
          preserveAspectRatio="xMidYMid meet"
        >
          <polyline
            points={path
              .map((i) => `${8 + (i % 4) * 118 + 55},${8 + Math.floor(i / 4) * 118 + 55}`)
              .join(" ")}
            fill="none"
            stroke="#8B5CF6"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.7"
          />
        </svg>
      )}
    </motion.div>
  );
}

export const Grid = memo(GridImpl);
