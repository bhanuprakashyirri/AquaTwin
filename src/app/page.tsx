"use client";

import { MotionConfig } from "framer-motion";
import Link from "next/link";
import { Droplets } from "lucide-react";
import { LandingHero } from "@/components/landing/landing-hero";
import {
  BudgetSection,
  FinalCtaSection,
  FingerprintSection,
  ImpactSection,
  LandingFooter,
  ProblemSection,
  ShiftSection,
  TwinSection,
  WeatherUncertaintySection,
  WhatIfSection,
} from "@/components/landing/landing-sections";

export default function LandingPage() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen overflow-x-hidden bg-page">
        {/* Understated Editorial Navigation */}
        <nav className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
            <Link href="/" className="group flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-light transition-transform duration-300 ease-out group-hover:-translate-y-0.5">
                <Droplets size={18} className="text-brand" />
              </div>
              <div>
                <div className="text-[15px] font-bold tracking-tight text-ink">AquaTwin</div>
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">
                  Irrigation Intelligence
                </div>
              </div>
            </Link>

            <div className="hidden items-center gap-6 md:flex">
              <Link
                href="#shift"
                className="text-xs font-semibold text-ink-soft transition-colors duration-150 hover:text-brand-dark"
              >
                How It Works
              </Link>
              <Link
                href="#twin"
                className="text-xs font-semibold text-ink-soft transition-colors duration-150 hover:text-brand-dark"
              >
                Field Twin
              </Link>
              <Link
                href="#what-if"
                className="text-xs font-semibold text-ink-soft transition-colors duration-150 hover:text-brand-dark"
              >
                What-If
              </Link>
              <Link
                href="#budget"
                className="text-xs font-semibold text-ink-soft transition-colors duration-150 hover:text-brand-dark"
              >
                Water Budget
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="hidden rounded-full border border-line bg-surface px-4 py-2 text-xs font-bold text-ink-soft transition-all duration-150 hover:border-brand/40 hover:bg-subtle hover:text-ink sm:block shadow-sm"
              >
                Sign in
              </Link>
              <Link
                href="/dashboard"
                className="rounded-full bg-brand px-5 py-2 text-xs font-bold text-white transition-[background-color,box-shadow,transform] duration-200 ease-out hover:bg-brand-dark hover:shadow-raised hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0"
              >
                Open Demo
              </Link>
            </div>
          </div>
        </nav>

        {/* The 10 Art-Directed Storytelling Sections */}
        <LandingHero />
        <ProblemSection />
        <ShiftSection />
        <TwinSection />
        <WhatIfSection />
        <WeatherUncertaintySection />
        <BudgetSection />
        <FingerprintSection />
        <ImpactSection />
        <FinalCtaSection />
        <LandingFooter />
      </div>
    </MotionConfig>
  );
}
