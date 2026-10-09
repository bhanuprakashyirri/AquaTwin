"use client";

export const CHART = {
  grid: "#E7EEE9",
  axis: "#8A988F",
  recommended: "#2F6B58",
  alternative: "#A9C0B4",
  risk: "#B47A19",
  danger: "#C84C4C",
  info: "#4D7EA8",
  olive: "#7A8B3A",
  softGreen: "#7FAF8C",
} as const;

interface TipProps {
  active?: boolean;
  payload?: Array<{ name?: string | number; value?: number | string; color?: string }>;
  label?: string | number;
  formatter?: (v: number | string, name: string) => string | [string, string];
  labelFormatter?: (label: string) => string;
}

/** Polished light Recharts tooltip — usage: content={<ChartTooltip .../>} */
export function ChartTooltip({ active, payload, label, formatter, labelFormatter }: TipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-white/95 px-3 py-2 text-tiny shadow-pop backdrop-blur">
      {labelFormatter ? <div className="mb-1 font-medium text-ink-soft">{labelFormatter(String(label))}</div> : null}
      {payload.map((p, i) => {
        const formatted = formatter ? formatter(p.value ?? "", String(p.name)) : String(p.value);
        const displayVal = Array.isArray(formatted) ? formatted[0] : formatted;
        return (
          <div key={i} className="flex items-center gap-2 py-0.5">
            <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} />
            <span className="text-ink-muted">{p.name}</span>
            <span className="ml-auto pl-3 font-semibold text-ink">
              {displayVal}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export const AXIS_STYLE = {
  stroke: CHART.axis,
  tick: { fill: CHART.axis, fontSize: 11 },
  tickLine: false,
} as const;
