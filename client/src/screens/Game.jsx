import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Grid } from "../components/Grid.jsx";
import { Timer } from "../components/Timer.jsx";
import { WordList } from "../components/WordList.jsx";
import { FloatingScore } from "../components/FloatingScore.jsx";
import { usePathSelection } from "../hooks/usePathSelection.js";
import { useTimer } from "../hooks/useTimer.js";
import { fetchGrid, validateWord } from "../api.js";
import { BonusLegend } from "../components/BonusLegend.jsx";

const DURATION = 120_000;

export function Game({ onEnd }) {
  const [grid, setGrid] = useState(null);
  const [words, setWords] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [flashPath, setFlashPath] = useState([]);
  const [floatingScore, setFloatingScore] = useState(null);
  const [scoreKey, setScoreKey] = useState(0);
  const [gridError, setGridError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const flashTimersRef = useRef([]);
  const submittingRef = useRef(false);
  const { path, tap, reset } = usePathSelection();

  const total = useMemo(() => words.reduce((s, w) => s + w.score, 0), [words]);

  const { remainingMs, running, start } = useTimer({
    durationMs: DURATION,
    onEnd: () => onEnd({ words, total, gridId: grid?.gridId, cells: grid?.cells }),
  });

  useEffect(() => {
    setGrid(null);
    setGridError(null);
    fetchGrid()
      .then(setGrid)
      .catch(() => setGridError(true));
  }, [retryCount]);

  useEffect(() => () => { flashTimersRef.current.forEach(clearTimeout); }, []);

  const handleTap = useCallback((i) => {
    if (!running) start();
    tap(i);
  }, [running, start, tap]);

  const submit = useCallback(async () => {
    if (submittingRef.current) return; // lock: block concurrent submits
    if (!grid || path.length < 2) { reset(); return; }
    const word = path.map((i) => grid.cells[i].letter).join("");
    if (words.some((w) => w.word === word)) {
      setFeedback({ type: "dup", word });
      reset();
      return;
    }
    submittingRef.current = true;
    try {
      const r = await validateWord({ gridId: grid.gridId, path, word });
      if (r.valid) {
        setWords((arr) => (arr.some((w) => w.word === word) ? arr : [...arr, { word, score: r.score }]));
        setFeedback({ type: "ok", word, score: r.score });
        setFlashPath([...path]);
        setFloatingScore(r.score);
        setScoreKey((k) => k + 1);
        flashTimersRef.current.forEach(clearTimeout);
        flashTimersRef.current = [
          setTimeout(() => setFlashPath([]), 500),
          setTimeout(() => setFloatingScore(null), 650),
        ];
      } else {
        setFeedback({ type: "no", word });
      }
    } catch (e) {
      setFeedback({ type: "err", message: e.message });
    } finally {
      submittingRef.current = false;
      reset();
    }
  }, [grid, path, words, reset]);

  if (gridError) return (
    <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
      <p className="text-danger text-center">Impossible de charger la grille. Vérifie ta connexion.</p>
      <button
        type="button"
        onClick={() => setRetryCount((c) => c + 1)}
        className="bg-surface px-6 py-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        Réessayer
      </button>
    </div>
  );
  if (!grid) return <p className="text-center text-text-muted">Chargement…</p>;

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_320px] max-w-5xl mx-auto">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Timer remainingMs={remainingMs} totalMs={DURATION} />
          <span className="font-display font-bold text-xl text-primary tabular-nums">
            {total}{" "}
            <span className="text-sm text-text-muted font-normal">pts</span>
          </span>
        </div>
        <div className="relative">
          <Grid
            cells={grid.cells}
            path={path}
            flashPath={flashPath}
            onTap={handleTap}
          />
          <FloatingScore score={floatingScore} scoreKey={scoreKey} />
        </div>
        <div className="flex gap-2 justify-center">
          <button
            type="button"
            onClick={submit}
            className="bg-primary text-bg font-display font-bold px-6 py-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Valider
          </button>
          <button
            type="button"
            onClick={reset}
            className="bg-surface px-6 py-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Effacer
          </button>
        </div>
        <BonusLegend />
        <p role="status" aria-live="polite" className="text-center text-sm h-5">
          <AnimatePresence mode="wait">
            {feedback && (
              <motion.span
                key={`${feedback.type}-${feedback.word ?? ""}`}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="inline-block"
              >
                {feedback.type === "ok" && (
                  <span className="text-success">{feedback.word} +{feedback.score}</span>
                )}
                {feedback.type === "no" && (
                  <span className="text-danger">{feedback.word} — pas dans le dico</span>
                )}
                {feedback.type === "dup" && (
                  <span className="text-text-muted">{feedback.word} — déjà trouvé</span>
                )}
                {feedback.type === "err" && (
                  <span className="text-danger">{feedback.message}</span>
                )}
              </motion.span>
            )}
          </AnimatePresence>
        </p>
      </div>
      <WordList words={words} />
    </section>
  );
}
