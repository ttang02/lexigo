import { motion } from "framer-motion";
import { Tile } from "./Tile.jsx";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion.js";

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

export function Grid({
  cells,
  path,
  robotPath = [],
  stepIndex = 0,
  isHolding = false,
  flashPath = [],
  onTap,
}) {
  const reduced = usePrefersReducedMotion();
  const selected = new Set(path);
  const flashing = new Set(flashPath);
  const isClearing = stepIndex > robotPath.length;

  return (
    <motion.div
      className="grid grid-cols-4 gap-2 w-full max-w-[480px] aspect-square mx-auto p-2 rounded-2xl bg-surface/40"
      role="group"
      aria-label="Ruzzle grid"
      variants={reduced ? undefined : gridVariants}
      initial={reduced ? false : "hidden"}
      animate="visible"
    >
      {cells.map((c, i) => {
        const posInPath = robotPath.indexOf(i);
        const revealed =
          posInPath !== -1 && posInPath < stepIndex && !isClearing;

        const robotTrailOpacity = revealed
          ? isHolding
            ? 1
            : trailOpacity(posInPath, stepIndex)
          : 0;

        const robotPulsing = revealed && isHolding;

        return (
          <Tile
            key={i}
            letter={c.letter}
            bonus={c.bonus}
            index={i}
            selected={selected.has(i)}
            robotTrailOpacity={robotTrailOpacity}
            robotPulsing={robotPulsing}
            flashing={flashing.has(i)}
            onTap={onTap}
          />
        );
      })}
    </motion.div>
  );
}
