"use client";

import { useEffect, useState } from "react";
import type { Sensor, SensorFrame } from "@/types";

const WS_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export interface SensorStreamState {
  sensors: Sensor[];
  connected: boolean;
  mode: "websocket" | "offline";
  lastFrameAt: string | null;
  step: number;
}

/**
 * Streams real-time sensor frames from the FastAPI WebSocket gateway.
 * When disconnected or unconfigured, reports honest offline state.
 */
export function useSensorStream(fieldId: string, enabled = true): SensorStreamState {
  const [state, setState] = useState<SensorStreamState>({
    sensors: [],
    connected: false,
    mode: "offline",
    lastFrameAt: null,
    step: 0,
  });

  useEffect(() => {
    if (!enabled) return;
    let ws: WebSocket | null = null;
    let disposed = false;

    try {
      const url = WS_BASE.replace(/^http/, "ws") + `/api/ws/field/${fieldId}`;
      ws = new WebSocket(url);

      ws.onopen = () => {
        if (!disposed) {
          setState((s) => ({ ...s, mode: "websocket", connected: true }));
        }
      };

      ws.onmessage = (ev) => {
        try {
          const frame: SensorFrame = JSON.parse(ev.data);
          if (!disposed) {
            setState((s) => ({
              ...s,
              sensors: frame.sensors || [],
              connected: true,
              mode: "websocket",
              lastFrameAt: frame.timestamp,
              step: frame.step,
            }));
          }
        } catch {
          /* ignore malformed frames */
        }
      };

      ws.onerror = () => {
        if (!disposed) {
          setState((s) => ({ ...s, mode: "offline", connected: false }));
        }
      };

      ws.onclose = () => {
        if (!disposed) {
          setState((s) => ({ ...s, mode: "offline", connected: false }));
        }
      };
    } catch {
      if (!disposed) {
        setState((s) => ({ ...s, mode: "offline", connected: false }));
      }
    }

    return () => {
      disposed = true;
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        } else if (ws.readyState === WebSocket.CONNECTING) {
          ws.onopen = () => {
            try {
              ws?.close();
            } catch {
              /* ignore */
            }
          };
        }
      }
    };
  }, [fieldId, enabled]);

  return state;
}
