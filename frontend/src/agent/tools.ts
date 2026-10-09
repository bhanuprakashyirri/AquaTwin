/**
 * Agent tool registry — every capability the voice agent can use.
 * Data tools wrap the existing API client (FastAPI backend with
 * deterministic demo-engine fallback), so the agent always answers
 * with the same numbers the UI shows.
 */

import {
  fetchFieldState,
  fetchHistory,
  fetchRecommendation,
  fetchSensors,
  fetchSystemStatus,
  fetchWaterFingerprint,
  fetchWeather,
  fetchZones,
  postOptimize,
  postRainUncertainty,
  postSimulation,
} from "@/services/api";

export interface ToolArgs {
  [key: string]: unknown;
}

export interface Tool<T = unknown> {
  id: string;
  description: string;
  execute: (args?: ToolArgs) => Promise<T>;
}

const FIELD_ID = "field-a";

export const tools = {
  get_field_state: {
    id: "get_field_state",
    description:
      "Digital twin state — root-zone moisture, crop water loss, effective rainfall, water balance",
    execute: async () => (await fetchFieldState(FIELD_ID)).data,
  },
  get_zones: {
    id: "get_zones",
    description:
      "All irrigation zones — moisture, stress risk, water requirement, NDVI, priority",
    execute: async () => (await fetchZones(FIELD_ID)).data,
  },
  get_weather: {
    id: "get_weather",
    description: "48h weather forecast, 7d observations, next-rain summary",
    execute: async () => (await fetchWeather(FIELD_ID)).data,
  },
  get_sensors: {
    id: "get_sensors",
    description: "Live sensor readings — soil moisture, temperature, rain gauge",
    execute: async () => (await fetchSensors(FIELD_ID)).data,
  },
  get_history: {
    id: "get_history",
    description: "Irrigation event history with decisions and reasons",
    execute: async () => (await fetchHistory(FIELD_ID)).data,
  },
  get_recommendation: {
    id: "get_recommendation",
    description: "Current AI irrigation recommendation with rationale and confidence",
    execute: async () => (await fetchRecommendation()).data,
  },
  get_system_status: {
    id: "get_system_status",
    description: "System status — sensor stream, weather, digital twin state",
    execute: async () => (await fetchSystemStatus()).data,
  },
  get_water_fingerprint: {
    id: "get_water_fingerprint",
    description:
      "How the field responds to irrigation and rain — retention, drying rate, recovery",
    execute: async () => (await fetchWaterFingerprint()).data,
  },
  run_simulation: {
    id: "run_simulation",
    description: "Run the 48h what-if simulation across all irrigation strategies",
    execute: async (args?: ToolArgs) => {
      const start = typeof args?.startPct === "number" ? args.startPct : 24.6;
      const horizon = typeof args?.horizonHours === "number" ? args.horizonHours : 48;
      const water = typeof args?.availableWaterL === "number" ? args.availableWaterL : 2000;
      return (await postSimulation(start, horizon, water)).data;
    },
  },
  run_rain_uncertainty: {
    id: "run_rain_uncertainty",
    description:
      "Test the recommended plan against rain arriving, partially arriving, or failing",
    execute: async (args?: ToolArgs) => {
      const strategy = typeof args?.strategy === "string" ? args.strategy : "wait6";
      return (await postRainUncertainty(strategy)).data;
    },
  },
  optimize_water: {
    id: "optimize_water",
    description:
      "Allocate a limited water budget across zones by stress reduction per litre",
    execute: async (args?: ToolArgs) => {
      const amount = typeof args?.availableWaterL === "number" ? args.availableWaterL : 2000;
      return (await postOptimize(amount)).data;
    },
  },
} satisfies Record<string, Tool>;

export type ToolId = keyof typeof tools;
