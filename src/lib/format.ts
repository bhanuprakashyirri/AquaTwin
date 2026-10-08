export function fmtL(v: number, digits = 0): string {
  return `${v.toLocaleString("en-US", { maximumFractionDigits: digits })} L`;
}

export function fmtPct(v: number, digits = 1): string {
  return `${v.toFixed(digits)}%`;
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}

export function fmtDateTime(iso: string): string {
  return `${fmtDate(iso)} ${fmtTime(iso)}`;
}

// ---- Muted, natural color scales (light-theme) ----

export function stressColor(pct: number): string {
  if (pct < 10) return "#2E7D5B"; // success green
  if (pct < 25) return "#7A8B3A"; // olive
  if (pct < 45) return "#B47A19"; // warning amber
  return "#C84C4C"; // danger red
}

/** Zone fill colors: subtle natural greens → ambers → oranges (dry) */
export function moistureColor(pct: number): string {
  if (pct < 18) return "#D97B4A"; // dry: muted orange
  if (pct < 22) return "#D9A441"; // moderate-dry: muted amber
  if (pct < 26) return "#A9C08D"; // moderate: sage
  if (pct < 30) return "#7FAF8C"; // good: soft green
  return "#5E9678"; // wet: deeper soft green
}

export function ndviColor(ndvi: number): string {
  if (ndvi < 0.45) return "#C08552";
  if (ndvi < 0.55) return "#D9A441";
  if (ndvi < 0.62) return "#A9C08D";
  return "#5E9678";
}

export function priorityColor(p: number): string {
  if (p === 1) return "#C84C4C";
  if (p === 2) return "#B47A19";
  if (p === 3) return "#7A8B3A";
  return "#2E7D5B";
}

export function wasteColor(w: string): string {
  switch (w) {
    case "NONE": return "#2E7D5B";
    case "LOW": return "#7A8B3A";
    case "MEDIUM": return "#B47A19";
    case "HIGH": return "#C84C4C";
    default: return "#68776F";
  }
}

/** Status tone helper for badges */
export function stressTone(pct: number): "good" | "warn" | "bad" {
  if (pct < 15) return "good";
  if (pct < 40) return "warn";
  return "bad";
}

// Chart palette (max 4 primary colors per chart)
export const CHART = {
  recommended: "#2F6B58",
  alternative: "#C9D6CE",
  risk: "#B47A19",
  danger: "#C84C4C",
  info: "#4D7EA8",
  grid: "#E7EEE9",
  axis: "#8A988F",
  softGreen: "#7FAF8C",
  olive: "#7A8B3A",
} as const;
