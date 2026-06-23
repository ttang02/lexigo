import { useState } from "react";
import { isSoundMuted, setSoundMuted } from "../utils/sound.js";

export function SoundToggle() {
  const [muted, setMuted] = useState(() => isSoundMuted());

  function toggle() {
    const next = !muted;
    setSoundMuted(next);
    setMuted(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={muted ? "Activer le son" : "Couper le son"}
      className="fixed left-4 bottom-4 z-40 w-11 h-11 rounded-full bg-surface border border-surface-2 flex items-center justify-center text-lg shadow-lg hover:scale-110 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <span aria-hidden="true">{muted ? "🔇" : "🔊"}</span>
    </button>
  );
}
