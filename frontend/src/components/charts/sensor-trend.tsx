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
import type { WeatherForecastRow, WeatherObservationRow } from "@/types";

export interface SensorTrendChartProps {
  height?: number;
  observations?: WeatherObservationRow[];
  forecast?: WeatherForecastRow[];
}

/** Recent sensor trend — past observations blended with near-term forecast. */
export function SensorTrendChart({
  height = 220,
  observations = [],
  forecast = [],
}: SensorTrendChartProps) {
  const data = useMemo(() => {
    const obs = (observations || []).slice(-16).map((o) => ({
      time: new Date(o.time).toLocaleTimeString("en-US", { hour: "2-digit" }),
      temp: o.temperatureC,
      rain: o.rainfallMm,
    }));
    const fc = (forecast || []).slice(0, 12).map((f) => ({
      time: new Date(f.time).toLocaleTimeString("en-US", { hour: "2-digit" }),
      temp: f.temperatureC,
      rain: f.rainfallMm,
    }));
    return [...obs, ...fc];
  }, [observations, forecast]);

  if (!data.length) {
    return (
      <div
        style={{ height }}
        className="flex w-full items-center justify-center rounded-xl border border-line bg-subtle/50 text-tiny text-ink-muted"
      >
        No sensor telemetry or weather observations recorded yet for this period.
      </div>
    );
  }

  return (
    <div style={{ height }} className="w-full" role="img" aria-label="Soil moisture, temperature and rainfall trend">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="time" {...AXIS_STYLE} interval={4} />
          <YAxis yAxisId="m" domain={[16, 40]} {...AXIS_STYLE} />
          <YAxis yAxisId="r" orientation="right" domain={[0, 10]} {...AXIS_STYLE} hide />
          <ChartTooltip
            formatter={(v, name) => (name === "Rainfall" ? `${v} mm` : `${v}°C`)}
          />
          <Bar yAxisId="r" dataKey="rain" name="Rainfall" fill="#60A5FA" opacity={0.6} radius={[2, 2, 0, 0]} />
          <Line
            yAxisId="m"
            type="monotone"
            dataKey="temp"
            name="Temperature"
            stroke="#E07A5F"
            strokeWidth={1.5}
            dot={false}
          />
          <Legend
            iconType="circle"
            iconSize={6}
            wrapperStyle={{ fontSize: 11, paddingTop: 4, color: "#60746C" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
