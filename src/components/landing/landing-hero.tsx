"use client";

/**
 * Editorial Landing Hero — Art-directed composition.
 * Layered Indian paddy scene with 3 real HTML product chips:
 * 1. Field Twin status (live root-zone moisture)
 * 2. Weather probability (rain in 7h)
 * 3. AI recommendation (Wait 6h · Saves 453 L)
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, CloudRain, Droplets, MapPin, Sparkles, Sprout } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { EASE, fadeUp, floatLoop, riseUp, staggerContainer } from "@/lib/motion";

export function LandingHero() {
  const [moisture, setMoisture] = useState(24.6);

  // Subtle real-time drift mimicking sensor telemetry
  useEffect(() => {
    const interval = window.setInterval(() => {
      setMoisture((prev) => {
        const delta = (Math.random() - 0.48) * 0.2;
        return Math.round(Math.min(27.5, Math.max(22.0, prev + delta)) * 10) / 10;
      });
    }, 3200);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <section className="relative overflow-hidden border-b border-line bg-page">
      {/* Ambient background wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-48 right-0 h-[640px] w-[800px] rounded-full bg-brand-light/60 blur-3xl"
      />

      <div className="mx-auto max-w-7xl px-6 pb-16 pt-12 md:pb-24 md:pt-16 lg:pt-20">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          {/* Left: Editorial Headline & Copy */}
          <motion.div
            variants={staggerContainer(0.08, 0.04)}
            initial="hidden"
            animate="show"
            className="relative z-10 max-w-2xl"
          >
            {/* Eyebrow */}
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-brand shadow-card"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
              AI Irrigation Optimizer · Field Digital Twin
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              variants={fadeUp}
              className="mt-6 text-[42px] font-extrabold leading-[1.06] tracking-[-0.03em] text-ink sm:text-[54px] lg:text-[62px]"
            >
              Simulate the future of your field{" "}
              <span className="text-brand">before using a single drop.</span>
            </motion.h1>

            {/* Supporting Copy */}
            <motion.p
              variants={fadeUp}
              className="mt-6 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg"
            >
              AI-powered irrigation intelligence combining soil, weather, satellite-derived, crop,
              and historical data — not another static irrigation schedule, but a digital twin that
              tests every decision first.
            </motion.p>

            {/* Action Buttons */}
            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center gap-3.5">
              <LinkButton href="/dashboard" variant="primary" size="lg" className="group">
                Explore Demo <ArrowRight size={15} className="transition-transform duration-200 ease-out group-hover:translate-x-1" />
              </LinkButton>
              <LinkButton href="#shift" variant="secondary" size="lg">
                How It Works
              </LinkButton>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-soft">
                <span className="h-2 w-2 rounded-full bg-success" />
                Live Demo Farm
              </span>
            </motion.div>

            {/* Micro Metadata */}
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

          {/* Right: Layered Photographic Scene with 3 REAL HTML Product Elements */}
          <motion.div
            variants={riseUp}
            initial="hidden"
            animate="show"
            className="relative lg:pl-4"
          >
            {/* The Cinematic Agricultural Photography Frame */}
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-pop">
              <Image
                src="/images/landing_hero.jpg"
                alt="Aerial agricultural photograph of Indian rice fields with irrigation channels in Bhimavaram"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 45vw"
                className="object-cover transition-transform duration-700 ease-out hover:scale-[1.02]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#163A31]/55 via-transparent to-transparent pointer-events-none" />

              {/* Geographic badge */}
              <div className="absolute left-4 top-4 rounded-full border border-line/70 bg-white/95 px-3 py-1 text-xs font-semibold text-ink-soft shadow-card backdrop-blur-md">
                Kisan Bhimavaram Demo Farm · Plot A
              </div>
            </div>

            {/* REAL HTML ELEMENT 1: Live Field Twin State Chip (Top Left Float) */}
            <motion.div
              {...floatLoop(0, 5)}
              className="absolute -left-4 top-8 z-20 max-w-[210px] rounded-xl2 border border-line bg-white/95 p-3.5 shadow-raised backdrop-blur-md sm:-left-8"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">Field Twin</span>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                </span>
              </div>
              <div className="mt-1.5 text-2xl font-bold tracking-tight text-ink">
                {moisture.toFixed(1)}%
              </div>
              <div className="mt-0.5 text-[11px] font-medium text-ink-muted">
                Root-zone moisture · Healthy
              </div>
            </motion.div>

            {/* REAL HTML ELEMENT 2: Forecast Rain Pill (Top Right Float) */}
            <motion.div
              {...floatLoop(1.4, 5)}
              className="absolute -right-3 top-4 z-20 hidden items-center gap-2 rounded-full border border-line bg-white/95 px-4 py-2 shadow-raised backdrop-blur-md sm:flex"
            >
              <CloudRain size={16} className="text-info" />
              <div className="text-xs">
                <span className="font-bold text-ink">Rain in 7h</span>
                <span className="ml-1 text-ink-muted">(70% · 12.3 mm)</span>
              </div>
            </motion.div>

            {/* REAL HTML ELEMENT 3: Irrigation Decision Banner (Bottom Anchor) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE, delay: 0.4 }}
              className="relative z-20 -mx-3 -mt-10 rounded-xl2 border border-[#BFDCCB] bg-brand-light p-4 shadow-raised backdrop-blur-md sm:mx-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white">
                    <Sparkles size={14} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-brand-dark">
                      Optimized Action
                    </div>
                    <div className="text-sm font-bold text-ink">
                      WAIT 6 HOURS
                    </div>
                  </div>
                </div>
                <div className="rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-brand-dark border border-brand/20">
                  Saves 453 L · Risk 5.2%
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
