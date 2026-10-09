"use client";

/**
 * AquaTwin — Cinematic Editorial Hero
 *
 * Art direction principles:
 * - Full-bleed immersive agricultural backdrop (100vh)
 * - Dark atmospheric overlay anchored to the bottom, letting sky breathe at top
 * - Headline cuts across the image edge — breaking out of the "card" paradigm
 * - Real Field Intelligence HUD with live telemetry drift
 * - Strict pill buttons, no box-button softness
 * - Animated scroll-down cue
 */

import { useEffect, useRef, useState } from "react";
// next/image not needed — background is a video
import { motion } from "framer-motion";
import {
  ArrowRight,
  Droplets,
  MapPin,
  Radio,
  Sparkles,
  Sprout,
} from "lucide-react";
import { AquaLink } from "@/components/ui/aqua-button";

const fadeUp = {
  hidden: { opacity: 0, y: 28, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1] },
  },
};

const stagger = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

export function LandingHero() {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Ensure video plays on mount (some browsers need an explicit call)
  useEffect(() => {
    const v = videoRef.current;
    if (v) {
      v.muted = true;
      v.play().catch(() => {
        // Silently ignore autoplay policy blocks
      });
    }
  }, []);
  const [moisture, setMoisture] = useState(24.9);
  const [temp, setTemp] = useState(31.4);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const iv = window.setInterval(() => {
      setMoisture((p) => Math.round(Math.min(26.8, Math.max(23.2, p + (Math.random() - 0.48) * 0.18)) * 10) / 10);
      setTemp((p) => Math.round(Math.min(33.2, Math.max(29.8, p + (Math.random() - 0.5) * 0.3)) * 10) / 10);
      setTick((t) => t + 1);
    }, 3800);
    return () => window.clearInterval(iv);
  }, []);

  return (
    <section className="relative flex min-h-screen flex-col overflow-hidden bg-[#0A1F18]">
      {/* ── FULL-BLEED VIDEO BACKGROUND ── */}
      <div className="absolute inset-0 z-0">
        {/* Hero video — full brightness, let overlays handle dimming */}
        <video
          ref={videoRef}
          src="/hero.mp4"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-center"
          style={{ opacity: 0.9 }}
        />

        {/* Minimal tint: just enough to ensure text readability */}
        {/* Gentle base dark — does NOT wash out the video */}
        <div className="absolute inset-0 bg-[#0A1F18]/25" />
        {/* Bottom gradient — darkens only the lower third where text lives */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0A1F18]/30 to-[#0A1F18]/85" />
        {/* Left vignette — keeps headline copy legible */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A1F18]/70 via-[#0A1F18]/30 to-transparent" />
      </div>

      {/* ── HERO CONTENT ── */}
      <div className="relative z-10 flex flex-1 items-end pb-16 sm:pb-20 lg:pb-24">
        <div className="mx-auto w-full max-w-7xl px-6">
          <div className="grid grid-cols-1 items-end gap-10 lg:grid-cols-[1fr_420px] lg:gap-16">

            {/* Left: Editorial Statement */}
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="show"
            >
              {/* Eyebrow — minimal, technical */}
              <motion.div
                variants={fadeUp}
                className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/8 px-3.5 py-1.5 backdrop-blur-sm"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-200">
                  AI Irrigation Intelligence · Field Digital Twin
                </span>
              </motion.div>

              {/* Main Headline — large, editorial, brand-emphasized split */}
              <motion.h1
                variants={fadeUp}
                className="mt-7 text-[48px] font-extrabold leading-[1.03] tracking-[-0.04em] text-white sm:text-[60px] lg:text-[72px]"
              >
                Simulate the future
                <br />
                of your field
                <br />
                <span className="bg-gradient-to-r from-emerald-300 to-[#5ECFB0] bg-clip-text text-transparent">
                  before using a drop.
                </span>
              </motion.h1>

              {/* Supporting copy */}
              <motion.p
                variants={fadeUp}
                className="mt-6 max-w-[560px] text-base leading-[1.7] text-white/70 sm:text-lg"
              >
                AquaTwin is the first irrigation intelligence platform that creates a living digital twin
                of your field — testing every irrigation scenario against real soil physics before
                releasing water.
              </motion.p>

              {/* Primary CTAs — unified AquaLink button system */}
              <motion.div
                variants={fadeUp}
                className="mt-8 flex flex-wrap items-center gap-3.5"
              >
                {/* Primary: Launch Platform */}
                <AquaLink href="/dashboard" variant="primary" size="lg">
                  Launch Platform
                  <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                </AquaLink>

                {/* Secondary: How It Works — glassmorphism with gaussian blur */}
                <AquaLink href="#shift" variant="glass-on-dark" size="lg">
                  How It Works
                </AquaLink>

                {/* Accent: Live Telemetry status pill — glassmorphic */}
                <AquaLink href="/dashboard" variant="glass-on-dark" size="sm">
                  <Radio size={11} className="animate-pulse text-emerald-300" />
                  Live Telemetry · 4 Sensors
                </AquaLink>
              </motion.div>

              {/* Field metadata strip */}
              <motion.div
                variants={fadeUp}
                className="mt-10 flex flex-wrap items-center gap-6 border-t border-white/10 pt-6"
              >
                <span className="flex items-center gap-1.5 text-xs font-medium text-white/55">
                  <MapPin size={12} className="text-emerald-400" /> Bhimavaram, AP · 10 ha
                </span>
                <span className="flex items-center gap-1.5 text-xs font-medium text-white/55">
                  <Sprout size={12} className="text-emerald-400" /> Rice · MTU-7029 · Kharif
                </span>
                <span className="flex items-center gap-1.5 text-xs font-medium text-white/55">
                  <Droplets size={12} className="text-emerald-400" /> 453 L saved / event
                </span>
              </motion.div>
            </motion.div>

            {/* Right: Field Intelligence HUD */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.85, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="overflow-hidden rounded-2xl border border-white/12 bg-[#0E2920]/80 shadow-[0_24px_64px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                {/* HUD Header */}
                <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                      <Sparkles size={15} />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-400/60">Field Twin</div>
                      <div className="text-sm font-bold text-white">North Plot · 10 ha</div>
                    </div>
                  </div>
                  <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live Sync
                  </span>
                </div>

                {/* Live Telemetry Grid */}
                <div className="grid grid-cols-3 gap-px bg-white/5 border-b border-white/8">
                  {[
                    { label: "Soil Moisture", value: `${moisture.toFixed(1)}%`, sub: "Target 22–30%", color: "text-emerald-300" },
                    { label: "Air Temp", value: `${temp.toFixed(1)}°C`, sub: "Optimal < 35°C", color: "text-amber-300" },
                    { label: "Rain Chance", value: "70%", sub: "In 7 hours", color: "text-sky-300" },
                  ].map((m) => (
                    <div key={m.label} className="bg-[#0E2920]/60 px-4 py-4">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-white/35">{m.label}</div>
                      <div className={`mt-1.5 text-2xl font-extrabold ${m.color}`}>{m.value}</div>
                      <div className="mt-0.5 text-[10px] font-semibold text-white/30">{m.sub}</div>
                    </div>
                  ))}
                </div>

                {/* AI Decision Banner */}
                <div className="px-5 py-4 border-b border-white/8">
                  <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3.5">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/60">AI Decision</div>
                      <div className="mt-0.5 text-xl font-extrabold text-emerald-300">WAIT 6 HOURS</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-emerald-300">453 L saved</div>
                      <div className="text-[10px] font-medium text-white/35">Rain replaces pump</div>
                    </div>
                  </div>
                </div>

                {/* Zone Moisture Bars */}
                <div className="px-5 py-4">
                  <div className="mb-3 text-[10px] font-bold uppercase tracking-wider text-white/30">Zone Moisture Status</div>
                  {[
                    { zone: "A", pct: 26.4, ok: true },
                    { zone: "B", pct: 21.8, ok: false },
                    { zone: "C", pct: 25.6, ok: true },
                    { zone: "D", pct: 23.2, ok: true },
                  ].map((z) => (
                    <div key={z.zone} className="mb-2.5 flex items-center gap-3">
                      <span className="w-12 text-[11px] font-bold text-white/50">Zone {z.zone}</span>
                      <div className="relative flex-1 h-1.5 overflow-hidden rounded-full bg-white/8">
                        <motion.div
                          className={`h-full rounded-full ${z.ok ? "bg-emerald-400" : "bg-amber-400"}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${(z.pct / 32) * 100}%` }}
                          transition={{ duration: 1.2, delay: 0.6 + Number(z.zone.charCodeAt(0) - 65) * 0.1, ease: [0.16, 1, 0.3, 1] }}
                        />
                      </div>
                      <span className={`w-12 text-right text-[11px] font-bold ${z.ok ? "text-emerald-300" : "text-amber-300"}`}>
                        {z.pct}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

    </section>
  );
}
