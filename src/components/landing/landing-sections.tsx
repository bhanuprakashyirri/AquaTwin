"use client";

/**
 * Landing sections — the storytelling spine of the site.
 *
 * Every data-driven visual here is a REAL component (MapLibre map,
 * Recharts, animated bars). The SVG scenes are used only for
 * editorial storytelling (problem imagery, CTA backdrop).
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { AnimatePresence, animate, motion, useInView } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  CloudRain,
  Droplets,
  FlaskConical,
  Layers,
  Map as MapIcon,
  Gauge,
  ScanSearch,
  Sprout,
  Target,
  Wand2,
} from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { CropDetailScene, GoldenHourScene, HealthyScene, StressScene, WaterloggedScene, WeatherScene } from "@/components/imagery/field-scenes";
import { LinkButton } from "@/components/ui/button";
import { DemoPill } from "@/components/ui/panel";
import { AXIS_STYLE, CHART, ChartTooltip } from "@/components/charts/common";
import { EASE, fadeUp, riseUp, staggerContainer } from "@/lib/motion";
import { fmtL } from "@/lib/format";
import { ZONES } from "@/lib/demo-data";

const FarmMap = dynamic(() => import("@/components/maps/farm-map").then((m) => ({ default: m.FarmMap })), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-subtle text-tiny text-ink-muted">
      Loading field map…
    </div>
  ),
});

/* ------------------------------------------------------------------ */
/* Count-up number for staged reveals                                  */
/* ------------------------------------------------------------------ */

function CountUp({ to, suffix = "", decimals = 0, play }: { to: number; suffix?: string; decimals?: number; play: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!play || !inView) return;
    const controls = animate(0, to, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setVal(v),
    });
    return () => controls.stop();
  }, [play, inView, to]);

  return (
    <span ref={ref}>
      {val.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* 1. THE PROBLEM                                                    */
/* ------------------------------------------------------------------ */

const PROBLEMS = [
  {
    scene: WaterloggedScene,
    k: "Over-irrigation",
    v: "Water the crop never uses",
    stat: "up to 35% wasted",
  },
  {
    scene: StressScene,
    k: "Under-irrigation",
    v: "Zones drift past the refill point",
    stat: "yield loss compounds",
  },
  {
    scene: WeatherScene,
    k: "Uncertain rainfall",
    v: "Watering hours before rain arrives",
    stat: "70% rain ignored",
  },
  {
    scene: HealthyScene,
    k: "The resolution",
    v: "Optimized irrigation, zone by zone",
    stat: "453 L saved / event",
    resolution: true,
  },
];

export function ProblemSection() {
  return (
    <section className="border-y border-line bg-surface">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="max-w-2xl"
        >
          <div className="text-micro font-semibold uppercase tracking-[0.18em] text-brand">
            The problem
          </div>
          <h2 className="mt-3 text-[32px] font-semibold leading-tight tracking-tight text-ink md:text-[40px]">
            Every irrigation decision has a cost.
          </h2>
          <p className="mt-4 leading-relaxed text-ink-muted">
            Most irrigation still runs on fixed schedules, habit, or guesswork — without weighing
            soil moisture, crop stage, weather forecasts, satellite-derived signals, past irrigation,
            and how little water is actually available.
          </p>
        </motion.div>

        <motion.div
          variants={staggerContainer(0.09)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {PROBLEMS.map((p) => (
            <motion.figure
              key={p.k}
              variants={fadeUp}
              className={`group relative overflow-hidden rounded-xl2 border bg-surface shadow-card transition-[box-shadow,transform] duration-300 ease-out hover:-translate-y-1 hover:shadow-raised ${
                p.resolution ? "border-[#BFDCCB]" : "border-line"
              }`}
            >
              <div className="relative aspect-[5/4] overflow-hidden">
                <p.scene className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.04]" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#17352D]/45 via-transparent to-transparent" />
                <figcaption className="absolute inset-x-0 bottom-0 p-4">
                  <div className="text-sm font-semibold text-white">{p.k}</div>
                  <div className="mt-0.5 text-tiny text-white/80">{p.v}</div>
                </figcaption>
              </div>
              <div className="flex items-center justify-between border-t border-line px-4 py-3">
                <span className="text-micro text-ink-faint">Impact</span>
                <span className={`text-tiny font-semibold ${p.resolution ? "text-brand-dark" : "text-warning"}`}>
                  {p.stat}
                </span>
              </div>
            </motion.figure>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 2. THE DIFFERENCE — "Don't just predict. Simulate."               */
/* ------------------------------------------------------------------ */

const WORKFLOW = [
  { icon: ScanSearch, step: "Current field state", desc: "Live moisture, stress and water balance from the digital twin." },
  { icon: FlaskConical, step: "Simulate futures", desc: "Project soil moisture 48h ahead for every irrigation choice." },
  { icon: Layers, step: "Compare outcomes", desc: "Water use, stress risk and waste side by side." },
  { icon: Gauge, step: "Optimize water", desc: "Allocate every litre where it reduces stress the most." },
  { icon: Target, step: "Recommend action", desc: "One clear decision — with the full reasoning attached." },
];

export function DifferenceSection() {
  const lineRef = useRef<HTMLDivElement>(null);
  const inView = useInView(lineRef, { once: true, margin: "-100px" });

  return (
    <section id="how" className="scroll-mt-16">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="max-w-2xl"
        >
          <div className="text-micro font-semibold uppercase tracking-[0.18em] text-brand">
            The difference
          </div>
          <h2 className="mt-3 text-[32px] font-semibold leading-tight tracking-tight text-ink md:text-[40px]">
            Don&apos;t just predict. <span className="text-brand">Simulate.</span>
          </h2>
          <p className="mt-4 leading-relaxed text-ink-muted">
            A prediction tells you what might happen. A simulation lets you test every decision
            against the field&apos;s own physics — before a single valve opens.
          </p>
        </motion.div>

        {/* animated connector line */}
        <div ref={lineRef} className="relative mt-14 hidden lg:block">
          <div className="absolute left-0 right-0 top-[26px] h-px bg-line" />
          <motion.div
            className="absolute left-0 top-[26px] h-px bg-brand"
            initial={{ width: "0%" }}
            animate={inView ? { width: "100%" } : {}}
            transition={{ duration: 1.6, ease: EASE, delay: 0.3 }}
          />
          <div className="grid grid-cols-5 gap-4">
            {WORKFLOW.map((w, i) => (
              <motion.div
                key={w.step}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: 0.15 + i * 0.14 }}
                className="group relative"
              >
                <div className="relative z-10 flex h-[52px] w-[52px] items-center justify-center rounded-full border border-line bg-surface shadow-card transition-[border-color,box-shadow,transform] duration-300 ease-out group-hover:-translate-y-1 group-hover:border-brand group-hover:shadow-raised">
                  <w.icon size={20} className="text-brand" />
                </div>
                <div className="mt-4 text-micro font-semibold uppercase tracking-[0.14em] text-brand">
                  Step {String(i + 1).padStart(2, "0")}
                </div>
                <div className="mt-1 text-[15px] font-semibold text-ink">{w.step}</div>
                <p className="mt-1.5 text-tiny leading-relaxed text-ink-muted">{w.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* mobile / tablet: vertical timeline */}
        <div className="mt-10 space-y-0 lg:hidden">
          {WORKFLOW.map((w, i) => (
            <motion.div
              key={w.step}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.08 }}
              className="relative flex gap-4 pb-8 last:pb-0"
            >
              {i < WORKFLOW.length - 1 && (
                <span className="absolute left-[25px] top-[52px] h-[calc(100%-52px)] w-px bg-line" />
              )}
              <div className="relative z-10 flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border border-line bg-surface shadow-card">
                <w.icon size={20} className="text-brand" />
              </div>
              <div>
                <div className="text-micro font-semibold uppercase tracking-[0.14em] text-brand">
                  Step {String(i + 1).padStart(2, "0")}
                </div>
                <div className="mt-0.5 text-[15px] font-semibold text-ink">{w.step}</div>
                <p className="mt-1 text-tiny leading-relaxed text-ink-muted">{w.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 3. FIELD DIGITAL TWIN — real MapLibre map                         */
/* ------------------------------------------------------------------ */

const TWIN_LAYERS = [
  { key: "moisture", label: "Soil Moisture" },
  { key: "stress", label: "Crop Stress" },
  { key: "ndvi", label: "Vegetation Health" },
  { key: "priority", label: "Irrigation Priority" },
];

export function TwinSection() {
  const [layer, setLayer] = useState("moisture");
  const [selected, setSelected] = useState<string | null>("zone-b");

  return (
    <section id="twin" className="scroll-mt-16 border-y border-line bg-surface">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_1.25fr]">
          <motion.div
            variants={staggerContainer(0.08)}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
          >
            <motion.div variants={fadeUp} className="text-micro font-semibold uppercase tracking-[0.18em] text-brand">
              Field digital twin
            </motion.div>
            <motion.h2
              variants={fadeUp}
              className="mt-3 text-[32px] font-semibold leading-tight tracking-tight text-ink md:text-[40px]"
            >
              A living copy of your field, in water balance.
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 leading-relaxed text-ink-muted">
              Field boundaries, four irrigation zones, soil moisture, crop stress, vegetation health
              and sensor positions — fused into one virtual field that updates as conditions change.
              Every simulation and every budget decision runs against this twin.
            </motion.p>
            <motion.ul variants={staggerContainer(0.07)} className="mt-7 space-y-3">
              {[
                { icon: Droplets, text: "Root-zone moisture tracked at 30 cm depth, per zone" },
                { icon: CloudRain, text: "Effective rainfall and evapotranspiration in the water balance" },
                { icon: Sprout, text: "Satellite-derived vegetation health, revisited every 5 days" },
              ].map((f) => (
                <motion.li key={f.text} variants={fadeUp} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-light">
                    <f.icon size={13} className="text-brand" />
                  </span>
                  <span className="text-sm leading-relaxed text-ink-soft">{f.text}</span>
                </motion.li>
              ))}
            </motion.ul>
            <motion.div variants={fadeUp} className="mt-8">
              <LinkButton href="/twin" variant="primary" className="group">
                Open the Field Twin <ArrowRight size={15} className="icon-nudge" />
              </LinkButton>
            </motion.div>
          </motion.div>

          {/* Real map — lazy-loaded MapLibre with real GeoJSON zones */}
          <motion.div
            variants={riseUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            className="relative"
          >
            <div className="overflow-hidden rounded-xl2 border border-line shadow-raised">
              <div className="h-[420px]">
                <FarmMap
                  zones={ZONES}
                  layer={layer}
                  onLayerChange={setLayer}
                  selectedZoneId={selected}
                  onZoneSelect={(id) => setSelected(id === selected ? null : id)}
                  showLegend
                />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {TWIN_LAYERS.map((l) => (
                <button
                  key={l.key}
                  onClick={() => setLayer(l.key)}
                  aria-pressed={layer === l.key}
                  className={`rounded-md border px-2.5 py-1 text-tiny font-medium transition-[background-color,border-color,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
                    layer === l.key
                      ? "border-brand bg-brand-light text-brand-dark"
                      : "border-line bg-surface text-ink-muted hover:bg-subtle hover:text-ink"
                  }`}
                >
                  {l.label}
                </button>
              ))}
              <span className="ml-auto"><DemoPill /></span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 4. WHAT-IF — "What happens if you wait?"                          */
/* ------------------------------------------------------------------ */

const SCENARIOS = [
  { key: "now", label: "Irrigate now", water: 720, stress: 2, risk: "High waste risk", tone: "neutral" as const },
  { key: "wait6", label: "Wait 6 hours", water: 310, stress: 5, risk: "Low waste risk", tone: "recommended" as const },
  { key: "wait24", label: "Wait 24 hours", water: 0, stress: 39, risk: "Higher stress risk", tone: "danger" as const },
];

export function WhatIfSection() {
  const [stage, setStage] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-120px" });

  // Staged reveal: cards → water usage → stress risk → recommended highlight
  useEffect(() => {
    if (!inView || stage > 0) return;
    const timers = [
      window.setTimeout(() => setStage(1), 350),
      window.setTimeout(() => setStage(2), 900),
      window.setTimeout(() => setStage(3), 1500),
    ];
    return () => timers.forEach(clearTimeout);
  }, [inView, stage]);

  return (
    <section ref={sectionRef} id="what-if" className="scroll-mt-16 mx-auto max-w-7xl px-6 py-20">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        className="max-w-2xl"
      >
        <div className="text-micro font-semibold uppercase tracking-[0.18em] text-brand">
          What-if simulation
        </div>
        <h2 className="mt-3 text-[32px] font-semibold leading-tight tracking-tight text-ink md:text-[40px]">
          What happens if you wait?
        </h2>
        <p className="mt-4 leading-relaxed text-ink-muted">
          The twin projects soil moisture 48 hours ahead under each choice — rainfall forecast, crop
          demand and soil retention included — so the field&apos;s future is tested, not guessed.
        </p>
      </motion.div>

      {/* Scenario cards — staged reveal */}
      <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
        {SCENARIOS.map((s, i) => {
          const recommended = s.tone === "recommended";
          const danger = s.tone === "danger";
          return (
            <motion.div
              key={s.key}
              initial={{ opacity: 0, y: 24 }}
              animate={stage >= 1 ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, ease: EASE, delay: i * 0.12 }}
              className={`relative overflow-hidden rounded-xl2 border p-6 transition-[box-shadow] duration-300 ${
                recommended
                  ? "border-brand bg-brand-light shadow-raised"
                  : danger
                    ? "border-[#E8C4C4] bg-surface"
                    : "border-line bg-surface shadow-card"
              }`}
            >
              {/* recommended highlight ring — stage 4 */}
              <AnimatePresence>
                {recommended && stage >= 3 && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                    className="absolute right-4 top-4 rounded-md bg-brand px-2 py-1 text-micro font-semibold text-white shadow-card"
                  >
                    Recommended
                  </motion.span>
                )}
              </AnimatePresence>

              <div className="text-micro font-semibold uppercase tracking-[0.14em] text-ink-faint">
                {s.label}
              </div>

              {/* water usage — stage 2 count-up */}
              <div className="mt-3 text-[34px] font-semibold leading-none tracking-tight text-ink">
                {stage >= 2 ? <CountUp to={s.water} play={inView} /> : "—"}
                <span className="ml-1.5 text-base font-medium text-ink-faint">L</span>
              </div>
              <div className="mt-1 text-micro text-ink-faint">water required</div>

              {/* stress risk — stage 3 bar fill */}
              <div className="mt-5">
                <div className="flex items-center justify-between text-tiny">
                  <span className="text-ink-muted">Predicted stress</span>
                  <span className="font-semibold text-ink">{stage >= 3 ? `${s.stress}%` : "—"}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#E3ECE6]">
                  <motion.div
                    className={`h-full rounded-full ${recommended ? "bg-brand" : danger ? "bg-danger" : "bg-[#7A8B3A]"}`}
                    initial={{ width: 0 }}
                    animate={stage >= 3 ? { width: `${s.stress}%` } : {}}
                    transition={{ duration: 0.7, ease: EASE, delay: 0.15 }}
                  />
                </div>
              </div>

              <div
                className={`mt-5 rounded-lg px-3 py-2 text-tiny font-medium ${
                  recommended
                    ? "bg-white/70 text-brand-dark"
                    : danger
                      ? "bg-[#FBEFEF] text-[#A03838]"
                      : "bg-subtle text-ink-soft"
                }`}
              >
                {s.risk}
              </div>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-40px" }}
        className="mt-8 flex flex-wrap items-center gap-3"
      >
        <LinkButton href="/simulator" variant="primary" className="group">
          Run the full simulation <ArrowRight size={15} className="icon-nudge" />
        </LinkButton>
        <span className="text-micro text-ink-faint">48-hour projection · weather uncertainty included</span>
      </motion.div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 5. WATER BUDGET — "Use the water you actually have."              */
/* ------------------------------------------------------------------ */

const ALLOCATION = [
  { zone: "Zone A", need: 400, allocated: 0, note: "Deferred — lowest benefit per litre" },
  { zone: "Zone B", need: 900, allocated: 900, note: "Highest stress reduction per litre" },
  { zone: "Zone C", need: 600, allocated: 400, note: "Partial — rain covers the rest" },
  { zone: "Zone D", need: 800, allocated: 700, note: "Near-full — clay loam holds water" },
];

export function BudgetSection() {
  const barsRef = useRef<HTMLDivElement>(null);
  const inView = useInView(barsRef, { once: true, margin: "-80px" });
  const maxNeed = Math.max(...ALLOCATION.map((a) => a.need));

  return (
    <section id="budget" className="scroll-mt-16 border-y border-line bg-surface">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_1.2fr]">
          <motion.div
            variants={staggerContainer(0.08)}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
          >
            <motion.div variants={fadeUp} className="text-micro font-semibold uppercase tracking-[0.18em] text-brand">
              Water budget optimizer
            </motion.div>
            <motion.h2
              variants={fadeUp}
              className="mt-3 text-[32px] font-semibold leading-tight tracking-tight text-ink md:text-[40px]"
            >
              Use the water you <span className="text-brand">actually have.</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 leading-relaxed text-ink-muted">
              When the tank and canal quota can&apos;t cover every zone, the optimizer allocates each
              litre where it reduces predicted crop stress the most — with an explicit, auditable
              rationale for every decision.
            </motion.p>

            <motion.div variants={staggerContainer(0.07)} className="mt-8 grid grid-cols-3 gap-3">
              {[
                { label: "Available water", value: "2,000 L", tone: "text-brand-dark" },
                { label: "Predicted demand", value: "2,700 L", tone: "text-ink" },
                { label: "Shortfall", value: "700 L", tone: "text-warning" },
              ].map((s) => (
                <motion.div
                  key={s.label}
                  variants={fadeUp}
                  className="rounded-xl2 border border-line bg-page p-4"
                >
                  <div className="text-micro text-ink-muted">{s.label}</div>
                  <div className={`mt-1 text-xl font-semibold tracking-tight ${s.tone}`}>{s.value}</div>
                </motion.div>
              ))}
            </motion.div>

            <motion.p variants={fadeUp} className="mt-6 rounded-xl2 border border-line bg-subtle p-4 text-tiny leading-relaxed text-ink-muted">
              Water is prioritized according to predicted crop-stress reduction — not spread evenly.
              Zone A waits for the forecast rain; Zone B is irrigated in full.
            </motion.p>
          </motion.div>

          {/* Animated allocation bars */}
          <motion.div
            ref={barsRef}
            variants={riseUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            className="rounded-xl2 border border-line bg-page p-6 shadow-card"
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="text-sm font-semibold text-ink">Allocation of 2,000 L</div>
              <DemoPill />
            </div>
            <div className="space-y-5">
              {ALLOCATION.map((a, i) => (
                <div key={a.zone}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-ink">{a.zone}</span>
                      <span className="rounded border border-line bg-surface px-1.5 py-0.5 text-micro font-medium text-ink-muted">
                        needs {fmtL(a.need)}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-brand-dark">
                      {inView ? <CountUp to={a.allocated} play={inView} /> : 0} L
                    </span>
                  </div>
                  <div className="relative mt-2 h-3.5 overflow-hidden rounded-md bg-[#E3ECE6]">
                    {/* requirement marker */}
                    <div
                      className="absolute top-0 h-full w-0.5 bg-ink-soft/40"
                      style={{ left: `${(a.need / maxNeed) * 100}%` }}
                    />
                    <motion.div
                      className={`h-full rounded-md ${a.allocated === 0 ? "bg-[#C9D6CE]" : "bg-brand"}`}
                      initial={{ width: 0 }}
                      animate={inView ? { width: `${(a.allocated / maxNeed) * 100}%` } : {}}
                      transition={{ duration: 0.9, ease: EASE, delay: 0.2 + i * 0.15 }}
                    />
                  </div>
                  <div className="mt-1.5 text-micro text-ink-muted">{a.note}</div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-4 border-t border-line pt-4 text-micro text-ink-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-brand" /> Allocated
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-[#C9D6CE]" /> Deferred
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-0.5 bg-ink-soft/50" /> Required
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 6. WHY IT LEARNS — Field Water Fingerprint                        */
/* ------------------------------------------------------------------ */

const FINGERPRINT_DATA = [
  { label: "Aug 30", observed: 8.2, predicted: 7.6 },
  { label: "Sep 2", observed: 9.1, predicted: 8.4 },
  { label: "Sep 5", observed: 7.4, predicted: 8.1 },
  { label: "Sep 8", observed: 10.3, predicted: 9.2 },
  { label: "Sep 11", observed: 9.8, predicted: 9.6 },
  { label: "Sep 14", observed: 11.2, predicted: 10.1 },
  { label: "Sep 17", observed: 10.6, predicted: 10.8 },
  { label: "Sep 20", observed: 12.1, predicted: 11.4 },
  { label: "Sep 23", observed: 11.8, predicted: 11.9 },
  { label: "Sep 26", observed: 12.6, predicted: 12.2 },
];

export function FingerprintSection() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.15fr_1fr]">
        <motion.div
          variants={staggerContainer(0.08)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
        >
          <motion.div variants={fadeUp} className="text-micro font-semibold uppercase tracking-[0.18em] text-brand">
            Why it learns
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className="mt-3 text-[32px] font-semibold leading-tight tracking-tight text-ink md:text-[40px]"
          >
            The Field Water Fingerprint.
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 leading-relaxed text-ink-muted">
            Every field responds differently to irrigation, rainfall, and drying. AquaTwin learns
            this particular field&apos;s response — how much moisture each litre adds, how fast it
            dries, how it reacts to an effective rain day — and tightens its simulations with every
            event.
          </motion.p>
          <motion.ul variants={staggerContainer(0.07)} className="mt-7 space-y-3">
            {[
              { k: "Observed response", v: "What the sensors actually measured after each event" },
              { k: "Predicted response", v: "What the twin expected — the gap drives learning" },
              { k: "Compounding accuracy", v: "Each irrigation sharpens the next simulation" },
            ].map((f) => (
              <motion.li key={f.k} variants={fadeUp} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-light">
                  <Wand2 size={13} className="text-brand" />
                </span>
                <div>
                  <span className="text-sm font-semibold text-ink">{f.k}</span>
                  <span className="text-sm text-ink-muted"> — {f.v}</span>
                </div>
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>

        {/* Real chart — observed vs predicted response */}
        <motion.div
          variants={riseUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="rounded-xl2 border border-line bg-surface p-5 shadow-card"
        >
          <div className="mb-1 text-sm font-semibold text-ink">Moisture response per event</div>
          <div className="mb-3 text-micro text-ink-faint">Observed vs predicted · last 10 irrigations · demo</div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={FINGERPRINT_DATA} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="label" {...AXIS_STYLE} interval={2} />
                <YAxis {...AXIS_STYLE} tickFormatter={(v) => `+${v}%`} />
                <ChartTooltip formatter={(v) => `+${Number(v).toFixed(1)}%`} />
                <Bar dataKey="predicted" name="Predicted response" fill={CHART.alternative} radius={[3, 3, 0, 0]} maxBarSize={18} />
                <Line dataKey="observed" name="Observed response" stroke={CHART.recommended} strokeWidth={2.5} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex items-center gap-4 border-t border-line pt-3 text-micro text-ink-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-brand" /> Observed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-[#C9D6CE]" /> Predicted
            </span>
            <span className="ml-auto font-medium text-brand-dark">Gap narrowing — model converging</span>
          </div>
        </motion.div>
      </div>

      {/* editorial crop detail band */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-40px" }}
        className="mt-16 overflow-hidden rounded-xl2 border border-line shadow-card"
      >
        <CropDetailScene className="aspect-[8/3] w-full" />
      </motion.div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 7. FINAL CTA — "Make every litre count."                          */
/* ------------------------------------------------------------------ */

export function FinalCtaSection() {
  return (
    <section className="relative overflow-hidden">
      <GoldenHourScene className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#17352D]/70 via-[#17352D]/45 to-[#17352D]/25" />
      <div className="relative mx-auto max-w-7xl px-6 py-28">
        <motion.div
          variants={staggerContainer(0.09)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="max-w-2xl"
        >
          <motion.div variants={fadeUp} className="text-micro font-semibold uppercase tracking-[0.18em] text-white/70">
            Ready when you are
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className="mt-3 text-[36px] font-semibold leading-tight tracking-tight text-white md:text-[48px]"
          >
            Make every litre count.
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 max-w-xl text-base leading-relaxed text-white/85">
            The demo farm&apos;s current recommendation saves 453 L per event — and the optimizer
            shows where a 2,000 L budget does the most good. Explore the full workspace, no account
            required.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center gap-3">
            <LinkButton href="/dashboard" variant="primary" size="lg" className="group">
              Explore AquaTwin <ArrowRight size={15} className="icon-nudge" />
            </LinkButton>
            <LinkButton
              href="/login"
              size="lg"
              className="group border-white/40 bg-white/10 text-white backdrop-blur transition-[background-color,border-color,transform] duration-200 ease-out hover:border-white/60 hover:bg-white/20 active:scale-[0.98]"
            >
              View Demo
            </LinkButton>
          </motion.div>
          <motion.p variants={fadeUp} className="mt-6 text-micro text-white/60">
            Fully offline prototype · simulated sensor stream · no API keys required
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 8. FOOTER                                                         */
/* ------------------------------------------------------------------ */

export function LandingFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 md:flex-row">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-light">
            <Droplets size={15} className="text-brand" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight text-ink">AquaTwin</div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
              Irrigation Intelligence
            </div>
          </div>
        </div>
        <p className="text-center text-micro text-ink-faint">
          Simulate the future of your field before using a single drop.
        </p>
        <p className="text-micro text-ink-faint">
          AquaTwin · Team Absolute Cinema · Vishnu College Hackathon
        </p>
      </div>
    </footer>
  );
}
