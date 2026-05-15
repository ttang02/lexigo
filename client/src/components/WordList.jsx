import { motion, AnimatePresence } from "framer-motion";

export function WordList({ words }) {
  const total = words.reduce((s, w) => s + w.score, 0);
  return (
    <section className="bg-surface rounded-2xl p-4 w-full" aria-label="Mots trouvés">
      <header className="flex justify-between items-baseline mb-2">
        <h2 className="font-display font-semibold text-lg">Mots trouvés</h2>
        <span className="font-display font-bold text-accent text-2xl tabular">{total}</span>
      </header>
      {words.length === 0 ? (
        <p className="text-text-muted text-sm">Aucun mot pour le moment.</p>
      ) : (
        <ul className="divide-y divide-surface-2">
          <AnimatePresence initial={false}>
            {words.map((w, i) => (
              <motion.li
                key={`${w.word}-${i}`}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex justify-between py-1 font-body"
              >
                <span>{w.word}</span>
                <span className="tabular text-text-muted">+{w.score}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}
