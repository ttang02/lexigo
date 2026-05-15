function format(ms) {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = String(s % 60).padStart(2, "0");
  return `${m}:${sec}`;
}

export function Timer({ remainingMs, totalMs }) {
  const danger = remainingMs <= 10_000;
  const pct = Math.max(0, Math.min(100, (remainingMs / totalMs) * 100));
  return (
    <div className="w-full">
      <div className={`tabular text-3xl font-display font-bold ${danger ? "text-danger animate-pulse" : "text-text-base"}`}>
        {format(remainingMs)}
      </div>
      <div className="h-1 bg-surface rounded-full mt-1 overflow-hidden">
        <div
          className={`h-full ${danger ? "bg-danger" : "bg-primary"} transition-[width] duration-200`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
