import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Grid } from "../components/Grid.jsx";
import { Timer } from "../components/Timer.jsx";
import { WordList } from "../components/WordList.jsx";
import { usePathSelection } from "../hooks/usePathSelection.js";
import { useTimer } from "../hooks/useTimer.js";
import { fetchGrid, validateWord } from "../api.js";

const DURATION = 120_000;

export function Game({ onEnd }) {
  const [grid, setGrid] = useState(null);
  const [words, setWords] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const { path, tap, reset } = usePathSelection();
  const { remainingMs, running, start } = useTimer({
    durationMs: DURATION,
    onEnd: () => onEnd({ words, total: words.reduce((s, w) => s + w.score, 0), gridId: grid?.gridId, cells: grid?.cells }),
  });

  useEffect(() => { fetchGrid().then(setGrid); }, []);

  function handleTap(i) {
    if (!running) start();
    tap(i);
  }

  async function submit() {
    if (!grid || path.length < 2) { reset(); return; }
    const word = path.map((i) => grid.cells[i].letter).join("");
    if (words.some((w) => w.word === word)) { setFeedback({ type: "dup", word }); reset(); return; }
    try {
      const r = await validateWord({ gridId: grid.gridId, path, word });
      if (r.valid) {
        setWords((arr) => [...arr, { word, score: r.score }]);
        setFeedback({ type: "ok", word, score: r.score });
      } else {
        setFeedback({ type: "no", word });
      }
    } catch (e) {
      setFeedback({ type: "err", message: e.message });
    }
    reset();
  }

  if (!grid) return <p>Chargement…</p>;

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_320px] max-w-5xl mx-auto">
      <div className="flex flex-col gap-3">
        <Timer remainingMs={remainingMs} totalMs={DURATION} />
        <Grid cells={grid.cells} path={path} onTap={handleTap} />
        <div className="flex gap-2 justify-center">
          <button onClick={submit} className="bg-primary text-bg font-display font-bold px-6 py-2 rounded-lg">
            Valider
          </button>
          <button onClick={reset} className="bg-surface px-6 py-2 rounded-lg">Effacer</button>
        </div>
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
                {feedback.type === "ok" && <span className="text-success">{feedback.word} +{feedback.score}</span>}
                {feedback.type === "no" && <span className="text-danger">{feedback.word} — pas dans le dico</span>}
                {feedback.type === "dup" && <span className="text-text-muted">{feedback.word} — déjà trouvé</span>}
                {feedback.type === "err" && <span className="text-danger">{feedback.message}</span>}
              </motion.span>
            )}
          </AnimatePresence>
        </p>
      </div>
      <WordList words={words} />
    </section>
  );
}
