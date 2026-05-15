/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0F0B1F",
        surface: "#1A1530",
        "surface-2": "#241D40",
        primary: "#8B5CF6",
        accent: "#FBBF24",
        success: "#10B981",
        danger: "#EF4444",
        "text-base": "#F4F1FF",
        "text-muted": "#9B96B5",
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
