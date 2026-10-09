"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/layout/page-header";
import { Panel, PanelHeader, DataBadge } from "@/components/ui/panel";
import { Dropdown } from "@/components/ui/dropdown";
import { AXIS_STYLE, CHART, ChartTooltip } from "@/components/charts/common";
import { fetchHistory, fetchSystemStatus } from "@/services/api";
import { useApiData } from "@/hooks/useApiData";
import { fmtDate, fmtL } from "@/lib/format";
import type { IrrigationEvent } from "@/types";

const ZONES = ["All zones", "Zone A", "Zone B", "Zone C", "Zone D"];
const DECISIONS = ["All decisions", "Irrigated", "Waited", "Partial"];

export default function HistoryPage() {
  const histQ = useApiData(() => fetchHistory("field-a"));
  const statusQ = useApiData(() => fetchSystemStatus("field-a"));
  const [zoneFilter, setZoneFilter] = useState("All zones");
  const [decisionFilter, setDecisionFilter] = useState("All decisions");
  const [rowCount, setRowCount] = useState(14);

  const events = histQ.data?.events ?? [];
  const sorted = useMemo(() => {
    return events
      .filter((e) => {
        if (zoneFilter !== "All zones" && e.zone !== zoneFilter) return false;
        if (decisionFilter !== "All decisions" && e.decision !== decisionFilter) return false;
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, rowCount);
  }, [events, zoneFilter, decisionFilter, rowCount]);

  const chartData = useMemo(
    () =>
      sorted
        .slice(0, 10)
        .reverse()
        .map((e) => ({
          label: `${new Date(e.date).getDate()}/${new Date(e.date).getMonth() + 1} ${(e.zone || "").split(" ")[1] || ""}`,
          predicted: e.predictedRequirementL ?? (e as any).predicted_requirement_l ?? 0,
          applied: e.appliedWaterL ?? (e as any).applied_water_l ?? 0,
        })),
    [sorted],
  );

  const decisionBadge = (d: IrrigationEvent["decision"]) =>
    d === "Irrigated" ? <DataBadge tone="good">{d}</DataBadge> : d === "Waited" ? <DataBadge tone="info">{d}</DataBadge> : <DataBadge tone="warn">{d}</DataBadge>;

  const zoneOptions = ZONES.map((z) => ({ value: z, label: z }));
  const decisionOptions = DECISIONS.map((d) => ({ value: d, label: d }));
  const rowOptions = [
    { value: 10, label: "10 rows" },
    { value: 14, label: "14 rows" },
    { value: 28, label: "All rows" },
  ];

  const totalApplied = useMemo(() => events.reduce((s, e) => s + (e.appliedWaterL ?? (e as any).applied_water_l ?? 0), 0), [events]);
  const totalDeferred = useMemo(() => events.filter(e => e.decision === "Waited").reduce((s, e) => s + (e.predictedRequirementL ?? (e as any).predicted_requirement_l ?? 0), 0), [events]);
  const avgResponse = useMemo(() => {
    const irrigated = events.filter(e => (e.appliedWaterL ?? (e as any).applied_water_l ?? 0) > 0);
    return irrigated.length ? (irrigated.reduce((s, e) => s + (e.moistureResponsePct ?? (e as any).moisture_response_pct ?? 0), 0) / irrigated.length).toFixed(1) : "0";
  }, [events]);

  return (
    <div className="mx-auto max-w-[1440px]">
      <PageHeader
        title="Irrigation History"
        subtitle="Chronological log of past irrigation actions, predicted requirements and soil moisture response."
        status={statusQ.data}
      />

      {/* Summary KPI row */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl2 border border-line bg-surface p-4 shadow-card">
          <div className="text-micro font-bold uppercase tracking-wider text-ink-muted">Total Applied Water</div>
          <div className="mt-1 text-2xl font-bold text-brand-dark">{fmtL(totalApplied)}</div>
          <div className="mt-1 text-micro text-ink-faint">Executed through {events.filter(e => e.appliedWaterL > 0).length} irrigation cycles</div>
        </div>
        <div className="rounded-xl2 border border-[#BFDCCB] bg-brand-light/60 p-4 shadow-card">
          <div className="text-micro font-bold uppercase tracking-wider text-brand-dark/80">Water Deferred / Saved</div>
          <div className="mt-1 text-2xl font-bold text-emerald-800">+{fmtL(totalDeferred)}</div>
          <div className="mt-1 text-micro text-brand-dark/70">Waited for forecasted rain events</div>
        </div>
        <div className="rounded-xl2 border border-line bg-surface p-4 shadow-card">
          <div className="text-micro font-bold uppercase tracking-wider text-ink-muted">Avg Moisture Gain</div>
          <div className="mt-1 text-2xl font-bold text-ink">+{avgResponse}%</div>
          <div className="mt-1 text-micro text-ink-faint">Volumetric root-zone moisture lift</div>
        </div>
      </div>

      <Panel>
        <PanelHeader title="Recent applications" subtitle="Predicted requirement vs actual applied water" />
        <div className="p-4">
          {chartData.length ? (
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis dataKey="label" {...AXIS_STYLE} />
                  <YAxis {...AXIS_STYLE} />
                  <ChartTooltip formatter={(v, name) => `${fmtL(Number(v))} (${name})`} />
                  <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 11, paddingTop: 4, color: "#60746C" }} />
                  <Bar dataKey="predicted" name="Predicted Need" fill="#8FA694" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="applied" name="Applied" fill="#28745F" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[180px] items-center justify-center text-tiny text-ink-muted">
              No irrigation records are available yet.
            </div>
          )}
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader
          title="All events"
          subtitle={`${events.length} total events recorded`}
          right={
            <div className="flex flex-wrap items-center gap-2">
              <Dropdown value={zoneFilter} onChange={setZoneFilter} options={zoneOptions} />
              <Dropdown value={decisionFilter} onChange={setDecisionFilter} options={decisionOptions} />
              <Dropdown value={rowCount} onChange={setRowCount} options={rowOptions} />
            </div>
          }
        />
        <div className="overflow-x-auto">
          {sorted.length ? (
            <table className="w-full text-left text-tiny">
              <thead className="border-b border-line bg-subtle text-micro font-bold uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Zone</th>
                  <th className="px-4 py-3 text-right">Applied</th>
                  <th className="px-4 py-3 text-right">Predicted need</th>
                  <th className="px-4 py-3 text-right">Moisture response</th>
                  <th className="px-4 py-3">Decision</th>
                  <th className="px-4 py-3">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {sorted.map((e) => (
                  <tr key={e.id || `${e.date}-${e.zone}`} className="transition-colors hover:bg-subtle/70">
                    <td className="px-4 py-3 font-semibold text-ink">{fmtDate(e.date)}</td>
                    <td className="px-4 py-3 text-ink-soft">
                      <span className="rounded bg-[#EAF2ED] px-2 py-0.5 text-micro font-medium text-brand-dark">
                        {e.zone}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-brand-dark">{fmtL(e.appliedWaterL ?? (e as any).applied_water_l)}</td>
                    <td className="px-4 py-3 text-right text-ink-muted">{fmtL(e.predictedRequirementL ?? (e as any).predicted_requirement_l)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-success">
                      {(e.moistureResponsePct ?? (e as any).moisture_response_pct ?? 0) > 0 ? `+${(e.moistureResponsePct ?? (e as any).moisture_response_pct).toFixed(1)}%` : "0%"}
                    </td>
                    <td className="px-4 py-3">{decisionBadge(e.decision)}</td>
                    <td className="max-w-md truncate px-4 py-3 text-ink-muted" title={e.reason}>
                      {e.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-tiny text-ink-muted">
              No irrigation records match the selected filters.
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
