import { AnimatePresence, motion } from "framer-motion";

export function FloatingScore({ score, scoreKey }) {
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
      <AnimatePresence mode="wait">
        {score !== null && (
          <motion.span
            key={scoreKey}
            initial={{ opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: 0, y: -48, scale: 1.2 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="font-display font-bold text-3xl text-success"
          >
            +{score}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
