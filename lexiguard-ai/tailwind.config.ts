import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#101a3a", soft: "#4a5578", faint: "#7b84a3" },
        paper: "#f6f7fb",
        line: "#e2e5f0",
        brand: { DEFAULT: "#3b4fd8", dark: "#2c3bb0", tint: "#eceffd" },
        violet: { accent: "#7a5af5" },
        mark: "#fff0b3",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: { card: "0 1px 2px rgba(16,26,58,.04), 0 8px 24px -12px rgba(16,26,58,.12)" },
    },
  },
  plugins: [],
};
export default config;
