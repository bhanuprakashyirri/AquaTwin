"use client";

import { useEffect, useRef, useState } from "react";
import type { Sensor, SensorFrame } from "@/types";

const WS_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export interface SensorStreamState {
  sensors: Sensor[];
  connected: boolean;
  mode: "websocket" | "demo-stream" | "offline";
  lastFrameAt: string | null;
  step: number;
}

/**
 * Streams simulated sensor frames. Uses WS /ws/field/{field_id} when the
 * backend is up; otherwise runs an equivalent in-process demo stream so the
 * UI always shows a live pulse.
 */
export function useSensorStream(fieldId: string, enabled = true): SensorStreamState {
  const [state, setState] = useState<SensorStreamState>({
    sensors: [],
    connected: false,
    mode: "offline",
    lastFrameAt: null,
    step: 0,
  });
  const stepRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    let ws: WebSocket | null = null;
    let demoTimer: ReturnType<typeof setInterval> | null = null;
    let disposed = false;

    const startDemoStream = () => {
      if (disposed || demoTimer) return;
      // lazy import keeps this file free of data deps at module scope
      import("@/lib/demo-data").then(({ SENSORS, DEMO_NOW }) => {
        setState((s) => ({ ...s, mode: "demo-stream", connected: true }));
        demoTimer = setInterval(() => {
          stepRef.current += 1;
          const step = stepRef.current;
          const sensors: Sensor[] = SENSORS.map((sen) => {
            const jitter =
              sen.kind === "soil_moisture"
                ? (deterministicJitter(step, sen.id) - 0.4) * 0.25
                : sen.kind === "temperature"
                  ? (deterministicJitter(step, sen.id) - 0.5) * 0.4
                  : 0;
            let v = sen.lastValue + jitter;
            if (sen.kind === "soil_moisture") v = Math.max(18, Math.min(30, v));
            return { ...sen, lastValue: Math.round(v * 100) / 100 };
          });
          setState((s) => ({
            ...s,
            sensors,
            connected: true,
            mode: "demo-stream",
            lastFrameAt: new Date().toISOString(),
            step,
          }));
        }, 3000);
      });
    };

    // Try WebSocket first
    try {
      const url = WS_BASE.replace(/^http/, "ws") + `/api/ws/field/${fieldId}`;
      ws = new WebSocket(url);
      const wsTimeout = setTimeout(() => {
        if (ws && ws.readyState !== WebSocket.OPEN) {
          ws.close();
          startDemoStream();
        }
      }, 2000);
      ws.onopen = () => {
        clearTimeout(wsTimeout);
        if (!disposed) setState((s) => ({ ...s, mode: "websocket", connected: true }));
      };
      ws.onmessage = (ev) => {
        try {
          const frame: SensorFrame = JSON.parse(ev.data);
          setState((s) => ({
            ...s,
            sensors: frame.sensors,
            connected: true,
            mode: "websocket",
            lastFrameAt: frame.timestamp,
            step: frame.step,
          }));
        } catch {
          /* ignore malformed frames */
        }
      };
      ws.onerror = () => {
        clearTimeout(wsTimeout);
        startDemoStream();
      };
      ws.onclose = () => {
        clearTimeout(wsTimeout);
        if (!disposed && !demoTimer) startDemoStream();
      };
    } catch {
      startDemoStream();
    }

    return () => {
      disposed = true;
      if (demoTimer) clearInterval(demoTimer);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [fieldId, enabled]);

  return state;
}

function deterministicJitter(step: number, id: string): number {
  let h = step * 374761393 + 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
