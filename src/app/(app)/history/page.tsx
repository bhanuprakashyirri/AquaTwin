"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/layout/page-header";
import { Panel, PanelHeader, DataBadge, DemoPill } from "@/components/ui/panel";
import { AXIS_STYLE, CHART, ChartTooltip } from "@/components/charts/common";
import { fetchHistory, fetchSystemStatus } from "@/services/api";
import { useApiData } from "@/hooks/useApiData";
import { fmtDate, fmtL } from "@/lib/format";
import type { IrrigationEvent } from "@/types";

const ZONES = ["All zones", "Zone A", "Zone B", "Zone C", "Zone D"];
const DECISIONS = ["All decisions", "Irrigated", "Waited", "Partial"];

export default function HistoryPage() {
  const histQ = useApiData(() => fetchHistory("field-a"));
  const statusQ = useApiData(() => fetchSystemStatus());
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
          label: `${new Date(e.date).getDate()}/${new Date(e.date).getMonth() + 1} ${e.zone.split(" ")[1]}`,
          predicted: e.predictedRequirementL,
          applied: e.appliedWaterL,
        })),
    [sorted],
  );

  const decisionBadge = (d: IrrigationEvent["decision"]) =>
    d === "Irrigated" ? <DataBadge tone="good">{d}</DataBadge> : d === "Waited" ? <DataBadge tone="info">{d}</DataBadge> : <DataBadge tone="warn">{d}</DataBadge>;

  const selectCls =
    "rounded-lg border border-line bg-surface px-2.5 py-1.5 text-tiny text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";

  return (
    <div className="mx-auto max-w-[1440px]">
      <PageHeader
        title="Irrigation History"
        subtitle="Every irrigation decision with its predicted requirement, actual response, and reason."
        status={statusQ.data}
        actions={<DemoPill />}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.7fr_1fr]">
        <Panel>
          <PanelHeader
            title="Decision log"
            subtitle={`${sorted.length} of ${events.length} records`}
            right={
              <div className="flex flex-wrap items-center gap-2">
                <select value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)} aria-label="Filter by zone" className={selectCls}>
                  {ZONES.map((z) => (
                    <option key={z}>{z}</option>
                  ))}
                </select>
                <select value={decisionFilter} onChange={(e) => setDecisionFilter(e.target.value)} aria-label="Filter by decision" className={selectCls}>
                  {DECISIONS.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
                <select value={rowCount} onChange={(e) => setRowCount(Number(e.target.value))} aria-label="Rows shown" className={selectCls}>
                  <option value={10}>10 rows</option>
                  <option value={14}>14 rows</option>
                  <option value={28}>All rows</option>
                </select>
              </div>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-tiny">
              <thead>
                <tr className="border-b border-line text-micro font-medium text-ink-faint">
                  <th className="px-5 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5 font-medium">Zone</th>
                  <th className="px-4 py-2.5 font-medium">Applied</th>
                  <th className="px-4 py-2.5 font-medium">Predicted</th>
                  <th className="px-4 py-2.5 font-medium">Moisture response</th>
                  <th className="px-4 py-2.5 font-medium">Decision</th>
                  <th className="px-5 py-2.5 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((e, i) => (
                  <tr key={i} className="border-b border-line/60 transition-colors last:border-0 hover:bg-subtle/60">
                    <td className="px-5 py-3 text-ink">{fmtDate(e.date)}</td>
                    <td className="px-4 py-3 font-medium text-ink">{e.zone}</td>
                    <td className="px-4 py-3 text-ink">{e.appliedWaterL > 0 ? fmtL(e.appliedWaterL) : "—"}</td>
                    <td className="px-4 py-3 text-ink-muted">{fmtL(e.predictedRequirementL)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${e.moistureResponsePct > 8 ? "text-success" : "text-warning"}`}>
                        {e.appliedWaterL > 0 ? "+" : ""}
                        {e.moistureResponsePct}%
                      </span>
                    </td>
                    <td className="px-4 py-3">{decisionBadge(e.decision)}</td>
                    <td className="px-5 py-3 text-ink-muted">{e.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Prediction vs actual" subtitle="Selected records" />
          <div className="p-4">
            <div style={{ height: 420 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 4 }}>
                  <CartesianGrid stroke={CHART.grid} horizontal={false} />
                  <XAxis type="number" {...AXIS_STYLE} />
                  <YAxis type="category" dataKey="label" width={64} {...AXIS_STYLE} />
                  <ChartTooltip formatter={(v) => `${v} L`} />
                  <Legend wrapperStyle={{ fontSize: 11, color: "#68776F" }} iconSize={8} />
                  <Bar dataKey="predicted" name="Predicted" fill={CHART.alternative} radius={[0, 3, 3, 0]} maxBarSize={10} />
                  <Bar dataKey="applied" name="Applied" fill={CHART.recommended} radius={[0, 3, 3, 0]} maxBarSize={10} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
