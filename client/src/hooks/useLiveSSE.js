import { useEffect, useRef, useState } from "react";

// Auto-reconnecting EventSource with exponential backoff (1s → 2s → 4s → ... → 10s cap).
// onMessage always sees the latest render's closure via a ref, so callers don't need
// to worry about stale state captured at subscribe time.
export function useLiveSSE(url, onMessage) {
  const [live, setLive] = useState(false);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!url) return;
    let es = null;
    let retryMs = 1000;
    let retryTimer = null;
    let stopped = false;

    function connect() {
      es = new EventSource(url);
      es.onopen = () => {
        setLive(true);
        retryMs = 1000;
      };
      es.onmessage = (e) => {
        try { onMessageRef.current(JSON.parse(e.data)); } catch { /* ignore */ }
      };
      es.onerror = () => {
        setLive(false);
        es.close();
        if (stopped) return;
        retryTimer = setTimeout(connect, retryMs);
        retryMs = Math.min(retryMs * 2, 10_000);
      };
    }

    connect();
    return () => {
      stopped = true;
      clearTimeout(retryTimer);
      if (es) es.close();
    };
  }, [url]);

  return live;
}
