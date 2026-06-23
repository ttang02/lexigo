import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState(
    () => document.documentElement.dataset.theme || "dark"
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("lexigo-theme", theme);
  }, [theme]);

  return (
    <button
      type="button"
      onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      aria-label={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
      className="fixed left-4 top-1/2 -translate-y-1/2 z-40 w-11 h-11 rounded-full bg-surface border border-surface-2 flex items-center justify-center text-lg shadow-lg hover:scale-110 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <span aria-hidden="true">{theme === "dark" ? "☀️" : "🌙"}</span>
    </button>
  );
}
