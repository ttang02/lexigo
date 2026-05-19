import { useState, useRef, useCallback, useEffect } from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion.js";

const STAGGER_MS = 200;
const HOLD_MS = 900;
const CLEAR_MS = 400;
const GAP_MS = 250;
const REDUCED_HOLD_MS = 800;

export function useRobotReplay({ solutions }) {
  const [currentEntry, setCurrentEntry] = useState(null);
  const [wordIndex, setWordIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [idle, setIdle] = useState(true);
  const reduced = usePrefersReducedMotion();

  const timerRef = useRef(null);
  const stateRef = useRef({ wordIndex: 0, stepIndex: 0, running: false });
  const runStepRef = useRef(null);

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  const runStep = useCallback(() => {
    const { wordIndex: wi, stepIndex: si } = stateRef.current;

    if (wi >= solutions.length) {
      setCurrentEntry(null);
      setStepIndex(0);
      setDone(true);
      stateRef.current.running = false;
      return;
    }

    const entry = solutions[wi];
    const path = entry.path;

    setCurrentEntry(entry);
    setWordIndex(wi);

    if (reduced) {
      // Show all tiles at once, then clear after hold
      stateRef.current.stepIndex = path.length;
      setStepIndex(path.length);
      timerRef.current = setTimeout(() => {
        stateRef.current.stepIndex = path.length + 1;
        setStepIndex(path.length + 1);
        timerRef.current = setTimeout(() => {
          stateRef.current.wordIndex += 1;
          stateRef.current.stepIndex = 0;
          setStepIndex(0);
          runStepRef.current?.();
        }, GAP_MS);
      }, REDUCED_HOLD_MS);
      return;
    }

    if (si < path.length) {
      // Reveal next tile
      timerRef.current = setTimeout(() => {
        stateRef.current.stepIndex += 1;
        setStepIndex(stateRef.current.stepIndex);
        runStepRef.current?.();
      }, STAGGER_MS);
    } else if (si === path.length) {
      // Hold: all tiles visible, wait before clearing
      timerRef.current = setTimeout(() => {
        stateRef.current.stepIndex += 1;
        setStepIndex(stateRef.current.stepIndex); // path.length + 1 = clear signal
        runStepRef.current?.();
      }, HOLD_MS);
    } else {
      // Clear: stepIndex > path.length — Grid already shows opacity 0
      timerRef.current = setTimeout(() => {
        timerRef.current = setTimeout(() => {
          stateRef.current.wordIndex += 1;
          stateRef.current.stepIndex = 0;
          setWordIndex(stateRef.current.wordIndex);
          setStepIndex(0);
          runStepRef.current?.();
        }, GAP_MS);
      }, CLEAR_MS);
    }
  }, [solutions, reduced]);

  useEffect(() => { runStepRef.current = runStep; }, [runStep]);

  const play = useCallback(() => {
    clearTimer();
    stateRef.current = { wordIndex: 0, stepIndex: 0, running: true };
    setDone(false);
    setIdle(false);
    setStepIndex(0);
    setCurrentEntry(solutions.length > 0 ? solutions[0] : null);
    setWordIndex(0);
    runStep();
  }, [solutions, runStep]);

  function skip() {
    clearTimer();
    stateRef.current.running = false;
    setStepIndex(0);
    setCurrentEntry(null);
    setDone(true);
    setIdle(false);
  }

  const isHolding = currentEntry !== null && stepIndex === currentEntry.path.length;

  return {
    play,
    skip,
    stepIndex,
    isHolding,
    currentEntry,
    wordIndex,
    total: solutions.length,
    done,
    idle,
  };
}
