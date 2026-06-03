import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion.js";

// Returns { score, found, last } for a bot at the given elapsed time.
function botStateAt(bot, elapsedMs) {
  let score = 0;
  let found = 0;
  let last = null;
  for (const e of bot.timeline) {
    if (e.atMs > elapsedMs) break;
    score += e.score;
    found += 1;
    last = e.word;
  }
  return { score, found, last };
}

export function BotsPanel({ bots, elapsedMs, playerScore }) {
  const reduced = usePrefersReducedMotion();
  if (!bots || bots.length === 0) return null;

  const rows = bots
    .map((b) => ({ ...b, ...botStateAt(b, elapsedMs) }))
    .sort((a, b) => b.score - a.score);

  return (
    <section className="bg-surface rounded-2xl p-4 w-full" aria-label="Robots adversaires">
      <header className="flex justify-between items-baseline mb-2">
        <h2 className="font-display font-semibold text-lg">Adversaires</h2>
        <span className="text-text-muted text-xs">en direct</span>
      </header>
      <ul className="flex flex-col gap-1.5">
        {rows.map((b) => {
          const ahead = playerScore != null && b.score > playerScore;
          return (
            <li
              key={b.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-surface-2/50"
            >
              <span aria-hidden="true" className="text-lg leading-none">{b.emoji}</span>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-medium leading-tight" style={{ color: b.color }}>
                  {b.name}
                </span>
                <span className="text-[11px] text-text-muted leading-tight">
                  {b.found > 0 ? `${b.found} mot${b.found > 1 ? "s" : ""}` : "—"}
                </span>
              </div>
              <motion.span
                key={b.score}
                initial={reduced ? false : { scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 18 }}
                className={`font-display font-bold tabular-nums text-right ${ahead ? "text-danger" : "text-text-base"}`}
              >
                {b.score}
              </motion.span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
