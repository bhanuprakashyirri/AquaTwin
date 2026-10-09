/**
 * Irrigation optimization, history, and water fingerprint services.
 */

import { IRRIGATION_HISTORY, ZONES } from "@/lib/demo-data";
import { optimizeWater } from "@/lib/demo-engine";
import { tryFetch, withFallback } from "./api-client";
import type { IrrigationEvent, OptimizationResult } from "@/types";

export function postOptimize(availableWaterL: number) {
  return withFallback(
    () =>
      tryFetch<OptimizationResult>("/api/water-budget/optimize", {
        method: "POST",
        body: JSON.stringify({ availableWaterL }),
      }),
    () => optimizeWater(ZONES, availableWaterL)
  );
}

export function fetchHistory(fieldId: string) {
  return withFallback(
    () =>
      tryFetch<{ events: IrrigationEvent[] }>(`/api/fields/${fieldId}/history`),
    () => ({ events: IRRIGATION_HISTORY })
  );
}

export function fetchWaterFingerprint() {
  return withFallback(
    () =>
      tryFetch<{
        moistureRetention: number;
        dryingRatePctPerDay: number;
        irrigationResponsePct: number;
        rainResponsePct: number;
        recoveryHours: number;
        notes: string[];
      }>("/api/analytics/water-fingerprint"),
    () => ({
      moistureRetention: 72,
      dryingRatePctPerDay: 4.6,
      irrigationResponsePct: 13.8,
      rainResponsePct: 9.2,
      recoveryHours: 26,
      notes: [
        "Clay-loam subzones retain moisture roughly 30% longer than sandy-loam subzones.",
        "Night-time ETc drops irrigation demand by ~40% versus midday peaks.",
        "The model learns how this field responds to irrigation and environmental conditions.",
      ],
    })
  );
}
