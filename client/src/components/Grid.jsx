import { motion } from "framer-motion";
import { Tile } from "./Tile.jsx";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion.js";

const gridVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.018 } },
};

export function Grid({ cells, path, robotPath = [], onTap }) {
  const reduced = usePrefersReducedMotion();
  const selected = new Set(path);
  const robotSelected = new Set(robotPath);
  return (
    <motion.div
      className="grid grid-cols-4 gap-2 w-full max-w-[480px] aspect-square mx-auto p-2 rounded-2xl bg-surface/40"
      role="group"
      aria-label="Ruzzle grid"
      variants={reduced ? undefined : gridVariants}
      initial={reduced ? false : "hidden"}
      animate="visible"
    >
      {cells.map((c, i) => (
        <Tile
          key={i}
          letter={c.letter}
          bonus={c.bonus}
          index={i}
          selected={selected.has(i)}
          robotSelected={robotSelected.has(i)}
          onTap={onTap}
        />
      ))}
    </motion.div>
  );
}
