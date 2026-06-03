import { useState } from "react";
import { HelpModal } from "./HelpModal.jsx";

// Fixed side button — available on every screen. Opens the illustrated guide.
export function HelpButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Comment jouer — ouvrir le guide"
        className="fixed right-4 top-1/2 -translate-y-1/2 z-40 w-11 h-11 rounded-full bg-surface border border-surface-2 text-text-base font-display font-bold text-xl shadow-lg hover:bg-surface-2 hover:scale-105 transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span aria-hidden="true">?</span>
      </button>
      <HelpModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
