/**
 * Simulation and What-If scenario services — Production.
 */

import { tryFetch } from "./api-client";
import type { RainUncertaintyScenario, SimulationResult } from "@/types";

export async function postSimulation(
  startPct: number,
  horizon = 48,
  availableWater = 2000,
  fieldId = "field-a"
) {
  const data = await tryFetch<SimulationResult>("/api/simulation/run", {
    method: "POST",
    body: JSON.stringify({
      startMoisturePct: startPct,
      horizonHours: horizon,
      availableWaterL: availableWater,
      fieldId,
    }),
  });
  return { data, error: data ? null : "Simulation computation failed" };
}

export async function postRainUncertainty(
  strategy = "wait6",
  startPct = 24.6,
  fieldId = "field-a"
) {
  const data = await tryFetch<{ scenarios: RainUncertaintyScenario[] }>(
    "/api/simulation/rain-uncertainty",
    {
      method: "POST",
      body: JSON.stringify({ strategy, startMoisturePct: startPct, fieldId }),
    }
  );
  return {
    data: data ?? { scenarios: [] },
    error: data ? null : "Uncertainty simulation failed",
  };
}
