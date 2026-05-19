import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { EndForm } from "../components/EndForm.jsx";
import { Leaderboard } from "../components/Leaderboard.jsx";
import { submitScore, fetchLeaderboard } from "../api.js";

export function End({ total, gridId, onRestart, onMenu, onRobotReplay }) {
  const [submitted, setSubmitted] = useState(false);
  const [rank, setRank] = useState(null);
  const [playerTotal, setPlayerTotal] = useState(null);
  const [board, setBoard] = useState([]);

  useEffect(() => { if (submitted) fetchLeaderboard(20).then(setBoard); }, [submitted]);

  async function handleSubmit(pseudo) {
    const r = await submitScore({ pseudo, score: total });
    setRank(r.rank);
    setPlayerTotal(r.total ?? null);
    setSubmitted(true);
  }

  if (!submitted) {
    return (
      <div className="flex flex-col gap-4 max-w-md mx-auto">
        <EndForm score={total} onSubmit={handleSubmit} />
        {gridId && onRobotReplay && (
          <button
            onClick={onRobotReplay}
            className="border border-surface-2 text-text-muted px-6 py-2 rounded-lg hover:border-primary/40 hover:text-text-base transition-colors duration-150 text-sm text-center"
          >
            Voir la solution du robot
          </button>
        )}
      </div>
    );
  }

  return (
    <section className="max-w-md mx-auto flex flex-col gap-4">
      <div className="flex flex-col items-center gap-1 py-2">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          className="flex items-baseline gap-1"
        >
          <span className="font-display text-5xl font-bold text-success">{total}</span>
          <span className="text-text-muted text-sm">pts</span>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
          className="text-text-muted text-sm"
        >
          Tu es{" "}
          <span className="text-accent font-bold">#{rank}</span>
          {playerTotal != null && (
            <> sur <span className="text-text-muted">{playerTotal}</span> joueurs</>
          )}
        </motion.p>
      </div>
      <Leaderboard rows={board} />
      <div className="flex gap-2 justify-center">
        <button onClick={onRestart} className="bg-primary text-bg px-6 py-2 rounded-lg font-bold">Rejouer</button>
        <button onClick={onMenu} className="bg-surface px-6 py-2 rounded-lg">Menu</button>
      </div>
      {gridId && onRobotReplay && (
        <button
          onClick={onRobotReplay}
          className="border border-surface-2 text-text-muted px-6 py-2 rounded-lg hover:border-primary/40 hover:text-text-base transition-colors duration-150 text-sm text-center"
        >
          Voir la solution du robot
        </button>
      )}
    </section>
  );
}
