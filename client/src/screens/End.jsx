import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { EndForm } from "../components/EndForm.jsx";
import { Leaderboard } from "../components/Leaderboard.jsx";
import { submitScore, fetchLeaderboard, fetchSolution } from "../api.js";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion.js";

// --- Stats helpers ---
function bestWord(words) {
  if (!words.length) return null;
  return words.reduce((a, b) => (b.score > a.score ? b : a));
}

function buildShareText({ score, rank, playerTotal, botsBeaten, botsTotal, words, solutions }) {
  const found = words.length;
  const total = solutions?.length ?? "?";
  const best = bestWord(words);
  const pct = solutions?.length ? Math.round((found / solutions.length) * 100) : null;

  const botsLine = botsTotal > 0
    ? `🤖 ${botsBeaten}/${botsTotal} robots battus`
    : "";

  const statsLine = pct !== null
    ? `📊 ${found}/${total} mots (${pct}%)`
    : `📊 ${found} mots trouvés`;

  const bestLine = best ? `⭐ Meilleur : ${best.word} (+${best.score})` : "";
  const rankLine = playerTotal != null ? `🏆 Rang #${rank} sur ${playerTotal}` : `🏆 Rang #${rank}`;

  return [
    "🔤 Ruzzle",
    `${score} pts`,
    rankLine,
    botsLine,
    statsLine,
    bestLine,
    "",
    "ruzzle.app",
  ].filter(Boolean).join("\n");
}

// --- Post-game stats panel ---
function StatsPanel({ words, solutions, finalScore, rank, playerTotal, botsBeaten, botsTotal }) {
  const [copied, setCopied] = useState(false);
  const found = words.length;
  const total = solutions?.length;
  const pct = total ? Math.round((found / total) * 100) : null;
  const best = bestWord(words);

  // Top 3 missed words by score
  const foundSet = new Set(words.map((w) => w.word));
  const missed = solutions
    ? solutions.filter((s) => !foundSet.has(s.word)).sort((a, b) => b.score - a.score).slice(0, 3)
    : [];

  async function handleShare() {
    const text = buildShareText({ score: finalScore, rank, playerTotal, botsBeaten, botsTotal, words, solutions });
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard not available */
    }
  }

  return (
    <div className="bg-surface rounded-2xl p-4 flex flex-col gap-3">
      {/* Quick numbers */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="font-display font-bold text-xl text-primary">
            {found}{total != null ? `/${total}` : ""}
          </div>
          <div className="text-[11px] text-text-muted">mots</div>
        </div>
        <div>
          <div className="font-display font-bold text-xl text-primary">
            {pct != null ? `${pct}%` : "—"}
          </div>
          <div className="text-[11px] text-text-muted">couverture</div>
        </div>
        <div>
          <div className="font-display font-bold text-xl text-primary">
            {best ? `+${best.score}` : "—"}
          </div>
          <div className="text-[11px] text-text-muted">{best ? best.word : "best"}</div>
        </div>
      </div>

      {/* Missed words */}
      {missed.length > 0 && (
        <div>
          <p className="text-xs text-text-muted mb-1">Mots manqués 😬</p>
          <div className="flex flex-wrap gap-1">
            {missed.map((s) => (
              <span key={s.word} className="text-xs bg-surface-2 px-2 py-0.5 rounded-full text-text-muted">
                {s.word} <span className="text-danger/80">+{s.score}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Share button */}
      <button
        type="button"
        onClick={handleShare}
        className="w-full bg-surface-2 hover:bg-surface-2/80 text-text-base px-4 py-2 rounded-lg text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors"
      >
        {copied ? "✅ Copié !" : "📋 Partager mon score"}
      </button>
    </div>
  );
}

// --- Main End screen ---
export function End({ total, gridId, bots = [], words = [], onRestart, onMenu, onRobotReplay }) {
  const reduced = usePrefersReducedMotion();
  const [submitted, setSubmitted] = useState(false);
  const [rank, setRank] = useState(null);
  const [finalScore, setFinalScore] = useState(total);
  const [playerTotal, setPlayerTotal] = useState(null);
  const [board, setBoard] = useState([]);
  const [submitError, setSubmitError] = useState(null);
  const [solutions, setSolutions] = useState(null);

  useEffect(() => {
    if (!submitted) return;
    const ctrl = new AbortController();
    fetchLeaderboard(20)
      .then((rows) => { if (!ctrl.signal.aborted) setBoard(rows); })
      .catch(() => {});
    // Fetch solutions for stats (missed words, coverage %)
    if (gridId) {
      fetchSolution(gridId)
        .then((r) => { if (!ctrl.signal.aborted) setSolutions(r.solutions); })
        .catch(() => {});
    }
    return () => ctrl.abort();
  }, [submitted, gridId]);

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

  const botsBeaten = bots.filter((b) => finalScore > b.total).length;

  return (
    <section className="max-w-md mx-auto flex flex-col gap-4">
      {/* Score + rank */}
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

      {/* Bots result */}
      {bots.length > 0 && (
        <p className="text-center text-sm text-text-muted">
          <span aria-hidden="true">🤖 </span>
          Tu as battu{" "}
          <span className="text-accent font-bold">{botsBeaten}</span>{" "}
          robot{bots.length > 1 ? "s" : ""} sur {bots.length}
        </p>
      )}

      {/* Stats + share */}
      <StatsPanel
        words={words}
        solutions={solutions}
        finalScore={finalScore}
        rank={rank}
        playerTotal={playerTotal}
        botsBeaten={botsBeaten}
        botsTotal={bots.length}
      />

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
