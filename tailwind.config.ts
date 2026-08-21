import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: "#0a0c10",
          card: "#131722",
          border: "#1e2330",
          cyan: "#00f2fe",
          green: "#10b981",
          red: "#ef4444",
          gold: "#f59e0b",
          muted: "#8b949e",
          text: "#e6edf3",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
        sans: ["IBM Plex Sans", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 24px rgba(0, 242, 254, 0.15)",
      },
    },
  },
  plugins: [],
};

export default config;
