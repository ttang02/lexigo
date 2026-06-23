import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion.js";

const LETTERS = ["L", "E", "X", "I", "G", "O"];
const TILE = 56;
const GAP = 8;
const COLS = 3;
const W = COLS * TILE + (COLS - 1) * GAP; // 184
const H = 2 * TILE + GAP;                  // 120

export function LexigoLogo() {
  const reduced = usePrefersReducedMotion();

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className={reduced ? "" : "logo-svg-glow"}
      aria-label="Lexigo"
      role="img"
    >
      {LETTERS.map((letter, i) => {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const x = col * (TILE + GAP);
        const y = row * (TILE + GAP);

        return (
          <g
            key={i}
            className={reduced ? "" : "logo-tile-pop"}
            style={reduced ? {} : { animationDelay: `${i * 80}ms` }}
          >
            <rect
              x={x}
              y={y}
              width={TILE}
              height={TILE}
              rx={10}
              ry={10}
              fill="#241D40"
              stroke="#8B5CF6"
              strokeOpacity="0.45"
              strokeWidth="1.5"
            />
            <text
              x={x + TILE / 2}
              y={y + TILE / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#F4F1FF"
              fontSize="26"
              fontWeight="bold"
              fontFamily="'Space Grotesk', sans-serif"
            >
              {letter}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
