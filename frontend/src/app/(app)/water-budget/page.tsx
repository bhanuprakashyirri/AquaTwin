"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Info } from "lucide-react";
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

  // `silent` suppresses the success toast for the automatic initial run —
  // feedback belongs to user-initiated optimizations only.
  const runOptimize = async (value: number, silent = false) => {
    setOptimizing(true);
    const { data } = await postOptimize(value);
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
  }, []);

  const onSliderChange = (v: number) => {
    setAvailable(v);
    setStale(true);
  };

  const totalNeed = result?.totalNeedL ?? 2700;
  const shortfall = Math.max(0, totalNeed - available);

  return (
    <div className="mx-auto max-w-[1440px]">
      <PageHeader
        title="Water Budget"
        subtitle="Allocate limited water where it reduces crop-stress risk the most."
        status={statusQ.data}
        actions={
          <Button variant="primary" loading={optimizing} onClick={() => runOptimize(available)} className="group">
            Optimize Water <ArrowRight size={14} className="transition-transform duration-200 ease-out group-hover:translate-x-1" />
          </Button>
        }
      />

      {/* Headline numbers */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Available water", value: fmtL(available), tone: "text-brand-dark", bg: "bg-brand-light", border: "border-[#BFDCCB]" },
          { label: "Predicted demand", value: fmtL(totalNeed), tone: "text-ink", bg: "bg-surface", border: "border-line" },
          { label: "Shortfall", value: fmtL(shortfall), tone: shortfall > 0 ? "text-warning" : "text-success", bg: "bg-surface", border: "border-line" },
        ].map((s) => (
          <div
            key={s.label}
            className={`rounded-xl2 border p-5 shadow-card transition-transform duration-200 ease-out hover:-translate-y-0.5 ${s.bg} ${s.border}`}
          >
            <div className="text-tiny font-medium text-ink-muted">{s.label}</div>
            <div className={`mt-1 text-[32px] font-semibold leading-tight tracking-tight ${s.tone}`}>
              <AnimatedValue>{s.value}</AnimatedValue>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[360px_1fr]">
        {/* Controls */}
        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Adjust available water" subtitle="Results update instantly" />
            <div className="p-5">
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
                <span>3,000 L</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {WATER_BUDGET_PRESETS.map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setAvailable(p);
                      runOptimize(p);
                    }}
                    className={`rounded-full border px-3 py-1 text-tiny font-medium transition-[background-color,border-color,color,transform] duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
                      available === p ? "border-brand bg-brand-light text-brand-dark" : "border-line text-ink-muted hover:bg-subtle"
                    }`}
                  >
                    {p.toLocaleString()} L
                  </button>
                ))}
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Allocation summary" />
            <div className="space-y-2.5 p-5 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-muted">Total allocated</span>
                <span className="font-semibold text-brand-dark">{fmtL(result?.totalAllocatedL ?? 0)} / {fmtL(available)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Projected water saved</span>
                <span className="font-semibold text-ink">{fmtL(result?.waterSavedL ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-line pt-2.5">
                <span className="text-ink-muted">Constraint status</span>
                {result ? (
                  <DataBadge tone={result.constraintStatus.startsWith("Fully") ? "good" : "warn"}>
                    <CheckCircle2 size={10} /> {result.constraintStatus}
                  </DataBadge>
                ) : null}
              </div>
            </div>
          </Panel>

          <div className="flex items-start gap-2 rounded-xl2 border border-line bg-subtle p-4 text-tiny leading-relaxed text-ink-muted">
            <Info size={14} className="mt-0.5 shrink-0 text-brand" />
            Allocation prioritizes future crop-stress reduction under the available-water constraint. Zones
            where a litre reduces stress the most receive water first.
          </div>
        </div>

        {/* Allocation workspace */}
        <Panel>
          <PanelHeader
            title="Water allocation by zone"
            subtitle="Bar shows allocated against required · dashed mark shows the requirement"
            right={result ? <DataBadge tone="neutral">{result.allocations.length} zones</DataBadge> : null}
          />
          <motion.div
            className="space-y-5 p-5"
            variants={staggerContainer(0.07)}
            initial="hidden"
            animate="show"
          >
            {(result?.allocations ?? []).map((a, i) => {
              const maxNeed = Math.max(...(result?.allocations ?? []).map((x) => x.needL), 1);
              const pct = (a.allocatedL / maxNeed) * 100;
              const needPct = (a.needL / maxNeed) * 100;
              return (
                <motion.div key={a.zoneId} variants={fadeUp}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-ink">{a.zoneName}</span>
                      <span className="rounded border border-line bg-subtle px-1.5 py-0.5 text-micro font-medium text-ink-muted">
                        Priority {a.priority}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="font-semibold text-brand-dark">{fmtL(a.allocatedL)}</span>
                      <span className="text-ink-faint"> / {fmtL(a.needL)} required</span>
                    </div>
                  </div>
                  <div className="relative mt-2 h-3.5 overflow-hidden rounded-md bg-[#EDF2EC]">
                    <motion.div
                      className="h-full rounded-md bg-brand"
                      initial={false}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.55, ease: EASE }}
                    />
                    <div className="absolute top-0 h-full w-0.5 bg-ink-soft/50" style={{ left: `${needPct}%` }} />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-micro text-ink-muted">
                    <span>
                      Stress{" "}
                      <span className="font-medium text-ink">{a.stressBeforePct}%</span>
                      {" → "}
                      <span className="font-medium" style={{ color: stressColor(a.stressAfterPct) }}>
                        {a.stressAfterPct}%
                      </span>{" "}
                      after irrigation
                    </span>
                    {a.allocatedL === 0 ? (
                      <span className="text-warning">Deferred — lowest benefit per litre</span>
                    ) : null}
                  </div>
                </motion.div>
              );
            })}

            {result ? (
              <div className="border-t border-line pt-4 text-tiny leading-relaxed text-ink-muted">
                {result.totalAllocatedL >= result.totalNeedL
                  ? "Full allocation achieved — every zone reaches its predicted requirement without over-irrigating ahead of the forecast rain."
                  : `With ${fmtL(available)} available, ${fmtL(Math.max(0, totalNeed - result.totalAllocatedL))} of the predicted demand stays unmet. The optimizer directs water to the zones where it reduces crop stress the most first.`}
              </div>
            ) : null}
          </motion.div>
        </Panel>
      </div>
    </div>
  );
}
