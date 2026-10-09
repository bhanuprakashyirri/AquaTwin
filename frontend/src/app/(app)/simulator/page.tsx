"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  CloudRain,
  Droplets,
  FlaskConical,
  Play,
  Sprout,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/layout/page-header";
import { Panel, PanelHeader, DataBadge } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { useFarm } from "@/context/farm-context";
import { AXIS_STYLE, CHART, ChartTooltip } from "@/components/charts/common";
import { AGENT_EVENTS, onAgentEvent } from "@/agent/site-bus";
import { EASE, DURATION, fadeUp, tabContent, staggerContainer } from "@/lib/motion";
import {
  fetchFieldState,
  fetchSystemStatus,
  fetchWeather,
  postRainUncertainty,
  postSimulation,
} from "@/services/api";
import { useApiData } from "@/hooks/useApiData";
import { fmtL, stressColor, wasteColor } from "@/lib/format";
import { FC, WP, STRESS_THRESHOLD_PCT } from "@/lib/constants";
import type { RainUncertaintyScenario, SimulationResult } from "@/types";

type Mode = "strategy" | "rain";

const STRATEGIES = [
  { key: "now", label: "Irrigate now" },
  { key: "wait3", label: "Wait 3h" },
  { key: "wait6", label: "Wait 6h" },
  { key: "wait12", label: "Wait 12h" },
  { key: "wait24", label: "Wait 24h" },
  { key: "partial", label: "Partial irrigation" },
];

const PROGRESS_STEPS = ["Preparing field state", "Projecting future conditions", "Comparing outcomes", "Decision ready"];

export default function SimulatorPage() {
  const { currentFarm, currentField } = useFarm();
  const fieldId = currentField?.id || "field-a";
  const stateQ = useApiData(() => fetchFieldState(fieldId), [fieldId]);
  const wxQ = useApiData(() => fetchWeather(fieldId), [fieldId]);
  const statusQ = useApiData(() => fetchSystemStatus());

  const [mode, setMode] = useState<Mode>("strategy");
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [rain, setRain] = useState<RainUncertaintyScenario[] | null>(null);
  const [running, setRunning] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const { toast } = useToast();

  const run = async () => {
    setRunning(true);
    setProgressStep(0);
    const advance = setInterval(() => setProgressStep((s) => Math.min(s + 1, PROGRESS_STEPS.length - 1)), 450);
    const start = stateQ.data?.rootZoneMoisturePct ?? 24.6;
    const [sim, rainScenarios] = await Promise.all([postSimulation(start), postRainUncertainty("wait6")]);
    setResult(sim.data);
    setRain(rainScenarios.data.scenarios);
    setTimeout(() => {
      clearInterval(advance);
      setProgressStep(PROGRESS_STEPS.length - 1);
      setTimeout(() => {
        setRunning(false);
        toast(`Simulation complete — best action identified: ${sim.data?.scenarios.find((s) => s.key === sim.data?.recommendedKey)?.label ?? "plan ready"}`, "success");
      }, 250);
    }, 1300);
  };

  // Voice-agent control: "run the simulation" triggers the same flow
  const runRef = useRef(run);
  runRef.current = run;
  useEffect(
    () => onAgentEvent(AGENT_EVENTS.simulate, () => runRef.current()),
    [],
  );

  return (
    <div className="mx-auto max-w-[1440px]">
      <PageHeader
        title="What-If Simulator"
        subtitle={`Compare future irrigation decisions for ${currentFarm?.name || "your farm"} before releasing water.`}
        status={statusQ.data}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[340px_1fr]">
        {/* Left: config */}
        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Current field state" />
            <div className="space-y-2.5 p-5 text-sm">
              {[
                ["Soil moisture", stateQ.data?.rootZoneMoisturePct ? `${stateQ.data.rootZoneMoisturePct.toFixed(1)}%` : "Soil telemetry unavailable"],
                ["Crop", currentFarm?.crop ? (currentFarm.cropVariety ? `${currentFarm.crop} — ${currentFarm.cropVariety}` : currentFarm.crop) : "Crop not configured"],
                ["Growth stage", currentFarm?.growthStage || "Growth stage not set"],
                ["Forecast rainfall", `${(wxQ.data?.forecast ?? []).slice(0, 24).reduce((s, f) => s + f.rainfallMm, 0).toFixed(1)} mm / 24h`],
                ["Water available", fmtL(2000)],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between border-b border-line pb-2 last:border-0 last:pb-0">
                  <span className="text-ink-muted">{k}</span>
                  <span className="font-semibold text-ink">{v}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Simulation" />
            {/* Mode tabs — animated underline + sliding content */}
            <div className="flex gap-1 border-b border-line px-4 pt-3">
              {[
                { key: "strategy" as Mode, label: "Irrigation timing" },
                { key: "rain" as Mode, label: "Rain forecast failure" },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setMode(t.key)}
                  aria-pressed={mode === t.key}
                  className={`relative rounded-t-lg px-3 pb-2.5 pt-1 text-tiny font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
                    mode === t.key ? "text-brand-dark" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {t.label}
                  {mode === t.key ? (
                    <motion.span
                      layoutId="sim-tab-underline"
                      transition={{ duration: 0.28, ease: EASE }}
                      className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand"
                    />
                  ) : null}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {mode === "strategy" ? (
                <motion.div
                  key="strategy"
                  variants={tabContent}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  className="p-4"
                >
                  <div className="mb-2 text-tiny font-medium text-ink-muted">Scenarios to compare</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {STRATEGIES.map((b) => (
                      <div
                        key={b.key}
                        className="rounded-full border border-line bg-subtle px-3 py-1.5 text-center text-tiny text-ink-soft transition-colors duration-150 hover:border-[#C3D4CA] hover:text-ink"
                      >
                        {b.label}
                      </div>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="rain"
                  variants={tabContent}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  className="p-4 text-tiny leading-relaxed text-ink-muted"
                >
                  Tests the recommended plan against three rain outcomes: rain arrives as forecast, rain partially
                  arrives, or no rain at all. The verdict shows whether the plan still holds.
                </motion.div>
              )}
            </AnimatePresence>

            <div className="border-t border-line p-4">
              <Button variant="primary" size="lg" className="w-full" onClick={run} disabled={running}>
                <Play size={15} /> {running ? "Running…" : result ? "Run again" : "Run simulation"}
              </Button>

              {/* Progress — steps light up in sequence; no generic spinner */}
              {running ? (
                <motion.div
                  className="mt-3 space-y-1.5"
                  variants={staggerContainer(0.05)}
                  initial="hidden"
                  animate="show"
                >
                  {PROGRESS_STEPS.map((s, i) => (
                    <motion.div key={s} variants={fadeUp} className="flex items-center gap-2 text-tiny">
                      {i < progressStep ? (
                        <motion.span initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.25, ease: EASE }}>
                          <CheckCircle2 size={13} className="text-success" />
                        </motion.span>
                      ) : i === progressStep ? (
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                      ) : (
                        <span className="h-3 w-3 rounded-full border border-line" />
                      )}
                      <span className={i <= progressStep ? "text-ink" : "text-ink-faint"}>{s}</span>
                    </motion.div>
                  ))}
                </motion.div>
              ) : null}
            </div>
          </Panel>

          {/* Why this decision */}
          {result && mode === "strategy" ? (
            <Panel>
              <PanelHeader title="Why this decision?" subtitle={`Recommended: ${result.scenarios.find((s) => s.recommended)?.label ?? "—"}`} />
              <motion.div
                className="space-y-3 p-5"
                variants={staggerContainer(0.07, 0.4)}
                initial="hidden"
                animate="show"
              >
                {result.scenarios
                  .find((s) => s.recommended)
                  ?.factors.map((f, i) => (
                    <motion.div key={i} variants={fadeUp} className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-light text-micro font-semibold text-brand">
                        {i + 1}
                      </span>
                      <div>
                        <div className="text-tiny font-medium text-ink">{f.label}</div>
                        <div className="text-tiny text-ink-muted">{f.value}</div>
                      </div>
                    </motion.div>
                  ))}
                <motion.p variants={fadeUp} className="border-t border-line pt-3 text-tiny leading-relaxed text-ink-muted">
                  Waiting is predicted to reduce water consumption while keeping crop stress below the configured{" "}
                  {STRESS_THRESHOLD_PCT}% threshold, with enough carryover moisture for the next decision window.
                </motion.p>
              </motion.div>
            </Panel>
          ) : null}
        </div>

        {/* Right: results */}
        <div className="space-y-4">
          {!result && !running ? (
            <Panel className="flex min-h-[420px] items-center justify-center overflow-hidden relative">
              {/* Dot pattern background */}
              <div className="absolute inset-0 dot-pattern opacity-40" />
              <motion.div
                className="relative max-w-sm p-8 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: DURATION.emphasis, ease: EASE }}
              >
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-light to-[#D5E9DF] shadow-[0_4px_16px_rgba(40,116,95,0.12)]">
                  <Sprout size={28} className="text-brand" />
                </div>
                <h3 className="mt-5 text-[17px] font-bold tracking-tight text-ink">Compare decisions before using water</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                  The simulator projects soil moisture for the next 48 hours under each irrigation choice — using
                  rainfall forecast, crop demand and soil retention — so you can see outcomes before committing water.
                </p>
                <Button variant="primary" className="mt-6" onClick={run}>
                  <Play size={14} /> Run simulation
                </Button>
              </motion.div>
            </Panel>
          ) : null}

          {running ? (
            <Panel className="flex min-h-[420px] flex-col items-center justify-center p-8">
              <div className="w-full max-w-xs">
                <div className="flex items-baseline justify-between">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={progressStep}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.22, ease: EASE }}
                      className="text-sm font-medium text-ink"
                    >
                      {PROGRESS_STEPS[progressStep]}
                    </motion.div>
                  </AnimatePresence>
                  <span className="text-micro font-medium text-brand">Step {progressStep + 1} of {PROGRESS_STEPS.length}</span>
                </div>
                {/* 4-step node indicators — NO PROGRESS BAR */}
                <div className="mt-4 flex items-center justify-between gap-2">
                  {PROGRESS_STEPS.map((step, idx) => (
                    <div
                      key={step}
                      className={cn(
                        "h-1.5 flex-1 rounded-full transition-all duration-300",
                        idx < progressStep
                          ? "bg-brand"
                          : idx === progressStep
                          ? "bg-brand animate-pulse shadow-[0_0_8px_rgba(40,116,95,0.4)]"
                          : "bg-[#E3ECE6]"
                      )}
                    />
                  ))}
                </div>
                <div className="mt-6 space-y-2.5">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="skeleton h-16 rounded-xl2" />
                  ))}
                </div>
              </div>
            </Panel>
          ) : null}

          {/* Scenario cards */}
          {result && !running && mode === "strategy" ? (
            <>
              <motion.div
                className="grid grid-cols-1 gap-3 md:grid-cols-3"
                variants={staggerContainer(0.09, 0.05)}
                initial="hidden"
                animate="show"
              >
                {result.scenarios
                  .filter((s) => ["now", "wait6", "wait24"].includes(s.key))
                  .map((s, i) => (
                    <motion.div
                      key={s.key}
                      variants={fadeUp}
                      className={`group rounded-xl2 border bg-surface p-4 transition-[border-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-raised ${
                        s.recommended ? "border-brand bg-brand-light" : "border-line shadow-card hover:border-[#C3D4CA]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-micro font-medium uppercase tracking-wide text-ink-faint">
                          {s.label}
                        </span>
                        {s.recommended ? (
                          <motion.span
                            initial={{ opacity: 0, scale: 0.6 }}
                            animate={{ opacity: 1, scale: [1, 1.08, 1] }}
                            transition={{ duration: 0.35, ease: EASE, delay: 0.35 + i * 0.09 }}
                            className="rounded-md bg-brand px-1.5 py-0.5 text-micro font-semibold text-white"
                          >
                            Recommended
                          </motion.span>
                        ) : null}
                      </div>
                        <div className="mt-2 text-[22px] font-semibold tracking-tight text-ink">{fmtL(s.waterUsedL)}</div>
                        <div className="mt-2 space-y-1.5 text-tiny">
                          <div className="flex justify-between">
                            <span className="text-ink-muted">Predicted stress</span>
                            <span className="font-semibold" style={{ color: stressColor(s.stressRiskPct) }}>
                              {s.stressRiskPct}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-ink-muted">Min moisture</span>
                            <span className="font-semibold text-ink">{s.minMoisturePct}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-ink-muted">Waste risk</span>
                            <span className="font-semibold" style={{ color: wasteColor(s.wasteRisk) }}>
                              {s.wasteRisk === "NONE" ? "None" : s.wasteRisk.charAt(0) + s.wasteRisk.slice(1).toLowerCase()}
                            </span>
                          </div>
                        </div>
                        {!s.recommended && s.key === "wait24" ? (
                          <div className="mt-2 rounded-md bg-[#FBEFEF] px-2 py-1.5 text-micro text-[#A03838]">
                            High crop risk — moisture approaches wilting
                          </div>
                        ) : null}
                        {s.recommended ? (
                          <div className="mt-2 rounded-md bg-white/70 px-2 py-1.5 text-micro text-brand-dark">
                            Saves {fmtL(620 - s.waterUsedL)} vs irrigating now
                          </div>
                        ) : null}
                    </motion.div>
                  ))}
              </motion.div>

              {/* 48h projection */}
              <Panel>
                <PanelHeader
                  title="48-hour moisture projection"
                  subtitle="Green shows the recommended plan · gray shows alternatives"
                />
                <div className="p-4">
                  <div style={{ height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart margin={{ top: 8, right: 16, bottom: 4, left: -12 }}>
                        <CartesianGrid stroke={CHART.grid} vertical={false} />
                        <XAxis
                          dataKey="hour"
                          type="number"
                          domain={[1, 48]}
                          ticks={[1, 6, 12, 18, 24, 30, 36, 42, 48]}
                          tickFormatter={(h) => `${h}h`}
                          {...AXIS_STYLE}
                        />
                        <YAxis domain={[16, 36]} tickFormatter={(v) => `${v}%`} {...AXIS_STYLE} />
                        <ChartTooltip labelFormatter={(l) => `T+${l}h`} formatter={(v) => `${Number(v).toFixed(1)}%`} />
                        <ReferenceLine
                          y={FC}
                          stroke={CHART.alternative}
                          strokeDasharray="4 4"
                          label={{ value: "Field capacity", fill: CHART.axis, fontSize: 10, position: "insideTopRight" }}
                        />
                        <ReferenceLine
                          y={WP}
                          stroke={CHART.danger}
                          strokeDasharray="4 4"
                          label={{ value: "Wilting point", fill: CHART.danger, fontSize: 10, position: "insideBottomRight" }}
                        />
                        <ReferenceLine
                          y={17.5}
                          stroke={CHART.risk}
                          strokeDasharray="2 4"
                          label={{ value: "Stress threshold", fill: CHART.risk, fontSize: 10, position: "insideTopRight" }}
                        />
                        {result.scenarios.map((s) => (
                          <Line
                            key={s.key}
                            data={s.timeline}
                            dataKey="moisturePct"
                            name={s.label}
                            type="monotone"
                            stroke={s.recommended ? CHART.recommended : s.key === "wait24" ? CHART.danger : CHART.alternative}
                            strokeWidth={s.recommended ? 2.5 : 1.5}
                            dot={false}
                            opacity={s.recommended ? 1 : 0.75}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-4 border-t border-line px-1 pt-3 text-micro text-ink-muted">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded bg-brand" /> Recommended</span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded bg-[#A9C0B4]" /> Alternative</span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded bg-danger" /> High risk</span>
                  </div>
                </div>
              </Panel>
            </>
          ) : null}

          {/* Rain uncertainty */}
          {mode === "rain" && rain && !running ? (
            <Panel>
              <PanelHeader
                title="What if the forecast is wrong?"
                subtitle="The recommended plan tested against three rain outcomes"
              />
              <div className="p-4">
                <div style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart margin={{ top: 8, right: 16, bottom: 4, left: -12 }}>
                      <CartesianGrid stroke={CHART.grid} vertical={false} />
                      <XAxis dataKey="hour" type="number" domain={[1, 48]} ticks={[6, 12, 18, 24, 30, 36, 42, 48]} tickFormatter={(h) => `${h}h`} {...AXIS_STYLE} />
                      <YAxis domain={[14, 36]} tickFormatter={(v) => `${v}%`} {...AXIS_STYLE} />
                      <ChartTooltip labelFormatter={(l) => `T+${l}h`} formatter={(v) => `${Number(v).toFixed(1)}%`} />
                      <ReferenceLine
                        y={WP}
                        stroke={CHART.danger}
                        strokeDasharray="4 4"
                        label={{ value: "Wilting point", fill: CHART.danger, fontSize: 10, position: "insideBottomRight" }}
                      />
                      <Line data={rain[0].timeline} dataKey="moisturePct" name="Rain occurs" stroke={CHART.recommended} strokeWidth={2} dot={false} />
                      <Line data={rain[1].timeline} dataKey="moisturePct" name="Rain partially occurs" stroke={CHART.risk} strokeWidth={2} dot={false} />
                      <Line data={rain[2].timeline} dataKey="moisturePct" name="Rain fails" stroke={CHART.danger} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                  {rain.map((r) => (
                    <div
                      key={r.key}
                      className={`rounded-xl2 border p-4 ${
                        r.stressRiskPct < 15 ? "border-line bg-subtle" : "border-[#E8C4C4] bg-[#FBEFEF]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-tiny font-semibold text-ink">{r.label}</span>
                        <span className="text-tiny font-semibold" style={{ color: stressColor(r.stressRiskPct) }}>
                          {r.stressRiskPct}% stress
                        </span>
                      </div>
                      <div className="mt-2 space-y-1 text-tiny text-ink-muted">
                        <div className="flex justify-between">
                          <span>Water still needed</span>
                          <span className="font-semibold text-ink">{fmtL(Math.max(0, (30 - r.endMoisturePct) * 45))}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>End moisture</span>
                          <span className="font-semibold text-ink">{r.endMoisturePct}%</span>
                        </div>
                      </div>
                      <div className={`mt-2.5 border-t pt-2 text-micro leading-relaxed ${r.stressRiskPct < 15 ? "border-line text-ink-muted" : "border-[#E8C4C4] text-[#A03838]"}`}>
                        {r.verdict}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          ) : null}
        </div>
      </div>
    </div>
  );
}
