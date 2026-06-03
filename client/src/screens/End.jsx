import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { EndForm } from "../components/EndForm.jsx";
import { Leaderboard } from "../components/Leaderboard.jsx";
import { submitScore, fetchLeaderboard } from "../api.js";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion.js";

export function End({ total, gridId, onRestart, onMenu, onRobotReplay }) {
  const reduced = usePrefersReducedMotion();
  const [submitted, setSubmitted] = useState(false);
  const [rank, setRank] = useState(null);
  const [finalScore, setFinalScore] = useState(total);
  const [playerTotal, setPlayerTotal] = useState(null);
  const [board, setBoard] = useState([]);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (!submitted) return;
    const ctrl = new AbortController();
    fetchLeaderboard(20)
      .then((rows) => { if (!ctrl.signal.aborted) setBoard(rows); })
      .catch(() => {});
    return () => ctrl.abort();
  }, [submitted]);

  async function handleSubmit(pseudo) {
    setSubmitError(null);
    try {
      const r = await submitScore({ pseudo, gridId });
      setRank(r.rank);
      setFinalScore(r.score ?? total);
      setPlayerTotal(r.total ?? null);
      setSubmitted(true);
    } catch (e) {
      setSubmitError(
        /session/i.test(e?.message || "")
          ? "Session expirée — score non enregistré."
          : "Échec de l'enregistrement. Réessaie."
      );
    }
  }

  if (!submitted) {
    return (
      <div className="flex flex-col gap-4 max-w-md mx-auto">
        <EndForm score={total} onSubmit={handleSubmit} />
        {submitError && (
          <p role="alert" className="text-danger text-sm text-center">{submitError}</p>
        )}
        {gridId && onRobotReplay && (
          <button
            type="button"
            onClick={onRobotReplay}
            className="border border-surface-2 text-text-muted px-6 py-2 rounded-lg hover:border-primary/40 hover:text-text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors duration-150 text-sm text-center"
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
          initial={reduced ? false : { scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          className="flex items-baseline gap-1"
        >
          <span className="font-display text-5xl font-bold text-success">{finalScore}</span>
          <span className="text-text-muted text-sm">pts</span>
        </motion.div>
        <motion.p
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: reduced ? 0 : 0.5, duration: 0.3 }}
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
        <button type="button" onClick={onRestart} className="bg-primary text-bg px-6 py-2 rounded-lg font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Rejouer</button>
        <button type="button" onClick={onMenu} className="bg-surface px-6 py-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Menu</button>
      </div>
      {gridId && onRobotReplay && (
        <button
          type="button"
          onClick={onRobotReplay}
          className="border border-surface-2 text-text-muted px-6 py-2 rounded-lg hover:border-primary/40 hover:text-text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors duration-150 text-sm text-center"
        >
          Voir la solution du robot
        </button>
      )}
    </section>
  );
}
