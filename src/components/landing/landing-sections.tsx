"use client";

/**
 * Art-directed Landing Sections — The complete 10-phase storytelling experience:
 * 02 — THE PROBLEM (Visual tension: 1 large photograph + editorial data points)
 * 03 — THE SHIFT (Interactive 4-step sequence: Current Field -> Twin -> Scenarios -> Decision)
 * 04 — FIELD DIGITAL TWIN (Full MapLibre GIS workspace with interactive zones & telemetry)
 * 05 — WHAT-IF SIMULATION (Signature feature: 3 futures with 48h trajectory chart)
 * 06 — WEATHER UNCERTAINTY ("What if the forecast is wrong?" Rain occurs / partial / fails)
 * 07 — WATER BUDGET ("Use the water you actually have" Interactive slider 500-3000L)
 * 08 — FIELD WATER FINGERPRINT ("Every field behaves differently" Predicted vs Observed)
 * 09 — IMPACT (Verified demo metrics with agricultural photography)
 * 10 — FINAL CTA ("Make every litre count" Cinematic sunrise backdrop)
 * LandingFooter (Clean editorial footer)
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import Image from "next/image";
import { AnimatePresence, motion, useInView } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  CloudRain,
  Droplets,
  Layers,
  MapPin,
  Play,
  Scale,
  ShieldCheck,
  Sparkles,
  Sprout,
  TrendingDown,
  TrendingUp,
  Wand2,
} from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { LinkButton } from "@/components/ui/button";
import { AXIS_STYLE, CHART, ChartTooltip } from "@/components/charts/common";
import { EASE, fadeUp, riseUp, staggerContainer } from "@/lib/motion";
import { fmtL } from "@/lib/format";
import { ZONES } from "@/lib/demo-data";

const FarmMap = dynamic(() => import("@/components/maps/farm-map").then((m) => ({ default: m.FarmMap })), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[380px] items-center justify-center bg-subtle text-xs text-ink-muted">
      Loading interactive field GIS engine…
    </div>
  ),
});

/* ==================================================================
   02 — THE PROBLEM: "Every irrigation decision has a cost."
   One powerful photograph + high visual tension + data points
   ================================================================== */

export function ProblemSection() {
  const problems = [
    { title: "Over-irrigation", stat: "Up to 35% water wasted", desc: "Water released before rain arrives or beyond field capacity drains unused." },
    { title: "Under-irrigation", stat: "Silent yield loss", desc: "Root zones fall below the refill threshold without early warning." },
    { title: "Uncertain rainfall", stat: "70% rain ignored", desc: "Farmers pump water hours before a downpour because forecasts aren't trusted." },
    { title: "Limited water", stat: "Canal quota deficits", desc: "Fixed schedules distribute scarce water equally instead of prioritizing high-stress zones." },
  ];

  return (
    <section className="border-b border-line bg-surface py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Left Column: Editorial Headline & Problem Points (7 cols) */}
          <motion.div
            variants={staggerContainer(0.08, 0.05)}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="lg:col-span-7"
          >
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand">
              The Reality of Irrigation
            </div>
            <h2 className="mt-3 text-[32px] font-extrabold leading-[1.12] tracking-[-0.025em] text-ink sm:text-[42px] lg:text-[48px]">
              Every irrigation decision <br className="hidden sm:inline" />
              has a compounding cost.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-muted">
              Most irrigation still operates on fixed calendar schedules, habit, or instinct — without
              testing how soil physics, approaching weather, and crop evapotranspiration will interact over
              the next 48 hours.
            </p>

            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
              {problems.map((p, i) => (
                <div key={p.title} className="rounded-xl2 border border-line bg-page p-5 transition-shadow hover:shadow-card">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-ink-faint">
                      Issue 0{i + 1}
                    </span>
                    <span className="text-xs font-bold text-danger">{p.stat}</span>
                  </div>
                  <h3 className="mt-2 text-base font-bold text-ink">{p.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{p.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right Column: Single Powerful Photograph (5 cols) */}
          <motion.div
            variants={riseUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            className="lg:col-span-5"
          >
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-line shadow-raised">
              <Image
                src="/images/water_stress.jpg"
                alt="Paddy crops showing soil moisture stress in dry irrigation channels"
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#163A31]/80 via-transparent to-transparent pointer-events-none" />
              <div className="absolute inset-x-6 bottom-6 rounded-xl border border-white/20 bg-black/40 p-4 text-white backdrop-blur-md">
                <div className="text-[10px] font-bold uppercase tracking-wider text-white/70">Field Diagnosis</div>
                <div className="mt-1 text-sm font-semibold">Zone B: Soil moisture dropped below 22% refill point</div>
                <div className="mt-1 text-xs text-white/80">Early root-zone deficit begins days before visible crop wilt.</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ==================================================================
   03 — THE SHIFT: "What if you could test before making it?"
   Interactive 4-step sequence: Current Field -> Twin -> Scenarios -> Decision
   ================================================================== */

export function ShiftSection() {
  const steps = [
    {
      num: "01",
      title: "Current Field State",
      subtitle: "Telemetry Ingestion",
      desc: "Live soil sensors, satellite canopy signals, and local 48h weather radar are ingested into memory.",
    },
    {
      num: "02",
      title: "Digital Twin Synthesis",
      subtitle: "Mass-Balance Physics",
      desc: "Root-zone water dynamics, infiltration curves, and evapotranspiration are simulated zone-by-zone.",
    },
    {
      num: "03",
      title: "Future Scenarios",
      subtitle: "What-If Projections",
      desc: "Multiple options (irrigate now, wait 6h, wait 24h, partial) are simulated forward 48 hours in parallel.",
    },
    {
      num: "04",
      title: "Optimal Decision",
      subtitle: "Constrained Action",
      desc: "Water is allocated only where predicted stress reduction is maximized, backed by an auditable reason.",
    },
  ];

  return (
    <section id="shift" className="scroll-mt-16 border-b border-line bg-page py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="mx-auto max-w-3xl text-center"
        >
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand">
            The Paradigm Shift
          </div>
          <h2 className="mt-3 text-[34px] font-extrabold leading-[1.1] tracking-[-0.025em] text-ink sm:text-[44px]">
            What if you could test an irrigation decision{" "}
            <span className="text-brand">before making it?</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink-muted">
            Instead of reactive guesswork, AquaTwin runs a digital twin simulation for every possible
            action — choosing the one that preserves crop yield while saving the most water.
          </p>
        </motion.div>

        {/* The 4-step horizontal process sequence */}
        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <motion.div
              key={s.num}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.12 }}
              className="relative rounded-2xl border border-line bg-surface p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-raised"
            >
              <div className="flex items-center justify-between border-b border-line pb-4">
                <span className="text-2xl font-extrabold text-brand-dark">{s.num}</span>
                <span className="rounded-full bg-brand-light px-2.5 py-0.5 text-[10px] font-bold text-brand uppercase tracking-wider">
                  Phase {i + 1}
                </span>
              </div>
              <h3 className="mt-4 text-base font-bold text-ink">{s.title}</h3>
              <div className="text-xs font-semibold text-brand">{s.subtitle}</div>
              <p className="mt-2 text-xs leading-relaxed text-ink-muted">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ==================================================================
   04 — FIELD DIGITAL TWIN: Real interactive MapLibre GIS
   Field occupies most visual area, 4 zones, layer switcher, inspector
   ================================================================== */

export function TwinSection() {
  const [layer, setLayer] = useState("moisture");
  const [selectedId, setSelectedId] = useState("zone-b");

  const layers = [
    { key: "moisture", label: "Soil Moisture" },
    { key: "stress", label: "Crop Stress" },
    { key: "ndvi", label: "Vegetation Health" },
    { key: "priority", label: "Irrigation Priority" },
  ];

  const currentZone = useMemo(() => {
    return ZONES.find((z) => z.id === selectedId) || ZONES[1];
  }, [selectedId]);

  return (
    <section id="twin" className="scroll-mt-16 border-b border-line bg-surface py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand">
              04 — Operational GIS Workspace
            </div>
            <h2 className="mt-2 text-[32px] font-extrabold leading-tight tracking-tight text-ink sm:text-[40px]">
              Field Digital Twin
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">
              Explore the four active management zones of Kisan Bhimavaram Farm. Select any zone or
              switch layers to inspect root-zone soil balance.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {layers.map((l) => (
              <button
                key={l.key}
                onClick={() => setLayer(l.key)}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                  layer === l.key
                    ? "bg-brand text-white shadow-card"
                    : "border border-line bg-surface text-ink-soft hover:bg-subtle"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* GIS Grid: 9 Cols Map, 3 Cols Zone Telemetry Panel */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Large Map Area */}
          <div className="overflow-hidden rounded-2xl border border-line shadow-card lg:col-span-8">
            <div className="h-[460px] w-full">
              <FarmMap
                zones={ZONES}
                layer={layer}
                selectedZoneId={selectedId}
                onZoneSelect={(id) => setSelectedId(id || "zone-b")}
                showLegend
              />
            </div>
          </div>

          {/* Right Inspector Panel */}
          <div className="flex flex-col justify-between rounded-2xl border border-line bg-page p-6 shadow-card lg:col-span-4">
            <div>
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div>
                  <h3 className="text-xl font-extrabold text-ink">{currentZone.name}</h3>
                  <div className="text-xs font-medium text-ink-muted">
                    {currentZone.areaHa} ha · {currentZone.soilType}
                  </div>
                </div>
                <span className="rounded-full bg-brand-light px-3 py-1 text-xs font-extrabold text-brand-dark">
                  Priority P{currentZone.priority}
                </span>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-line bg-surface p-3.5">
                  <span className="text-xs font-medium text-ink-muted">Root-Zone Moisture</span>
                  <span className="text-lg font-bold text-ink">{currentZone.moisturePct}%</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-line bg-surface p-3.5">
                  <span className="text-xs font-medium text-ink-muted">Predicted Crop Stress</span>
                  <span className="text-lg font-bold text-warning">{currentZone.stressRiskPct}%</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-line bg-surface p-3.5">
                  <span className="text-xs font-medium text-ink-muted">Water Requirement</span>
                  <span className="text-lg font-bold text-brand-dark">{fmtL(currentZone.waterRequirementL)}</span>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-line/80 bg-subtle p-3.5 text-xs leading-relaxed text-ink-soft">
                {currentZone.id === "zone-b"
                  ? "Zone B holds the highest immediate deficit. Recommended for primary allocation under scarce water quotas."
                  : "Zone is currently in a safe moisture bracket. Irrigation can be deferred pending 48h rainfall."}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-line">
              <LinkButton href="/twin" variant="primary" className="w-full text-center">
                Open Full GIS Workspace →
              </LinkButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ==================================================================
   05 — WHAT-IF SIMULATION: Signature Hero Feature
   "DON'T JUST PREDICT. SIMULATE."
   Current State + 3 Futures + 48h Trajectory Line Chart
   ================================================================== */

export function WhatIfSection() {
  const [selectedScenario, setSelectedScenario] = useState<"now" | "wait6" | "wait24">("wait6");

  const scenarios = [
    {
      key: "now" as const,
      label: "Irrigate Now",
      water: 720,
      stress: 2.1,
      desc: "Water released immediately. High risk of washing out nutrients if expected rain falls.",
      recommended: false,
    },
    {
      key: "wait6" as const,
      label: "Wait 6 Hours",
      water: 310,
      stress: 5.2,
      desc: "Allows forecast rain to infiltrate first. Saves 410 L while keeping stress safely below 15%.",
      recommended: true,
    },
    {
      key: "wait24" as const,
      label: "Wait 24 Hours",
      water: 0,
      stress: 39.4,
      desc: "No water added. If rain misses or arrives late, crop enters severe moisture stress.",
      recommended: false,
    },
  ];

  // 48h trajectory projection based on selected scenario
  const chartData = useMemo(() => {
    return Array.from({ length: 9 }).map((_, i) => {
      const hour = i * 6;
      let moisture = 24.6;
      if (selectedScenario === "now") {
        moisture = hour < 6 ? 24.6 + hour * 1.5 : Math.max(22, 33 - (hour - 6) * 0.25);
      } else if (selectedScenario === "wait6") {
        moisture = hour < 6 ? 24.6 - hour * 0.15 : hour < 18 ? 23.7 + (hour - 6) * 0.8 : 31 - (hour - 18) * 0.2;
      } else {
        moisture = Math.max(14.2, 24.6 - hour * 0.22);
      }
      return {
        time: `${hour}h`,
        moisture: Math.round(moisture * 10) / 10,
        wiltingPoint: 14.0,
        refillPoint: 22.0,
      };
    });
  }, [selectedScenario]);

  return (
    <section id="what-if" className="scroll-mt-16 border-b border-line bg-page py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="max-w-2xl"
        >
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand">
            05 — The Signature Innovation
          </div>
          <h2 className="mt-2 text-[34px] font-extrabold leading-tight tracking-tight text-ink sm:text-[44px]">
            Don&apos;t just predict. <span className="text-brand">Simulate.</span>
          </h2>
          <p className="mt-3 text-base text-ink-muted">
            Test future irrigation scenarios against the field&apos;s physical model before touching a single pump valve.
          </p>
        </motion.div>

        {/* Current State Bar */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-xl2 border border-line bg-surface p-5 shadow-card">
          <div className="text-xs font-bold uppercase tracking-wider text-ink-soft">
            Live Field Baseline:
          </div>
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div>
              <span className="text-ink-muted">Current Moisture:</span>{" "}
              <strong className="text-ink">24.6%</strong>
            </div>
            <div>
              <span className="text-ink-muted">Rain Probability:</span>{" "}
              <strong className="text-info">70% in 7h</strong>
            </div>
            <div>
              <span className="text-ink-muted">Available Water:</span>{" "}
              <strong className="text-brand-dark">2,000 L</strong>
            </div>
          </div>
        </div>

        {/* 3 Future Scenario Cards */}
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
          {scenarios.map((s) => {
            const isSelected = selectedScenario === s.key;
            return (
              <div
                key={s.key}
                onClick={() => setSelectedScenario(s.key)}
                className={`relative cursor-pointer rounded-2xl border p-6 transition-all duration-200 ${
                  isSelected
                    ? "border-brand bg-surface shadow-raised ring-2 ring-brand/30"
                    : "border-line bg-surface/70 hover:bg-surface hover:shadow-card"
                }`}
              >
                {s.recommended && (
                  <span className="absolute right-4 top-4 rounded-full bg-brand px-3 py-1 text-[10px] font-bold text-white uppercase tracking-wider">
                    Recommended
                  </span>
                )}
                <div className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                  {s.label}
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-ink">{s.water}</span>
                  <span className="text-xs font-semibold text-ink-muted">Litres required</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-ink-muted">Predicted Crop Stress:</span>
                  <span className={`font-bold ${s.stress > 20 ? "text-danger" : "text-success"}`}>
                    {s.stress}%
                  </span>
                </div>
                <p className="mt-4 border-t border-line/80 pt-3 text-xs leading-relaxed text-ink-muted">
                  {s.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* 48-Hour Soil Moisture Trajectory Chart */}
        <div className="mt-8 rounded-2xl border border-line bg-surface p-6 shadow-card">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-ink">48-Hour Root-Zone Trajectory</h3>
              <p className="text-xs text-ink-muted">Simulated outcome for scenario: <strong className="text-brand">{selectedScenario.toUpperCase()}</strong></p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-ink-soft">
                <span className="h-2 w-2 rounded-full bg-brand" /> Simulated Moisture
              </span>
              <span className="flex items-center gap-1.5 text-ink-muted">
                <span className="h-0.5 w-3 bg-danger" /> Wilting Point (14%)
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
                <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="time" {...AXIS_STYLE} />
                <YAxis domain={[10, 36]} tickFormatter={(v) => `${v}%`} {...AXIS_STYLE} />
                <ChartTooltip formatter={(v) => `${v}%`} />
                <ReferenceLine y={14} stroke="#C45A55" strokeDasharray="4 4" />
                <ReferenceLine y={22} stroke="#B98227" strokeDasharray="4 4" />
                <Line
                  type="monotone"
                  dataKey="moisture"
                  stroke={CHART.recommended}
                  strokeWidth={3}
                  dot={{ r: 4, fill: CHART.recommended }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ==================================================================
   06 — WEATHER UNCERTAINTY: "What if the forecast is wrong?"
   3 outcomes: Rain Occurs / Partial Rain / Rain Fails
   ================================================================== */

export function WeatherUncertaintySection() {
  const [outcome, setOutcome] = useState<"rain" | "partial" | "fail">("rain");

  const outcomes = [
    {
      key: "rain" as const,
      label: "Rain Occurs (12.3 mm)",
      prob: "70% Probability",
      moistureOutcome: "29.8%",
      stressOutcome: "3.2%",
      waterNeed: "0 L",
      verdict: "Optimal outcome. Waiting avoided pumping water that would have overflowed field bunds.",
    },
    {
      key: "partial" as const,
      label: "Partial Rain (3.5 mm)",
      prob: "20% Probability",
      moistureOutcome: "24.2%",
      stressOutcome: "6.8%",
      waterNeed: "180 L",
      verdict: "Safe threshold maintained. Minor supplemental watering scheduled for tomorrow morning.",
    },
    {
      key: "fail" as const,
      label: "Rain Fails (0 mm)",
      prob: "10% Probability",
      moistureOutcome: "21.5%",
      stressOutcome: "11.4%",
      waterNeed: "400 L",
      verdict: "Safety buffer held. System triggers emergency irrigation window before stress reaches threshold.",
    },
  ];

  const current = outcomes.find((o) => o.key === outcome) || outcomes[0];

  return (
    <section className="border-b border-line bg-surface py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand">
              06 — Risk Sensitivity
            </div>
            <h2 className="mt-2 text-[32px] font-extrabold leading-tight tracking-tight text-ink sm:text-[40px]">
              What if the forecast <br className="hidden sm:inline" />
              is wrong?
            </h2>
            <p className="mt-4 text-base leading-relaxed text-ink-muted">
              Farmers distrust algorithms when they don&apos;t account for weather forecast error.
              AquaTwin stress-tests every recommendation against full rain, partial rain, and rain failure.
            </p>

            <div className="mt-8 space-y-3">
              {outcomes.map((o) => (
                <button
                  key={o.key}
                  onClick={() => setOutcome(o.key)}
                  className={`w-full rounded-2xl border p-4 text-left transition-all ${
                    outcome === o.key
                      ? "border-brand bg-brand-light shadow-card ring-1 ring-brand/30"
                      : "border-line bg-page hover:bg-subtle"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-ink">{o.label}</span>
                    <span className="text-xs font-semibold text-brand-dark">{o.prob}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-page p-6 shadow-card lg:col-span-7">
            <div className="border-b border-line pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-faint">
                Simulated Outcome for {current.label}
              </span>
              <h3 className="mt-1 text-xl font-extrabold text-ink">{current.verdict}</h3>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="rounded-xl border border-line bg-surface p-4 text-center">
                <div className="text-xs text-ink-muted">Post-Event Moisture</div>
                <div className="mt-1 text-2xl font-extrabold text-ink">{current.moistureOutcome}</div>
              </div>
              <div className="rounded-xl border border-line bg-surface p-4 text-center">
                <div className="text-xs text-ink-muted">Predicted Crop Stress</div>
                <div className="mt-1 text-2xl font-extrabold text-success">{current.stressOutcome}</div>
              </div>
              <div className="rounded-xl border border-line bg-surface p-4 text-center">
                <div className="text-xs text-ink-muted">Supplemental Water</div>
                <div className="mt-1 text-2xl font-extrabold text-brand-dark">{current.waterNeed}</div>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-line bg-surface p-4 text-xs leading-relaxed text-ink-muted">
              <strong>Audit Guarantee:</strong> In all three uncertainty branches, predicted crop-stress
              remains below the critical 15% stress threshold. The decision to wait is mathematically robust.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ==================================================================
   07 — WATER BUDGET: "Use the water you actually have."
   Interactive slider 500L -> 3000L with animated allocation bars
   ================================================================== */

export function BudgetSection() {
  const [budget, setBudget] = useState(2000);

  // Dynamic distribution across zones based on budget
  const allocations = useMemo(() => {
    // Total need = 2700 L (Zone B 900, D 800, C 600, A 400)
    const b = Math.min(900, Math.max(0, budget * 0.45));
    const d = Math.min(800, Math.max(0, (budget - b) * 0.65));
    const c = Math.min(600, Math.max(0, (budget - b - d) * 0.8));
    const a = Math.min(400, Math.max(0, budget - b - d - c));

    return [
      { name: "Zone B", need: 900, allocated: Math.round(b), priority: "P1", status: b >= 900 ? "Full" : "Partial" },
      { name: "Zone D", need: 800, allocated: Math.round(d), priority: "P2", status: d >= 800 ? "Full" : "Partial" },
      { name: "Zone C", need: 600, allocated: Math.round(c), priority: "P3", status: c >= 600 ? "Full" : c > 0 ? "Partial" : "Deferred" },
      { name: "Zone A", need: 400, allocated: Math.round(a), priority: "P4", status: a > 0 ? "Partial" : "Deferred" },
    ];
  }, [budget]);

  return (
    <section id="budget" className="scroll-mt-16 border-b border-line bg-page py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand">
              07 — Constrained Optimization
            </div>
            <h2 className="mt-2 text-[32px] font-extrabold leading-tight tracking-tight text-ink sm:text-[40px]">
              Use the water you <span className="text-brand">actually have.</span>
            </h2>
            <p className="mt-4 text-base leading-relaxed text-ink-muted">
              When canal quotas and storage tanks cannot cover total field demand, AquaTwin allocates
              every litre where it creates the greatest drop in crop stress.
            </p>

            {/* Interactive Slider */}
            <div className="mt-8 rounded-2xl border border-line bg-surface p-5 shadow-card">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-ink-muted uppercase tracking-wider">Available Water Quota:</span>
                <span className="text-xl font-extrabold text-brand-dark">{budget.toLocaleString()} L</span>
              </div>
              <input
                type="range"
                min="500"
                max="3000"
                step="250"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-lg bg-line accent-brand"
              />
              <div className="mt-2 flex justify-between text-[11px] font-semibold text-ink-faint">
                <span>500 L (Severe Drought)</span>
                <span>3,000 L (Surplus)</span>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <LinkButton href="/water-budget" variant="primary" className="rounded-full">
                Open Water Budget Workspace →
              </LinkButton>
            </div>
          </div>

          {/* Allocation Breakdown */}
          <div className="rounded-2xl border border-line bg-surface p-6 shadow-card lg:col-span-7">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <h3 className="text-base font-bold text-ink">Optimized Distribution (2,700 L Total Demand)</h3>
              <span className="text-xs font-bold text-brand-dark">
                {Math.round((allocations.reduce((s, z) => s + z.allocated, 0) / 2700) * 100)}% Demand Covered
              </span>
            </div>

            <div className="mt-6 space-y-5">
              {allocations.map((a) => (
                <div key={a.name}>
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-ink">
                      {a.name} <span className="text-ink-faint">({a.priority})</span>
                    </span>
                    <span className="text-brand-dark">
                      {a.allocated} L / {a.need} L ({a.status})
                    </span>
                  </div>
                  <div className="mt-2 h-3.5 w-full overflow-hidden rounded-full bg-subtle">
                    <motion.div
                      className="h-full rounded-full bg-brand"
                      initial={{ width: 0 }}
                      animate={{ width: `${(a.allocated / a.need) * 100}%` }}
                      transition={{ duration: 0.5, ease: EASE }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 border-t border-line pt-4 text-xs leading-relaxed text-ink-muted">
              Prioritization strictly targets Zone B and D first. Zone A is safely deferred because
              forecast rainfall satisfies its moisture curve without pump energy.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ==================================================================
   08 — FIELD WATER FINGERPRINT: "Every field behaves differently."
   Predicted vs Observed Response Real Chart
   ================================================================== */

export function FingerprintSection() {
  const chartData = [
    { event: "Aug 28", predicted: 7.2, observed: 7.0 },
    { event: "Sep 02", predicted: 8.5, observed: 8.9 },
    { event: "Sep 07", predicted: 6.8, observed: 7.1 },
    { event: "Sep 12", predicted: 9.4, observed: 9.1 },
    { event: "Sep 18", predicted: 10.1, observed: 10.4 },
    { event: "Sep 24", predicted: 8.9, observed: 8.8 },
  ];

  return (
    <section className="border-b border-line bg-surface py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand">
              08 — Self-Calibrating Physics
            </div>
            <h2 className="mt-2 text-[32px] font-extrabold leading-tight tracking-tight text-ink sm:text-[40px]">
              Every field behaves <br className="hidden sm:inline" />
              differently.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-ink-muted">
              Soil texture, drainage, and root depth vary across plots. AquaTwin learns your field&apos;s
              specific moisture response after every irrigation event — narrowing the error gap over time.
            </p>

            <div className="mt-6 space-y-2.5 text-xs text-ink-soft">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-success shrink-0" />
                <span>Calibrates moisture gain per 100 litres pumped</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-success shrink-0" />
                <span>Learns site-specific drying rates under varying heat</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-success shrink-0" />
                <span>Calculates true effective infiltration from rain events</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-page p-6 shadow-card lg:col-span-7">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <h3 className="text-sm font-bold text-ink">Observed vs. Predicted Moisture Response</h3>
                <p className="text-xs text-ink-muted">Last 6 irrigation cycles (soil moisture gain %)</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-brand">
                  <span className="h-2 w-2 rounded-full bg-brand" /> Observed
                </span>
                <span className="flex items-center gap-1.5 text-ink-muted">
                  <span className="h-2 w-2 rounded-full bg-ink-faint" /> Predicted
                </span>
              </div>
            </div>

            <div className="mt-4 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis dataKey="event" {...AXIS_STYLE} />
                  <YAxis {...AXIS_STYLE} tickFormatter={(v) => `+${v}%`} />
                  <ChartTooltip formatter={(v) => `+${v}%`} />
                  <Bar dataKey="predicted" fill="#A4B8AE" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Line dataKey="observed" stroke={CHART.recommended} strokeWidth={2.5} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ==================================================================
   09 — IMPACT: Verified demo indicators with agricultural photo
   ================================================================== */

export function ImpactSection() {
  const impacts = [
    { stat: "453 Litres", label: "Average saved per irrigation window on 10 ha" },
    { stat: "Zero Deficit", label: "Crop stress kept below critical 15% threshold" },
    { stat: "70% Forecast", label: "Rainfall successfully utilized to replace canal pumping" },
    { stat: "100% Auditable", label: "Every decision backed by explicit physical rationale" },
  ];

  return (
    <section className="border-b border-line bg-page py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-line shadow-card lg:col-span-5">
            <Image
              src="/images/optimized_irrigation.jpg"
              alt="Controlled channel irrigation through South Indian rice paddies"
              fill
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#163A31]/60 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-4 left-4 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-ink-soft shadow-card backdrop-blur-md">
              Targeted Channel Flow · Zero Tailwater Waste
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand">
              09 — Quantified Results
            </div>
            <h2 className="mt-2 text-[32px] font-extrabold leading-tight tracking-tight text-ink sm:text-[40px]">
              Precision without complexity.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-ink-muted">
              Results measured across calibrated demo runs at Kisan Bhimavaram Farm.
              Smart decisions conserve water and electricity without putting crop yield at risk.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-4">
              {impacts.map((imp) => (
                <div key={imp.stat} className="rounded-2xl border border-line bg-surface p-5 shadow-card">
                  <div className="text-2xl font-extrabold text-brand-dark sm:text-3xl">{imp.stat}</div>
                  <div className="mt-1 text-xs text-ink-muted leading-relaxed">{imp.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ==================================================================
   10 — FINAL CTA: "Make every litre count."
   Cinematic sunrise background + pill buttons
   ================================================================== */

export function FinalCtaSection() {
  return (
    <section className="relative overflow-hidden bg-page py-24 lg:py-32">
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/login_sunrise.jpg"
          alt="Golden hour sunrise over South Indian rice farmland"
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#163A31]/95 via-[#163A31]/85 to-[#163A31]/65" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <motion.div
          variants={staggerContainer(0.08, 0.04)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="max-w-2xl text-white"
        >
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
            10 — Ready for the Field
          </div>
          <h2 className="mt-3 text-[38px] font-extrabold leading-tight tracking-tight sm:text-[50px]">
            Make every litre count.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/85 sm:text-lg">
            Turn soil moisture, weather forecasts, and satellite signals into confident, simulated
            irrigation decisions. Explore the live interactive demo now.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <LinkButton href="/dashboard" variant="primary" size="lg" className="rounded-full shadow-raised">
              Explore AquaTwin <ArrowRight size={15} className="ml-1" />
            </LinkButton>
            <LinkButton
              href="/login"
              size="lg"
              className="rounded-full border border-white/40 bg-white/10 text-white backdrop-blur-md hover:bg-white/20"
            >
              Open Demo
            </LinkButton>
          </div>

          <div className="mt-8 text-xs text-white/60">
            Offline-ready prototype · Deterministic demo dataset · No sign-up required
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ==================================================================
   LANDING FOOTER: Editorial, clean, informative
   ================================================================== */

export function LandingFooter() {
  return (
    <footer className="border-t border-line bg-surface py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 sm:flex-row">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-light">
            <Droplets size={16} className="text-brand" />
          </div>
          <div>
            <div className="text-sm font-bold text-ink">AquaTwin</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
              AI Irrigation Intelligence
            </div>
          </div>
        </div>

        <div className="text-xs text-ink-muted text-center sm:text-left">
          &ldquo;We don&apos;t just predict when to irrigate — we simulate the future of the field before using a single drop.&rdquo;
        </div>

        <div className="text-xs font-semibold text-ink-faint">
          Vishnu Hackathon Edition
        </div>
      </div>
    </footer>
  );
}
