"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CloudRain, Droplets, RefreshCcw, Sprout, Layers } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Panel, PanelHeader, DataBadge } from "@/components/ui/panel";
import { Button, LinkButton } from "@/components/ui/button";
import { FarmMap } from "@/components/maps/farm-map";
import { WhyDrawer } from "@/components/ui/assistant";
import { fetchField, fetchFieldState, fetchSystemStatus, fetchZones } from "@/services/api";
import { useApiData } from "@/hooks/useApiData";
import { useSensorStream } from "@/hooks/useSensorStream";
import { fmtL, stressColor } from "@/lib/format";
import type { Zone } from "@/types";

const LAYER_LABELS: Record<string, string> = {
  moisture: "Soil moisture",
  stress: "Crop stress",
  ndvi: "Vegetation health",
  priority: "Irrigation priority",
};

export default function TwinPage() {
  const [selectedZone, setSelectedZone] = useState<string | null>("zone-b");
  const [layer, setLayer] = useState("moisture");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const zonesQ = useApiData(() => fetchZones("field-a"));
  const stateQ = useApiData(() => fetchFieldState("field-a"));
  const fieldQ = useApiData(() => fetchField("field-a"));
  const statusQ = useApiData(() => fetchSystemStatus());
  const stream = useSensorStream("field-a");

  const zones: Zone[] = zonesQ.data?.zones ?? [];
  const zone = zones.find((z) => z.id === selectedZone) ?? null;
  const st = stateQ.data;

  return (
    <div className="mx-auto max-w-[1440px]">
      <PageHeader
        title="Field Twin"
        subtitle="A live virtual representation of the field and its water balance."
        status={statusQ.data}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.9fr_1fr]">
        {/* Map — main focus */}
        <Panel className="overflow-hidden">
          <PanelHeader
            title={fieldQ.data?.name ?? "North Plot"}
            subtitle={`${fieldQ.data?.crop.name ?? "Rice"} · ${fieldQ.data?.crop.growthStage ?? ""} · ${fieldQ.data?.areaHa ?? 10} ha`}
            right={<DataBadge tone="neutral">Live view</DataBadge>}
          />
          <div className="h-[520px] p-2">
            <FarmMap
              zones={zones}
              layer={layer}
              onLayerChange={setLayer}
              selectedZoneId={selectedZone}
              onZoneSelect={setSelectedZone}
              sensors={stream.sensors}
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5 border-t border-line px-4 py-2.5">
            <Layers size={13} className="mr-1 text-ink-faint" />
            {Object.entries(LAYER_LABELS).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setLayer(k)}
                aria-pressed={layer === k}
                className={`rounded-full px-3.5 py-1 text-tiny font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
                  layer === k
                    ? "bg-brand text-white shadow-card"
                    : "text-ink-muted hover:bg-subtle hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </Panel>

        {/* Zone inspector */}
        <div className="space-y-4">
          <Panel>
            <PanelHeader
              title={zone ? zone.name : "Zone details"}
              subtitle={zone ? `${zone.areaHa} ha · ${zone.soilType}` : "Select a zone on the map"}
            />
            {zone ? (
              <motion.div key={zone.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="p-5">
                <div className="space-y-3">
                  {[
                    { label: "Soil moisture", value: `${zone.moisturePct}%` },
                    { label: "Crop stress", value: `${zone.stressRiskPct}%`, color: stressColor(zone.stressRiskPct) },
                    { label: "Water requirement", value: fmtL(zone.waterRequirementL) },
                    { label: "Rain exposure", value: zone.rainExposure },
                    { label: "Last irrigated", value: `${zone.lastIrrigatedHoursAgo}h ago` },
                    { label: "Priority", value: `P${zone.priority}` },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between border-b border-line pb-2.5 last:border-0 last:pb-0">
                      <span className="text-sm text-ink-muted">{row.label}</span>
                      <span className="text-sm font-semibold" style={row.color ? { color: row.color } : undefined}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Why this zone */}
                <div className="mt-4 rounded-lg border border-line bg-subtle p-3.5">
                  <div className="text-tiny font-semibold text-ink">Why this zone?</div>
                  <p className="mt-1 text-tiny leading-relaxed text-ink-muted">
                    {zone.id === "zone-b"
                      ? "Lowest moisture of all zones with the highest predicted stress. Clay-loam soil holds water longer, so a full irrigation now carries the field safely through the next 24 hours."
                      : zone.stressRiskPct > 15
                        ? "Stress risk is above the comfort threshold. Irrigation here reduces predicted stress faster than in lower-priority zones."
                        : "Moisture is within the healthy range. This zone can wait while water goes where stress risk is higher."}
                  </p>
                </div>

                <div className="mt-4 flex gap-2">
                  <LinkButton href="/simulator" variant="primary" size="sm" className="flex-1">
                    Simulate this zone
                  </LinkButton>
                  <Button variant="secondary" size="sm" onClick={() => setDrawerOpen(true)}>
                    Explain
                  </Button>
                </div>
              </motion.div>
            ) : (
              <div className="p-5 text-sm text-ink-muted">Click a zone on the map to inspect it.</div>
            )}
          </Panel>

          {/* Field state — 2x2 grid */}
          <Panel>
            <PanelHeader title="Field state" subtitle="Digital twin water balance" />
            <div className="grid grid-cols-2 gap-3 p-4">
              {st
                ? [
                    { label: "Root-zone moisture", value: `${st.rootZoneMoisturePct}%`, sub: "30 cm depth" },
                    { label: "Crop water loss", value: `${st.evapotranspirationMmDay} mm/day`, sub: "evapotranspiration" },
                    { label: "Effective rainfall", value: `${st.effectiveRainfallMm48h} mm`, sub: "next 48 hours" },
                    { label: "Available water", value: `${st.availableWaterMm} mm`, sub: "stored in root zone" },
                  ].map((c) => (
                    <div key={c.label} className="rounded-lg border border-line bg-subtle p-3">
                      <div className="text-micro text-ink-muted">{c.label}</div>
                      <div className="mt-1 text-lg font-semibold tracking-tight text-ink">{c.value}</div>
                      <div className="text-micro text-ink-faint">{c.sub}</div>
                    </div>
                  ))
                : null}
            </div>
            <div className="border-t border-line px-4 py-2.5 text-micro text-ink-faint">
              Advanced: soil water holding {st?.soilWaterHoldingMm} mm · crop coefficient {st?.cropCoefficient} · field capacity {st?.fieldCapacityPct}%
            </div>
          </Panel>
        </div>
      </div>

      <WhyDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
