/**
 * Dashboard & Farm metadata services — Production.
 */

import { tryFetch } from "./api-client";
import type { Farm, Recommendation, SystemStatus } from "@/types";

export async function fetchFarms(): Promise<{ data: { farms: Farm[] } | null; error: string | null }> {
  const data = await tryFetch<{ farms: Farm[] }>("/api/farms");
  return {
    data: data ?? { farms: [] },
    error: data ? null : "Unable to reach farms registry",
  };
}

export async function fetchRecommendation(
  fieldId: string = "field-a"
): Promise<{ data: Recommendation | null; error: string | null }> {
  const data = await tryFetch<Recommendation>(`/api/recommendation?field_id=${fieldId}`);
  return {
    data,
    error: data ? null : "Recommendation service unavailable",
  };
}

export async function fetchSystemStatus(
  fieldId: string = "field-a"
): Promise<{ data: SystemStatus | null; error: string | null }> {
  const data = await tryFetch<SystemStatus>(`/api/system/status?field_id=${fieldId}`);
  return {
    data: data ?? {
      sensorStream: "OFFLINE",
      weather: "UNAVAILABLE",
      satelliteLastSync: null,
      digitalTwin: "IDLE",
      demoMode: false,
    },
    error: data ? null : "Unable to reach backend status service",
  };
}
