"use client";

/**
 * Editorial Landing Hero — Precision AgriTech Twin Console.
 * Seamless, balanced composition:
 * - Editorial headline with Plus Jakarta Sans typography
 * - Integrated GIS Digital Twin console viewport (no chaotic clipping stickers)
 * - Real telemetry HUD: Live Root-Zone moisture, 48h rain forecast, optimized action
 */

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  CloudRain,
  Droplets,
  Layers,
  MapPin,
  Radio,
  Sparkles,
  Sprout,
} from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { EASE, fadeUp, riseUp, staggerContainer } from "@/lib/motion";

export function LandingHero() {
  const [moisture, setMoisture] = useState(24.6);
  const [pulse, setPulse] = useState(false);

  // Subtle telemetry drift
  useEffect(() => {
    const interval = window.setInterval(() => {
      setMoisture((prev) => {
        const delta = (Math.random() - 0.48) * 0.2;
        return Math.round(Math.min(27.0, Math.max(22.5, prev + delta)) * 10) / 10;
      });
      setPulse(true);
      setTimeout(() => setPulse(false), 800);
    }, 3600);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <section className="relative overflow-hidden border-b border-line bg-page">
      {/* Soft ambient atmospheric radiance */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 right-[-5%] h-[580px] w-[700px] rounded-full bg-brand-light/50 blur-3xl"
      />

      <div className="mx-auto max-w-7xl px-6 pb-20 pt-12 md:pb-28 md:pt-16 lg:pt-20">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          {/* Left Column: Editorial Headline & Value Narrative */}
          <motion.div
            variants={staggerContainer(0.08, 0.04)}
            initial="hidden"
            animate="show"
            className="relative z-10 max-w-2xl"
          >
            {/* Precision Eyebrow Badge */}
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-brand shadow-card"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              AI Irrigation Optimizer · Field Digital Twin
            </motion.div>

            {/* Editorial Headline */}
            <motion.h1
              variants={fadeUp}
              className="mt-6 text-[40px] font-extrabold leading-[1.06] tracking-[-0.035em] text-ink sm:text-[52px] lg:text-[60px]"
            >
              Simulate the future of your field{" "}
              <span className="text-brand">before using a single drop.</span>
            </motion.h1>

            {/* Supporting Copy */}
            <motion.p
              variants={fadeUp}
              className="mt-6 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg"
            >
              AI-powered irrigation intelligence combining soil physics, 48-hour weather forecasts,
              satellite-derived signals, and historical response — a living digital twin that tests every
              decision before opening a valve.
            </motion.p>

            {/* Primary Action Buttons */}
            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center gap-3.5">
              <LinkButton href="/dashboard" variant="primary" size="lg" className="group shadow-raised">
                Explore Demo <ArrowRight size={15} className="transition-transform duration-200 ease-out group-hover:translate-x-1" />
              </LinkButton>
              <LinkButton href="#shift" variant="secondary" size="lg">
                How It Works
              </LinkButton>
              <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-semibold text-ink-soft">
                <Radio size={12} className="text-success animate-pulse" />
                Live Sensor Telemetry
              </div>
            </motion.div>

            {/* Technical Metadata Bar */}
            <motion.div
              variants={fadeUp}
              className="mt-10 flex flex-wrap items-center gap-6 border-t border-line/80 pt-6 text-xs text-ink-muted"
            >
              <span className="flex items-center gap-1.5 font-medium text-ink-soft">
                <MapPin size={13} className="text-brand" /> Bhimavaram, AP (10 ha)
              </span>
              <span className="flex items-center gap-1.5 font-medium text-ink-soft">
                <Sprout size={13} className="text-brand" /> Rice · MTU-7029
              </span>
              <span className="flex items-center gap-1.5 font-medium text-ink-soft">
                <Droplets size={13} className="text-brand" /> 453 L saved / event
              </span>
            </motion.div>
          </motion.div>

          {/* Right Column: Precision Digital Twin Workstation Console */}
          <motion.div
            variants={riseUp}
            initial="hidden"
            animate="show"
            className="relative"
          >
            {/* The Integrated Workstation Chassis */}
            <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-pop">
              {/* Chassis Titlebar */}
              <div className="flex items-center justify-between border-b border-line bg-subtle/70 px-4 py-2.5 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-2 w-2 rounded-full bg-success" />
                  <span className="font-bold text-ink">Field Twin Console</span>
                  <span className="text-ink-faint">·</span>
                  <span className="text-ink-muted">North Plot A (10.0 ha)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md border border-line bg-surface px-2 py-0.5 text-[10px] font-bold text-brand uppercase tracking-wider">
                    Model v2.4
                  </span>
                  <span className="text-[10px] font-semibold text-ink-faint">Live Sync</span>
                </div>
              </div>

              {/* Viewport: Aerial Scene with Inset HUD Data Overlays */}
              <div className="relative aspect-[16/11] w-full overflow-hidden bg-slate-900">
                <Image
                  src="/images/landing_hero.jpg"
                  alt="Cinematic aerial photograph of Indian rice fields with irrigation channels in Bhimavaram"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  className="object-cover"
                />
                {/* Visual depth gradient mask */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30 pointer-events-none" />

                {/* Top HUD: Inset Status Tags */}
                <div className="absolute inset-x-4 top-4 flex items-center justify-between">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Sensors: 4/4 Online
                  </div>

                  <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
                    <CloudRain size={13} className="text-cyan-300" />
                    Rain: 70% in 7h (12.3 mm)
                  </div>
                </div>

                {/* Bottom Inset HUD: Primary Decision & Sensor Strip */}
                <div className="absolute inset-x-4 bottom-4 space-y-2.5">
                  {/* Real-time telemetry readouts */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-white/15 bg-black/50 p-2.5 backdrop-blur-md">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-white/70">
                        <span>Root-Zone Moisture</span>
                        <span className="text-emerald-400">Target 22–30%</span>
                      </div>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-xl font-extrabold text-white">
                          {moisture.toFixed(1)}%
                        </span>
                        <span className="text-[11px] font-medium text-white/80">Healthy</span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/15 bg-black/50 p-2.5 backdrop-blur-md">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-white/70">
                        <span>Crop Stress Risk</span>
                        <span className="text-emerald-400">&lt;15% Safe</span>
                      </div>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-xl font-extrabold text-emerald-300">
                          5.2%
                        </span>
                        <span className="text-[11px] font-medium text-white/80">Low Risk</span>
                      </div>
                    </div>
                  </div>

                  {/* Primary AI Decision Banner */}
                  <div className="flex items-center justify-between rounded-xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/80 to-[#163A31]/90 p-3 text-white backdrop-blur-md shadow-lg">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                        <Sparkles size={14} />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/90">
                          Recommended Action
                        </div>
                        <div className="text-xs font-extrabold tracking-wide">
                          WAIT 6 HOURS
                        </div>
                      </div>
                    </div>
                    <div className="rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 text-xs font-bold text-emerald-200">
                      Saves 453 L · Infiltration Safe
                    </div>
                  </div>
                </div>
              </div>

              {/* Chassis Base Footer: Rationale Line */}
              <div className="flex items-center justify-between border-t border-line bg-surface px-4 py-2.5 text-xs text-ink-muted">
                <span className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 size={13} className="text-brand" />
                  Physics verified against 48h evapotranspiration model
                </span>
                <span className="font-semibold text-brand-dark">
                  Autonomous re-evaluation at 04:00
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
