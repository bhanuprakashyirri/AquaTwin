"use client";

/**
 * AquaTwin — Editorial Landing Sections
 *
 * Art direction:
 * - Dark-mode problem section (inverted visual rhythm from the rest)
 * - Each section has a distinct visual "personality" — not just different content
 * - Real interactive components embedded in sections (not screenshots)
 * - Alternating white/off-white/dark backgrounds create visual rhythm
 * - Numbers, data, and stats used as graphic design elements
 * - Every CTA is pill-shaped
 */

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AquaLink } from "@/components/ui/aqua-button";
import dynamic from "next/dynamic";
import Image from "next/image";
import { motion, useInView } from "framer-motion";
import {
  ArrowRight,
  CloudRain,
  Droplets,
  Scale,
  Sparkles,
  Wand2,
  Activity,
  ChevronRight,
  AlertTriangle,
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
import { AXIS_STYLE, CHART, ChartTooltip } from "@/components/charts/common";
import { fadeUp, riseUp, staggerContainer } from "@/lib/motion";
import { fmtL } from "@/lib/format";
import { ZONES } from "@/lib/demo-data";

const FarmMap = dynamic(() => import("@/components/maps/farm-map").then((m) => ({ default: m.FarmMap })), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[380px] items-center justify-center bg-[#0E1F18] text-xs text-emerald-900/50">
      Loading interactive field GIS engine…
    </div>
  ),
});

/* Reusable section number + label eyebrow */
function SectionLabel({ num, label, dark = false }: { num: string; label: string; dark?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.2em] ${dark ? "text-emerald-400" : "text-brand"}`}>
      <span className={`h-px w-8 ${dark ? "bg-emerald-400/50" : "bg-brand/50"}`} />
      {num} — {label}
    </div>
  );
}

/* ================================================================
   02 — THE PROBLEM (Dark section — visual contrast from hero)
   Full-bleed dark atmosphere, white text, numbered stats
   ================================================================ */

export function ProblemSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  const problems = [
    {
      stat: "35%",
      label: "Water wasted",
      desc: "Over-irrigation pumps water hours before a rain event, overflowing bunds and leaching expensive soil nutrients.",
      tag: "Over-Irrigation",
      icon: Droplets,
      color: "text-red-400",
      bg: "bg-red-500/8 border-red-500/15",
      imgKey: "/images/aquatwin/problem-water.webp",
    },
    {
      stat: "−18%",
      label: "Yield lost silently",
      desc: "Root zones drop past the wilting point days before visible foliage yellowing — a loss most farmers never measure.",
      tag: "Under-Irrigation",
      icon: AlertTriangle,
      color: "text-amber-400",
      bg: "bg-amber-500/8 border-amber-500/15",
      imgKey: "/images/aquatwin/problem-stress.webp",
    },
    {
      stat: "70%",
      label: "Forecast ignored",
      desc: "Fixed schedules disregard precipitation probability because farmers have no reliable simulation to trust.",
      tag: "Weather Blind",
      icon: CloudRain,
      color: "text-sky-400",
      bg: "bg-sky-500/8 border-sky-500/15",
      imgKey: "/images/aquatwin/weather-risk.webp",
    },
  ];

  return (
    <section className="relative overflow-hidden bg-[#060F0C] py-24 lg:py-32">
      {/* Subtle texture */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_0%,rgba(40,116,95,0.12),transparent)]" />

      <div ref={ref} className="relative mx-auto max-w-7xl px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl"
        >
          <SectionLabel num="02" label="The Hidden Loss" dark />
          <h2 className="mt-5 text-[36px] font-extrabold leading-[1.08] tracking-[-0.035em] text-white sm:text-[50px]">
            Every irrigation decision
            <br />
            <span className="text-white/40">has a cost.</span>
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-[1.75] text-white/50">
            Most irrigation still runs on fixed calendars or guesswork. When water is applied without knowing the
            48-hour future of the root zone, the field pays a compounding penalty.
          </p>
        </motion.div>

        {/* Problem cards — asymmetric editorial layout */}
        <div className="mt-14 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {problems.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.tag}
                initial={{ opacity: 0, y: 32 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.7, delay: 0.1 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                className="group relative overflow-hidden rounded-2xl border border-white/6 bg-white/4"
              >
                {/* Problem image */}
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src={p.imgKey}
                    alt={p.tag}
                    fill
                    sizes="(max-width: 1024px) 100vw, 33vw"
                    className="object-cover opacity-50 transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#060F0C] via-[#060F0C]/40 to-transparent" />
                  <span className={`absolute left-4 top-4 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${p.bg} ${p.color}`}>
                    {p.tag}
                  </span>
                </div>

                {/* Content */}
                <div className="px-6 pb-6 pt-4">
                  <div className={`text-[44px] font-extrabold leading-none tracking-tighter ${p.color}`}>
                    {p.stat}
                  </div>
                  <div className="mt-1 text-base font-bold text-white/80">{p.label}</div>
                  <p className="mt-3 text-sm leading-[1.7] text-white/40">{p.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom callout */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-12 rounded-2xl border border-emerald-500/15 bg-emerald-500/5 px-6 py-5"
        >
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-white/60">
              <span className="font-bold text-emerald-400">AquaTwin solves all three</span> — by simulating the future of your root zone before releasing a single litre.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-5 py-2.5 text-xs font-bold text-emerald-300 transition-all hover:bg-emerald-500/20"
            >
              See the solution <ArrowRight size={13} />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ================================================================
   03 — THE SHIFT: "Don't just predict. Simulate."
   White section — horizontal simulation sequence as a visual story
   ================================================================ */

export function ShiftSection() {
  const steps = [
    {
      step: "01",
      label: "Ingest",
      value: "Real-time",
      desc: "Live soil probes, satellite NDVI, and weather radar fused into field memory.",
      icon: Activity,
    },
    {
      step: "02",
      label: "Simulate",
      value: "3 Futures",
      desc: "The digital twin projects 48-hour root-zone trajectories across all decision paths.",
      icon: Wand2,
    },
    {
      step: "03",
      label: "Optimize",
      value: "CP-SAT",
      desc: "Constraint programming allocates every litre where it reduces the most crop stress.",
      icon: Scale,
    },
    {
      step: "04",
      label: "Decide",
      value: "1 Action",
      desc: "A single, physics-validated recommendation — with full simulation trace behind it.",
      icon: Sparkles,
      highlight: true,
    },
  ];

  return (
    <section id="shift" className="scroll-mt-16 border-b border-line bg-surface py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mx-auto max-w-2xl text-center"
        >
          <SectionLabel num="03" label="The Core Methodology" />
          <h2 className="mt-5 text-[36px] font-extrabold leading-[1.08] tracking-[-0.035em] text-ink sm:text-[50px]">
            Don&apos;t just predict.{" "}
            <span className="text-brand">Simulate.</span>
          </h2>
          <p className="mt-5 text-base leading-[1.75] text-ink-muted">
            A prediction merely guesses what might happen. A simulation tests every alternative choice
            against the physical water balance of the field before releasing a single drop.
          </p>
        </motion.div>

        {/* Flow sequence */}
        <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.step}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.1 }}
                className={`relative rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 ${
                  s.highlight
                    ? "border-brand/30 bg-brand text-white shadow-[0_8px_24px_rgba(40,116,95,0.3)]"
                    : "border-line bg-surface shadow-card hover:shadow-raised"
                }`}
              >
                {/* Step number */}
                <div className={`text-[11px] font-extrabold uppercase tracking-[0.2em] ${s.highlight ? "text-white/50" : "text-ink-faint"}`}>
                  {s.step}
                </div>

                {/* Arrow connector (hidden on last) */}
                {i < steps.length - 1 && (
                  <ChevronRight size={14} className="absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 text-ink-faint lg:block" />
                )}

                {/* Icon */}
                <div className={`mt-4 flex h-10 w-10 items-center justify-center rounded-xl ${s.highlight ? "bg-white/15" : "bg-brand-light"}`}>
                  <Icon size={18} className={s.highlight ? "text-white" : "text-brand"} />
                </div>

                <h3 className={`mt-4 text-lg font-extrabold ${s.highlight ? "text-white" : "text-ink"}`}>
                  {s.label}
                </h3>
                <div className={`mt-0.5 text-xs font-bold ${s.highlight ? "text-white/60" : "text-brand"}`}>
                  {s.value}
                </div>
                <p className={`mt-3 text-[13px] leading-[1.65] ${s.highlight ? "text-white/70" : "text-ink-muted"}`}>
                  {s.desc}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Core claim */}
        <motion.blockquote
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="mx-auto mt-16 max-w-2xl text-center"
        >
          <p className="text-xl font-bold leading-[1.5] tracking-tight text-ink sm:text-2xl">
            &ldquo;We don&apos;t just predict when to irrigate —{" "}
            <span className="text-brand">we simulate the future of the field</span>{" "}
            before using a single drop.&rdquo;
          </p>
        </motion.blockquote>
      </div>
    </section>
  );
}

/* ================================================================
   04 — FIELD DIGITAL TWIN
   Off-white section — real interactive GIS map + zone inspector
   ================================================================ */

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
    <section id="twin" className="scroll-mt-16 border-b border-line bg-page py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
          >
            <SectionLabel num="04" label="Spatial Intelligence" />
            <h2 className="mt-4 text-[36px] font-extrabold leading-[1.08] tracking-[-0.03em] text-ink sm:text-[48px]">
              Field Digital Twin
            </h2>
            <p className="mt-4 max-w-xl text-base leading-[1.75] text-ink-muted">
              A living map of 4 management zones across North Plot (10 ha). Each zone tracks root-zone
              retention, soil texture, and sensor telemetry independently.
            </p>
          </motion.div>

          {/* Layer switcher */}
          <div className="flex flex-wrap gap-2">
            {layers.map((l) => (
              <button
                key={l.key}
                onClick={() => setLayer(l.key)}
                className={`rounded-full px-4 py-2 text-xs font-bold transition-all duration-200 ${
                  layer === l.key
                    ? "bg-brand text-white shadow-raised"
                    : "border border-line bg-surface text-ink-soft hover:border-brand/30 hover:text-brand"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* GIS Grid */}
        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
          {/* Interactive Map */}
          <div className="overflow-hidden rounded-2xl border border-line shadow-card">
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

          {/* Zone Inspector */}
          <div className="flex flex-col gap-4">
            <div className="flex-1 overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
              <div className="border-b border-line px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Selected Zone</div>
                    <h3 className="text-xl font-extrabold text-ink">{currentZone.name}</h3>
                    <div className="text-xs text-ink-muted">{currentZone.areaHa} ha · {currentZone.soilType}</div>
                  </div>
                  <span className="rounded-full bg-brand-light px-3 py-1 text-xs font-extrabold text-brand-dark border border-brand/20">
                    P{currentZone.priority}
                  </span>
                </div>
              </div>

              <div className="space-y-3 p-5">
                {[
                  { label: "Root-Zone Moisture", value: `${currentZone.moisturePct}%`, color: "text-brand-dark" },
                  { label: "Predicted Crop Stress", value: `${currentZone.stressRiskPct}%`, color: "text-warning" },
                  { label: "Water Requirement", value: fmtL(currentZone.waterRequirementL), color: "text-ink" },
                ].map((m) => (
                  <div key={m.label} className="flex items-center justify-between rounded-xl border border-line bg-subtle px-4 py-3">
                    <span className="text-xs font-medium text-ink-muted">{m.label}</span>
                    <span className={`text-lg font-bold ${m.color}`}>{m.value}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-line px-5 pb-5">
                <p className="mt-4 rounded-xl border border-line bg-subtle/60 p-3.5 text-xs leading-[1.7] text-ink-soft">
                  {currentZone.id === "zone-b"
                    ? "Zone B holds the highest deficit. Targeted for primary allocation under scarce water quotas."
                    : "Zone is currently in a safe moisture bracket. Irrigation can be deferred pending 48h rainfall."}
                </p>
              </div>
            </div>

            <Link
              href="/twin"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-bold text-white shadow-raised transition-all duration-200 hover:bg-brand-dark hover:-translate-y-0.5"
            >
              Open Full GIS Workspace <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   05 — WHAT-IF SIMULATION
   White section — 3 futures as selectable cards + chart
   ================================================================ */

export function WhatIfSection() {
  const [selectedScenario, setSelectedScenario] = useState<"now" | "wait6" | "wait24">("wait6");

  const scenarios = [
    {
      key: "now" as const,
      label: "Irrigate Now",
      water: 720,
      stress: 2.1,
      wastage: "HIGH risk — rain will overflow nutrients",
      recommended: false,
      accent: "border-danger/30 bg-danger/5",
      stressColor: "text-success",
    },
    {
      key: "wait6" as const,
      label: "Wait 6 Hours",
      water: 310,
      stress: 5.2,
      wastage: "Let 12.3mm rain infiltrate first",
      recommended: true,
      accent: "border-brand/30 bg-brand-light",
      stressColor: "text-success",
    },
    {
      key: "wait24" as const,
      label: "Wait 24 Hours",
      water: 0,
      stress: 39.4,
      wastage: "39% stress if rain misses",
      recommended: false,
      accent: "border-line bg-surface",
      stressColor: "text-danger",
    },
  ];

  const chartData = useMemo(() => {
    return Array.from({ length: 9 }).map((_, i) => {
      const hour = i * 6;
      let moisture = 24.9;
      if (selectedScenario === "now") {
        moisture = hour < 6 ? 24.9 + hour * 1.5 : Math.max(22, 33 - (hour - 6) * 0.25);
      } else if (selectedScenario === "wait6") {
        moisture = hour < 6 ? 24.9 - hour * 0.15 : hour < 18 ? 24.0 + (hour - 6) * 0.8 : 31 - (hour - 18) * 0.2;
      } else {
        moisture = Math.max(14.2, 24.9 - hour * 0.22);
      }
      return { time: `${hour}h`, moisture: Math.round(moisture * 10) / 10, wiltingPoint: 14.0, refillPoint: 22.0 };
    });
  }, [selectedScenario]);

  return (
    <section id="what-if" className="scroll-mt-16 border-b border-line bg-surface py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="max-w-2xl"
        >
          <SectionLabel num="05" label="The Signature Innovation" />
          <h2 className="mt-5 text-[36px] font-extrabold leading-[1.08] tracking-[-0.03em] text-ink sm:text-[48px]">
            Test every future.
            <br />
            <span className="text-brand">Pick the best one.</span>
          </h2>
          <p className="mt-5 text-base leading-[1.75] text-ink-muted">
            AquaTwin runs multiple irrigation scenarios simultaneously and ranks them by water efficiency
            and crop safety — not just one guess.
          </p>
        </motion.div>

        {/* Baseline bar */}
        <div className="mt-10 flex flex-wrap items-center gap-6 rounded-2xl border border-line bg-page px-6 py-4">
          <div className="text-xs font-bold uppercase tracking-wider text-ink-muted">Live Field Baseline</div>
          <div className="flex flex-1 flex-wrap items-center gap-6 text-sm">
            <span className="text-ink-soft">Moisture: <strong className="text-ink">24.9%</strong></span>
            <span className="text-ink-soft">Rain in 7h: <strong className="text-info">70% probability</strong></span>
            <span className="text-ink-soft">Available: <strong className="text-brand-dark">2,000 L</strong></span>
          </div>
        </div>

        {/* Scenario cards */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {scenarios.map((s) => {
            const selected = selectedScenario === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setSelectedScenario(s.key)}
                className={`relative rounded-2xl border p-6 text-left transition-all duration-200 hover:-translate-y-1 ${
                  selected
                    ? `${s.accent} shadow-raised ring-2 ring-brand/20`
                    : "border-line bg-surface/70 hover:shadow-card"
                }`}
              >
                {s.recommended && (
                  <span className="absolute right-4 top-4 rounded-full bg-brand px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                    Recommended
                  </span>
                )}
                <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink-faint">{s.label}</div>
                <div className="mt-4 flex items-baseline gap-1.5">
                  <span className="text-[42px] font-extrabold leading-none tracking-tighter text-ink">{s.water}</span>
                  <span className="text-sm font-semibold text-ink-muted">L required</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-ink-muted">Predicted stress:</span>
                  <span className={`font-bold ${s.stressColor}`}>{s.stress}%</span>
                </div>
                <p className="mt-4 border-t border-line/60 pt-3 text-xs leading-[1.65] text-ink-muted">
                  {s.wastage}
                </p>
              </button>
            );
          })}
        </div>

        {/* 48h trajectory chart */}
        <div className="mt-6 rounded-2xl border border-line bg-surface p-6 shadow-card">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-ink">48-Hour Root-Zone Trajectory</h3>
              <p className="text-xs text-ink-muted">
                Simulated moisture outcome for: <strong className="text-brand">{selectedScenario.toUpperCase()}</strong>
              </p>
            </div>
            <div className="flex items-center gap-5 text-xs">
              <span className="flex items-center gap-1.5 text-ink-soft">
                <span className="h-2 w-2 rounded-full bg-brand" /> Simulated moisture
              </span>
              <span className="flex items-center gap-1.5 text-ink-muted">
                <span className="h-0.5 w-3 bg-danger" /> Wilting point
              </span>
            </div>
          </div>
          <div className="h-64">
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
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: CHART.recommended }}
                  activeDot={{ r: 5.5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   06 — WATER BUDGET
   Off-white bg — interactive slider + allocation visualization
   ================================================================ */

export function BudgetSection() {
  const [budget, setBudget] = useState(2000);

  const allocations = useMemo(() => {
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

  const totalAllocated = allocations.reduce((s, z) => s + z.allocated, 0);
  const coveragePct = Math.round((totalAllocated / 2700) * 100);

  return (
    <section id="budget" className="scroll-mt-16 border-b border-line bg-page py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[420px_1fr] lg:gap-16">
          {/* Left: copy + slider */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
          >
            <SectionLabel num="06" label="Constrained Optimization" />
            <h2 className="mt-5 text-[36px] font-extrabold leading-[1.08] tracking-[-0.03em] text-ink sm:text-[44px]">
              Use the water you
              <br />
              <span className="text-brand">actually have.</span>
            </h2>
            <p className="mt-5 text-base leading-[1.75] text-ink-muted">
              When canal quotas can&apos;t cover total demand, AquaTwin allocates every litre
              where it creates the greatest drop in crop stress.
            </p>

            {/* Interactive slider */}
            <div className="mt-8 rounded-2xl border border-line bg-surface p-6 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">Water Quota</span>
                <span className="text-2xl font-extrabold text-brand-dark">{budget.toLocaleString()} L</span>
              </div>
              <input
                type="range"
                min="500"
                max="3000"
                step="250"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-line accent-brand"
              />
              <div className="mt-2 flex justify-between text-[11px] text-ink-faint">
                <span>500 L (Deficit)</span>
                <span>3,000 L (Surplus)</span>
              </div>
            </div>

            <div className="mt-5">
              <Link
                href="/water-budget"
                className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-bold text-white shadow-raised transition-all duration-200 hover:bg-brand-dark hover:-translate-y-0.5"
              >
                Open Budget Workspace <ArrowRight size={14} />
              </Link>
            </div>
          </motion.div>

          {/* Right: allocation visualization */}
          <motion.div
            variants={riseUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="rounded-2xl border border-line bg-surface p-6 shadow-card"
          >
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <h3 className="text-base font-bold text-ink">Optimized Distribution</h3>
                <p className="text-xs text-ink-muted">2,700 L total field demand</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-extrabold text-brand-dark">{coveragePct}%</div>
                <div className="text-xs text-ink-muted">Demand covered</div>
              </div>
            </div>

            <div className="mt-6 space-y-5">
              {allocations.map((a) => {
                const pct = a.need > 0 ? (a.allocated / a.need) * 100 : 0;
                return (
                  <div key={a.name}>
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="flex items-center gap-2 text-ink">
                        {a.name}
                        <span className="rounded-full bg-subtle px-2 py-0.5 text-[10px] font-bold text-ink-faint">{a.priority}</span>
                      </span>
                      <span className={`font-bold ${a.status === "Deferred" ? "text-ink-faint" : "text-brand-dark"}`}>
                        {a.allocated} / {a.need} L
                        <span className="ml-2 rounded-full bg-line/60 px-2 py-0.5 text-[10px] font-bold text-ink-muted">{a.status}</span>
                      </span>
                    </div>
                    <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-subtle">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-brand to-brand-mid"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="mt-6 border-t border-line pt-4 text-xs leading-[1.7] text-ink-muted">
              Priority targets Zone B and D first — Zone A is safely deferred because forecast rainfall satisfies its moisture curve without pump energy.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   07 — FIELD WATER FINGERPRINT
   White section — self-calibrating physics profile
   ================================================================ */

export function FingerprintSection() {
  const profile = [
    { metric: "Moisture Retention", score: 88, desc: "Clay loam retains 88% of infiltrated water across 24 hours." },
    { metric: "Drying Rate", score: 62, desc: "1.8% moisture drop per day under 32°C average ambient heat." },
    { metric: "Irrigation Response", score: 94, desc: "+1.95% root moisture gain per 100 L pumped." },
    { metric: "Rain Infiltration", score: 82, desc: "82% effective infiltration from heavy tropical downpours." },
    { metric: "Stress Recovery", score: 76, desc: "Returns to comfort zone within 3.5 hours of watering." },
  ];

  return (
    <section className="border-b border-line bg-surface py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[400px_1fr] lg:gap-16">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
          >
            <SectionLabel num="07" label="Self-Calibrating Physics" />
            <h2 className="mt-5 text-[36px] font-extrabold leading-[1.08] tracking-[-0.03em] text-ink sm:text-[44px]">
              Every field behaves
              <br />
              <span className="text-brand">differently.</span>
            </h2>
            <p className="mt-5 text-base leading-[1.75] text-ink-muted">
              Soil texture, slope, drainage, and root depth vary plot to plot.
              AquaTwin learns your field&apos;s specific moisture response after every
              irrigation event — narrowing the error gap over time.
            </p>
            <Link
              href="/analytics"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-bold text-white shadow-raised transition-all duration-200 hover:bg-brand-dark hover:-translate-y-0.5"
            >
              View Field Fingerprint <ArrowRight size={14} />
            </Link>
          </motion.div>

          {/* Profile visualization */}
          <motion.div
            variants={riseUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="rounded-2xl border border-line bg-page p-6 shadow-card"
          >
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <h3 className="text-sm font-bold text-ink">Field Water Fingerprint</h3>
                <p className="text-xs text-ink-muted">Kisan Bhimavaram Farm · Self-calibrating model</p>
              </div>
              <span className="rounded-full border border-brand/20 bg-brand-light px-3 py-1 text-[10px] font-bold text-brand-dark">
                87% confidence
              </span>
            </div>

            <div className="mt-6 space-y-4">
              {profile.map((p, i) => (
                <div key={p.metric}>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="font-semibold text-ink">{p.metric}</span>
                    <span className="font-extrabold text-brand-dark">{p.score}<span className="text-ink-faint font-normal">/100</span></span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-line/50">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-brand to-brand-mid"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${p.score}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.9, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] leading-[1.6] text-ink-muted">{p.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   08 — FINAL CTA
   Full-bleed dark section with atmospheric agricultural image
   ================================================================ */

export function FinalCtaSection() {
  return (
    <section className="relative overflow-hidden bg-[#060F0C] py-32 lg:py-40">
      {/* Full-bleed background image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/aquatwin/cta-field.webp"
          alt="Golden sunrise over South Indian rice farmland"
          fill
          sizes="100vw"
          className="object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#060F0C]/95 via-[#060F0C]/80 to-[#060F0C]/60" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#060F0C]/80" />
      </div>

      {/* Decorative radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_30%_50%,rgba(40,116,95,0.15),transparent)]" />

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <motion.div
          variants={staggerContainer(0.08, 0.04)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="max-w-2xl"
        >
          <motion.div variants={fadeUp} className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-400">
            08 — Precision Agriculture
          </motion.div>

          <motion.h2
            variants={fadeUp}
            className="mt-6 text-[44px] font-extrabold leading-[1.06] tracking-[-0.04em] text-white sm:text-[62px]"
          >
            Make every litre
            <br />
            <span className="bg-gradient-to-r from-emerald-300 to-[#5ECFB0] bg-clip-text text-transparent">
              count.
            </span>
          </motion.h2>

          <motion.p
            variants={fadeUp}
            className="mt-6 text-base leading-[1.75] text-white/60 sm:text-lg"
          >
            Move from scheduled irrigation to decisions built around the future state of your field.
            No setup required — explore the live interactive demo now.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-10 flex flex-wrap items-center gap-4">
            <AquaLink href="/dashboard" variant="primary" size="lg">
              Explore AquaTwin <ArrowRight size={15} />
            </AquaLink>
            <AquaLink href="/login" variant="secondary" size="lg">
              View Demo
            </AquaLink>
          </motion.div>

          <motion.div variants={fadeUp} className="mt-8 text-xs text-white/30">
            Simulated sensor streams · Offline prototype · No sign-up required
          </motion.div>
        </motion.div>

        {/* Stats row */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="mt-20 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/8 bg-white/5 lg:grid-cols-4"
        >
          {[
            { value: "453 L", label: "Saved per event" },
            { value: "87%", label: "Model confidence" },
            { value: "4 Zones", label: "Per field" },
            { value: "48h", label: "Simulation horizon" },
          ].map((s) => (
            <div key={s.label} className="bg-white/3 px-6 py-5 backdrop-blur-sm">
              <div className="text-2xl font-extrabold text-emerald-300">{s.value}</div>
              <div className="mt-1 text-xs font-medium text-white/40">{s.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ================================================================
   FOOTER
   ================================================================ */

export function LandingFooter() {
  return (
    <footer className="border-t border-line bg-surface py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 sm:flex-row">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand p-1.5 text-white shadow-sm">
            <Image src="/logo-white.png" alt="AquaTwin" width={24} height={24} className="object-contain" />
          </div>
          <div>
            <div className="text-sm font-extrabold tracking-tight text-ink">AquaTwin</div>
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-faint">AI Irrigation Intelligence</div>
          </div>
        </div>

        <p className="max-w-md text-center text-xs text-ink-muted">
          &ldquo;We don&apos;t just predict when to irrigate — we simulate the future of the field before using a single drop.&rdquo;
        </p>

        <div className="text-xs font-semibold text-ink-faint">Vishnu Hackathon Edition</div>
      </div>
    </footer>
  );
}
