"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/layout/page-header";
import { Panel, PanelHeader, DataBadge, DemoPill } from "@/components/ui/panel";
import { KpiCard } from "@/components/ui/kpi";
import { AXIS_STYLE, CHART, ChartTooltip } from "@/components/charts/common";
import { fetchHistory, fetchSystemStatus, fetchWaterFingerprint, fetchWeather } from "@/services/api";
import { useApiData } from "@/hooks/useApiData";
import { OBSERVATIONS_7D } from "@/lib/demo-data";

export default function AnalyticsPage() {
  const histQ = useApiData(() => fetchHistory("field-a"));
  const wxQ = useApiData(() => fetchWeather("field-a"));
  const fpQ = useApiData(() => fetchWaterFingerprint());
  const statusQ = useApiData(() => fetchSystemStatus());

  const daily = useMemo(() => {
    const buckets = new Map<string, { day: string; moisture: number; irrigation: number; rain: number }>();
    OBSERVATIONS_7D.forEach((o) => {
      const key = new Date(o.time).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const b = buckets.get(key) ?? { day: key, moisture: 0, irrigation: 0, rain: 0 };
      b.rain += o.rainfallMm;
      buckets.set(key, b);
    });
    (histQ.data?.events ?? []).forEach((e) => {
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
  }, [histQ.data]);

  const predVsActual = useMemo(() => {
    return (histQ.data?.events ?? [])
      .slice(0, 10)
      .reverse()
      .map((e) => ({
        label: `${new Date(e.date).getDate()}/${new Date(e.date).getMonth() + 1}`,
        predicted: e.predictedRequirementL,
        actual: e.appliedWaterL,
      }));
  }, [histQ.data]);

  const fp = fpQ.data;
  const events = histQ.data?.events ?? [];
  const irrigated = events.filter((e) => e.appliedWaterL > 0);
  const totalApplied7d = events.slice(0, 14).reduce((s, e) => s + e.appliedWaterL, 0);
  const savedTotal = events.reduce(
    (s, e) => s + (e.decision === "Waited" ? e.predictedRequirementL * 0.55 : Math.max(0, e.predictedRequirementL - e.appliedWaterL)),
    0,
  );
  const meanResponse = irrigated.length
    ? irrigated.reduce((s, e) => s + e.moistureResponsePct, 0) / irrigated.length
    : 0;

  // Radar: normalize fingerprint traits to 0-100
  const radarData = fp
    ? [
        { trait: "Moisture retention", value: fp.moistureRetention },
        { trait: "Drying rate", value: Math.min(100, fp.dryingRatePctPerDay * 14) },
        { trait: "Irrigation response", value: Math.min(100, fp.irrigationResponsePct * 6) },
        { trait: "Rain response", value: Math.min(100, fp.rainResponsePct * 8) },
        { trait: "Recovery speed", value: Math.max(10, 100 - fp.recoveryHours * 2.4) },
      ]
    : [];

  // Twin learning history: observed vs predicted response over recent events
  const learning = useMemo(
    () =>
      events
        .filter((e) => e.appliedWaterL > 0)
        .slice(0, 10)
        .reverse()
        .map((e) => {
          const predicted = Math.round(((e.appliedWaterL * 0.0195) / 1) * 10) / 10; // litres → expected moisture points
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
        subtitle="How the field used water over the last seven days — and how well predictions matched reality."
        status={statusQ.data}
        actions={<DemoPill />}
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard index={0} label="Water applied (7 days)" value={`${(totalApplied7d / 1000).toFixed(1)}k L`} sub="Across 4 zones" />
        <KpiCard index={1} label="Est. water saved" value={`${(savedTotal / 1000).toFixed(1)}k L`} sub="Vs fixed schedule" trend={{ direction: "up", text: "cumulative", good: true }} />
        <KpiCard index={2} label="Avg moisture response" value={`+${meanResponse.toFixed(1)}%`} sub="Per irrigation event" />
        <KpiCard index={3} label="Rainfall (7 days)" value={`${daily.reduce((s, d) => s + d.rain, 0).toFixed(0)} mm`} sub="≈80% effective" />
      </div>

      {/* Editorial chart sections — fewer, larger with one-line interpretation */}
      <div className="mt-6 space-y-6">
        {/* 1. Soil moisture */}
        <section>
          <h2 className="text-[17px] font-semibold text-ink">Soil moisture</h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            Root-zone moisture remained stable between 21.8% and 27.2%, comfortably above the 14% wilting point.
          </p>
          <Panel className="mt-3">
            <div className="p-4">
              <div style={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={daily} margin={{ top: 8, right: 16, bottom: 4, left: -8 }}>
                    <CartesianGrid stroke={CHART.grid} vertical={false} />
                    <XAxis dataKey="day" {...AXIS_STYLE} />
                    <YAxis domain={[15, 35]} tickFormatter={(v) => `${v}%`} {...AXIS_STYLE} />
                    <ChartTooltip formatter={(v) => `${v}%`} />
                    <Line dataKey="moisture" name="Root-zone moisture" stroke={CHART.recommended} strokeWidth={2.5} dot={{ r: 3.5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Panel>
        </section>

        {/* 2. Crop stress */}
        <section>
          <h2 className="text-[17px] font-semibold text-ink">Crop stress</h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            Crop stress stayed safely below the 15% threshold throughout the week, peaking briefly before scheduled watering.
          </p>
          <Panel className="mt-3">
            <div className="p-4">
              <div style={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={daily} margin={{ top: 8, right: 16, bottom: 4, left: -8 }}>
                    <CartesianGrid stroke={CHART.grid} vertical={false} />
                    <XAxis dataKey="day" {...AXIS_STYLE} />
                    <YAxis domain={[0, 25]} tickFormatter={(v) => `${v}%`} {...AXIS_STYLE} />
                    <ChartTooltip formatter={(v) => `${v}%`} />
                    <Line dataKey="stress" name="Crop stress risk" stroke={CHART.risk} strokeWidth={2.5} dot={{ r: 3.5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Panel>
        </section>

        {/* 3. Water use */}
        <section>
          <h2 className="text-[17px] font-semibold text-ink">Water use</h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            Water use decreased 18% during the last 7 days as rainfall covered more of the crop demand.
          </p>
          <Panel className="mt-3">
            <div className="p-4">
              <div style={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={daily} margin={{ top: 8, right: 16, bottom: 4, left: -8 }}>
                    <CartesianGrid stroke={CHART.grid} vertical={false} />
                    <XAxis dataKey="day" {...AXIS_STYLE} />
                    <YAxis {...AXIS_STYLE} />
                    <ChartTooltip formatter={(v) => `${v} L`} />
                    <Bar dataKey="irrigation" name="Irrigation applied" fill={CHART.recommended} radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Panel>
        </section>

        <section>
          <h2 className="text-[17px] font-semibold text-ink">Rainfall vs irrigation</h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            Rain arrived on three days; irrigation was deferred twice when rain probability was high.
          </p>
          <Panel className="mt-3">
            <div className="p-4">
              <div style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={daily} margin={{ top: 8, right: 16, bottom: 4, left: -8 }}>
                    <CartesianGrid stroke={CHART.grid} vertical={false} />
                    <XAxis dataKey="day" {...AXIS_STYLE} />
                    <YAxis yAxisId="l" {...AXIS_STYLE} />
                    <ChartTooltip formatter={(v, n) => (n === "Rainfall" ? `${v} mm` : `${v} L`)} />
                    <Legend wrapperStyle={{ fontSize: 11, color: "#68776F" }} iconSize={8} />
                    <Bar yAxisId="l" dataKey="irrigation" name="Irrigation (L)" fill="rgba(47,107,88,0.35)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Line yAxisId="l" dataKey="rain" name="Rainfall (mm)" stroke={CHART.info} strokeWidth={2.5} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Panel>
        </section>

        <section>
          <h2 className="text-[17px] font-semibold text-ink">Prediction vs actual</h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            Applied water tracked predicted requirement closely; differences reflect deliberate wait and partial decisions.
          </p>
          <Panel className="mt-3">
            <div className="p-4">
              <div style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={predVsActual} margin={{ top: 8, right: 16, bottom: 4, left: -8 }}>
                    <CartesianGrid stroke={CHART.grid} vertical={false} />
                    <XAxis dataKey="label" {...AXIS_STYLE} />
                    <YAxis {...AXIS_STYLE} />
                    <ChartTooltip formatter={(v) => `${v} L`} />
                    <Legend wrapperStyle={{ fontSize: 11, color: "#68776F" }} iconSize={8} />
                    <Bar dataKey="predicted" name="Predicted" fill={CHART.alternative} radius={[4, 4, 0, 0]} maxBarSize={26} />
                    <Bar dataKey="actual" name="Applied" fill={CHART.recommended} radius={[4, 4, 0, 0]} maxBarSize={26} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Panel>
        </section>
      </div>

      {/* Water Fingerprint */}
      <section className="mt-8">
        <h2 className="text-[17px] font-semibold text-ink">Field Water Fingerprint</h2>
        <p className="mt-0.5 text-sm text-ink-muted">How this field responds to irrigation and weather.</p>
        <Panel className="mt-3">
          <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1fr_1.1fr]">
            <div className="border-b border-line p-4 lg:border-b-0 lg:border-r" style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="72%">
                  <PolarGrid stroke={CHART.grid} />
                  <PolarAngleAxis dataKey="trait" tick={{ fill: "#68776F", fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  <ChartTooltip formatter={(v) => `${Math.round(Number(v))}/100`} />
                  <Radar dataKey="value" name="Field profile" stroke={CHART.recommended} fill="rgba(47,107,88,0.18)" strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="p-5">
              {fp ? (
                <div className="space-y-3">
                  {[
                    ["Moisture retention", `${fp.moistureRetention}/100`, "How long the soil holds applied water"],
                    ["Drying rate", `${fp.dryingRatePctPerDay}%/day`, "Typical loss under seasonal conditions"],
                    ["Irrigation response", `+${fp.irrigationResponsePct}%`, "Moisture gained per standard event"],
                    ["Rain response", `+${fp.rainResponsePct}%`, "Moisture gained per effective rain day"],
                    ["Recovery time", `${fp.recoveryHours}h`, "Return to safe range after stress"],
                  ].map(([k, v, hint]) => (
                    <div key={k} className="flex items-baseline justify-between gap-3 border-b border-line pb-2.5 last:border-0">
                      <div>
                        <div className="text-sm font-medium text-ink">{k}</div>
                        <div className="text-micro text-ink-muted">{hint}</div>
                      </div>
                      <div className="text-sm font-semibold text-brand-dark">{v}</div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <div className="border-t border-line p-4">
            <div className="text-tiny font-semibold text-ink">Twin learning history</div>
            <p className="mt-0.5 text-micro text-ink-muted">
              Observed vs predicted moisture response — the model learns how this field reacts to each irrigation.
            </p>
            <div style={{ height: 180 }} className="mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={learning} margin={{ top: 4, right: 16, bottom: 4, left: -14 }}>
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis dataKey="label" {...AXIS_STYLE} />
                  <YAxis {...AXIS_STYLE} tickFormatter={(v) => `+${v}%`} />
                  <ChartTooltip formatter={(v) => `+${v}%`} />
                  <Legend wrapperStyle={{ fontSize: 11, color: "#68776F" }} iconSize={8} />
                  <Bar dataKey="predicted" name="Predicted response" fill={CHART.alternative} radius={[3, 3, 0, 0]} maxBarSize={22} />
                  <Line dataKey="observed" name="Observed response" stroke={CHART.recommended} strokeWidth={2.5} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Panel>
      </section>
    </div>
  );
}
