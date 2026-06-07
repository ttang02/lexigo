import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion.js";

function format(ms) {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = String(s % 60).padStart(2, "0");
  return `${m}:${sec}`;
}

export function Timer({ remainingMs, totalMs, urgent = false }) {
  const reduced = usePrefersReducedMotion();
  const danger = urgent || remainingMs <= 10_000;
  const warn = !danger && remainingMs <= 30_000;
  const pct = Math.max(0, Math.min(100, (remainingMs / totalMs) * 100));
  const barColor = danger ? "bg-danger" : warn ? "bg-accent" : "bg-primary";
  return (
    <div className="w-full" role="timer" aria-label="Temps restant">
      <div
        className={`tabular text-3xl font-display font-bold ${danger ? "text-danger" : warn ? "text-accent" : "text-text-base"} ${danger && !reduced ? "animate-pulse" : ""}`}
      >
        {danger && <span aria-hidden="true">⚠ </span>}
        {format(remainingMs)}
      </div>
      {danger && (
        <span className="sr-only" role="status" aria-live="assertive">
          Plus que dix secondes
        </span>
      )}
      <div className="h-1 bg-surface rounded-full mt-1 overflow-hidden">
        <div
          className={`h-full ${barColor} transition-[width] duration-200`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
