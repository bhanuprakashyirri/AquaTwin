"use client";

import { Database, Plug, RefreshCcw, Satellite, Server, Wifi, Bot } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Panel, PanelHeader, DataBadge, DemoPill } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { fetchSystemStatus } from "@/services/api";
import { useApiData } from "@/hooks/useApiData";

const ADAPTERS = [
  {
    icon: Wifi,
    name: "Sensor data",
    active: "DemoSensorProvider",
    note: "Simulated sensor stream with deterministic readings. Replace with an IoT/MQTT provider — same interface.",
    status: "Demo",
  },
  {
    icon: Server,
    name: "Weather data",
    active: "DemoWeatherProvider",
    note: "48-hour forecast and 7-day observations, seeded deterministically. Swap with OpenMeteo (keyless) or a commercial API.",
    status: "Demo",
  },
  {
    icon: Satellite,
    name: "Satellite data",
    active: "DemoSatelliteProvider",
    note: "Simulated vegetation and water indices. Swap with a Sentinel-2 provider — layers are already labeled as satellite-derived.",
    status: "Demo",
  },
  {
    icon: Database,
    name: "Storage",
    active: "In-memory store",
    note: "TimescaleDB/PostGIS schema is defined; falls back to memory when no database URL is configured.",
    status: "Demo",
  },
  {
    icon: Bot,
    name: "Explanation model",
    active: "Deterministic generator",
    note: "Explanations come from structured twin, simulation and optimizer outputs. A Gemini adapter can enrich prose when a key is configured — it never changes numeric decisions.",
    status: "Optional",
  },
];

export default function SettingsPage() {
  const statusQ = useApiData(() => fetchSystemStatus());

  return (
    <div className="mx-auto max-w-[1000px]">
      <PageHeader
        title="Settings"
        subtitle="Demo configuration, data providers and diagnostics."
        status={statusQ.data}
        actions={<DemoPill />}
      />

      <Panel>
        <PanelHeader title="Demo mode" subtitle="This prototype runs fully offline with seeded data" />
        <div className="space-y-3 p-5">
          <p className="text-sm leading-relaxed text-ink-muted">
            All field, sensor, weather and satellite-derived data is deterministically simulated for demonstration.
            Sensor readings stream in-process, or over WebSocket when the Python backend is running. Nothing on the
            dashboard represents live real-world measurement.
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              if (typeof window !== "undefined") {
                sessionStorage.clear();
                window.location.reload();
              }
            }}
          >
            <RefreshCcw size={14} /> Reset demo
          </Button>
        </div>
      </Panel>

      <Panel className="mt-4">
        <PanelHeader title="Data providers" subtitle="Each demo adapter can be replaced without touching pages or services" />
        <div className="space-y-3 p-5">
          {ADAPTERS.map((a) => (
            <div key={a.name} className="flex gap-3.5 rounded-xl2 border border-line bg-subtle p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface">
                <a.icon size={16} className="text-brand" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-ink">{a.name}</span>
                  <span className="text-tiny text-brand-dark">{a.active}</span>
                  <DataBadge tone={a.status === "Demo" ? "info" : "neutral"}>{a.status}</DataBadge>
                </div>
                <p className="mt-1 text-tiny leading-relaxed text-ink-muted">{a.note}</p>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="mt-4 mb-8">
        <PanelHeader title="Developer diagnostics" subtitle="Implementation details — safe to ignore during a demo" />
        <div className="space-y-1.5 p-5 text-tiny text-ink-muted">
          <div>
            API base: <span className="font-mono text-ink">{process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000"}</span>
          </div>
          <div>
            Engine in use: <span className="font-medium text-ink">{statusQ.source === "backend" ? "FastAPI backend" : "Built-in demo engine"}</span>
          </div>
          <div className="pt-1 leading-relaxed text-ink-faint">
            Start the backend with <span className="font-mono text-ink-soft">uvicorn app.main:app --port 8000</span> from
            /backend. The frontend switches to it automatically; otherwise the identical in-browser engine serves every page.
          </div>
        </div>
      </Panel>
    </div>
  );
}
