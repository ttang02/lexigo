import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion.js";

// Guide panels. Drop the matching PNG (小黑 style) into client/public/help/.
// If an image is missing, the caption still renders so the guide stays usable.
const PANELS = [
  { img: "/help/01-tracer.png", title: "Trace un mot", caption: "Relie des lettres voisines (8 directions) pour former un mot." },
  { img: "/help/02-valider.png", title: "Valide", caption: "Appuie sur Valider. Le mot doit exister dans le dictionnaire." },
  { img: "/help/03-bonus.png", title: "Cases bonus", caption: "DL/TL multiplient la lettre, DW/TW multiplient le mot entier." },
  { img: "/help/04-chrono.png", title: "2 minutes", caption: "Trouve un max de mots avant la fin du chrono." },
  { img: "/help/05-robots.png", title: "Bats les robots", caption: "4 robots jouent la même grille en direct. Dépasse-les !" },
];

export function HelpModal({ open, onClose }) {
  const reduced = usePrefersReducedMotion();
  const [i, setI] = useState(0);
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setI(0);
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") setI((v) => Math.min(PANELS.length - 1, v + 1));
      else if (e.key === "ArrowLeft") setI((v) => Math.max(0, v - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const panel = PANELS[i];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Guide du jeu"
        >
          <motion.div
            className="bg-bg rounded-2xl w-full max-w-lg p-5 flex flex-col gap-4 shadow-2xl"
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 12 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-xl">Comment jouer</h2>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Fermer le guide"
                className="text-text-muted hover:text-text-base text-2xl leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>

            <div className="aspect-video w-full rounded-xl bg-white overflow-hidden flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.img
                  key={panel.img}
                  src={panel.img}
                  alt={panel.caption}
                  loading="lazy"
                  initial={reduced ? { opacity: 0 } : { opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, x: -16 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full h-full object-contain"
                  onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
                />
              </AnimatePresence>
            </div>

            <div className="text-center min-h-[3.5rem]">
              <p className="font-display font-bold text-lg" style={{ color: "#F59E0B" }}>{panel.title}</p>
              <p className="text-text-muted text-sm">{panel.caption}</p>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setI((v) => Math.max(0, v - 1))}
                disabled={i === 0}
                className="px-4 py-2 rounded-lg bg-surface disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                ← Préc.
              </button>
              <div className="flex gap-1.5" aria-hidden="true">
                {PANELS.map((_, idx) => (
                  <span
                    key={idx}
                    className={`w-2 h-2 rounded-full ${idx === i ? "bg-primary" : "bg-surface-2"}`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  i === PANELS.length - 1 ? onClose() : setI((v) => v + 1)
                }
                className="px-4 py-2 rounded-lg bg-primary text-bg font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {i === PANELS.length - 1 ? "Compris" : "Suiv. →"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
