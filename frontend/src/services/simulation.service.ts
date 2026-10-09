/**
 * Simulation and What-If scenario services.
 */

import { rainUncertainty, runFullSimulation } from "@/lib/demo-engine";
import { tryFetch, withFallback } from "./api-client";
import type { RainUncertaintyScenario, SimulationResult } from "@/types";

export function postSimulation(
  startPct: number,
  horizon = 48,
  availableWater = 2000
) {
  return withFallback(
    () =>
      tryFetch<SimulationResult>("/api/simulation/run", {
        method: "POST",
        body: JSON.stringify({
          startMoisturePct: startPct,
          horizonHours: horizon,
          availableWaterL: availableWater,
        }),
      }),
    () => runFullSimulation(startPct, horizon, availableWater)
  );
}

export function postRainUncertainty(strategy = "wait6") {
  return withFallback(
    () =>
      tryFetch<{ scenarios: RainUncertaintyScenario[] }>(
        "/api/simulation/rain-uncertainty",
        {
          method: "POST",
          body: JSON.stringify({ strategy }),
        }
      ),
    () => ({ scenarios: rainUncertainty(strategy) })
  );
}
