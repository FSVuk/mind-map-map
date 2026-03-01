import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        vanzemla: {
          bg: "#0B1120",
          sidebar: "#0D1525",
          grid: "#1A2540",
          border: "#1E2A40",
          text: "#C8D0DC",
          "text-dim": "#6B7A90",
          accent: "#3B82A0",
          "accent-bright": "#5EAFD4",
        },
      },
      fontFamily: {
        display: ["var(--font-geist-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
