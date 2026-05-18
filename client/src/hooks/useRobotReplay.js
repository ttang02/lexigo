import { useState, useRef, useCallback } from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion.js";

const STAGGER_MS = 40;
const HOLD_MS = 100;
const CLEAR_MS = 160;
const GAP_MS = 40;
const REDUCED_HOLD_MS = 300;

export function useRobotReplay({ solutions }) {
  const [activeIndices, setActiveIndices] = useState(new Set());
  const [currentEntry, setCurrentEntry] = useState(null);
  const [wordIndex, setWordIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [idle, setIdle] = useState(true);
  const reduced = usePrefersReducedMotion();

  const timerRef = useRef(null);
  const stateRef = useRef({ wordIndex: 0, stepIndex: 0, running: false });

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  const runStep = useCallback(() => {
    const { wordIndex: wi, stepIndex: si } = stateRef.current;

    if (wi >= solutions.length) {
      setActiveIndices(new Set());
      setCurrentEntry(null);
      setDone(true);
      stateRef.current.running = false;
      return;
    }

    const entry = solutions[wi];
    const path = entry.path;

    setCurrentEntry(entry);
    setWordIndex(wi);

    if (reduced) {
      setActiveIndices(new Set(path));
      timerRef.current = setTimeout(() => {
        setActiveIndices(new Set());
        timerRef.current = setTimeout(() => {
          stateRef.current.wordIndex += 1;
          stateRef.current.stepIndex = 0;
          runStep();
        }, GAP_MS);
      }, REDUCED_HOLD_MS);
      return;
    }

    if (si < path.length) {
      // Reveal tile si
      timerRef.current = setTimeout(() => {
        setActiveIndices((prev) => new Set([...prev, path[si]]));
        stateRef.current.stepIndex += 1;
        runStep();
      }, STAGGER_MS);
    } else if (si === path.length) {
      // Hold
      timerRef.current = setTimeout(() => {
        stateRef.current.stepIndex += 1;
        runStep();
      }, HOLD_MS);
    } else {
      // Clear and advance to next word
      timerRef.current = setTimeout(() => {
        setActiveIndices(new Set());
        timerRef.current = setTimeout(() => {
          stateRef.current.wordIndex += 1;
          stateRef.current.stepIndex = 0;
          runStep();
        }, GAP_MS);
      }, CLEAR_MS);
    }
  }, [solutions, reduced]);

  function play() {
    clearTimer();
    stateRef.current = { wordIndex: 0, stepIndex: 0, running: true };
    setDone(false);
    setIdle(false);
    setActiveIndices(new Set());
    setCurrentEntry(solutions.length > 0 ? solutions[0] : null);
    setWordIndex(0);
    runStep();
  }

  function skip() {
    clearTimer();
    stateRef.current.running = false;
    setActiveIndices(new Set());
    setCurrentEntry(null);
    setDone(true);
    setIdle(false);
  }

  return {
    play,
    skip,
    activeIndices,
    currentEntry,
    wordIndex,
    total: solutions.length,
    done,
    idle,
  };
}
