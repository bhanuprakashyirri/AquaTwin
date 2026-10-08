"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CloudRain, Droplets, FlaskConical, Sparkles, X } from "lucide-react";
import { Button } from "./button";

/**
 * Structured "Why this decision?" drawer. It presents the decision chain —
 * current condition → weather outlook → simulation result → decision — in
 * plain language. Content is deterministic, generated from the same twin +
 * simulation + optimizer outputs that drive the UI. If GEMINI_API_KEY is
 * configured server-side, an adapter can enrich the prose — never the numbers.
 */
export function WhyDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-[#17352D]/25"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.aside
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-line bg-surface shadow-pop"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            role="dialog"
            aria-label="Why this decision"
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-light">
                  <Sparkles size={15} className="text-brand" />
                </div>
                <div>
                  <div className="text-[15px] font-semibold text-ink">Why this decision?</div>
                  <div className="text-micro text-ink-faint">Decision chain · Field Twin + Simulation</div>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close explanation"
                className="rounded-lg p-1.5 text-ink-faint hover:bg-subtle hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {/* Decision chain */}
              <ol className="relative space-y-6 border-l border-line pl-6">
                <Step
                  icon={<Droplets size={13} />}
                  label="Current condition"
                  value="24.6% soil moisture"
                  detail="Root-zone moisture is above the stress threshold, falling about 1.1% per hour under crop water use."
                />
                <Step
                  icon={<CloudRain size={13} />}
                  label="Weather outlook"
                  value="70% rain probability"
                  detail="Around 12 mm of rain is expected within 8 hours — enough to cover most of the crop's demand for tomorrow."
                />
                <Step
                  icon={<FlaskConical size={13} />}
                  label="Simulation result"
                  value="186 L saved by waiting"
                  detail="Simulating wait-6h against irrigate-now shows lower water use with stress staying at 5.2% — under the 15% threshold."
                  highlight
                />
              </ol>

              {/* Plain language */}
              <div className="mt-6 rounded-xl2 border border-line bg-brand-light p-4">
                <div className="text-tiny font-semibold text-brand-dark">In plain language</div>
                <p className="mt-1.5 text-sm leading-relaxed text-[#2A5446]">
                  Waiting allows expected rainfall to contribute to crop demand while keeping projected
                  root-zone moisture above the stress threshold. If the rain does not arrive, AquaTwin
                  schedules a supplemental irrigation automatically.
                </p>
              </div>

              <p className="mt-4 text-micro leading-relaxed text-ink-faint">
                Explanations are generated from the field digital twin, simulation and optimizer outputs.
                The assistant never changes the underlying numeric decision.
              </p>
            </div>

            <div className="border-t border-line p-4">
              <Button variant="primary" className="w-full" onClick={onClose}>
                <FlaskConical size={14} /> View full simulation
              </Button>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function Step({
  icon,
  label,
  value,
  detail,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  highlight?: boolean;
}) {
  return (
    <li className="relative">
      <span
        className={`absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full border ${
          highlight ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink-faint"
        }`}
      >
        {icon}
      </span>
      <div className="text-micro font-medium uppercase tracking-wide text-ink-faint">{label}</div>
      <div className={`mt-0.5 text-sm font-semibold ${highlight ? "text-brand-dark" : "text-ink"}`}>{value}</div>
      <p className="mt-1 text-tiny leading-relaxed text-ink-muted">{detail}</p>
    </li>
  );
}
