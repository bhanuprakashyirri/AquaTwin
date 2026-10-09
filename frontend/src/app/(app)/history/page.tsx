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
          label: `${new Date(e.date).getDate()}/${new Date(e.date).getMonth() + 1} ${e.zone.split(" ")[1] || ""}`,
          predicted: e.predictedRequirementL,
          applied: e.appliedWaterL,
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

  return (
    <div className="mx-auto max-w-[1440px]">
      <PageHeader
        title="Irrigation History"
        subtitle="Chronological log of past irrigation actions, predicted requirements and soil moisture response."
        status={statusQ.data}
      />

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
          subtitle={`${events.length} total events`}
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
              <thead className="border-b border-line bg-subtle text-micro font-medium text-ink-muted">
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
                  <tr key={e.id || `${e.date}-${e.zone}`} className="hover:bg-subtle/50">
                    <td className="px-4 py-3 font-medium text-ink">{fmtDate(e.date)}</td>
                    <td className="px-4 py-3 text-ink-soft">{e.zone}</td>
                    <td className="px-4 py-3 text-right font-medium text-ink">{fmtL(e.appliedWaterL)}</td>
                    <td className="px-4 py-3 text-right text-ink-muted">{fmtL(e.predictedRequirementL)}</td>
                    <td className="px-4 py-3 text-right font-medium text-success">
                      {e.moistureResponsePct > 0 ? `+${e.moistureResponsePct.toFixed(1)}%` : "0%"}
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
              No irrigation records are available yet.
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
