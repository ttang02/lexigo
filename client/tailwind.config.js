/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // RGB channel vars → support opacity modifiers (bg-primary/50)
        bg: "rgb(var(--c-bg) / <alpha-value>)",
        surface: "rgb(var(--c-surface) / <alpha-value>)",
        "surface-2": "rgb(var(--c-surface-2) / <alpha-value>)",
        primary: "rgb(var(--c-primary) / <alpha-value>)",
        accent: "rgb(var(--c-accent) / <alpha-value>)",
        success: "rgb(var(--c-success) / <alpha-value>)",
        danger: "rgb(var(--c-danger) / <alpha-value>)",
        "text-base": "rgb(var(--c-text-base) / <alpha-value>)",
        "text-muted": "rgb(var(--c-text-muted) / <alpha-value>)",
        // Bonus colors fixed (no theme change)
        "bonus-dl": "#3B82F6",
        "bonus-tl": "#8B5CF6",
        "bonus-dw": "#F97316",
        "bonus-tw": "#DC2626",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      borderRadius: {
        tile: "16px",
      },
    },
  },
  plugins: [],
};
