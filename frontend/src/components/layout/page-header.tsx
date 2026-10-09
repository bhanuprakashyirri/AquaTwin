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
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="mb-6"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-gradient-brand">{title}</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-muted">{subtitle}</p>
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      <div className="mt-4 relative">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-brand/30 via-brand/10 to-transparent" />
        <div className="pt-3">
          <SystemStatusBar status={status} />
        </div>
      </div>
    </motion.div>
  );
}

