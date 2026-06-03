import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const BONUSES = [
  { code: "DL", label: "Lettre ×2", cls: "bg-bonus-dl" },
  { code: "TL", label: "Lettre ×3", cls: "bg-bonus-tl" },
  { code: "DW", label: "Mot ×2",    cls: "bg-bonus-dw" },
  { code: "TW", label: "Mot ×3",    cls: "bg-bonus-tw" },
];

export function BonusLegend() {
  const [open, setOpen] = useState(false);
  return (
    <div className="text-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="bonus-legend-panel"
        className="flex items-center gap-1 text-text-muted text-xs font-display tracking-widest uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
      >
        <span>? Bonus</span>
        <motion.span
          aria-hidden="true"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ display: "inline-block" }}
        >
          ▾
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            id="bonus-legend-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 pt-2">
              {BONUSES.map(({ code, label, cls }) => (
                <div key={code} className="flex items-center gap-2">
                  <span
                    className={`${cls} text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md`}
                  >
                    {code}
                  </span>
                  <span className="text-text-muted">{label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
