"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { EASE } from "@/lib/motion";
import { AnimatedValue } from "./animated-value";
import { Tooltip } from "./tooltip";
import type { ReactNode } from "react";

export function KpiCard({
  label,
  value,
  sub,
  trend,
  accent = false,
  index = 0,
  info,
  children,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  trend?: { direction: "up" | "down" | "flat"; text: string; good?: boolean };
  accent?: boolean;
  index?: number;
  /** Contextual tooltip shown on hover/focus — explains what the metric means right now. */
  info?: ReactNode;
  children?: ReactNode;
}) {
  const card = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE, delay: index * 0.05 }}
      className={cn(
        "group/kpi relative h-full overflow-hidden rounded-xl2 border border-line bg-surface p-5 shadow-card transition-[border-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:border-[#C3D4CA] hover:shadow-raised",
        accent && "border-[#BFDCCB] bg-brand-light hover:border-[#A9C8B8]",
      )}
    >
      {/* Subtle top accent gradient — gives premium "lit from above" feel */}
      <div className={cn(
        "absolute inset-x-0 top-0 h-[2px] opacity-0 transition-opacity duration-200 group-hover/kpi:opacity-100",
        accent
          ? "bg-gradient-to-r from-brand via-[#34A87A] to-brand/50 opacity-100"
          : "bg-gradient-to-r from-transparent via-brand/40 to-transparent"
      )} />

      <div className="text-tiny font-semibold uppercase tracking-wide text-ink-muted">{label}</div>
      <div className="mt-2 text-[30px] font-bold leading-tight tracking-tight text-ink">
        <AnimatedValue>{value}</AnimatedValue>
      </div>
      <div className="mt-1.5 flex items-center gap-2 text-tiny">
        {trend ? (
          <motion.span
            className={cn(
              "inline-flex items-center gap-0.5 font-medium",
              trend.good === undefined ? "text-ink-muted" : trend.good ? "text-success" : "text-warning",
            )}
            key={trend.text}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
          >
            {trend.direction === "up" ? <ArrowUpRight size={12} /> : trend.direction === "down" ? <ArrowDownRight size={12} /> : <Minus size={12} />}
            {trend.text}
          </motion.span>
        ) : null}
        {sub ? <span className="text-ink-faint">{sub}</span> : null}
      </div>
      {children}
    </motion.div>
  );

  // With `info`, the whole card becomes the tooltip trigger (hover + focus).
  return info ? <Tooltip content={info} className="h-full w-full [&>span]:h-full [&>span]:w-full">{card}</Tooltip> : card;
}

/** Compact supporting indicator — sits below primary KPI row */
export function MiniIndicator({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3 px-1 py-2", className)}>
      <span className="text-tiny text-ink-muted">{label}</span>
      <span className="text-sm font-semibold text-ink">{value}</span>
    </div>
  );
}
