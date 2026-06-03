import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Grid } from "../components/Grid.jsx";
import { fetchSolution } from "../api.js";
import { useRobotReplay } from "../hooks/useRobotReplay.js";

function SolutionList({ solutions, done }) {
  const listRef = useRef(null);

  useEffect(() => {
    listRef.current?.lastElementChild?.scrollIntoView?.({
      block: "nearest",
      behavior: "smooth",
    });
  }, [solutions.length]);

  return (
    <ul
      ref={listRef}
      role="list"
      tabIndex={0}
      aria-label="Mots trouvés par le robot"
      className="flex flex-col gap-1 overflow-y-auto max-h-[480px] pr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg"
    >
      <AnimatePresence>
        {solutions.map((s, i) => {
          const isActive = !done && i === solutions.length - 1;
          return (
            <motion.li
              key={s.word}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className={[
                "flex justify-between items-center px-3 py-1.5 rounded-lg text-sm",
                isActive
                  ? "bg-amber-400/20 text-amber-400 font-bold"
                  : "text-text-base",
              ].join(" ")}
            >
              <span className="font-display">{s.word}</span>
              <span className="tabular-nums text-xs">+{s.score}</span>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}

export function RobotReplay({ gridId, cells, onDone }) {
  const [solutions, setSolutions] = useState(null);
  const [error, setError] = useState(null);

  const {
    play,
    skip,
    stepIndex,
    isHolding,
    currentEntry,
    wordIndex,
    total,
    done,
  } = useRobotReplay({ solutions: solutions ?? [] });

  useEffect(() => {
    fetchSolution(gridId)
      .then(({ solutions: s }) => setSolutions(s))
      .catch(() => setError("Grille expirée, solution indisponible."));
  }, [gridId]);

  useEffect(() => {
    if (solutions === null) return;
    if (solutions.length === 0) return;
    play();
  }, [solutions, play]);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(onDone, 800);
    return () => clearTimeout(t);
  }, [done, onDone]);

  if (error) {
    return (
      <section className="flex flex-col items-center gap-4 max-w-md mx-auto">
        <p className="text-danger" role="alert">{error}</p>
        <button type="button" onClick={onDone} className="bg-surface px-6 py-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          Retour
        </button>
      </section>
    );
  }

  if (!solutions) {
    return <p className="text-center text-text-muted">Calcul en cours…</p>;
  }

  if (solutions.length === 0) {
    return <p className="text-center text-text-muted">Aucun mot valide trouvé.</p>;
  }

  const revealedSolutions = done ? solutions : solutions.slice(0, wordIndex + 1);

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_260px] max-w-5xl mx-auto">
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h2 className="font-display font-bold text-xl">Solution du robot</h2>
          <button
            type="button"
            onClick={() => { skip(); onDone(); }}
            aria-label="Passer la solution du robot"
            className="text-text-muted underline text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
          >
            Passer <span aria-hidden="true">→</span>
          </button>
        </div>

        <Grid
          cells={cells}
          path={[]}
          robotPath={currentEntry?.path ?? []}
          stepIndex={stepIndex}
          isHolding={isHolding}
          onTap={() => {}}
        />

        <div className="h-10 flex items-center justify-between px-1">
          <span aria-live="polite" aria-atomic="true">
            <AnimatePresence mode="wait">
              {currentEntry && (
                <motion.span
                  key={currentEntry.word}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="inline-block font-display font-bold text-2xl text-amber-400"
                >
                  {currentEntry.word}
                </motion.span>
              )}
            </AnimatePresence>
          </span>
          <span className="text-text-muted text-sm tabular-nums">
            {currentEntry ? `+${currentEntry.score} · ` : ""}mot {wordIndex + 1} / {total}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="font-display font-bold text-sm text-text-muted uppercase tracking-wide">
          Mots trouvés
        </h3>
        <SolutionList solutions={revealedSolutions} done={done} />
      </div>
    </section>
  );
}
