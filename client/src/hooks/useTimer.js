import { useCallback, useEffect, useRef, useState } from "react";

export function useTimer({ durationMs, onEnd, tickMs = 100 }) {
  const [remainingMs, setRemainingMs] = useState(durationMs);
  const [running, setRunning] = useState(false);
  const startAtRef = useRef(null);
  const endedRef = useRef(false);
  // Keep latest onEnd in a ref so an inline callback at the call site does not
  // retrigger the interval effect (which would tear down/restart every render).
  const onEndRef = useRef(onEnd);
  useEffect(() => { onEndRef.current = onEnd; }, [onEnd]);

  const start = useCallback(() => {
    startAtRef.current = Date.now();
    endedRef.current = false;
    setRemainingMs(durationMs);
    setRunning(true);
  }, [durationMs]);

  const stop = useCallback(() => { setRunning(false); }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const elapsed = Date.now() - startAtRef.current;
      const left = Math.max(0, durationMs - elapsed);
      setRemainingMs(left);
      if (left === 0 && !endedRef.current) {
        endedRef.current = true;
        setRunning(false);
        onEndRef.current && onEndRef.current();
      }
    }, tickMs);
    return () => clearInterval(id);
  }, [running, durationMs, tickMs]);

  return { remainingMs, running, start, stop };
}
