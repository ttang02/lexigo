import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion.js";

function format(ms) {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = String(s % 60).padStart(2, "0");
  return `${m}:${sec}`;
}

export function Timer({ remainingMs, totalMs }) {
  const reduced = usePrefersReducedMotion();
  const danger = remainingMs <= 10_000;
  const pct = Math.max(0, Math.min(100, (remainingMs / totalMs) * 100));
  return (
    <div className="w-full" role="timer" aria-label="Temps restant">
      <div
        className={`tabular text-3xl font-display font-bold ${danger ? "text-danger" : "text-text-base"} ${danger && !reduced ? "animate-pulse" : ""}`}
      >
        {/* Non-color cue: warning glyph in addition to the red color. */}
        {danger && <span aria-hidden="true">⚠ </span>}
        {format(remainingMs)}
      </div>
      {/* Announced once when the final 10s begins (color/motion are not enough). */}
      {danger && (
        <span className="sr-only" role="status" aria-live="assertive">
          Plus que dix secondes
        </span>
      )}
      <div className="h-1 bg-surface rounded-full mt-1 overflow-hidden">
        <div
          className={`h-full ${danger ? "bg-danger" : "bg-primary"} transition-[width] duration-200`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
