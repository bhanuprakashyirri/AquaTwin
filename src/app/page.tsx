"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CloudRain,
  Droplets,
  FlaskConical,
  Map as MapIcon,
  Sprout,
  Target,
} from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { DemoPill } from "@/components/ui/panel";

const WORKFLOW = [
  { step: "Current state", desc: "Live field conditions" },
  { step: "What-if futures", desc: "Simulate every choice" },
  { step: "Compare outcomes", desc: "48h projections side by side" },
  { step: "Optimize water", desc: "Allocate where it matters" },
  { step: "Recommend", desc: "One clear action" },
  { step: "Explain why", desc: "Full decision chain" },
];

const FEATURES = [
  {
    icon: MapIcon,
    title: "Field Digital Twin",
    text: "A live virtual copy of your field — soil moisture, crop water loss, effective rainfall and soil water balance — updated from sensors and satellite-derived layers.",
  },
  {
    icon: FlaskConical,
    title: "What-If Simulation",
    text: "Project soil moisture 48 hours ahead for every option: irrigate now, wait a few hours, or apply partial deficit irrigation — before releasing a single drop.",
  },
  {
    icon: Target,
    title: "Water Budget Optimizer",
    text: "When water is limited, the optimizer allocates every litre to the zone where it reduces crop stress the most — with an explicit, auditable rationale.",
  },
  {
    icon: CloudRain,
    title: "Weather Uncertainty",
    text: "Test the plan against the forecast failing. If rain doesn't arrive, see the stress trajectory and the contingency window it creates.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-page">
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-light">
              <Droplets size={18} className="text-brand" />
            </div>
            <div>
              <div className="text-[15px] font-semibold tracking-tight text-ink">AquaTwin</div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                Irrigation Intelligence
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DemoPill />
            <LinkButton href="/dashboard" variant="primary" size="sm">
              Open Demo
            </LinkButton>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-14 md:pt-20">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <div className="text-micro font-semibold uppercase tracking-[0.18em] text-brand">
            AI Irrigation Optimizer · Field Digital Twin
          </div>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.12] tracking-tight text-ink md:text-[52px]">
            Simulate the future of your field{" "}
            <span className="text-brand">before using a single drop.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-muted md:text-lg">
            AI-powered irrigation intelligence combining soil, weather, satellite-derived, crop, and historical data —
            not another schedule, but a digital twin that tests every decision first.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <LinkButton href="/dashboard" variant="primary" size="lg">
              Explore Demo <ArrowRight size={15} />
            </LinkButton>
            <LinkButton href="#how" variant="secondary" size="lg">
              How It Works
            </LinkButton>
          </div>
        </motion.div>

        {/* Hero visual: field map fragment */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.15 }}
          className="mt-12 overflow-hidden rounded-xl2 border border-line bg-surface shadow-raised"
        >
          <div className="border-b border-line px-5 py-3">
            <div className="text-tiny font-medium text-ink-muted">Farm Overview — Kisan Bhimavaram Demo Farm</div>
          </div>
          <div className="grid grid-cols-2 gap-px bg-line md:grid-cols-4">
            {[
              { name: "Zone A", m: 26.4, tone: "#7FAF8C" },
              { name: "Zone B", m: 21.8, tone: "#D9A441" },
              { name: "Zone C", m: 25.6, tone: "#A9C08D" },
              { name: "Zone D", m: 23.2, tone: "#A9C08D" },
            ].map((z, i) => (
              <div key={z.name} className="relative bg-white px-5 pb-7 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-tiny font-medium text-ink">{z.name}</span>
                  <span className="text-tiny font-semibold text-ink-soft">{z.m}%</span>
                </div>
                <div className="mt-3 flex h-20 items-end gap-1.5">
                  {Array.from({ length: 12 }).map((_, j) => (
                    <motion.div
                      key={j}
                      className="flex-1 rounded-sm"
                      style={{ background: z.tone, opacity: 0.35 + ((j * 7 + i * 13) % 50) / 100 }}
                      initial={{ height: 0 }}
                      animate={{ height: `${28 + ((j * 17 + i * 23 + z.m * 3) % 60)}%` }}
                      transition={{ duration: 0.6, delay: 0.35 + j * 0.035 }}
                    />
                  ))}
                </div>
                <div className="mt-2 text-micro text-ink-faint">Soil moisture · demo</div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line bg-subtle px-5 py-3 text-tiny">
            <span className="flex items-center gap-1.5 text-ink-soft">
              <span className="h-2 w-2 rounded-full bg-success" /> Stress low
            </span>
            <span className="text-ink-muted">Rain expected in 7h · 70%</span>
            <span className="ml-auto font-medium text-brand-dark">Recommended: Wait 6 hours · saves 453 L</span>
          </div>
        </motion.div>
      </section>

      {/* Problem */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-2">
          <div>
            <h2 className="text-[26px] font-semibold tracking-tight text-ink">The problem</h2>
            <p className="mt-4 leading-relaxed text-ink-muted">
              Most irrigation still runs on fixed schedules, habit, or guesswork — without weighing soil moisture, crop
              stage, weather forecasts, satellite-derived signals, past irrigation, and how little water is actually
              available. The result: over-irrigation, water waste, crop stress, and unnecessary cost.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 self-center">
            {[
              { icon: Droplets, k: "Over-irrigation", v: "Water the crop never uses" },
              { icon: CloudRain, k: "Ignored forecasts", v: "Watering hours before rain" },
              { icon: Sprout, k: "Hidden stress", v: "Zones drift past the refill point" },
              { icon: Target, k: "Scarce budgets", v: "Water spread evenly, not effectively" },
            ].map((c) => (
              <div key={c.k} className="rounded-xl2 border border-line bg-page p-4">
                <c.icon size={16} className="text-warning" />
                <div className="mt-2 text-sm font-semibold text-ink">{c.k}</div>
                <div className="text-tiny text-ink-muted">{c.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works — workflow strip */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-[26px] font-semibold tracking-tight text-ink">How AquaTwin works</h2>
        <p className="mt-2 max-w-2xl text-ink-muted">
          One workflow, six steps — from live field state to an explained recommendation.
        </p>
        <div className="mt-8 flex flex-wrap gap-2">
          {WORKFLOW.map((w, i) => (
            <div key={w.step} className="flex items-center gap-2">
              <div className="rounded-xl2 border border-line bg-surface px-4 py-3 shadow-card">
                <div className="text-micro font-semibold text-brand">{String(i + 1).padStart(2, "0")}</div>
                <div className="mt-0.5 text-sm font-semibold text-ink">{w.step}</div>
                <div className="text-micro text-ink-muted">{w.desc}</div>
              </div>
              {i < WORKFLOW.length - 1 ? <ArrowRight size={14} className="text-ink-faint" /> : null}
            </div>
          ))}
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.35, delay: i * 0.06 }}
              className="rounded-xl2 border border-line bg-surface p-6 shadow-card"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-light">
                  <f.icon size={17} className="text-brand" />
                </div>
                <h3 className="text-base font-semibold text-ink">{f.title}</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">{f.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-line bg-brand-light">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center">
          <h2 className="text-[26px] font-semibold tracking-tight text-ink">
            Every irrigation, tested before it happens.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-ink-muted">
            The demo farm&apos;s current recommendation saves 453 L per event — and the optimizer shows where a 2,000 L
            budget does the most good.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <LinkButton href="/dashboard" variant="primary" size="lg">
              Open Demo <ArrowRight size={15} />
            </LinkButton>
            <span className="text-micro text-ink-muted">Fully offline · no API keys required</span>
          </div>
        </div>
      </section>

      <footer className="border-t border-line bg-surface py-6 text-center text-micro text-ink-faint">
        AquaTwin — Team Absolute Cinema · SRKR Engineering College · Vishnu College Hackathon
      </footer>
    </div>
  );
}
