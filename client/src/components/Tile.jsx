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

export const tileVariants = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
  },
};

export function Tile({
  letter,
  bonus,
  index,
  selected,
  robotTrailOpacity = 0,
  robotPulsing = false,
  flashing = false,
  onTap,
}) {
  const reduced = usePrefersReducedMotion();
  const ariaLabel = `Letter ${letter}${bonus ? `, ${BONUS_LABEL[bonus]} bonus` : ""}`;

  let bgClass;
  if (flashing) {
    bgClass = "bg-success text-bg ring-2 ring-success";
  } else if (robotTrailOpacity > 0) {
    bgClass =
      "bg-amber-400 text-black" +
      (robotTrailOpacity === 1 ? " ring-2 ring-amber-200" : "");
  } else if (selected) {
    bgClass =
      "bg-primary text-bg ring-2 ring-accent shadow-[0_0_16px_rgba(139,92,246,0.6)]";
  } else {
    bgClass = "bg-surface-2 text-text-base hover:bg-surface";
  }

  let animateProps;
  let transitionProps;

  if (flashing && !reduced) {
    animateProps = { scale: [1, 1.3, 0.95, 1], opacity: 1 };
    transitionProps = { duration: 0.45, ease: "easeOut" };
  } else if (robotPulsing && !reduced) {
    animateProps = {
      scale: [1.12, 1.2, 1.12],
      filter: ["brightness(1)", "brightness(1.5)", "brightness(1)"],
      opacity: 1,
    };
    transitionProps = { duration: 0.5, repeat: Infinity, ease: "easeInOut" };
  } else if (robotTrailOpacity > 0 && !reduced) {
    animateProps = {
      scale: robotTrailOpacity === 1 ? 1.12 : 1,
      opacity: robotTrailOpacity,
      filter: "brightness(1)",
    };
    transitionProps = {
      opacity: { duration: 0.15, ease: "easeOut" },
      scale: { type: "spring", stiffness: 400, damping: 18 },
    };
  } else {
    animateProps = { scale: 1, opacity: 1, filter: "brightness(1)" };
    transitionProps = {
      opacity: { duration: 0.15, ease: "easeOut" },
      scale: SPRING,
    };
  }

  return (
    <motion.button
      type="button"
      onClick={() => onTap(index)}
      aria-label={ariaLabel}
      aria-pressed={selected}
      variants={reduced ? undefined : tileVariants}
      animate={animateProps}
      transition={transitionProps}
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
        <span
          className={`absolute top-1 right-1 text-[10px] font-bold px-1 py-0.5 rounded-md text-white ${BONUS_BG[bonus]}`}
        >
          {bonus}
        </span>
      )}
    </motion.button>
  );
}
