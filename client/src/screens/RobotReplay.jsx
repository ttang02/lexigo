import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Grid } from "../components/Grid.jsx";
import { fetchSolution } from "../api.js";
import { useRobotReplay } from "../hooks/useRobotReplay.js";

function SolutionList({ solutions, wordIndex, done }) {
  const activeRef = useRef(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, [wordIndex]);

  return (
    <div className="flex flex-col gap-1 overflow-y-auto max-h-[480px] pr-1">
      {solutions.map((s, i) => {
        const isActive = !done && i === wordIndex;
        const isPast = done || i < wordIndex;
        return (
          <div
            key={s.word}
            ref={isActive ? activeRef : null}
            className={[
              "flex justify-between items-center px-3 py-1.5 rounded-lg text-sm transition-colors duration-200",
              isActive
                ? "bg-amber-400/20 text-amber-400 font-bold"
                : isPast
                ? "text-text-muted"
                : "text-text-base",
            ].join(" ")}
          >
            <span className="font-display">{s.word}</span>
            <span className="tabular-nums text-xs">{isPast || isActive ? `+${s.score}` : ""}</span>
          </div>
        );
      })}
    </div>
  );
}

export function RobotReplay({ gridId, cells, onDone }) {
  const [solutions, setSolutions] = useState(null);
  const [error, setError] = useState(null);

  const { play, skip, activeIndices, currentEntry, wordIndex, total, done } =
    useRobotReplay({ solutions: solutions ?? [] });

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
        <p className="text-danger">{error}</p>
        <button onClick={onDone} className="bg-surface px-6 py-2 rounded-lg">
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

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_260px] max-w-5xl mx-auto">
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h2 className="font-display font-bold text-xl">Solution du robot</h2>
          <button
            onClick={() => { skip(); onDone(); }}
            className="text-text-muted underline text-sm"
          >
            Passer →
          </button>
        </div>

        <Grid
          cells={cells}
          path={[]}
          robotPath={[...activeIndices]}
          onTap={() => {}}
        />

        <div className="h-10 flex items-center justify-between px-1">
          <AnimatePresence mode="wait">
            {currentEntry && (
              <motion.span
                key={currentEntry.word}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="font-display font-bold text-2xl text-amber-400"
              >
                {currentEntry.word}
              </motion.span>
            )}
          </AnimatePresence>
          <span className="text-text-muted text-sm tabular-nums">
            {currentEntry ? `+${currentEntry.score} · ` : ""}mot {wordIndex + 1} / {total}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="font-display font-bold text-sm text-text-muted uppercase tracking-wide">
          Mots trouvés
        </h3>
        <SolutionList solutions={solutions} wordIndex={wordIndex} done={done} />
      </div>
    </section>
  );
}
