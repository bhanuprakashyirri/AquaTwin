import type { Config } from "tailwindcss";

/**
 * AquaTwin Tailwind Config
 * Typography: Plus Jakarta Sans (exact QuizCore font)
 * Color: AgriTech light-first palette
 * Motion: QuizCore easing tokens
 */
const config: Config = {
  content: [
    "./frontend/src/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ── Colors ──────────────────────────────────────────────
      colors: {
        // Surfaces
        page:    "#F5F7F4",
        surface: "#FFFFFF",
        subtle:  "#F0F4F1",
        overlay: "rgba(22,58,49,0.04)",

        // Text — deep green-charcoal hierarchy
        ink: {
          DEFAULT: "#163A31",
          soft:    "#3F564E",
          muted:   "#60746C",
          faint:   "#8A9A92",
        },

        // Brand agricultural greens
        brand: {
          DEFAULT: "#28745F",
          dark:    "#1C5143",
          light:   "#E8F2ED",
          mid:     "#32836D",
          muted:   "#5A9080",
        },

        // Status
        success: "#28745F",
        warning: "#B98227",
        danger:  "#C45A55",
        info:    "#537D9B",

        // Borders
        line:         "#DDE6E1",
        "line-strong":"#CBD7D0",
        "line-faint": "#EBF0ED",
      },

      // ── Font Family (QuizCore DNA) ───────────────────────────
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        display: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },

      // ── Font Size — AquaTwin typographic scale ───────────────
      fontSize: {
        // Micro sizes
        micro:  ["0.6875rem", { lineHeight: "1rem",    letterSpacing: "-0.003em" }],
        tiny:   ["0.75rem",   { lineHeight: "1.125rem", letterSpacing: "-0.005em" }],

        // Standard sizes tuned for Plus Jakarta Sans
        sm:     ["0.875rem",  { lineHeight: "1.375rem", letterSpacing: "-0.008em" }],
        base:   ["0.9375rem", { lineHeight: "1.5rem",   letterSpacing: "-0.01em"  }],
        lg:     ["1.0625rem", { lineHeight: "1.625rem", letterSpacing: "-0.012em" }],
        xl:     ["1.25rem",   { lineHeight: "1.75rem",  letterSpacing: "-0.015em" }],
        "2xl":  ["1.5rem",    { lineHeight: "2rem",     letterSpacing: "-0.018em" }],
        "3xl":  ["1.875rem",  { lineHeight: "2.25rem",  letterSpacing: "-0.02em"  }],
        "4xl":  ["2.25rem",   { lineHeight: "2.5rem",   letterSpacing: "-0.025em" }],
        "5xl":  ["3rem",      { lineHeight: "1.1",      letterSpacing: "-0.03em"  }],
        "6xl":  ["3.75rem",   { lineHeight: "1.05",     letterSpacing: "-0.035em" }],

        // Product-specific
        metric: ["2.5rem",    { lineHeight: "1",        letterSpacing: "-0.03em"  }],
        kpi:    ["1.875rem",  { lineHeight: "1.1",      letterSpacing: "-0.025em" }],
      },

      // ── Box Shadows ──────────────────────────────────────────
      boxShadow: {
        card:      "0 1px 3px rgba(22,58,49,0.06), 0 1px 2px rgba(22,58,49,0.04)",
        raised:    "0 4px 16px rgba(22,58,49,0.09), 0 1px 4px rgba(22,58,49,0.05)",
        pop:       "0 12px 32px rgba(22,58,49,0.14), 0 4px 8px rgba(22,58,49,0.06)",
        float:     "0 20px 48px rgba(22,58,49,0.16), 0 4px 12px rgba(22,58,49,0.08)",
        editorial: "0 2px 12px rgba(22,58,49,0.06), 0 1px 3px rgba(22,58,49,0.04)",
        "inner-sm":"inset 0 1px 2px rgba(22,58,49,0.05)",
      },

      // ── Border Radius ────────────────────────────────────────
      borderRadius: {
        sm:   "6px",
        DEFAULT:"8px",
        md:   "10px",
        lg:   "12px",
        xl:   "14px",
        xl2:  "16px",
        "2xl":"20px",
        "3xl":"24px",
        "4xl":"32px",
        full: "9999px",
      },

      // ── Spacing extras ───────────────────────────────────────
      spacing: {
        "4.5": "1.125rem",
        "5.5": "1.375rem",
        "13":  "3.25rem",
        "15":  "3.75rem",
        "18":  "4.5rem",
        "22":  "5.5rem",
        "26":  "6.5rem",
      },

      // ── Transitions (QuizCore motion tokens) ─────────────────
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
        "spring":   "cubic-bezier(0.34, 1.56, 0.64, 1)",
        "in-expo":  "cubic-bezier(0.7, 0, 0.84, 0)",
      },
      transitionDuration: {
        "150": "150ms",
        "200": "200ms",
        "280": "280ms",
        "350": "350ms",
        "420": "420ms",
      },

      // ── Background gradients / images ─────────────────────────
      backgroundImage: {
        "brand-gradient":  "linear-gradient(135deg, #28745F 0%, #1C5143 100%)",
        "brand-light-gradient": "linear-gradient(135deg, #E8F2ED 0%, #D5E9DF 100%)",
        "page-gradient":   "linear-gradient(180deg, #F5F7F4 0%, #F0F5F2 100%)",
      },

      // ── Animations ───────────────────────────────────────────
      keyframes: {
        "aqua-float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-6px)" },
        },
        "aqua-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.4" },
        },
      },
      animation: {
        float: "aqua-float 4s ease-in-out infinite",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
