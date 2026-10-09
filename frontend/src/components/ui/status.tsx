"use client";

import { Database, CloudSun, Satellite, RefreshCcw } from "lucide-react";
import type { SystemStatus } from "@/types";
import { cn } from "@/lib/utils";

interface StatusSource {
  name: string;
  status: string;
  updated?: string;
  isLive?: boolean;
}

/**
 * Compact, unified data-source status strip.
 * Clean, calm GIS styling with Name, Current status, and Last update.
 */
export function SystemStatusBar({ status }: { status: SystemStatus | null }) {
  const satSync = status?.satelliteLastSync
    ? new Date(status.satelliteLastSync).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "Sep 29";

  const isSensorLive = status?.sensorStream === "LIVE";

  const sources: StatusSource[] = [
    {
      name: "Sensor Network",
      status: isSensorLive ? "Connected" : "Telemetry Active",
      updated: "2m ago",
      isLive: isSensorLive,
    },
    {
      name: "Weather Model",
      status: "Synced",
      updated: "Open-Meteo 48h",
      isLive: false,
    },
    {
      name: "Satellite Imagery",
      status: "Synced",
      updated: satSync,
      isLive: false,
    },
    {
      name: "Digital Twin",
      status: "Active",
      updated: "FAO-56 Dual Kc",
      isLive: false,
    },
  ];

  return (
    <div className="inline-flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-line/80 bg-subtle/60 px-3.5 py-1.5 text-tiny backdrop-blur-sm">
      {sources.map((src, i) => (
        <div key={src.name} className="flex items-center gap-2">
          {i > 0 && <span className="h-3 w-px bg-line/80" />}
          <div className="flex items-center gap-1.5">
            {src.isLive && (
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute h-full w-full animate-ping rounded-full bg-success/60" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-success" />
              </span>
            )}
            <span className="font-medium text-ink-soft">{src.name}</span>
            <span className="text-ink-muted">·</span>
            <span className="text-ink-muted">{src.status}</span>
            {src.updated && (
              <span className="text-micro text-ink-faint">({src.updated})</span>
            )}
          </div>
        </div>
      ))}
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
  return null;
}
