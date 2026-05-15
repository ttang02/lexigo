import { motion } from "framer-motion";

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

export function Tile({ letter, bonus, index, selected, onTap }) {
  const ariaLabel = `Letter ${letter}${bonus ? `, ${BONUS_LABEL[bonus]} bonus` : ""}`;
  return (
    <motion.button
      type="button"
      onClick={() => onTap(index)}
      aria-label={ariaLabel}
      aria-pressed={selected}
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={[
        "relative aspect-square rounded-tile font-display font-bold text-3xl md:text-4xl",
        "flex items-center justify-center select-none",
        "transition-colors duration-150",
        selected
          ? "bg-primary text-bg ring-2 ring-accent shadow-[0_0_16px_rgba(139,92,246,0.6)]"
          : "bg-surface-2 text-text-base hover:bg-surface",
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
