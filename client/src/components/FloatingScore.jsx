import { AnimatePresence, motion } from "framer-motion";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion.js";

export function FloatingScore({ score, scoreKey }) {
  const reduced = usePrefersReducedMotion();
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
      <AnimatePresence mode="wait">
        {score !== null && (
          <motion.span
            key={scoreKey}
            initial={{ opacity: 1, y: 0, scale: 1 }}
            animate={reduced ? { opacity: 0 } : { opacity: 0, y: -48, scale: 1.2 }}
            transition={{ duration: reduced ? 0.15 : 0.6, ease: "easeOut" }}
            className="font-display font-bold text-3xl text-success"
          >
            +{score}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
