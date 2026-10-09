"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Droplets,
  Gauge,
  Info,
  Layers,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Panel, PanelHeader, DataBadge } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { AnimatedValue } from "@/components/ui/animated-value";
import { useToast } from "@/components/ui/toast";
import { EASE, fadeUp, staggerContainer } from "@/lib/motion";
import { fetchSystemStatus, fetchZones, postOptimize } from "@/services/api";
import { useApiData } from "@/hooks/useApiData";
import { fmtL, stressColor } from "@/lib/format";
import { WATER_BUDGET_PRESETS } from "@/lib/constants";
import type { OptimizationResult } from "@/types";

export default function WaterBudgetPage() {
  const zonesQ = useApiData(() => fetchZones("field-a"));
  const statusQ = useApiData(() => fetchSystemStatus());
  const [available, setAvailable] = useState(2000);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [stale, setStale] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const { toast } = useToast();

  const runOptimize = async (value: number, silent = false) => {
    setOptimizing(true);
    const { data } = await postOptimize(value, "field-a", zonesQ.data?.zones);
    setResult(data);
    setStale(false);
    setOptimizing(false);
    if (!silent) {
      toast(`Optimization complete — ${fmtL(value)} allocated across ${data.allocations.length} zones`, "success");
    }
  };

  useEffect(() => {
    runOptimize(2000, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zonesQ.data]);

  const onSliderChange = (v: number) => {
    setAvailable(v);
    setStale(true);
  };

  const totalNeed = result?.totalNeedL ?? 2700;
  const shortfall = Math.max(0, totalNeed - available);
  const satisfactionPct = totalNeed > 0 ? Math.min(100, Math.round(((result?.totalAllocatedL ?? 0) / totalNeed) * 100)) : 100;

  return (
    <div className="mx-auto max-w-[1440px]">
      <PageHeader
        title="Water Budget"
        subtitle="Allocate limited water where it reduces crop-stress risk the most."
        status={statusQ.data}
        actions={
          <Button variant="primary" loading={optimizing} onClick={() => runOptimize(available)} className="group shadow-sm">
            <Sparkles size={14} className="mr-1" />
            Optimize Water <ArrowRight size={14} className="transition-transform duration-200 ease-out group-hover:translate-x-1" />
          </Button>
        }
      />

      {/* Primary KPI Cards — elevated with glassmorphic cards and icon accents */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Available Water */}
        <div className="group relative overflow-hidden rounded-xl2 border border-[#BFDCCB] bg-gradient-to-br from-brand-light via-[#E8F3ED] to-surface p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-raised">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-brand via-emerald-400 to-transparent" />
          <div className="flex items-center justify-between">
            <span className="text-tiny font-bold uppercase tracking-wide text-brand-dark/80">Available water</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Droplets size={16} />
            </div>
          </div>
          <div className="mt-2 text-[32px] font-bold leading-tight tracking-tight text-brand-dark">
            <AnimatedValue>{fmtL(available)}</AnimatedValue>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-tiny text-[#3A6353]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand" />
            Configured quota for 48h cycle
          </div>
        </div>

        {/* Predicted Demand */}
        <div className="group relative overflow-hidden rounded-xl2 border border-line bg-surface p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-[#C3D4CA] hover:shadow-raised">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#8FA694]/60 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
          <div className="flex items-center justify-between">
            <span className="text-tiny font-bold uppercase tracking-wide text-ink-muted">Predicted demand</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-subtle text-ink-muted">
              <Gauge size={16} />
            </div>
          </div>
          <div className="mt-2 text-[32px] font-bold leading-tight tracking-tight text-ink">
            <AnimatedValue>{fmtL(totalNeed)}</AnimatedValue>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-tiny text-ink-faint">
            Aggregated crop requirement across field
          </div>
        </div>

        {/* Shortfall / Balance */}
        <div className="group relative overflow-hidden rounded-xl2 border border-line bg-surface p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-[#C3D4CA] hover:shadow-raised">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/50 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
          <div className="flex items-center justify-between">
            <span className="text-tiny font-bold uppercase tracking-wide text-ink-muted">Shortfall</span>
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${shortfall > 0 ? "bg-[#FAF3E6] text-[#A67215]" : "bg-brand-light text-brand"}`}>
              {shortfall > 0 ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
            </div>
          </div>
          <div className={`mt-2 text-[32px] font-bold leading-tight tracking-tight ${shortfall > 0 ? "text-warning" : "text-success"}`}>
            <AnimatedValue>{fmtL(shortfall)}</AnimatedValue>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-tiny text-ink-faint">
            {shortfall > 0 ? (
              <span className="text-[#A67215] font-medium">Deficit managed via prioritized rationing</span>
            ) : (
              <span className="text-brand font-medium">100% of crop requirement satisfied</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[380px_1fr]">
        {/* Left Column: Controls & Summary */}
        <div className="space-y-4">
          <Panel>
            <PanelHeader
              title={
                <span className="flex items-center gap-2">
                  <SlidersHorizontal size={15} className="text-brand" />
                  Adjust available water
                </span>
              }
              subtitle="Results re-optimize instantly"
            />
            <div className="p-5">
              {/* Satisfaction Meter */}
              <div className="mb-4 rounded-xl border border-line bg-subtle p-3.5">
                <div className="flex items-center justify-between text-tiny">
                  <span className="font-medium text-ink">Satisfaction rate</span>
                  <span className="font-bold text-brand-dark">{satisfactionPct}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E2EAE5]">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-brand to-teal-500 shadow-[0_0_8px_rgba(40,116,95,0.4)]"
                    initial={false}
                    animate={{ width: `${satisfactionPct}%` }}
                    transition={{ duration: 0.4, ease: EASE }}
                  />
                </div>
              </div>

              <Slider
                value={[available]}
                min={500}
                max={3000}
                step={250}
                onValueChange={(v) => onSliderChange(v[0])}
                onValueCommit={(v) => runOptimize(v[0])}
                aria-label="Available water in litres"
              />
              <div className="mt-2 flex justify-between text-micro text-ink-faint">
                <span>500 L</span>
                <span className="font-semibold text-brand-dark">{fmtL(available)}</span>
                <span>3,000 L</span>
              </div>

              {/* Preset Buttons */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {WATER_BUDGET_PRESETS.map((p) => {
                  const active = available === p;
                  return (
                    <button
                      key={p}
                      onClick={() => {
                        setAvailable(p);
                        runOptimize(p);
                      }}
                      className={`rounded-full border px-3 py-1 text-tiny font-medium transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
                        active
                          ? "border-brand bg-brand text-white shadow-[0_2px_8px_rgba(40,116,95,0.25)] font-semibold"
                          : "border-line bg-surface text-ink-muted hover:border-[#C3D4CA] hover:bg-subtle hover:text-ink"
                      }`}
                    >
                      {p.toLocaleString()} L
                    </button>
                  );
                })}
              </div>
            </div>
          </Panel>

          {/* Allocation summary */}
          <Panel>
            <PanelHeader title="Allocation summary" />
            <div className="space-y-3 p-5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">Total allocated</span>
                <span className="font-semibold text-brand-dark">
                  {fmtL(result?.totalAllocatedL ?? 0)} <span className="text-ink-faint font-normal">/ {fmtL(available)}</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">Projected water saved</span>
                <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
                  +{fmtL(result?.waterSavedL ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-line pt-3">
                <span className="text-ink-muted">Constraint status</span>
                {result ? (
                  <DataBadge tone={result.constraintStatus.startsWith("Fully") ? "good" : "warn"}>
                    <CheckCircle2 size={11} className="inline mr-1" /> {result.constraintStatus}
                  </DataBadge>
                ) : (
                  <span className="text-micro text-ink-faint">Calculating…</span>
                )}
              </div>
              <div className="flex items-center justify-between border-t border-line pt-2 text-micro text-ink-faint">
                <span>Optimizer solver</span>
                <span className="font-medium text-ink-muted">Google OR-Tools CP-SAT</span>
              </div>
            </div>
          </Panel>

          <div className="flex items-start gap-2.5 rounded-xl2 border border-line bg-subtle p-4 text-tiny leading-relaxed text-ink-muted">
            <Info size={15} className="mt-0.5 shrink-0 text-brand" />
            <span>
              Allocation prioritizes future crop-stress reduction under the available-water constraint. Zones
              where a litre reduces stress the most receive water first.
            </span>
          </div>
        </div>

        {/* Right Column: Zone Allocations */}
        <Panel>
          <PanelHeader
            title="Water allocation by zone"
            subtitle="Bar shows allocated against required · dashed mark shows the requirement"
            right={result ? <DataBadge tone="neutral">{result.allocations.length} zones</DataBadge> : null}
          />
          <div className="p-5">
            {result?.allocations && result.allocations.length > 0 ? (
              <motion.div
                className="space-y-5"
                variants={staggerContainer(0.07)}
                initial="hidden"
                animate="show"
              >
                {result.allocations.map((a) => {
                  const maxNeed = Math.max(...result.allocations.map((x) => x.needL), 1);
                  const pct = Math.min(100, (a.allocatedL / maxNeed) * 100);
                  const needPct = Math.min(100, (a.needL / maxNeed) * 100);
                  const satisfied = a.needL > 0 ? Math.round((a.allocatedL / a.needL) * 100) : 100;
                  const stressRelief = Math.max(0, a.stressBeforePct - a.stressAfterPct);

                  return (
                    <motion.div
                      key={a.zoneId}
                      variants={fadeUp}
                      className="rounded-xl border border-line bg-surface p-4 shadow-sm transition-all duration-150 hover:border-[#BFDCCB] hover:shadow-card"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="text-[15px] font-bold text-ink">{a.zoneName}</span>
                          <span className={`rounded-full px-2 py-0.5 text-micro font-bold uppercase tracking-wider ${
                            a.priority === 1
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : a.priority === 2
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-[#EDF4F0] text-brand-dark border border-[#BFDCCB]"
                          }`}>
                            Priority {a.priority}
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="font-bold text-brand-dark">{fmtL(a.allocatedL)}</span>
                          <span className="text-ink-muted"> / {fmtL(a.needL)} required</span>
                          <span className="ml-2 font-semibold text-tiny text-ink-soft">({satisfied}%)</span>
                        </div>
                      </div>

                      {/* Allocation Progress Bar with Target Needle */}
                      <div className="relative mt-3 h-3 overflow-hidden rounded-md bg-[#EDF2EC]">
                        <motion.div
                          className="h-full rounded-md bg-gradient-to-r from-brand via-emerald-600 to-teal-500 shadow-sm"
                          initial={false}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.55, ease: EASE }}
                        />
                        {/* Requirement mark */}
                        <div
                          className="absolute top-0 bottom-0 w-1 bg-ink/60 rounded-full"
                          style={{ left: `calc(${needPct}% - 2px)` }}
                          title={`Requirement: ${fmtL(a.needL)}`}
                        />
                      </div>

                      {/* Stress Impact & Status */}
                      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-micro">
                        <div className="flex items-center gap-2 text-ink-muted">
                          <span>Crop stress:</span>
                          <span className="font-semibold text-ink">{a.stressBeforePct}%</span>
                          <span>→</span>
                          <span className="font-bold" style={{ color: stressColor(a.stressAfterPct) }}>
                            {a.stressAfterPct}%
                          </span>
                          {stressRelief > 0 && (
                            <span className="rounded bg-emerald-50 px-1.5 py-0.2 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                              -{stressRelief.toFixed(0)}% risk relief
                            </span>
                          )}
                        </div>

                        <div>
                          {a.allocatedL === 0 ? (
                            <span className="rounded bg-amber-50 px-2 py-0.5 font-medium text-amber-800 border border-amber-200">
                              Deferred — lowest stress reduction per litre
                            </span>
                          ) : a.allocatedL >= a.needL ? (
                            <span className="rounded bg-emerald-50 px-2 py-0.5 font-medium text-emerald-800 border border-emerald-200">
                              Fully satisfied
                            </span>
                          ) : (
                            <span className="rounded bg-teal-50 px-2 py-0.5 font-medium text-teal-800 border border-teal-200">
                              Optimized partial quota
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                <div className="rounded-xl border border-line bg-subtle p-4 text-tiny leading-relaxed text-ink-muted">
                  {result.totalAllocatedL >= result.totalNeedL
                    ? "Full allocation achieved — every zone reaches its predicted requirement without over-irrigating ahead of the forecast rain."
                    : `With ${fmtL(available)} available, ${fmtL(Math.max(0, totalNeed - result.totalAllocatedL))} of the predicted demand stays unmet. The optimizer directs water to the zones where it reduces crop stress the most first.`}
                </div>
              </motion.div>
            ) : (
              /* High-end Empty State when no zones are registered */
              <div className="flex min-h-[360px] flex-col items-center justify-center p-8 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-light to-[#D8ECE0] shadow-[0_4px_16px_rgba(40,116,95,0.12)]">
                  <Layers size={28} className="text-brand" />
                </div>
                <h3 className="mt-4 text-[17px] font-bold text-ink">No Field Management Zones Configured</h3>
                <p className="mt-1.5 max-w-md text-tiny leading-relaxed text-ink-muted">
                  To run algorithmic water budgeting, divide your field into hydrological management zones with calibrated soil sensors.
                </p>
                <div className="mt-5 flex gap-2">
                  <Button variant="primary" onClick={() => runOptimize(available)}>
                    Load Field Zones
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
