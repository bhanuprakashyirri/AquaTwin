"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CloudRain,
  Droplets,
  FlaskConical,
  Sprout,
  Sun,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Panel, PanelHeader, DataBadge } from "@/components/ui/panel";
import { Button, LinkButton } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { KpiCard, MiniIndicator } from "@/components/ui/kpi";

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
import { SensorTrendChart } from "@/components/charts/sensor-trend";
import { WhyDrawer } from "@/components/ui/assistant";
import {
  fetchFieldState,
  fetchRecommendation,
  fetchSystemStatus,
  fetchWeather,
  fetchZones,
} from "@/services/api";
import { useApiData } from "@/hooks/useApiData";
import { useSensorStream } from "@/hooks/useSensorStream";
import { AGENT_EVENTS, onAgentEvent } from "@/agent/site-bus";
import { fmtL, stressColor } from "@/lib/format";
import type { Zone } from "@/types";
import { useFarm } from "@/context/farm-context";

export default function DashboardPage() {
  const { currentFarm, currentField, hasConfiguredFarm, openFarmSetup } = useFarm();
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [layer, setLayer] = useState("moisture");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const zonesQ = useApiData(() => fetchZones("field-a"));
  const stateQ = useApiData(() => fetchFieldState("field-a"));
  const recQ = useApiData(() => fetchRecommendation("field-a"));
  const wxQ = useApiData(() => fetchWeather("field-a"));
  const statusQ = useApiData(() => fetchSystemStatus("field-a"));
  const stream = useSensorStream("field-a");

  const zones: Zone[] = zonesQ.data?.zones ?? [];
  const zone = zones.find((z) => z.id === selectedZone) ?? null;

  const liveMoisture = useMemo(() => {
    const soil = stream.sensors.filter((s) => s.kind === "soil_moisture");
    if (!soil.length) return null;
    const values = soil
      .map((s) => s.lastValue ?? (s as any).last_value)
      .filter((v): v is number => typeof v === "number" && !isNaN(v));
    if (!values.length) return null;
    return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
  }, [stream.sensors]);

  const moisture =
    liveMoisture ??
    stateQ.data?.rootZoneMoisturePct ??
    (stateQ.data as any)?.root_zone_moisture_pct ??
    null;
  const rainPct = wxQ.data?.summary?.nextRainProbabilityPct ?? null;
  const rainH = wxQ.data?.summary?.nextRainInHours ?? null;
  const rec = recQ.data;
  const stress = rec?.stressRiskPct ?? null;

  const lastIrrigated = useMemo(() => {
    if (!zones.length) return "No irrigation records available";
    const hours = Math.min(...zones.map((z) => z.lastIrrigatedHoursAgo || 0));
    return `${Math.round(hours)}h ago`;
  }, [zones]);

  // Voice-agent site control: map layer, zone selection, data refresh
  useEffect(
    () => onAgentEvent<{ layer: string }>(AGENT_EVENTS.layer, (d) => setLayer(d.layer)),
    [],
  );
  useEffect(
    () => onAgentEvent<{ zoneId: string }>(AGENT_EVENTS.zone, (d) => setSelectedZone(d.zoneId)),
    [],
  );
  useEffect(
    () =>
      onAgentEvent(AGENT_EVENTS.refresh, () => {
        zonesQ.retry();
        stateQ.retry();
        recQ.retry();
        wxQ.retry();
        statusQ.retry();
      }),
    [zonesQ, stateQ, recQ, wxQ, statusQ],
  );

  const forecast = wxQ.data?.forecast ?? [];
  const nextRainEvent = forecast.find((f) => f.rainProbabilityPct >= 50 && f.rainfallMm > 0.5);

  return (
    <div className="mx-auto max-w-[1440px]">
      <PageHeader
        title="Farm Overview"
        subtitle="Real-time field conditions, water demand, and recommended actions."
        status={statusQ.data}
      />

      {!hasConfiguredFarm && (
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-dashed border-brand/40 bg-brand-light/40 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-sm">
              <Sprout size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink">Set up your farm to continue</h3>
              <p className="text-xs text-ink-muted mt-0.5">
                Add your real farm name, land area, and crop details to activate personalized irrigation intelligence.
              </p>
            </div>
          </div>
          <button
            onClick={openFarmSetup}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-dark transition-colors shrink-0 cursor-pointer"
          >
            Configure Farm <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard
          index={0}
          label="Soil moisture"
          value={moisture !== null ? `${moisture.toFixed(1)}%` : "—"}
          sub={moisture !== null ? "Measured root-zone avg" : "Awaiting sensor readings"}
          trend={moisture !== null ? { direction: "flat", text: "Target: 24-34%" } : undefined}
          info={
            <>
              Root-zone volumetric moisture measured across active soil sensors. When sensors are unconfigured, connect telemetry in Settings.
            </>
          }
        />
        <KpiCard
          index={1}
          label="Crop stress"
          value={stress !== null ? `${stress}%` : "—"}
          sub={stress !== null ? (stress < 15 ? "Low risk" : "Elevated risk") : "Telemetry needed"}
          trend={stress !== null ? { direction: "flat", text: "Threshold: 15%" } : undefined}
          info={
            <>
              FAO-56 physical crop stress probability computed over the 48-hour forecast horizon.
            </>
          }
        />
        <KpiCard
          index={2}
          label="Next rain"
          value={rainPct !== null ? `${rainPct}%` : "—"}
          sub={rainH !== null && rainPct ? `In ${rainH} hours` : "Open-Meteo live sync"}
          info={
            <>
              Precipitation probability retrieved from the live high-resolution weather model.
            </>
          }
        />
        <KpiCard
          index={3}
          label="Water available"
          value={rec?.availableWaterL != null ? fmtL(rec.availableWaterL) : "—"}
          sub="Configured quota"
          info={<>Total water available for this irrigation window. Adjust quota in Water Budget.</>}
        />
      </div>

      {/* Supporting indicators */}
      <div className="mt-3 grid grid-cols-2 gap-x-6 rounded-xl2 border border-line bg-surface px-4 py-1 shadow-card sm:grid-cols-4">
        <MiniIndicator label="Recommended water" value={rec?.waterUsedL != null ? fmtL(rec.waterUsedL) : "—"} />
        <MiniIndicator label="Estimated saving" value={rec?.waterSavedL ? fmtL(rec.waterSavedL) : "—"} />
        <MiniIndicator label="Last irrigation" value={lastIrrigated} />
        <MiniIndicator label="Evapotranspiration" value={wxQ.data?.summary?.et0Mm != null ? `${wxQ.data.summary.et0Mm.toFixed(1)} mm/day (FAO-56)` : "—"} />
      </div>

      {/* Main 2-col layout */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
        {/* Field map */}
        <Panel className="overflow-hidden">
          <PanelHeader
            title="Field map"
            subtitle="Irrigation zones · click a zone for details"
            right={<DataBadge tone="neutral">{zones.length ? `${zones.length} zones` : "No zones"}</DataBadge>}
          />
          <div className="h-[430px] p-2">
            <FarmMap
              zones={zones}
              layer={layer}
              onLayerChange={setLayer}
              selectedZoneId={selectedZone}
              onZoneSelect={(id) => setSelectedZone(id === selectedZone ? null : id)}
              sensors={stream.sensors}
            />
          </div>
          {zone ? (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-line px-5 py-3 text-tiny"
            >
              <span className="font-semibold text-ink">{zone.name}</span>
              <span className="text-ink-muted">Moisture <span className="font-semibold text-ink">{zone.moisturePct}%</span></span>
              <span className="text-ink-muted">Stress <span className="font-semibold" style={{ color: stressColor(zone.stressRiskPct) }}>{zone.stressRiskPct}%</span></span>
              <span className="text-ink-muted">Need <span className="font-semibold text-ink">{fmtL(zone.waterRequirementL)}</span></span>
              <span className="text-ink-muted">{zone.soilType}</span>
              <Link href="/twin" className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-tiny font-medium text-brand transition-all hover:border-brand/40 hover:bg-brand-light hover:-translate-y-0.5 shadow-sm">
                Open Field Twin <ArrowRight size={12} />
              </Link>
            </motion.div>
          ) : (
            <div className="border-t border-line px-5 py-3 text-tiny text-ink-faint">
              {zones.length ? "Select a zone on the map to inspect moisture, stress and water requirement." : "No field zones registered. Configure field zones in Field Twin."}
            </div>
          )}
        </Panel>

        {/* AI Recommendation */}
        <div className="space-y-4">
          <Panel className="overflow-hidden">
            <PanelHeader
              title="AI Recommendation"
              subtitle="FAO-56 Twin + Physical Simulation + Optimization"
              right={<span className="text-micro text-ink-faint">{rec?.confidencePct ? `${rec.confidencePct}% confidence` : "Awaiting data"}</span>}
            />
            <div className="p-5">
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.1 }}
                className="relative overflow-hidden rounded-xl2 border border-[#BFDCCB] bg-gradient-to-br from-brand-light via-[#E4F1EA] to-brand-light/60 p-5"
              >
                {/* Decorative glow */}
                <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-brand/8 blur-3xl pointer-events-none" />

                <div className="relative">
                  <div className="text-micro font-bold uppercase tracking-widest text-brand/70">Recommended action</div>
                  <div className="mt-2 text-[26px] font-bold leading-tight tracking-tight text-brand-dark">
                    {rec?.action ?? "PENDING TELEMETRY"}
                  </div>
                  <p className="mt-2.5 text-sm leading-relaxed text-[#2A5446]">
                    {rec?.reason ??
                      "Awaiting active soil moisture readings and field digital twin baseline to compute recommendations."}
                  </p>
                </div>
              </motion.div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  ["Water saved", rec?.waterSavedL ? `+${fmtL(rec.waterSavedL)}` : "—", "text-emerald-800 bg-emerald-50/90 border-emerald-200/80"],
                  ["Stress risk", stress !== null ? `${stress}%` : "—", "text-ink bg-subtle border-line"],
                  ["Next review", rec?.nextEvaluationAt ?? "Pending telemetry", "text-ink bg-subtle border-line"],
                ].map(([k, v, cls]) => (
                  <div key={k} className={`rounded-xl border p-3 ${cls}`}>
                    <div className="text-micro font-bold uppercase tracking-wider text-ink-muted">{k}</div>
                    <div className="mt-1 text-sm font-bold">{v}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex gap-2">
                <LinkButton href="/simulator" variant="primary" className="group flex-1">
                  <FlaskConical size={14} /> View simulation <ArrowRight size={14} className="icon-nudge" />
                </LinkButton>
                <Button variant="secondary" onClick={() => setDrawerOpen(true)}>
                  Why this decision?
                </Button>
              </div>
            </div>
          </Panel>

          {/* Upcoming events */}
          <Panel>
            <PanelHeader title="Upcoming field events" subtitle="Next 48 hours" />
            <div className="space-y-2 p-4">
              {nextRainEvent ? (
                <div className="flex items-start gap-3 rounded-lg border border-line bg-subtle px-3 py-2.5">
                  <span className="mt-0.5"><CloudRain size={14} className="text-info" /></span>
                  <div>
                    <div className="text-tiny font-medium text-ink">Rainfall — {nextRainEvent.rainfallMm.toFixed(1)} mm</div>
                    <div className="text-micro text-ink-muted">In ~{forecast.indexOf(nextRainEvent)}h · {nextRainEvent.rainProbabilityPct}% probability</div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 rounded-lg border border-line bg-subtle px-3 py-2.5">
                  <span className="mt-0.5"><Sun size={14} className="text-warning" /></span>
                  <div>
                    <div className="text-tiny font-medium text-ink">Clear atmospheric window</div>
                    <div className="text-micro text-ink-muted">No substantial rainfall expected in next 48h</div>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3 rounded-lg border border-line bg-subtle px-3 py-2.5">
                <span className="mt-0.5"><FlaskConical size={14} className="text-brand" /></span>
                <div>
                  <div className="text-tiny font-medium text-ink">Decision review window</div>
                  <div className="text-micro text-ink-muted">{rec?.nextEvaluationAt || "Every 6 hours on new weather cycles"}</div>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {/* Sensor trend */}
      <Panel className="mt-4">
        <PanelHeader
          title="Recent field conditions"
          subtitle="Observed and forecasted temperature and rainfall"
          right={<DataBadge tone={stream.connected ? "good" : "neutral"}>{stream.connected ? "Live gateway" : "Offline"}</DataBadge>}
        />
        <div className="p-4">
          <SensorTrendChart
            observations={wxQ.data?.observations}
            forecast={wxQ.data?.forecast}
          />
        </div>
      </Panel>

      <WhyDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
