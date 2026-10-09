"use client";

import { useMemo } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { AXIS_STYLE, CHART, ChartTooltip } from "./common";
import { FORECAST_48H, OBSERVATIONS_7D } from "@/lib/demo-data";

/** Recent sensor trend — past observations blended with near-term forecast. */
export function SensorTrendChart({ height = 220 }: { height?: number }) {
  const data = useMemo(() => {
    const obs = OBSERVATIONS_7D.slice(-20).map((o) => ({
      time: new Date(o.time).toLocaleTimeString("en-US", { hour: "2-digit" }),
      moisture: Math.round((26 + Math.sin(new Date(o.time).getHours() / 3) * 1.5) * 10) / 10,
      temp: o.temperatureC,
      rain: o.rainfallMm,
    }));
    const fc = FORECAST_48H.slice(0, 12).map((f) => ({
      time: new Date(f.time).toLocaleTimeString("en-US", { hour: "2-digit" }),
      moisture: Math.round((24.8 - fcOffset(f.time) + (f.rainfallMm > 1 ? 1.2 : 0)) * 10) / 10,
      temp: f.temperatureC,
      rain: f.rainfallMm,
    }));
    return [...obs, ...fc];
  }, []);

  return (
    <div style={{ height }} className="w-full" role="img" aria-label="Soil moisture, temperature and rainfall trend (simulated data)">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="time" {...AXIS_STYLE} interval={5} />
          <YAxis yAxisId="m" domain={[16, 34]} {...AXIS_STYLE} />
          <YAxis yAxisId="r" orientation="right" domain={[0, 8]} {...AXIS_STYLE} hide />
          <ChartTooltip
            formatter={(v, name) => (name === "Rainfall" ? `${v} mm` : name === "Temperature" ? `${v}°C` : `${v}%`)}
            labelFormatter={(l) => `${l} · simulated sensor stream`}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: "#68776F" }} iconSize={8} />
          <Bar yAxisId="r" dataKey="rain" name="Rainfall" fill="rgba(77,126,168,0.35)" radius={[2, 2, 0, 0]} />
          <Area yAxisId="m" type="monotone" dataKey="moisture" name="Soil moisture" stroke={CHART.recommended} fill="rgba(47,107,88,0.10)" strokeWidth={2} />
          <Line yAxisId="m" type="monotone" dataKey="temp" name="Temperature" stroke={CHART.risk} strokeWidth={1.5} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function fcOffset(iso: string): number {
  const h = (new Date(iso).getTime() - Date.parse("2026-09-29T09:41:00Z")) / 3_600_000;
  return h * 0.18;
}
