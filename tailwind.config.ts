import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#f7f8fa",
        panel: "#ffffff",
        panel2: "#fafbfc",
        line: "#e4e7ee",
        line2: "#eef0f4",
        ink: "#14181f",
        muted: "#646b7a",
        faint: "#9aa1b0",
        indigo: { DEFAULT: "#4f5bd5", soft: "#eef0fe", deep: "#3a45b0" },
        ok: { DEFAULT: "#1f9d6b", soft: "#e6f6ee" },
        warn: { DEFAULT: "#c98a1e", soft: "#fdf3e3" },
        bad: { DEFAULT: "#d2553f", soft: "#fbeae6" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "var(--font-kr)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,22,40,0.04)",
        focus: "0 0 0 3px #eef0fe",
        pop: "0 12px 32px -12px rgba(16,22,40,0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
