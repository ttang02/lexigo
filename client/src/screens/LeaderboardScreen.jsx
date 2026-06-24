import { useState } from "react";
import { Leaderboard } from "../components/Leaderboard.jsx";
import { useLiveSSE } from "../hooks/useLiveSSE.js";
import { API_BASE } from "../config.js";

const MODES = [
  { id: "normal", label: "Normal" },
  { id: "bombe", label: "💣 Bombe" },
  { id: "daily", label: "📅 Défi" },
];

export function LeaderboardScreen({ onMenu }) {
  const [mode, setMode] = useState("normal");
  const [rows, setRows] = useState([]);
  const live = useLiveSSE(`${API_BASE}/api/scores/live?mode=${mode}`, setRows);

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
      <div className="flex gap-1 bg-surface rounded-lg p-1" role="tablist" aria-label="Mode de jeu">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={mode === m.id}
            onClick={() => { setMode(m.id); setRows([]); }}
            className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              mode === m.id ? "bg-primary text-bg" : "text-text-muted hover:text-text-base"
            }`}
          >
            {m.label}
          </button>
        ))}
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
