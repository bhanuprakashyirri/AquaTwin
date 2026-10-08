"use client";

/**
 * Landing hero — editorial headline + art-directed aerial scene
 * with the AquaTwin product preview composed over it.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CloudRain, Droplets, Map as MapIcon } from "lucide-react";
import Image from "next/image";
import { LinkButton } from "@/components/ui/button";
import { DemoPill } from "@/components/ui/panel";
import { AnimatedValue } from "@/components/ui/animated-value";
import { EASE, fadeUp, floatLoop, riseUp, staggerContainer } from "@/lib/motion";

const ZONE_BASE = [
  { name: "Zone A", m: 26.4, tone: "#7FAF8C" },
  { name: "Zone B", m: 21.8, tone: "#D9A441" },
  { name: "Zone C", m: 25.6, tone: "#A9C08D" },
  { name: "Zone D", m: 23.2, tone: "#A9C08D" },
];

export function LandingHero() {
  // Live demo behavior: zone moisture drifts gently, like the simulated sensor stream.
  const [zones, setZones] = useState(ZONE_BASE);
  useEffect(() => {
    const id = window.setInterval(() => {
      setZones((prev) =>
        prev.map((z, i) => ({
          ...z,
          m:
            Math.round(
              Math.min(32, Math.max(18, z.m + (Math.sin(Date.now() / 4000 + i * 1.7) > 0 ? 0.1 : -0.1))) *
                10,
            ) / 10,
        })),
      );
    }, 2800);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="relative overflow-hidden">
      {/* soft ambient wash behind the hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 right-[-10%] h-[560px] w-[720px] rounded-full bg-brand-light/70 blur-3xl"
      />

      <div className="mx-auto max-w-7xl px-6 pb-10 pt-14 md:pt-20">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
          {/* Copy */}
          <motion.div variants={staggerContainer(0.09, 0.05)} initial="hidden" animate="show" className="relative">
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-micro font-semibold uppercase tracking-[0.16em] text-brand shadow-card"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              AI Irrigation Optimizer · Field Digital Twin
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="mt-5 text-[40px] font-semibold leading-[1.08] tracking-tight text-ink md:text-[56px]"
            >
              Simulate the future of your field{" "}
              <span className="text-brand">before using a single drop.</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="mt-5 max-w-xl text-base leading-relaxed text-ink-muted md:text-lg">
              AI-powered irrigation intelligence combining soil, weather, satellite-derived, crop, and historical
              data — not another irrigation schedule, but a digital twin that tests every decision first.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center gap-3">
              <LinkButton href="/dashboard" variant="primary" size="lg" className="group">
                Explore Demo <ArrowRight size={15} className="icon-nudge" />
              </LinkButton>
              <LinkButton href="#how" variant="secondary" size="lg">
                How It Works
              </LinkButton>
              <span className="hidden sm:inline"><DemoPill /></span>
            </motion.div>

            <motion.div variants={fadeUp} className="mt-9 flex items-center gap-6 text-tiny text-ink-muted">
              <span className="flex items-center gap-1.5">
                <MapIcon size={13} className="text-brand" /> Live field twin
              </span>
              <span className="flex items-center gap-1.5">
                <CloudRain size={13} className="text-info" /> Weather-aware
              </span>
              <span className="flex items-center gap-1.5">
                <Droplets size={13} className="text-brand" /> 453 L saved / event
              </span>
            </motion.div>
          </motion.div>

          {/* Visual — aerial scene + product preview composition */}
          <motion.div variants={riseUp} initial="hidden" animate="show" className="relative">
            {/* floating accent chips — QuizCore landing DNA, AquaTwin semantics */}
            <motion.div
              {...floatLoop(0, 6)}
              className="absolute -left-2 -top-4 z-20 hidden items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 shadow-raised md:flex"
            >
              <CloudRain size={15} className="text-info" aria-hidden />
              <span className="text-tiny font-semibold text-ink">Rain in 7h · 70%</span>
            </motion.div>
            <motion.div
              {...floatLoop(1.2, 6)}
              className="absolute -right-2 -bottom-4 z-20 hidden items-center gap-2 rounded-full bg-brand px-4 py-2 shadow-raised md:flex"
            >
              <Droplets size={15} className="text-white" aria-hidden />
              <span className="text-tiny font-semibold text-white">Saves 453 L per event</span>
            </motion.div>

            {/* aerial scene frame */}
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-line shadow-raised">
              <Image
                src="/images/landing_hero.jpg"
                alt="Cinematic aerial photograph of Indian rice fields with irrigation channels in Bhimavaram, Andhra Pradesh"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover transition-transform duration-700 ease-out hover:scale-[1.02]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#163A31]/50 via-transparent to-transparent pointer-events-none" />
              <div className="absolute left-4 top-4 rounded-full border border-line bg-white/95 px-3 py-1 text-micro font-medium text-ink-soft shadow-card backdrop-blur-md">
                North Plot · 10 ha · Rice
              </div>
            </div>

            {/* product preview card — overlaps the scene */}
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE, delay: 0.45 }}
              className="relative z-10 -mx-4 mt-[-44px] rounded-2xl border border-line bg-surface shadow-pop sm:mx-6"
            >
              <div className="flex items-center justify-between border-b border-line px-5 py-3">
                <div className="text-tiny font-medium text-ink-muted">Farm Overview — Kisan Bhimavaram Demo Farm</div>
                <span className="flex items-center gap-1.5 text-micro font-medium text-ink-faint">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                  </span>
                  Simulated sensor stream
                </span>
              </div>
              <div className="grid grid-cols-2 gap-px bg-line md:grid-cols-4">
                {zones.map((z, i) => (
                  <div key={z.name} className="group relative bg-white px-5 pb-6 pt-4 transition-colors duration-200 hover:bg-subtle/50">
                    <div className="flex items-center justify-between">
                      <span className="text-tiny font-medium text-ink">{z.name}</span>
                      <span className="text-tiny font-semibold text-ink-soft">
                        <AnimatedValue>{`${z.m}%`}</AnimatedValue>
                      </span>
                    </div>
                    <div className="mt-3 flex h-16 items-end gap-1.5">
                      {Array.from({ length: 12 }).map((_, j) => (
                        <motion.div
                          key={j}
                          className="flex-1 rounded-sm"
                          style={{ background: z.tone, opacity: 0.35 + ((j * 7 + i * 13) % 50) / 100 }}
                          initial={{ height: 0 }}
                          animate={{ height: `${28 + ((j * 17 + i * 23 + z.m * 3) % 60)}%` }}
                          transition={{ duration: 0.6, delay: 0.6 + j * 0.035, ease: EASE }}
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
                <span className="ml-auto font-medium text-brand-dark">
                  Recommended: <span className="font-semibold">Wait 6 hours</span> · saves 453 L
                </span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>{/* reserved for landing-level overlays */}</AnimatePresence>
    </section>
  );
}
