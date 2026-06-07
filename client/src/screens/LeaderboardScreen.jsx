import { useEffect, useRef, useState } from "react";
import { Leaderboard } from "../components/Leaderboard.jsx";

export function LeaderboardScreen({ onMenu }) {
  const [rows, setRows] = useState([]);
  const [live, setLive] = useState(false);
  const esRef = useRef(null);

  useEffect(() => {
    const es = new EventSource("/api/scores/live");
    esRef.current = es;

    es.onopen = () => setLive(true);
    es.onmessage = (e) => {
      try { setRows(JSON.parse(e.data)); } catch { /* ignore */ }
    };
    es.onerror = () => {
      setLive(false);
      es.close();
    };

    return () => {
      es.close();
      setLive(false);
    };
  }, []);

  return (
    <section className="max-w-md mx-auto flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold">Classement</h2>
        <span className="flex items-center gap-1.5 text-xs text-text-muted">
          <span
            aria-hidden="true"
            className={`w-2 h-2 rounded-full ${live ? "bg-success animate-pulse" : "bg-text-muted"}`}
          />
          {live ? "en direct" : "hors ligne"}
        </span>
      </div>
      <Leaderboard rows={rows} />
      <button
        type="button"
        onClick={onMenu}
        className="bg-surface px-6 py-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        Menu
      </button>
    </section>
  );
}
