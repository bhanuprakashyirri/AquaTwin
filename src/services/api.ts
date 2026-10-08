/**
 * API client — tries the FastAPI backend first, falls back to the local
 * deterministic demo engine so the UI never breaks during a presentation.
 */

import {
  FIELD,
  FARM,
  FIELD_STATE,
  FORECAST_48H,
  IRRIGATION_HISTORY,
  OBSERVATIONS_7D,
  SATELLITE_SERIES,
  SENSORS,
  ZONES,
} from "@/lib/demo-data";
import {
  getRecommendation,
  optimizeWater,
  rainUncertainty,
  runFullSimulation,
} from "@/lib/demo-engine";
import type {
  Farm,
  Field,
  FieldTwinState,
  IrrigationEvent,
  OptimizationResult,
  RainUncertaintyScenario,
  Recommendation,
  SatelliteObservation,
  Sensor,
  SimulationResult,
  SystemStatus,
  WeatherForecastRow,
  WeatherObservationRow,
  Zone,
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
const TIMEOUT_MS = 2500;

export type DataSource = "backend" | "demo";
export { getRecommendation, optimizeWater, rainUncertainty, runFullSimulation };

async function tryFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Run a backend call; if unreachable, produce the same result locally. */
async function withFallback<T>(remote: () => Promise<T | null>, local: () => T): Promise<{ data: T; source: DataSource }> {
  const remote_ = await remote();
  if (remote_ !== null) return { data: remote_, source: "backend" };
  return { data: local(), source: "demo" };
}

// ---------------------------------------------------------------- API

export function fetchFarms() {
  return withFallback(
    () => tryFetch<{ farms: Farm[] }>("/api/farms"),
    () => ({ farms: [FARM] }),
  );
}

export function fetchField(fieldId: string) {
  return withFallback(
    () => tryFetch<Field>(`/api/fields/${fieldId}`),
    () => FIELD,
  );
}

export function fetchFieldState(fieldId: string) {
  return withFallback(
    () => tryFetch<FieldTwinState>(`/api/fields/${fieldId}/state`),
    () => ({ ...FIELD_STATE, updatedAt: new Date().toISOString() }),
  );
}

export function fetchZones(fieldId: string) {
  return withFallback(
    () => tryFetch<{ zones: Zone[] }>("/api/fields/field-a/zones"),
    () => ({ zones: ZONES }),
  );
}

export function fetchWeather(fieldId: string) {
  return withFallback(
    () =>
      tryFetch<{ source: string; forecast: WeatherForecastRow[]; observations: WeatherObservationRow[]; summary: { nextRainProbabilityPct: number; nextRainInHours: number; tempNowC: number } }>(
        `/api/fields/${fieldId}/weather`,
      ),
    () => {
      let nextRainH = 0;
      let nextRainP = 0;
      for (let h = 0; h < FORECAST_48H.length; h++) {
        if (FORECAST_48H[h].rainProbabilityPct >= 50 && FORECAST_48H[h].rainfallMm > 0.5) {
          nextRainH = h;
          nextRainP = FORECAST_48H[h].rainProbabilityPct;
          break;
        }
      }
      return {
        source: "Demo Data",
        forecast: FORECAST_48H,
        observations: OBSERVATIONS_7D,
        summary: {
          nextRainProbabilityPct: nextRainP || 68,
          nextRainInHours: nextRainH || 7,
          tempNowC: FORECAST_48H[0].temperatureC,
        },
      };
    },
  );
}

export function fetchSatellite(fieldId: string) {
  return withFallback(
    () => tryFetch<{ source: string; series: SatelliteObservation[] }>(`/api/fields/${fieldId}/satellite`),
    () => ({ source: "Satellite-derived demo layer", series: SATELLITE_SERIES }),
  );
}

export function fetchSensors(fieldId: string) {
  return withFallback(
    () => tryFetch<{ source: string; sensors: Sensor[] }>(`/api/fields/${fieldId}/sensors`),
    () => ({ source: "Simulated Sensor Stream", sensors: SENSORS }),
  );
}

export function fetchHistory(fieldId: string) {
  return withFallback(
    () => tryFetch<{ events: IrrigationEvent[] }>(`/api/fields/${fieldId}/history`),
    () => ({ events: IRRIGATION_HISTORY }),
  );
}

export function postSimulation(startPct: number, horizon = 48, availableWater = 2000) {
  return withFallback(
    () =>
      tryFetch<SimulationResult>("/api/simulation/run", {
        method: "POST",
        body: JSON.stringify({ startMoisturePct: startPct, horizonHours: horizon, availableWaterL: availableWater }),
      }),
    () => runFullSimulation(startPct, horizon, availableWater),
  );
}

export function postRainUncertainty(strategy = "wait6") {
  return withFallback(
    () => tryFetch<{ scenarios: RainUncertaintyScenario[] }>("/api/simulation/rain-uncertainty", {
      method: "POST",
      body: JSON.stringify({ strategy }),
    }),
    () => ({ scenarios: rainUncertainty(strategy) }),
  );
}

export function postOptimize(availableWaterL: number) {
  return withFallback(
    () =>
      tryFetch<OptimizationResult>("/api/water-budget/optimize", {
        method: "POST",
        body: JSON.stringify({ availableWaterL }),
      }),
    () => optimizeWater(ZONES, availableWaterL),
  );
}

export function fetchRecommendation() {
  return withFallback(
    () => tryFetch<Recommendation>("/api/recommendation"),
    () => getRecommendation(),
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
    }),
  );
}

export function fetchWaterFingerprint() {
  return withFallback(
    () =>
      tryFetch<{ moistureRetention: number; dryingRatePctPerDay: number; irrigationResponsePct: number; rainResponsePct: number; recoveryHours: number; notes: string[] }>(
        "/api/analytics/water-fingerprint",
      ),
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
    }),
  );
}
