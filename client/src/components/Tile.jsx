import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion.js";

const BONUS_LABEL = {
  DL: "double letter",
  TL: "triple letter",
  DW: "double word",
  TW: "triple word",
};
const BONUS_BG = {
  DL: "bg-bonus-dl",
  TL: "bg-bonus-tl",
  DW: "bg-bonus-dw",
  TW: "bg-bonus-tw",
};

const SPRING = { type: "spring", stiffness: 300, damping: 20 };
const ROBOT_SPRING = { type: "spring", stiffness: 400, damping: 18 };

export const tileVariants = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
  },
};

export function Tile({ letter, bonus, index, selected, robotSelected, onTap }) {
  const reduced = usePrefersReducedMotion();
  const ariaLabel = `Letter ${letter}${bonus ? `, ${BONUS_LABEL[bonus]} bonus` : ""}`;

  let bgClass;
  if (robotSelected) {
    bgClass = "bg-amber-400 text-black ring-2 ring-amber-200";
  } else if (selected) {
    bgClass = "bg-primary text-bg ring-2 ring-accent shadow-[0_0_16px_rgba(139,92,246,0.6)]";
  } else {
    bgClass = "bg-surface-2 text-text-base hover:bg-surface";
  }

  return (
    <motion.button
      type="button"
      onClick={() => onTap(index)}
      aria-label={ariaLabel}
      aria-pressed={selected}
      variants={reduced ? undefined : tileVariants}
      animate={robotSelected && !reduced ? { scale: 1.12 } : { scale: 1 }}
      transition={robotSelected ? ROBOT_SPRING : undefined}
      whileTap={reduced ? {} : { scale: 0.95, transition: SPRING }}
      whileHover={reduced ? {} : { scale: 1.05, transition: SPRING }}
      className={[
        "relative aspect-square rounded-tile font-display font-bold text-3xl md:text-4xl",
        "flex items-center justify-center select-none",
        "transition-colors duration-150",
        bgClass,
      ].join(" ")}
    >
      {letter}
      {bonus && (
        <span className={`absolute top-1 right-1 text-[10px] font-bold px-1 py-0.5 rounded-md text-white ${BONUS_BG[bonus]}`}>
          {bonus}
        </span>
      )}
    </motion.button>
  );
}
