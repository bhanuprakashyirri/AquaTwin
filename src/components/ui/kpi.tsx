"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function KpiCard({
  label,
  value,
  sub,
  trend,
  accent = false,
  index = 0,
  children,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  trend?: { direction: "up" | "down" | "flat"; text: string; good?: boolean };
  accent?: boolean;
  index?: number;
  children?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
      className={cn(
        "rounded-xl2 border border-line bg-surface p-5 shadow-card",
        accent && "border-[#BFDCCB] bg-brand-light",
      )}
    >
      <div className="text-tiny font-medium text-ink-muted">{label}</div>
      <div className="mt-1.5 text-[30px] font-semibold leading-tight tracking-tight text-ink">{value}</div>
      <div className="mt-1 flex items-center gap-2 text-tiny">
        {trend ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-medium",
              trend.good === undefined ? "text-ink-muted" : trend.good ? "text-success" : "text-warning",
            )}
          >
            {trend.direction === "up" ? <ArrowUpRight size={12} /> : trend.direction === "down" ? <ArrowDownRight size={12} /> : <Minus size={12} />}
            {trend.text}
          </span>
        ) : null}
        {sub ? <span className="text-ink-faint">{sub}</span> : null}
      </div>
      {children}
    </motion.div>
  );
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
