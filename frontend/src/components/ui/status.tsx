"use client";

import { Database, CloudSun, Satellite, RefreshCcw } from "lucide-react";
import type { SystemStatus } from "@/types";
import { cn } from "@/lib/utils";

function FreshItem({
  icon,
  label,
  detail,
  live = false,
}: {
  icon: React.ReactNode;
  label: string;
  detail: string;
  live?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-ink-faint">{icon}</span>
      <div className="leading-tight">
        <div className="flex items-center gap-1.5 text-tiny font-medium text-ink-soft">
          {label}
          {live ? <span className="relative flex h-1.5 w-1.5"><span className="absolute h-full w-full animate-ping rounded-full bg-success/50" /><span className="relative h-1.5 w-1.5 rounded-full bg-success" /></span> : null}
        </div>
        <div className="text-micro text-ink-faint">{detail}</div>
      </div>
    </div>
  );
}

/** Compact, human data-freshness strip — replaces the technical status bar. */
export function SystemStatusBar({ status }: { status: SystemStatus | null }) {
  const satSync = status?.satelliteLastSync
    ? new Date(status.satelliteLastSync).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "Sep 29";
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
      <FreshItem icon={<Database size={14} />} label="Sensor data" detail="Updated 2 min ago" live />
      <FreshItem icon={<CloudSun size={14} />} label="Weather" detail="Updated 8 min ago" />
      <FreshItem icon={<Satellite size={14} />} label="Satellite" detail={`Synced ${satSync}`} />
      <FreshItem icon={<RefreshCcw size={14} />} label="Digital Twin" detail="Active" />
    </div>
  );
}

/** Live dot kept for sensor-stream surfaces */
export function LiveDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="absolute h-full w-full animate-ping rounded-full bg-success/50" />
      <span className="relative h-2 w-2 rounded-full bg-success" />
    </span>
  );
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-line bg-subtle px-2 py-0.5 text-micro font-medium text-ink-muted",
        className,
      )}
    >
      Demo data
    </span>
  );
}
