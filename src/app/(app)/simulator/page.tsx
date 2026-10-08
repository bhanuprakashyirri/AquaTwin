"use client";

import { useState } from "react";
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
import { Panel, PanelHeader, DataBadge, DemoPill } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { AXIS_STYLE, CHART, ChartTooltip } from "@/components/charts/common";
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

const PROGRESS_STEPS = ["Preparing field state", "Simulating scenarios", "Comparing outcomes", "Decision ready"];

export default function SimulatorPage() {
  const stateQ = useApiData(() => fetchFieldState("field-a"));
  const wxQ = useApiData(() => fetchWeather("field-a"));
  const statusQ = useApiData(() => fetchSystemStatus());

  const [mode, setMode] = useState<Mode>("strategy");
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [rain, setRain] = useState<RainUncertaintyScenario[] | null>(null);
  const [running, setRunning] = useState(false);
  const [progressStep, setProgressStep] = useState(0);

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
      setTimeout(() => setRunning(false), 250);
    }, 1300);
  };

  return (
    <div className="mx-auto max-w-[1440px]">
      <PageHeader
        title="What-If Simulator"
        subtitle="Compare future irrigation decisions before releasing water."
        status={statusQ.data}
        actions={<DemoPill />}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[340px_1fr]">
        {/* Left: config */}
        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Current field state" />
            <div className="space-y-2.5 p-5 text-sm">
              {[
                ["Soil moisture", `${(stateQ.data?.rootZoneMoisturePct ?? 24.6).toFixed(1)}%`],
                ["Crop", "Rice — MTU-7029"],
                ["Growth stage", "Reproductive"],
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
            {/* Mode tabs */}
            <div className="flex gap-1 border-b border-line px-4 pt-3">
              {[
                { key: "strategy" as Mode, label: "Irrigation timing" },
                { key: "rain" as Mode, label: "Rain forecast failure" },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setMode(t.key)}
                  aria-pressed={mode === t.key}
                  className={`rounded-t-lg border-b-2 px-3 pb-2.5 pt-1 text-tiny font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
                    mode === t.key ? "border-brand text-brand-dark" : "border-transparent text-ink-muted hover:text-ink"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {mode === "strategy" ? (
              <div className="p-4">
                <div className="mb-2 text-tiny font-medium text-ink-muted">Scenarios to compare</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {STRATEGIES.map((b) => (
                    <div key={b.key} className="rounded-lg border border-line bg-subtle px-2 py-2 text-center text-tiny text-ink-soft">
                      {b.label}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 text-tiny leading-relaxed text-ink-muted">
                Tests the recommended plan against three rain outcomes: rain arrives as forecast, rain partially
                arrives, or no rain at all. The verdict shows whether the plan still holds.
              </div>
            )}

            <div className="border-t border-line p-4">
              <Button variant="primary" size="lg" className="w-full" onClick={run} disabled={running}>
                <Play size={15} /> {running ? "Running…" : result ? "Run again" : "Run simulation"}
              </Button>

              {/* Progress */}
              {running ? (
                <div className="mt-3 space-y-1.5">
                  {PROGRESS_STEPS.map((s, i) => (
                    <div key={s} className="flex items-center gap-2 text-tiny">
                      {i < progressStep ? (
                        <CheckCircle2 size={13} className="text-success" />
                      ) : i === progressStep ? (
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                      ) : (
                        <span className="h-3 w-3 rounded-full border border-line" />
                      )}
                      <span className={i <= progressStep ? "text-ink" : "text-ink-faint"}>{s}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </Panel>

          {/* Why this decision */}
          {result && mode === "strategy" ? (
            <Panel>
              <PanelHeader title="Why this decision?" subtitle={`Recommended: ${result.scenarios.find((s) => s.recommended)?.label ?? "—"}`} />
              <div className="space-y-3 p-5">
                {result.scenarios
                  .find((s) => s.recommended)
                  ?.factors.map((f, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-light text-micro font-semibold text-brand">
                        {i + 1}
                      </span>
                      <div>
                        <div className="text-tiny font-medium text-ink">{f.label}</div>
                        <div className="text-tiny text-ink-muted">{f.value}</div>
                      </div>
                    </div>
                  ))}
                <p className="border-t border-line pt-3 text-tiny leading-relaxed text-ink-muted">
                  Waiting is predicted to reduce water consumption while keeping crop stress below the configured{" "}
                  {STRESS_THRESHOLD_PCT}% threshold, with enough carryover moisture for the next decision window.
                </p>
              </div>
            </Panel>
          ) : null}
        </div>

        {/* Right: results */}
        <div className="space-y-4">
          {!result && !running ? (
            <Panel className="flex min-h-[420px] items-center justify-center">
              <div className="max-w-sm p-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl2 bg-brand-light">
                  <Sprout size={26} className="text-brand" />
                </div>
                <h3 className="mt-4 text-[15px] font-semibold text-ink">Compare decisions before using water</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                  The simulator projects soil moisture for the next 48 hours under each irrigation choice — using
                  rainfall forecast, crop demand and soil retention — so you can see outcomes before committing water.
                </p>
                <Button variant="primary" className="mt-5" onClick={run}>
                  <Play size={14} /> Run simulation
                </Button>
              </div>
            </Panel>
          ) : null}

          {running ? (
            <Panel className="flex min-h-[420px] items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-[3px] border-brand border-t-transparent" />
                <div className="mt-3 text-sm font-medium text-ink">{PROGRESS_STEPS[progressStep]}…</div>
              </div>
            </Panel>
          ) : null}

          {/* Scenario cards */}
          {result && !running && mode === "strategy" ? (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <AnimatePresence>
                  {result.scenarios
                    .filter((s) => ["now", "wait6", "wait24"].includes(s.key))
                    .map((s, i) => (
                      <motion.div
                        key={s.key}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1, duration: 0.3 }}
                        className={`rounded-xl2 border bg-surface p-4 ${
                          s.recommended ? "border-brand bg-brand-light" : "border-line shadow-card"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-micro font-medium uppercase tracking-wide text-ink-faint">
                            {s.label}
                          </span>
                          {s.recommended ? (
                            <span className="rounded-md bg-brand px-1.5 py-0.5 text-micro font-semibold text-white">
                              Recommended
                            </span>
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
                </AnimatePresence>
              </div>

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
