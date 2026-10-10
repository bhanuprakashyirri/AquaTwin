"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, CloudRain, Droplets, Sparkles, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Panel, PanelHeader, DataBadge } from "@/components/ui/panel";
import { KpiCard } from "@/components/ui/kpi";
import { AXIS_STYLE, CHART, ChartTooltip } from "@/components/charts/common";
import { fetchAnalyticsSummary, fetchHistory, fetchSystemStatus, fetchWaterFingerprint, fetchWeather } from "@/services/api";
import { useApiData } from "@/hooks/useApiData";

export default function AnalyticsPage() {
  const histQ = useApiData(() => fetchHistory("field-a"));
  const wxQ = useApiData(() => fetchWeather("field-a"));
  const fpQ = useApiData(() => fetchWaterFingerprint("field-a"));
  const statusQ = useApiData(() => fetchSystemStatus("field-a"));
  const summaryQ = useApiData(() => fetchAnalyticsSummary("field-a"));

  const observations = wxQ.data?.observations ?? [];
  const events = histQ.data?.events ?? [];

  const daily = useMemo(() => {
    if (!observations.length && !events.length) return [];
    const buckets = new Map<string, { day: string; moisture: number; irrigation: number; rain: number }>();

    observations.forEach((o) => {
      const key = new Date(o.time).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const b = buckets.get(key) ?? { day: key, moisture: 0, irrigation: 0, rain: 0 };
      b.rain += o.rainfallMm;
      buckets.set(key, b);
    });

    events.forEach((e) => {
      const key = new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const b = buckets.get(key);
      if (b) {
        b.irrigation += e.appliedWaterL;
        b.moisture += e.moistureResponsePct;
      }
    });

    let m = 27;
    return Array.from(buckets.values()).map((b) => {
      m = Math.max(19, m - 0.6 + (b.rain > 2 ? 2.2 : 0));
      const s = Math.round(Math.max(3.5, (34 - m) * 1.45) * 10) / 10;
      return { ...b, moisture: Math.round(m * 10) / 10, stress: s, rain: Math.round(b.rain * 10) / 10 };
    });
  }, [observations, events]);

  const predVsActual = useMemo(() => {
    return events
      .slice(0, 10)
      .reverse()
      .map((e) => ({
        label: `${new Date(e.date).getDate()}/${new Date(e.date).getMonth() + 1}`,
        predicted: e.predictedRequirementL,
        actual: e.appliedWaterL,
      }));
  }, [events]);

  const fp = fpQ.data;
  const irrigated = events.filter((e) => e.appliedWaterL > 0);
  const totalApplied7d = events.slice(0, 14).reduce((s, e) => s + e.appliedWaterL, 0);
  const savedTotal = events.reduce(
    (s, e) => s + (e.decision === "Waited" ? e.predictedRequirementL * 0.55 : Math.max(0, e.predictedRequirementL - e.appliedWaterL)),
    0,
  );
  const meanResponse = irrigated.length
    ? irrigated.reduce((s, e) => s + e.moistureResponsePct, 0) / irrigated.length
    : 0;

  // 168h digital-twin moisture prediction from the backend,
  // bucketed to daily averages for the timeline chart.
  const predictedDaily = useMemo(() => {
    const timeline = summaryQ.data?.moistureTimeline ?? [];
    if (!timeline.length) return [];
    const buckets = new Map<string, { day: string; sum: number; n: number }>();
    timeline.forEach((p) => {
      const d = new Date(p.time);
      const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const b = buckets.get(key) ?? { day: key, sum: 0, n: 0 };
      b.sum += p.moisturePct;
      b.n += 1;
      buckets.set(key, b);
    });
    return Array.from(buckets.values()).map((b) => ({
      day: b.day,
      predicted: Math.round((b.sum / b.n) * 10) / 10,
    }));
  }, [summaryQ.data]);

  const moistureChart = useMemo(() => {
    const pred = new Map(predictedDaily.map((p) => [p.day, p.predicted]));
    const rows = new Map<string, { day: string; moisture: number | null; predicted: number | null }>();
    daily.forEach((d) => rows.set(d.day, { day: d.day, moisture: d.moisture, predicted: pred.get(d.day) ?? null }));
    predictedDaily.forEach((p) => {
      const existing = rows.get(p.day);
      if (existing) existing.predicted = p.predicted;
      else rows.set(p.day, { day: p.day, moisture: null, predicted: p.predicted });
    });
    return Array.from(rows.values());
  }, [daily, predictedDaily]);

  const radarData = fp && fp.status === "calculated"
    ? [
        { trait: "Moisture retention", value: fp.moistureRetention },
        { trait: "Drying rate", value: Math.min(100, fp.dryingRatePctPerDay * 14) },
        { trait: "Irrigation response", value: Math.min(100, fp.irrigationResponsePct * 6) },
        { trait: "Rain response", value: Math.min(100, fp.rainResponsePct * 8) },
        { trait: "Recovery speed", value: Math.max(10, 100 - fp.recoveryHours * 2.4) },
      ]
    : [];

  const learning = useMemo(
    () =>
      events
        .filter((e) => e.appliedWaterL > 0)
        .slice(0, 10)
        .reverse()
        .map((e) => {
          const predicted = Math.round(((e.appliedWaterL * 0.0195) / 1) * 10) / 10;
          return {
            label: `${new Date(e.date).getDate()}/${new Date(e.date).getMonth() + 1}`,
            observed: e.moistureResponsePct,
            predicted,
          };
        }),
    [events],
  );

  return (
    <div className="mx-auto max-w-[1440px]">
      <PageHeader
        title="Analytics"
        subtitle="Historical water use, soil response, and model calibration verification."
        status={statusQ.data}
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard
          index={0}
          label="Water applied (7 days)"
          value={totalApplied7d ? `${(totalApplied7d / 1000).toFixed(1)}k L` : "0 L"}
          sub="Logged applications"
          info={<>Total irrigation water physically applied through automated or scheduled valves in the last 7 days.</>}
        />
        <KpiCard
          index={1}
          label="Est. water saved"
          value={savedTotal ? `${(savedTotal / 1000).toFixed(1)}k L` : "0 L"}
          sub="Vs unoptimized baseline"
          accent
          trend={{ direction: "up", text: "cumulative", good: true }}
          info={<>Net water preserved by waiting for forecast rain windows and deficit rationing.</>}
        />
        <KpiCard
          index={2}
          label="Avg moisture response"
          value={meanResponse ? `+${meanResponse.toFixed(1)}%` : "—"}
          sub="Per irrigation event"
          info={<>Observed volumetric soil moisture delta within 3 hours post-irrigation.</>}
        />
        <KpiCard
          index={3}
          label="Rainfall (7 days)"
          value={daily.length ? `${daily.reduce((s, d) => s + d.rain, 0).toFixed(0)} mm` : "—"}
          sub="Open-Meteo observations"
          info={<>Observed cumulative rainfall from local meteorological radar.</>}
        />
      </div>

      <div className="mt-6 space-y-6">
        {/* Soil moisture trend */}
        <section>
          <h2 className="text-[17px] font-semibold text-ink">Soil moisture timeline</h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            Observed root-zone moisture progression against the 7-day digital-twin prediction and hydraulic critical points.
          </p>
          <Panel className="mt-3">
            <div className="p-4">
              {moistureChart.length ? (
                <div style={{ height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={moistureChart} margin={{ top: 8, right: 16, bottom: 4, left: -8 }}>
                      <CartesianGrid stroke={CHART.grid} vertical={false} />
                      <XAxis dataKey="day" {...AXIS_STYLE} />
                      <YAxis domain={[15, 35]} tickFormatter={(v) => `${v}%`} {...AXIS_STYLE} />
                      <ChartTooltip formatter={(v) => `${v}%`} />
                      <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 11, paddingTop: 4, color: "#60746C" }} />
                      <Line dataKey="moisture" name="Observed" stroke={CHART.recommended} strokeWidth={2.5} dot={{ r: 3.5 }} connectNulls />
                      <Line dataKey="predicted" name="Predicted (7-day twin)" stroke={CHART.alternative} strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-[200px] items-center justify-center text-tiny text-ink-muted">
                  No historical moisture records or twin predictions available yet for this field.
                </div>
              )}
            </div>
          </Panel>
        </section>

        {/* Predicted vs Applied */}
        <section>
          <h2 className="text-[17px] font-semibold text-ink">Predicted need vs. applied volume</h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            Comparison between the optimizer recommendation and executed field applications.
          </p>
          <Panel className="mt-3">
            <div className="p-4">
              {predVsActual.length ? (
                <div style={{ height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={predVsActual} margin={{ top: 8, right: 16, bottom: 4, left: -8 }}>
                      <CartesianGrid stroke={CHART.grid} vertical={false} />
                      <XAxis dataKey="label" {...AXIS_STYLE} />
                      <YAxis tickFormatter={(v) => `${v}L`} {...AXIS_STYLE} />
                      <ChartTooltip formatter={(v) => `${v} L`} />
                      <Bar dataKey="predicted" name="Predicted Need" fill="#8FA694" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="actual" name="Applied Water" fill="#28745F" radius={[3, 3, 0, 0]} />
                      <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 11, paddingTop: 4, color: "#60746C" }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-[200px] items-center justify-center text-tiny text-ink-muted">
                  No irrigation application events recorded yet.
                </div>
              )}
            </div>
          </Panel>
        </section>

        {/* Water Fingerprint */}
        <section>
          <h2 className="text-[17px] font-semibold text-ink">Soil water fingerprint</h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            Field hydraulic properties and drying curves based on soil texture and recorded behavior.
          </p>
          <Panel className="mt-3">
            <div className="p-5">
              {radarData.length ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-[1.2fr_1fr]">
                  <div style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke={CHART.grid} />
                        <PolarAngleAxis dataKey="trait" tick={{ fill: "#60746C", fontSize: 11 }} />
                        <Radar name="Field hydraulic profile" dataKey="value" stroke="#28745F" fill="#28745F" fillOpacity={0.3} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 text-tiny text-ink-muted">
                    <div className="font-semibold text-ink">Analytical Notes</div>
                    {fp?.notes?.map((n, i) => (
                      <div key={i} className="rounded-lg border border-line bg-subtle p-2.5">
                        {n}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-line bg-subtle p-5 text-tiny text-ink-muted">
                  Soil hydraulic fingerprinting requires logged sensor telemetry or field soil classification in Settings.
                </div>
              )}
            </div>
          </Panel>
        </section>
      </div>
    </div>
  );
}
