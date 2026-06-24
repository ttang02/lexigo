import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Grid } from "../components/Grid.jsx";
import { Timer } from "../components/Timer.jsx";
import { WordList } from "../components/WordList.jsx";
import { FloatingScore } from "../components/FloatingScore.jsx";
import { usePathSelection } from "../hooks/usePathSelection.js";
import { useTimer } from "../hooks/useTimer.js";
import { fetchGrid, fetchDailyGrid, validateWord, fetchBots, fetchHint, pushRoomScore } from "../api.js";
import { BonusLegend } from "../components/BonusLegend.jsx";
import { BotsPanel } from "../components/BotsPanel.jsx";
import { playClick, playValid, playError } from "../utils/sound.js";

const DURATIONS = { normal: 120_000, bombe: 60_000, daily: 120_000 };

export function Game({ onEnd, mode = "normal", onMenu, overrideGrid = null, multiRoomCode = null, multiPlayerId = null }) {
  const DURATION = DURATIONS[mode] ?? DURATIONS.normal;
  const isBombe = mode === "bombe";
  const isDaily = mode === "daily";

  const [grid, setGrid] = useState(null);
  const [words, setWords] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [flashPath, setFlashPath] = useState([]);
  const [floatingScore, setFloatingScore] = useState(null);
  const [scoreKey, setScoreKey] = useState(0);
  const [gridError, setGridError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [bots, setBots] = useState([]);
  const [hinting, setHinting] = useState(false);
  const [hintCooldown, setHintCooldown] = useState(false);
  const botsRef = useRef([]);
  useEffect(() => { botsRef.current = bots; }, [bots]);
  const flashTimersRef = useRef([]);
  const submittingRef = useRef(false);
  const { path, tap, reset } = usePathSelection();

  const total = useMemo(() => words.reduce((s, w) => s + w.score, 0), [words]);

  const { remainingMs, running, start } = useTimer({
    durationMs: DURATION,
    onEnd: () => onEnd({ words, total, gridId: grid?.gridId, cells: grid?.cells, bots: botsRef.current }),
  });

  const elapsedMs = DURATION - remainingMs;

  useEffect(() => {
    setGrid(null);
    setGridError(null);
    setBots([]);
    // 1v1: use the shared room grid instead of fetching a private one.
    if (overrideGrid) {
      setGrid(overrideGrid);
      return;
    }
    const gridFetch = isDaily ? fetchDailyGrid() : fetchGrid();
    gridFetch
      .then((g) => {
        setGrid(g);
        fetchBots(g.gridId).then((r) => setBots(r.bots)).catch(() => {});
      })
      .catch(() => setGridError(true));
  }, [retryCount, overrideGrid?.gridId]);

  useEffect(() => () => { flashTimersRef.current.forEach(clearTimeout); }, []);

  // 1v1: start the clock as soon as the shared grid is ready, so both players
  // begin at the same moment (not on first tap).
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (multiRoomCode && grid && !autoStartedRef.current) {
      autoStartedRef.current = true;
      start();
    }
  }, [multiRoomCode, grid, start]);

  // 1v1: broadcast our running total whenever it changes (incl. initial 0) so
  // the opponent's banner always stays in sync, even if a submit-time push is lost.
  useEffect(() => {
    if (multiRoomCode && multiPlayerId) {
      pushRoomScore({ code: multiRoomCode, playerId: multiPlayerId, score: total }).catch(() => {});
    }
  }, [total, multiRoomCode, multiPlayerId]);

  const handleTap = useCallback((i) => {
    if (!running) start();
    playClick();
    tap(i);
  }, [running, start, tap]);

  const submit = useCallback(async () => {
    if (submittingRef.current) return;
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
        playValid();
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
        playError();
        setFeedback({ type: "no", word });
      }
    } catch (e) {
      playError();
      setFeedback({ type: "err", message: e.message });
    } finally {
      submittingRef.current = false;
      reset();
    }
  }, [grid, path, words, reset]);

  const useHint = useCallback(async () => {
    if (!grid || hinting || hintCooldown) return;
    setHinting(true);
    try {
      const r = await fetchHint(grid.gridId);
      setFlashPath(r.path);
      setFeedback({ type: "hint", word: r.word, cost: r.cost });
      flashTimersRef.current.push(setTimeout(() => setFlashPath([]), 1500));
      setHintCooldown(true);
      setTimeout(() => setHintCooldown(false), 10_000);
    } catch (e) {
      const noHint = /NO_HINT/i.test(e.message);
      setFeedback({ type: "err", message: noHint ? "Tous les mots déjà trouvés !" : "Indice indisponible" });
    } finally {
      setHinting(false);
    }
  }, [grid, hinting, hintCooldown]);

  if (gridError) return (
    <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
      <p className="text-danger text-center">Impossible de charger la grille. Vérifie ta connexion.</p>
      <button type="button" onClick={() => setRetryCount((c) => c + 1)}
        className="bg-surface px-6 py-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        Réessayer
      </button>
    </div>
  );
  if (!grid) return <p className="text-center text-text-muted">Chargement…</p>;

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_320px] max-w-5xl mx-auto">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onMenu && (
              <button
                type="button"
                onClick={() => { if (window.confirm("Quitter la partie ? Ton score sera perdu.")) onMenu(); }}
                aria-label="Quitter la partie"
                className="bg-surface border border-surface-2 w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors"
              >
                ←
              </button>
            )}
            {isBombe && <span aria-hidden="true" className="text-2xl animate-pulse">💣</span>}
            {isDaily && <span aria-hidden="true" className="text-xl">📅</span>}
            <Timer remainingMs={remainingMs} totalMs={DURATION} urgent={isBombe} />
          </div>
          <span className="font-display font-bold text-xl text-primary tabular-nums">
            {total}{" "}
            <span className="text-sm text-text-muted font-normal">pts</span>
          </span>
        </div>
        <div className="relative">
          <Grid cells={grid.cells} path={path} flashPath={flashPath} onTap={handleTap} />
          <FloatingScore score={floatingScore} scoreKey={scoreKey} />
        </div>
        <div className="flex gap-2 justify-center flex-wrap">
          <button type="button" onClick={submit}
            className="bg-primary text-bg font-display font-bold px-6 py-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            Valider
          </button>
          <button type="button" onClick={reset}
            className="bg-surface px-6 py-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            Effacer
          </button>
          <button
            type="button"
            onClick={useHint}
            disabled={hinting || hintCooldown || !running}
            aria-label="Indice — révèle un mot (-50 pts)"
            className="bg-surface border border-surface-2 px-4 py-2 rounded-lg text-sm text-text-muted hover:text-text-base disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors"
          >
            💡 {hintCooldown ? "Indice…" : "-50 pts"}
          </button>
        </div>
        <BonusLegend />
        <p role="status" aria-live="polite" className="text-center text-sm h-5">
          <AnimatePresence mode="wait">
            {feedback && (
              <motion.span
                key={`${feedback.type}-${feedback.word ?? ""}-${feedback.message ?? ""}`}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="inline-block"
              >
                {feedback.type === "ok" && <span className="text-success">{feedback.word} +{feedback.score}</span>}
                {feedback.type === "no" && <span className="text-danger">{feedback.word} — pas dans le dico</span>}
                {feedback.type === "dup" && <span className="text-text-muted">{feedback.word} — déjà trouvé</span>}
                {feedback.type === "hint" && <span className="text-accent">💡 {feedback.word} (-{feedback.cost} pts)</span>}
                {feedback.type === "err" && <span className="text-danger">{feedback.message}</span>}
              </motion.span>
            )}
          </AnimatePresence>
        </p>
      </div>
      <div className="flex flex-col gap-4">
        <BotsPanel bots={bots} elapsedMs={elapsedMs} playerScore={total} />
        <WordList words={words} />
      </div>
    </section>
  );
}
