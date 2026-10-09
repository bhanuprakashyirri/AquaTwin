/**
 * Dashboard & Farm metadata services.
 */

import { FARM } from "@/lib/demo-data";
import { getRecommendation } from "@/lib/demo-engine";
import { tryFetch, withFallback } from "./api-client";
import type { Farm, Recommendation, SystemStatus } from "@/types";

export function fetchFarms() {
  return withFallback(
    () => tryFetch<{ farms: Farm[] }>("/api/farms"),
    () => ({ farms: [FARM] })
  );
}

export function fetchRecommendation() {
  return withFallback(
    () => tryFetch<Recommendation>("/api/recommendation"),
    () => getRecommendation()
  );
}

export function fetchSystemStatus() {
  return withFallback(
    () => tryFetch<SystemStatus>("/api/system/status"),
    () => ({
      sensorStream: "DEMO" as const,
      weather: "UPDATED" as const,
      satelliteLastSync: new Date().toISOString(),
      digitalTwin: "ACTIVE" as const,
      demoMode: true,
    })
  );
}
