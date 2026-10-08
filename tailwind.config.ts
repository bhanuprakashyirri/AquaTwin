import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Surfaces
        page: "#F5F7F4",
        surface: "#FFFFFF",
        subtle: "#F0F4F1",
        // Text
        ink: {
          DEFAULT: "#163A31",
          soft: "#3F564E",
          muted: "#60746C",
          faint: "#8A9A92",
        },
        // Brand greens
        brand: {
          DEFAULT: "#28745F",
          dark: "#1C5143",
          light: "#E8F2ED",
          mid: "#32836D",
        },
        // Status
        success: "#28745F",
        warning: "#B98227",
        danger: "#C45A55",
        info: "#537D9B",
        // Borders
        line: "#DDE6E1",
        "line-strong": "#CBD7D0",

      },
      fontSize: {
        micro: ["0.6875rem", { lineHeight: "1rem" }],
        tiny: ["0.75rem", { lineHeight: "1.125rem" }],
      },
      boxShadow: {
        card: "0 1px 2px rgba(23,53,45,0.05), 0 1px 3px rgba(23,53,45,0.04)",
        raised: "0 4px 12px rgba(23,53,45,0.08)",
        pop: "0 8px 24px rgba(23,53,45,0.14)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        xl2: "14px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
