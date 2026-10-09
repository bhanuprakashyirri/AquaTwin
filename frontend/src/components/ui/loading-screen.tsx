"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

const LOADING_STAGES = [
  { threshold: 0, text: "Initializing Field Digital Twin v2.0…" },
  { threshold: 30, text: "Calibrating Soil Hydrology & Weather Radar…" },
  { threshold: 65, text: "Synchronizing GIS Telemetry · Bhimavaram, AP…" },
  { threshold: 90, text: "Field Memory Ready · Launching System…" },
];

export function LoadingScreen() {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [stageText, setStageText] = useState(LOADING_STAGES[0].text);

  useEffect(() => {
    const duration = 1200; // 1.2s total duration
    const interval = 20; // 20ms steps
    const step = 100 / (duration / interval);

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(100, Math.round(prev + step));

        for (let i = LOADING_STAGES.length - 1; i >= 0; i--) {
          if (next >= LOADING_STAGES[i].threshold) {
            setStageText(LOADING_STAGES[i].text);
            break;
          }
        }

        if (next >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            setLoading(false);
          }, 200);
        }
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, []);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          key="site-loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02, filter: "blur(6px)" }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-[#071913] select-none overflow-hidden"
          aria-live="polite"
          aria-label="Loading AquaTwin system"
        >
          {/* Ambient luminous glow background */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.18)_0%,transparent_65%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(28,81,67,0.30)_0%,transparent_70%)]" />

          {/* Center Emblem with orbital rings */}
          <div className="relative flex flex-col items-center">
            {/* Outer spinning dashed ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-6 rounded-full border border-dashed border-emerald-400/25 pointer-events-none"
            />

            {/* Inner counter-rotating ring */}
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-3 rounded-full border border-emerald-500/15 pointer-events-none"
            />

            {/* Glowing glass container holding the new transparent site logo */}
            <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-950/80 to-[#0A261D] p-3 border border-emerald-500/30 shadow-[0_8px_32px_rgba(16,185,129,0.25),inset_0_1px_1px_rgba(255,255,255,0.2)] backdrop-blur-xl">
              <Image
                src="/logo-white.png"
                alt="AquaTwin"
                width={64}
                height={64}
                className="h-full w-full object-contain filter drop-shadow-[0_2px_8px_rgba(52,211,153,0.4)]"
                priority
              />
            </div>

            {/* Brand Title */}
            <div className="mt-6 text-center">
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-black tracking-tight text-white">AquaTwin</span>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300">
                  v2.0
                </span>
              </div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400/70">
                Irrigation Intelligence
              </div>
            </div>

            {/* Ambient telemetry status — NO PROGRESS BAR */}
            <div className="mt-8 flex flex-col items-center">
              {/* Dynamic status pill with pulsing radar dot */}
              <div className="flex items-center gap-2.5 rounded-full border border-emerald-500/25 bg-emerald-950/60 px-4 py-1.5 shadow-[0_2px_16px_rgba(16,185,129,0.15)] backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="font-mono text-[11px] font-medium tracking-tight text-emerald-200">
                  {stageText}
                </span>
              </div>

              {/* Sub-telemetry indicators: 3 pulsing sensor nodes */}
              <div className="mt-4 flex items-center gap-4 text-[10px] text-emerald-400/50">
                <span className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-emerald-400" />
                  Soil Hydrology
                </span>
                <span className="text-white/20">/</span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-teal-400" />
                  Weather Radar
                </span>
                <span className="text-white/20">/</span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-emerald-300" />
                  Digital Twin
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default LoadingScreen;
