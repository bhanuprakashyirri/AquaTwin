"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { SystemStatusBar } from "@/components/ui/status";
import type { SystemStatus } from "@/types";

export function PageHeader({
  title,
  subtitle,
  actions,
  status,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  status: SystemStatus | null;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="mb-6"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink md:text-[26px]">
            {title}
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-muted">
            {subtitle}
          </p>
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2.5">{actions}</div>
        ) : null}
      </div>
      <div className="mt-3.5">
        <SystemStatusBar status={status} />
      </div>
    </motion.div>
  );
}

