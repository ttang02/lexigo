import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion.js";
import { RuzzleLogo } from "../components/RuzzleLogo.jsx";

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
};

export function Menu({ onPlay, onLeaderboard, onPlayBombe }) {
  const reduced = usePrefersReducedMotion();
  return (
    <motion.section
      className="flex flex-col items-center gap-6 max-w-md mx-auto"
      variants={reduced ? undefined : container}
      initial={reduced ? false : "hidden"}
      animate="visible"
    >
      <motion.div variants={reduced ? undefined : item}>
        <RuzzleLogo />
      </motion.div>
      <motion.p
        variants={reduced ? undefined : item}
        className="text-text-muted text-sm tracking-widest uppercase"
      >
        FR
      </motion.p>
      <motion.p variants={reduced ? undefined : item} className="text-text-muted text-center">
        Trouve un maximum de mots en 2 minutes.
      </motion.p>
      <motion.button
        variants={reduced ? undefined : item}
        onClick={onPlay}
        className="bg-primary text-bg font-display font-bold px-8 py-3 rounded-xl text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        Jouer — 2 min
      </motion.button>
      <motion.button
        variants={reduced ? undefined : item}
        onClick={onPlayBombe}
        className="bg-danger/90 text-bg font-display font-bold px-8 py-3 rounded-xl text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent hover:bg-danger transition-colors"
      >
        💣 Mode Bombe — 60s
      </motion.button>
      <motion.button
        variants={reduced ? undefined : item}
        onClick={onLeaderboard}
        className="border border-surface-2 text-text-muted px-6 py-2 rounded-lg hover:border-primary/40 hover:text-text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors duration-150"
      >
        Voir le classement
      </motion.button>
    </motion.section>
  );
}
