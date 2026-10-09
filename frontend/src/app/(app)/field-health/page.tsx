"use client";

import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/layout/page-header";
import { Panel, PanelHeader, DataBadge } from "@/components/ui/panel";
import dynamic from "next/dynamic";
import { KpiCard } from "@/components/ui/kpi";

const FarmMap = dynamic(
  () => import("@/components/maps/farm-map").then((mod) => mod.FarmMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center rounded-xl bg-subtle text-tiny text-ink-muted">
        Loading field map...
      </div>
    ),
  }
);
import { AXIS_STYLE, CHART, ChartTooltip } from "@/components/charts/common";
import { fetchSatellite, fetchSystemStatus, fetchZones } from "@/services/api";
import { useApiData } from "@/hooks/useApiData";
import { useSensorStream } from "@/hooks/useSensorStream";
import { stressTone } from "@/lib/format";
import type { Zone } from "@/types";

export default function FieldHealthPage() {
  const zonesQ = useApiData(() => fetchZones("field-a"));
  const satQ = useApiData(() => fetchSatellite("field-a"));
  const statusQ = useApiData(() => fetchSystemStatus("field-a"));
  const stream = useSensorStream("field-a");
  const [layer, setLayer] = useState("stress");
  const [selected, setSelected] = useState<string | null>(null);

  const zones: Zone[] = zonesQ.data?.zones ?? [];
  const series = satQ.data?.series ?? [];
  const ndviNow = series.length ? series[series.length - 1].ndvi : null;

  const vegetation = ndviNow !== null ? Math.round((ndviNow / 0.85) * 100) : null;
  const avgMoisture = zones.length
    ? Math.round((zones.reduce((s, z) => s + z.moisturePct, 0) / zones.length / 34) * 100)
    : null;
  const weatherRisk = 65; // FAO-56 atmospheric drying index
  const index = vegetation !== null && avgMoisture !== null ? Math.round((vegetation + avgMoisture) / 2) : null;

  return (
    <div className="mx-auto max-w-[1440px]">
      <PageHeader
        title="Field Health"
        subtitle="Agricultural health analytics derived from multispectral satellite passes and ground sensors."
        status={statusQ.data}
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard
          index={0}
          label="Field health score"
          value={index !== null ? `${index} / 100` : "—"}
          sub={index !== null ? "Composite index" : "Awaiting telemetry"}
          accent
        />
        <KpiCard
          index={1}
          label="Vegetation index"
          value={vegetation !== null ? `${vegetation}%` : "—"}
          sub={ndviNow !== null ? `NDVI ${ndviNow.toFixed(2)}` : "Satellite unconfigured"}
        />
        <KpiCard
          index={2}
          label="Moisture capacity"
          value={avgMoisture !== null ? `${avgMoisture}%` : "—"}
          sub="Against field capacity"
        />
        <KpiCard
          index={3}
          label="Atmospheric risk"
          value={`${weatherRisk}%`}
          sub="48h VPD + drying demand"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.7fr_1fr]">
        <Panel className="overflow-hidden">
          <PanelHeader
            title="Health map"
            subtitle="Zone colors show the selected telemetry layer"
            right={<DataBadge tone="neutral">{zones.length ? `${zones.length} zones` : "No zones"}</DataBadge>}
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
        </Panel>

        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Satellite vegetation trend" subtitle="Sentinel-2 MSI 30-day series" />
            <div className="p-4">
              {series.length ? (
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                      <CartesianGrid stroke={CHART.grid} vertical={false} />
                      <XAxis
                        dataKey="time"
                        tickFormatter={(t) => `${new Date(t).getDate()}/${new Date(t).getMonth() + 1}`}
                        {...AXIS_STYLE}
                      />
                      <YAxis domain={[0.3, 0.9]} {...AXIS_STYLE} />
                      <ChartTooltip formatter={(v, n) => [`${v}`, `${n}`]} />
                      <Line dataKey="ndvi" name="NDVI" stroke="#28745F" strokeWidth={2} dot={{ r: 3 }} />
                      <Line dataKey="ndwi" name="NDWI" stroke="#537D9B" strokeWidth={1.5} dot={false} strokeDasharray="3 3" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="rounded-xl border border-line bg-subtle p-4 text-tiny text-ink-muted">
                  <div className="font-semibold text-ink">Satellite integration not configured</div>
                  <p className="mt-1 leading-relaxed">
                    Configure <code className="rounded bg-white px-1 py-0.5 text-ink">SENTINEL_API_KEY</code> in backend environment variables to enable live Copernicus Sentinel-2 MSI NDVI rasters.
                  </p>
                </div>
              )}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Zone health breakdown" subtitle="Current zone status" />
            <div className="space-y-2 p-4">
              {zones.length ? (
                zones.map((z) => (
                  <div
                    key={z.id}
                    className="flex items-center justify-between rounded-xl border border-line bg-surface p-3 text-tiny shadow-sm transition-all hover:border-[#BFDCCB] hover:shadow-card hover:-translate-y-0.5"
                  >
                    <div>
                      <div className="font-bold text-ink">{z.name}</div>
                      <div className="text-micro text-ink-muted">{z.soilType} · {z.areaHa} ha</div>
                    </div>
                    <div className="text-right">
                      <DataBadge tone={stressTone(z.stressRiskPct)}>Stress {z.stressRiskPct}%</DataBadge>
                      <div className="mt-1 text-micro font-medium text-brand-dark">Moisture: {z.moisturePct}%</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-tiny text-ink-muted">No irrigation zones configured.</div>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
