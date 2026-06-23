import { useMemo } from "react";
import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion.js";

const COLORS = ["#8B5CF6", "#FBBF24", "#10B981", "#EF4444", "#60A5FA"];

export function Confetti({ count = 60 }) {
  const reduced = usePrefersReducedMotion();
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.4,
        duration: 1.8 + Math.random() * 1.2,
        rotate: Math.random() * 360,
        color: COLORS[i % COLORS.length],
        width: 6 + Math.random() * 6,
      })),
    [count]
  );

  if (reduced) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50" aria-hidden="true">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          initial={{ x: `${p.x}vw`, y: "-10vh", opacity: 1, rotate: 0 }}
          animate={{ y: "110vh", rotate: p.rotate }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeIn" }}
          style={{
            position: "absolute",
            width: p.width,
            height: p.width * 1.6,
            backgroundColor: p.color,
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  );
}
