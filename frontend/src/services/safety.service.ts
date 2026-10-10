/**
 * Missed-Rain Protection & Electricity-Slot Safety services — Production.
 *
 * Backed by the slot-aware decision engine that prevents
 * "skip irrigation because rain is forecast" advice from becoming
 * a crop-water disaster when the forecast is wrong and the next
 * agricultural power slot is far away.
 */

import { tryFetch } from "./api-client";
import type { MissedRainRequest, MissedRainResult, SafetyPolicy } from "@/types";

export async function postMissedRain(body: MissedRainRequest) {
  const data = await tryFetch<MissedRainResult>("/api/safety/missed-rain", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return { data, error: data ? null : "Missed-rain safety engine unavailable" };
}

export async function fetchSafetyPolicy() {
  const data = await tryFetch<SafetyPolicy>("/api/safety/policy");
  return { data, error: data ? null : "Safety policy unavailable" };
}
