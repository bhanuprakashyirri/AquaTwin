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
import { Panel, PanelHeader, DataBadge, DemoPill } from "@/components/ui/panel";
import { Button, LinkButton } from "@/components/ui/button";
import { KpiCard, MiniIndicator } from "@/components/ui/kpi";
import { FarmMap } from "@/components/maps/farm-map";
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
import { fmtL, stressColor } from "@/lib/format";
import { FORECAST_48H, FIELD_STATE } from "@/lib/demo-data";
import type { Zone } from "@/types";

export default function DashboardPage() {
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const zonesQ = useApiData(() => fetchZones("field-a"));
  const stateQ = useApiData(() => fetchFieldState("field-a"));
  const recQ = useApiData(() => fetchRecommendation());
  const wxQ = useApiData(() => fetchWeather("field-a"));
  const statusQ = useApiData(() => fetchSystemStatus());
  const stream = useSensorStream("field-a");

  const zones: Zone[] = zonesQ.data?.zones ?? [];
  const zone = zones.find((z) => z.id === selectedZone) ?? null;

  const liveMoisture = useMemo(() => {
    const soil = stream.sensors.filter((s) => s.kind === "soil_moisture");
    if (!soil.length) return null;
    return Math.round((soil.reduce((a, s) => a + s.lastValue, 0) / soil.length) * 10) / 10;
  }, [stream.sensors]);

  const moisture = liveMoisture ?? stateQ.data?.rootZoneMoisturePct ?? 24.6;
  const rainPct = wxQ.data?.summary.nextRainProbabilityPct ?? 70;
  const rainH = wxQ.data?.summary.nextRainInHours ?? 7;
  const rec = recQ.data;
  const stress = rec?.stressRiskPct ?? 5.2;

  const lastIrrigated = useMemo(() => {
    const hours = Math.min(...zones.map((z) => z.lastIrrigatedHoursAgo));
    return `${Math.round(hours)}h ago`;
  }, [zones]);

  return (
    <div className="mx-auto max-w-[1440px]">
      <PageHeader
        title="Farm Overview"
        subtitle="Real-time field conditions, water demand, and recommended actions."
        status={statusQ.data}
        actions={<DemoPill />}
      />

      {/* Primary KPIs — each with contextual hover info (interaction depth) */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard
          index={0}
          label="Soil moisture"
          value={`${moisture.toFixed(1)}%`}
          sub="Healthy range"
          trend={{ direction: "down", text: "2.4% in 6h", good: true }}
          info={
            <>
              Root-zone average across all four sensors. Within the healthy range — a 2.4% decline over the last 6
              hours tracks normal crop water use.
            </>
          }
        />
        <KpiCard
          index={1}
          label="Crop stress"
          value={`${stress}%`}
          sub={stress < 15 ? "Low risk" : "Elevated"}
          trend={{ direction: "flat", text: "threshold 15%" }}
          info={
            <>
              Predicted crop-stress risk over the next 48h. Below the configured 15% threshold — Zone B is closest at
              22%.
            </>
          }
        />
        <KpiCard
          index={2}
          label="Next rain"
          value={`${rainPct}%`}
          sub={`Expected in ${rainH}h`}
          info={
            <>
              Probability of the next rainfall event from the 48h forecast — about 12.3 mm expected. The recommender
              defers irrigation when this is high.
            </>
          }
        />
        <KpiCard
          index={3}
          label="Water available"
          value={fmtL(2000)}
          sub="Tank + canal quota"
          info={<>Total water available for this irrigation window — tank storage plus canal quota. Adjust it in the Water Budget workspace.</>}
        />
      </div>

      {/* Supporting indicators */}
      <div className="mt-3 grid grid-cols-2 gap-x-6 rounded-xl2 border border-line bg-surface px-4 py-1 shadow-card sm:grid-cols-4">
        <MiniIndicator label="Recommended water" value={fmtL(310)} />
        <MiniIndicator label="Estimated saving" value={fmtL(rec?.waterSavedL ?? 453)} />
        <MiniIndicator label="Last irrigation" value={lastIrrigated} />
        <MiniIndicator label="Current crop water loss" value={`${FIELD_STATE.evapotranspirationMmDay} mm/day`} />
      </div>

      {/* Main 2-col layout */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
        {/* Field map */}
        <Panel className="overflow-hidden">
          <PanelHeader
            title="Field map"
            subtitle="Four irrigation zones · click a zone for details"
            right={<DataBadge tone="neutral">10 ha</DataBadge>}
          />
          <div className="h-[430px] p-2">
            <FarmMap
              zones={zones}
              layer="moisture"
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
              <Link href="/twin" className="ml-auto inline-flex items-center gap-1 font-medium text-brand hover:text-brand-dark">
                Open Field Twin <ArrowRight size={12} />
              </Link>
            </motion.div>
          ) : (
            <div className="border-t border-line px-5 py-3 text-tiny text-ink-faint">
              Select a zone on the map to inspect moisture, stress and water requirement.
            </div>
          )}
        </Panel>

        {/* AI Recommendation */}
        <div className="space-y-4">
          <Panel className="overflow-hidden">
            <PanelHeader
              title="AI Recommendation"
              subtitle="Field Twin + Simulation + Optimization"
              right={<span className="text-micro text-ink-faint">87% model confidence</span>}
            />
            <div className="p-5">
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.1 }}
                className="rounded-xl2 border border-[#BFDCCB] bg-brand-light p-4"
              >
                <div className="text-micro font-medium uppercase tracking-wide text-ink-muted">Recommended action</div>
                <div className="mt-1 text-[26px] font-semibold leading-tight tracking-tight text-brand-dark">
                  {rec?.action ?? "WAIT 6 HOURS"}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[#2A5446]">
                  {rec?.reason ??
                    "Current root-zone moisture is sufficient for approximately 6 hours and rainfall probability is high. Waiting is predicted to reduce unnecessary irrigation while keeping crop-stress risk below the configured threshold."}
                </p>
              </motion.div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  ["Water saved", fmtL(rec?.waterSavedL ?? 453)],
                  ["Stress risk", `${stress}%`],
                  ["Next review", rec?.nextEvaluationAt ?? "in 6 hours"],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-line bg-subtle px-3 py-2.5">
                    <div className="text-micro text-ink-muted">{k}</div>
                    <div className="mt-0.5 text-sm font-semibold text-ink">{v}</div>
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
              {[
                { icon: <CloudRain size={14} className="text-info" />, title: `Rainfall — ${(FORECAST_48H[7]?.rainfallMm ?? 1.3).toFixed(1)} mm`, meta: `in 7h · ${rainPct}% probability` },
                { icon: <FlaskConical size={14} className="text-brand" />, title: `Irrigation window — ${rec?.headline ?? "Wait 6 Hours"}`, meta: "re-evaluates automatically" },
                { icon: <Sprout size={14} className="text-warning" />, title: "Stress threshold — 15%", meta: "Zone B is closest at 22%" },
              ].map((e, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border border-line bg-subtle px-3 py-2.5">
                  <span className="mt-0.5">{e.icon}</span>
                  <div>
                    <div className="text-tiny font-medium text-ink">{e.title}</div>
                    <div className="text-micro text-ink-muted">{e.meta}</div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {/* Sensor trend */}
      <Panel className="mt-4">
        <PanelHeader
          title="Recent field conditions"
          subtitle="Soil moisture, temperature and rainfall — simulated sensor stream"
          right={<DataBadge tone={stream.connected ? "good" : "warn"}>{stream.connected ? "Live" : "Connecting"}</DataBadge>}
        />
        <div className="p-4">
          <SensorTrendChart />
        </div>
      </Panel>

      <WhyDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
