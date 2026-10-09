/**
 * Irrigation optimization, history, and water fingerprint services — Production.
 */

import { tryFetch } from "./api-client";
import type { IrrigationEvent, OptimizationResult, Zone } from "@/types";

export async function postOptimize(
  availableWaterL: number,
  fieldId = "field-a",
  zones?: Zone[]
) {
  const data = await tryFetch<OptimizationResult>("/api/water-budget/optimize", {
    method: "POST",
    body: JSON.stringify({ availableWaterL, fieldId, zones }),
  });
  return {
    data: data ?? {
      availableWaterL,
      totalNeedL: 0,
      totalAllocatedL: 0,
      allocations: [],
      constraintStatus: "No zones registered",
      waterSavedL: 0,
      explanation: "No active field zones registered to allocate water.",
      solver: "N/A",
    },
    error: data ? null : "Optimization failed",
  };
}

export async function fetchHistory(fieldId: string) {
  const data = await tryFetch<{ events: IrrigationEvent[] }>(`/api/fields/${fieldId}/history`);
  return {
    data: data ?? { events: [] },
    error: data ? null : "History unavailable",
  };
}

export async function fetchWaterFingerprint(fieldId: string = "field-a") {
  const data = await tryFetch<{
    status: string;
    moistureRetention: number;
    dryingRatePctPerDay: number;
    irrigationResponsePct: number;
    rainResponsePct: number;
    recoveryHours: number;
    notes: string[];
  }>(`/api/analytics/water-fingerprint?field_id=${fieldId}`);

  return {
    data,
    error: data ? null : "Water fingerprint unavailable",
  };
}
