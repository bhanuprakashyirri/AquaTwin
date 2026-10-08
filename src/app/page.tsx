"use client";

import { MotionConfig } from "framer-motion";
import Link from "next/link";
import { Droplets } from "lucide-react";
import { LandingHero } from "@/components/landing/landing-hero";
import {
  BudgetSection,
  DifferenceSection,
  FingerprintSection,
  FinalCtaSection,
  LandingFooter,
  ProblemSection,
  TwinSection,
  WhatIfSection,
} from "@/components/landing/landing-sections";
import { ScrollProgress } from "@/components/scroll-progress";

export default function LandingPage() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen overflow-x-hidden bg-page">
        {/* Nav */}
        <nav className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
            <Link href="/" className="group flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-light transition-transform duration-300 ease-out group-hover:-translate-y-0.5">
                <Droplets size={18} className="text-brand" />
              </div>
              <div>
                <div className="text-[15px] font-semibold tracking-tight text-ink">AquaTwin</div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                  Irrigation Intelligence
                </div>
              </div>
            </Link>
            <div className="hidden items-center gap-1 md:flex">
              <Link
                href="#how"
                className="rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition-colors duration-150 hover:bg-subtle hover:text-ink"
              >
                How It Works
              </Link>
              <Link
                href="#twin"
                className="rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition-colors duration-150 hover:bg-subtle hover:text-ink"
              >
                Field Twin
              </Link>
              <Link
                href="#what-if"
                className="rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition-colors duration-150 hover:bg-subtle hover:text-ink"
              >
                What-If
              </Link>
              <Link
                href="#budget"
                className="rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition-colors duration-150 hover:bg-subtle hover:text-ink"
              >
                Water Budget
              </Link>
            </div>
            <div className="flex items-center gap-2.5">
              <Link
                href="/login"
                className="hidden rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition-colors duration-150 hover:bg-subtle hover:text-ink sm:block"
              >
                Sign in
              </Link>
              <Link
                href="/dashboard"
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-[background-color,box-shadow,transform] duration-200 ease-out hover:bg-brand-dark hover:shadow-raised active:scale-[0.98]"
              >
                Open Demo
              </Link>
            </div>
          </div>
        </nav>

        <LandingHero />
        <ProblemSection />
        <DifferenceSection />
        <TwinSection />
        <WhatIfSection />
        <BudgetSection />
        <FingerprintSection />
        <FinalCtaSection />
        <LandingFooter />
      </div>
    </MotionConfig>
  );
}
