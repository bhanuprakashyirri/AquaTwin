"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CloudRain, Droplets, RefreshCcw, Sprout, Layers } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Panel, PanelHeader, DataBadge } from "@/components/ui/panel";
import dynamic from "next/dynamic";
import { Button, LinkButton } from "@/components/ui/button";

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
import { WhyDrawer } from "@/components/ui/assistant";
import { AGENT_EVENTS, onAgentEvent } from "@/agent/site-bus";
import { fetchField, fetchFieldState, fetchSystemStatus, fetchZones } from "@/services/api";
import { useApiData } from "@/hooks/useApiData";
import { useSensorStream } from "@/hooks/useSensorStream";
import { fmtL, stressColor } from "@/lib/format";
import type { Zone } from "@/types";

import { useFarm } from "@/context/farm-context";

const LAYER_LABELS: Record<string, string> = {
  moisture: "Soil moisture",
  stress: "Crop stress",
  ndvi: "Vegetation health",
  priority: "Irrigation priority",
};

export default function TwinPage() {
  const { currentFarm, currentField, hasConfiguredFarm, openFarmSetup } = useFarm();
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [layer, setLayer] = useState("moisture");
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Voice-agent site control: map layer + zone selection
  useEffect(
    () => onAgentEvent<{ layer: string }>(AGENT_EVENTS.layer, (d) => setLayer(d.layer)),
    [],
  );
  useEffect(
    () => onAgentEvent<{ zoneId: string }>(AGENT_EVENTS.zone, (d) => setSelectedZone(d.zoneId)),
    [],
  );

  const zonesQ = useApiData(() => fetchZones("field-a"));
  const stateQ = useApiData(() => fetchFieldState("field-a"));
  const fieldQ = useApiData(() => fetchField("field-a"));
  const statusQ = useApiData(() => fetchSystemStatus());
  const stream = useSensorStream("field-a");

  const zones: Zone[] = zonesQ.data?.zones ?? [];
  const zone = zones.find((z) => z.id === selectedZone) ?? null;
  const st = stateQ.data;

  const displayFieldName = currentField?.name || (hasConfiguredFarm ? `${currentFarm?.name} Plot 1` : "Field Not Configured");
  const displayCropName = currentField?.crop?.name || "Crop not configured";
  const displayCropStage = currentField?.crop?.growthStage ? ` · ${currentField.crop.growthStage}` : "";
  const displayArea = currentFarm?.totalArea
    ? ` · ${currentFarm.totalArea} ${currentFarm.preferredUnit || "ha"}`
    : " · Land area not provided";

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
            title={displayFieldName}
            subtitle={`${displayCropName}${displayCropStage}${displayArea}`}
            right={<DataBadge tone={hasConfiguredFarm ? "good" : "neutral"}>{hasConfiguredFarm ? "Saved Farm" : "Setup Required"}</DataBadge>}
          />
          <div className="h-[560px] p-2">
            <FarmMap
              zones={zones}
              layer={layer}
              onLayerChange={setLayer}
              selectedZoneId={selectedZone}
              onZoneSelect={setSelectedZone}
              sensors={stream.sensors}
            />
          </div>
        </Panel>

        {/* Zone inspector */}
        <div className="space-y-4">
          <Panel>
            <PanelHeader
              title={zone ? zone.name : "Zone inspector"}
              subtitle={zone ? `${zone.areaHa} ha · ${zone.soilType}` : "Select a zone on the map"}
              right={zone ? <DataBadge tone="neutral">Zone active</DataBadge> : null}
            />
            {zone ? (
              <motion.div key={zone.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="p-5">
                <div className="space-y-2.5">
                  {[
                    { label: "Soil moisture", value: `${zone.moisturePct}%`, sub: "Volumetric root-zone avg" },
                    { label: "Crop stress risk", value: `${zone.stressRiskPct}%`, color: stressColor(zone.stressRiskPct), sub: "FAO-56 physical calculation" },
                    { label: "Water requirement", value: fmtL(zone.waterRequirementL), sub: "Deficit to field capacity" },
                    { label: "Rain exposure", value: zone.rainExposure, sub: "Canopy & slope factor" },
                    { label: "Last irrigated", value: `${zone.lastIrrigatedHoursAgo}h ago`, sub: "System telemetry log" },
                    { label: "Irrigation priority", value: `P${zone.priority}`, sub: "Rationing weight" },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between border-b border-line/70 pb-2 last:border-0 last:pb-0">
                      <div>
                        <div className="text-tiny font-medium text-ink">{row.label}</div>
                        <div className="text-micro text-ink-faint">{row.sub}</div>
                      </div>
                      <span className="text-sm font-semibold" style={row.color ? { color: row.color } : undefined}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Why this zone rationale */}
                <div className="mt-4 rounded-xl border border-line bg-subtle/80 p-3.5">
                  <div className="text-tiny font-semibold text-ink">Field twin analysis</div>
                  <p className="mt-1 text-tiny leading-relaxed text-ink-muted">
                    {zone.id === "zone-b"
                      ? "Lowest moisture of all subzones with highest predicted stress risk. Soil texture holds moisture efficiently, prioritizing early release."
                      : zone.stressRiskPct > 15
                        ? "Stress risk is above comfortable threshold. Irrigation reduces predicted stress faster than lower-priority zones."
                        : "Moisture is within comfortable target range (24-34%). Can safely defer while limited quota is directed to higher stress zones."}
                  </p>
                </div>

                {/* Expandable soil hydraulics */}
                <div className="mt-3 rounded-xl border border-line/70 bg-surface px-3.5 py-2.5 text-micro text-ink-muted">
                  <div className="font-semibold text-ink-soft mb-1">Hydraulic specifications</div>
                  <div className="grid grid-cols-2 gap-2 text-micro">
                    <div>Soil: <span className="font-medium text-ink">{zone.soilType}</span></div>
                    <div>Root depth: <span className="font-medium text-ink">30 cm</span></div>
                    <div>Field capacity: <span className="font-medium text-ink">34.0%</span></div>
                    <div>Wilting point: <span className="font-medium text-ink">14.0%</span></div>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <LinkButton href="/simulator" variant="primary" size="sm" className="flex-1">
                    Simulate this zone
                  </LinkButton>
                  <Button variant="secondary" size="sm" onClick={() => setDrawerOpen(true)}>
                    Explain AI
                  </Button>
                </div>
              </motion.div>
            ) : (
              <div className="p-8 text-center text-tiny text-ink-muted">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-subtle text-ink-faint">
                  <Layers size={18} />
                </div>
                Select an irrigation zone on the map to inspect its real-time telemetry, soil profile, and water balance.
              </div>
            )}
          </Panel>

          {/* Field state — 2x2 grid */}
          <Panel>
            <PanelHeader title="Field state" subtitle="Digital twin water balance" />
            <div className="grid grid-cols-2 gap-3 p-4">
              {st
                ? [
                    { label: "Root-zone moisture", value: `${st.rootZoneMoisturePct}%`, sub: "30 cm active root depth" },
                    { label: "Crop water loss", value: `${st.evapotranspirationMmDay} mm/day`, sub: "FAO-56 evapotranspiration" },
                    { label: "Effective rainfall", value: `${st.effectiveRainfallMm48h} mm`, sub: "next 48h horizon" },
                    { label: "Available water", value: `${st.availableWaterMm} mm`, sub: "stored in soil profile" },
                  ].map((c) => (
                    <div key={c.label} className="rounded-xl border border-line bg-subtle p-3.5 transition-colors hover:bg-white hover:shadow-sm">
                      <div className="text-micro font-bold uppercase tracking-wider text-ink-muted">{c.label}</div>
                      <div className="mt-1 text-xl font-bold tracking-tight text-ink">{c.value}</div>
                      <div className="mt-0.5 text-micro text-ink-faint">{c.sub}</div>
                    </div>
                  ))
                : (
                  <div className="col-span-2 p-4 text-center text-tiny text-ink-muted">
                    Telemetry baseline syncing…
                  </div>
                )}
            </div>
            <div className="border-t border-line px-4 py-2.5 text-micro text-ink-muted bg-[#F8FAF9]">
              Hydraulic baseline: soil water holding {st?.soilWaterHoldingMm ?? 68} mm · Kc {st?.cropCoefficient ?? 1.12} · field capacity {st?.fieldCapacityPct ?? 34}%
            </div>
          </Panel>
        </div>
      </div>

      <WhyDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
