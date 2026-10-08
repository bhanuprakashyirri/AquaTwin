"use client";

import { useEffect, useState } from "react";
import { MotionConfig, AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { Menu, X, Droplets, ArrowRight } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { LandingHero } from "@/components/landing/landing-hero";
import {
  BudgetSection,
  FinalCtaSection,
  FingerprintSection,
  LandingFooter,
  ProblemSection,
  ShiftSection,
  TwinSection,
  WhatIfSection,
} from "@/components/landing/landing-sections";
import { AquaLink } from "@/components/ui/aqua-button";

// ─── Nav link definitions ─────────────────────────────────────────────────────

const NAV_LINKS = [
  { href: "#shift",    label: "How It Works" },
  { href: "#twin",     label: "Field Twin" },
  { href: "#what-if",  label: "What-If" },
  { href: "#budget",   label: "Water Budget" },
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on scroll
  useEffect(() => {
    if (scrolled && mobileOpen) setMobileOpen(false);
  }, [scrolled, mobileOpen]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen overflow-x-hidden">

        {/* ──────────────────────────────────────────────────────────────
            PREMIUM GLASSMORPHISM NAVBAR
            - Floating pill container with multi-layer crystal specular highlights
            - Real backdrop-filter: blur(24px) saturate(190%)
            - Top edge reflection prism and subtle inset bevel
            - Crisp high-contrast typography
            - QuizCore button interaction system
        ────────────────────────────────────────────────────────────── */}
        <header className="fixed top-4 inset-x-0 z-50 px-4 sm:px-6 lg:px-8 flex justify-center pointer-events-none">
          <nav
            aria-label="Main navigation"
            className="pointer-events-auto relative w-full max-w-7xl overflow-hidden rounded-[22px] transition-all duration-300 ease-out"
            style={{
              background: scrolled
                ? "linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0.82) 100%)"
                : "linear-gradient(135deg, rgba(255, 255, 255, 0.68) 0%, rgba(255, 255, 255, 0.44) 100%)",
              backdropFilter: "blur(24px) saturate(190%)",
              WebkitBackdropFilter: "blur(24px) saturate(190%)",
              border: scrolled
                ? "1px solid rgba(221, 230, 225, 0.85)"
                : "1px solid rgba(255, 255, 255, 0.65)",
              boxShadow: scrolled
                ? "0 12px 36px -8px rgba(22, 58, 49, 0.12), inset 0 1px 1px 0 rgba(255, 255, 255, 0.95), inset 0 -1px 0 rgba(0, 0, 0, 0.03)"
                : "0 20px 48px -12px rgba(0, 0, 0, 0.24), inset 0 1px 1px 0 rgba(255, 255, 255, 0.9), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.05)",
            }}
          >
            {/* Top specular reflection glare bar */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent opacity-90"
              aria-hidden="true"
            />

            <div className="flex h-[70px] items-center justify-between px-5 lg:px-7">

              {/* ── Logo + Telemetry pill ── */}
              <div className="flex items-center gap-3">
                <Logo size="sm" href="/" />

                {/* Subtle telemetry status badge */}
                <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 select-none">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Twin v2.0 Live</span>
                </div>
              </div>

              {/* ── Center nav links (desktop) ── */}
              <div className="hidden items-center gap-1.5 md:flex">
                {NAV_LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={[
                      "relative rounded-full px-4 py-2 text-[13px] font-bold tracking-tight",
                      "text-ink/85 transition-colors duration-150 ease-out",
                      "hover:bg-white/70 hover:text-brand-dark active:scale-[0.98]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
                    ].join(" ")}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>

              {/* ── Right actions (QuizCore Button Components) ── */}
              <div className="flex items-center gap-2.5">
                <AquaLink
                  href="/login"
                  variant="glass"
                  size="sm"
                  noLift
                  className="hidden sm:inline-flex"
                >
                  Sign in
                </AquaLink>
                <AquaLink
                  href="/dashboard"
                  variant="primary"
                  size="sm"
                  noLift
                  iconRight={<ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />}
                >
                  Open Demo
                </AquaLink>

                {/* Mobile hamburger */}
                <button
                  aria-label={mobileOpen ? "Close menu" : "Open menu"}
                  aria-expanded={mobileOpen}
                  onClick={() => setMobileOpen((v) => !v)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface/90 text-ink-soft transition-colors duration-150 hover:bg-white hover:text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 md:hidden cursor-pointer"
                >
                  {mobileOpen ? <X size={16} /> : <Menu size={16} />}
                </button>
              </div>
            </div>

            {/* ── Mobile drawer ── */}
            <AnimatePresence>
              {mobileOpen && (
                <motion.div
                  key="mobile-menu"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden border-t border-line/60 bg-white/40 backdrop-blur-md"
                >
                  <div className="flex flex-col gap-1 px-4 py-3">
                    {NAV_LINKS.map((l) => (
                      <Link
                        key={l.href}
                        href={l.href}
                        onClick={() => setMobileOpen(false)}
                        className="rounded-xl px-4 py-2.5 text-sm font-bold text-ink-soft transition-colors duration-150 hover:bg-white/80 hover:text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                      >
                        {l.label}
                      </Link>
                    ))}
                    <div className="mt-2 flex gap-2 border-t border-line/60 pt-3">
                      <AquaLink href="/login" variant="outline" size="sm" className="flex-1 justify-center">
                        Sign in
                      </AquaLink>
                      <AquaLink href="/dashboard" variant="primary" size="sm" className="flex-1 justify-center">
                        Open Demo
                      </AquaLink>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </nav>
        </header>

        {/* ── Page content ── */}
        <LandingHero />
        <ProblemSection />
        <ShiftSection />
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
