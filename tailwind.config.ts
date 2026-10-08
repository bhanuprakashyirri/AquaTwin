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
          DEFAULT: "#17352D",
          soft: "#42544C",
          muted: "#68776F",
          faint: "#8A988F",
        },
        // Brand greens
        brand: {
          DEFAULT: "#2F6B58",
          dark: "#1D493D",
          light: "#EAF3EE",
          mid: "#3E8168",
        },
        // Status
        success: "#2E7D5B",
        warning: "#B47A19",
        danger: "#C84C4C",
        info: "#4D7EA8",
        // Borders
        line: "#DFE7E2",
        "line-strong": "#C9D6CE",
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
