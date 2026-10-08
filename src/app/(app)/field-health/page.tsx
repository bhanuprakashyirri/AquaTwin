"use client";

import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/layout/page-header";
import { Panel, PanelHeader, DataBadge, DemoPill } from "@/components/ui/panel";
import { KpiCard } from "@/components/ui/kpi";
import { FarmMap } from "@/components/maps/farm-map";
import { AXIS_STYLE, CHART, ChartTooltip } from "@/components/charts/common";
import { fetchSatellite, fetchSystemStatus, fetchZones } from "@/services/api";
import { useApiData } from "@/hooks/useApiData";
import { useSensorStream } from "@/hooks/useSensorStream";
import { stressTone } from "@/lib/format";
import { DataBadge as _DB } from "@/components/ui/panel";
import type { Zone } from "@/types";

export default function FieldHealthPage() {
  const zonesQ = useApiData(() => fetchZones("field-a"));
  const satQ = useApiData(() => fetchSatellite("field-a"));
  const statusQ = useApiData(() => fetchSystemStatus());
  const stream = useSensorStream("field-a");
  const [layer, setLayer] = useState("stress");
  const [selected, setSelected] = useState<string | null>(null);

  const zones: Zone[] = zonesQ.data?.zones ?? [];
  const series = satQ.data?.series ?? [];
  const ndviNow = series.length ? series[series.length - 1].ndvi : 0.65;

  const vegetation = Math.round((ndviNow / 0.85) * 100);
  const moisture = Math.round((zones.reduce((s, z) => s + z.moisturePct, 0) / (zones.length || 1) / 34) * 100);
  const weatherRisk = 76;
  const index = Math.round((vegetation + moisture + weatherRisk) / 3);

  return (
    <div className="mx-auto max-w-[1440px]">
      <PageHeader
        title="Field Health"
        subtitle="Agricultural health analytics from satellite-derived and sensor layers."
        status={statusQ.data}
        actions={<DemoPill />}
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard index={0} label="Field health score" value={`${index} / 100`} sub="Composite index" accent />
        <KpiCard index={1} label="Vegetation" value={vegetation} sub={`NDVI-style ${ndviNow.toFixed(2)} · demo`} />
        <KpiCard index={2} label="Moisture" value={moisture} sub="Against field capacity" />
        <KpiCard index={3} label="Weather risk" value={weatherRisk} sub="48h rain + heat" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.7fr_1fr]">
        <Panel className="overflow-hidden">
          <PanelHeader
            title="Health map"
            subtitle="Zone colors show the selected layer"
            right={<DataBadge tone="neutral">Simulated for demonstration</DataBadge>}
          />
          <div className="h-[480px] p-2">
            <FarmMap
              zones={zones}
              layer={layer}
              onLayerChange={setLayer}
              selectedZoneId={selected}
              onZoneSelect={setSelected}
              sensors={stream.sensors}
            />
          </div>
          <div className="flex flex-wrap gap-1.5 border-t border-line px-4 py-2.5">
            {[
              ["moisture", "Soil moisture"],
              ["stress", "Crop stress"],
              ["ndvi", "Vegetation health"],
              ["priority", "Irrigation priority"],
            ].map(([k, label]) => (
              <button
                key={k}
                onClick={() => setLayer(k)}
                aria-pressed={layer === k}
                className={`rounded-md px-2.5 py-1 text-tiny font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
                  layer === k ? "bg-brand-light text-brand-dark" : "text-ink-muted hover:bg-subtle"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Zone detail" subtitle={selected ? zones.find((z) => z.id === selected)?.name : "Click a zone"} />
            <div className="p-5 text-sm">
              {(() => {
                const z = zones.find((zz) => zz.id === selected);
                if (!z)
                  return (
                    <div className="text-ink-muted">
                      Select a zone to see its vegetation, moisture and stress detail.
                    </div>
                  );
                return (
                  <div className="space-y-3">
                    {[
                      ["Vegetation (NDVI-style)", z.ndvi.toFixed(2)],
                      ["Soil moisture", `${z.moisturePct}%`],
                      ["Crop stress", `${z.stressRiskPct}%`],
                      ["Irrigation priority", `P${z.priority}`],
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between border-b border-line pb-2.5 last:border-0 last:pb-0">
                        <span className="text-ink-muted">{k}</span>
                        <span className="font-semibold text-ink">{v}</span>
                      </div>
                    ))}
                    <DataBadge tone={stressTone(z.stressRiskPct)}>
                      {z.stressRiskPct < 15 ? "Healthy" : z.stressRiskPct < 40 ? "Watch" : "Needs attention"}
                    </DataBadge>
                  </div>
                );
              })()}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="How to read this" />
            <div className="space-y-2.5 p-5 text-tiny leading-relaxed text-ink-muted">
              <p>
                <span className="font-medium text-ink">Vegetation</span> reflects canopy density from satellite-style
                indices. <span className="font-medium text-ink">Moisture</span> compares root-zone water against field
                capacity. <span className="font-medium text-ink">Weather risk</span> blends rain and heat exposure over
                the next 48 hours.
              </p>
              <p className="text-ink-faint">
                Satellite-derived values in this prototype are simulated. In production they come from a Sentinel-2
                provider through the same interface.
              </p>
            </div>
          </Panel>
        </div>
      </div>

      <Panel className="mt-4">
        <PanelHeader title="Health trend" subtitle="30-day simulated satellite-derived series (5-day revisits)" />
        <div className="p-4">
          <div style={{ height: 230 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 8, right: 16, bottom: 4, left: -12 }}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis
                  dataKey="time"
                  {...AXIS_STYLE}
                  tickFormatter={(t) => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                />
                <YAxis domain={[-0.2, 0.9]} {...AXIS_STYLE} />
                <ChartTooltip
                  formatter={(v) => Number(v).toFixed(2)}
                  labelFormatter={(l) => new Date(l).toLocaleDateString("en-US", { month: "long", day: "numeric" })}
                />
                <Line dataKey="ndvi" name="Vegetation index" stroke={CHART.recommended} strokeWidth={2} dot={{ r: 2.5 }} />
                <Line dataKey="ndwi" name="Water index" stroke={CHART.info} strokeWidth={2} dot={{ r: 2.5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Panel>
    </div>
  );
}
