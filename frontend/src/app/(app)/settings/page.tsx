"use client";

import { Database, Satellite, Server, Wifi, Cpu, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Panel, PanelHeader, DataBadge } from "@/components/ui/panel";
import { fetchSystemStatus } from "@/services/api";
import { useApiData } from "@/hooks/useApiData";

const INTEGRATIONS = [
  {
    icon: Server,
    name: "Weather Intelligence",
    provider: "Open-Meteo High-Resolution NWP",
    status: "Connected",
    tone: "good" as const,
    note: "Live 48-hour hourly forecasting and 7-day meteorological observations driving FAO-56 reference evapotranspiration.",
  },
  {
    icon: Database,
    name: "Relational Persistence",
    provider: "SQLite Database",
    status: "Active",
    tone: "good" as const,
    note: "ACID-compliant storage for farms, field boundaries, soil sensor telemetry, and historical irrigation logs.",
  },
  {
    icon: Cpu,
    name: "Optimization Solver",
    provider: "Google OR-Tools CP-SAT",
    status: "Active",
    tone: "good" as const,
    note: "Constrained mathematical programming solver optimizing water allocation across prioritized farm subzones.",
  },
  {
    icon: Wifi,
    name: "IoT Sensor Gateway",
    provider: "Telemetry WebSocket Gateway",
    status: "Active",
    tone: "neutral" as const,
    note: "Real-time ground soil moisture and temperature ingestion gateway for enrolled hardware probes.",
  },
  {
    icon: Satellite,
    name: "Multispectral Satellite",
    provider: "Copernicus Sentinel-2 MSI",
    status: "Optional (Unconfigured)",
    tone: "neutral" as const,
    note: "Configure SENTINEL_API_KEY in backend environment to ingest 10m-resolution NDVI and NDWI rasters.",
  },
];

export default function SettingsPage() {
  const statusQ = useApiData(() => fetchSystemStatus("field-a"));

  return (
    <div className="mx-auto max-w-[1000px]">
      <PageHeader
        title="Settings & System Status"
        subtitle="Active integrations, telemetry connections, and architectural health."
        status={statusQ.data}
      />

      <Panel>
        <PanelHeader
          title="Production architecture"
          subtitle="Real-time data providers and analytical microservices"
          right={<DataBadge tone="good"><ShieldCheck size={12} className="inline mr-1" />Verified</DataBadge>}
        />
        <div className="space-y-3 p-5">
          {INTEGRATIONS.map((a) => (
            <div key={a.name} className="flex gap-3.5 rounded-xl2 border border-line bg-subtle p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface">
                <a.icon size={16} className="text-brand" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink">{a.name}</span>
                    <span className="text-tiny font-medium text-ink-muted">· {a.provider}</span>
                  </div>
                  <DataBadge tone={a.tone}>{a.status}</DataBadge>
                </div>
                <p className="mt-1 text-tiny leading-relaxed text-ink-muted">{a.note}</p>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="mt-4 mb-8">
        <PanelHeader title="Environment configuration" subtitle="Server connection details" />
        <div className="space-y-2 p-5 text-tiny text-ink-muted">
          <div>
            API Gateway Base: <code className="rounded bg-white px-2 py-0.5 font-mono text-ink">{process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000"}</code>
          </div>
          <div>
            Physical Modeling Version: <span className="font-medium text-ink">FAO-56 Irrigation & Drainage Paper No. 56</span>
          </div>
          <div>
            Solver Protocol: <span className="font-medium text-ink">OR-Tools Constraint Programming (CP-SAT)</span>
          </div>
        </div>
      </Panel>
    </div>
  );
}
