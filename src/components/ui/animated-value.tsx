"use client";

import { motion } from "framer-motion";
import { EASE } from "@/lib/motion";
import type { ReactNode } from "react";

/**
 * AnimatedValue — re-mounts (and pops) whenever its rendered value changes.
 * Used for KPI numbers so live demo-stream updates are noticed as deltas,
 * not silently swapped (QuizCore "deltaPop" pattern, tuned for a calm UI).
 */
export function AnimatedValue({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.span
      key={String(children)}
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: EASE }}
      className={className}
    >
      {children}
    </motion.span>
  );
}
