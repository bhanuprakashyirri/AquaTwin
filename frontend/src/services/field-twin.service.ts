/**
 * Field Twin, zones, sensors, satellite, and weather services — Production.
 */

import { tryFetch } from "./api-client";
import type {
  Field,
  FieldTwinState,
  SatelliteObservation,
  Sensor,
  WeatherForecastRow,
  WeatherObservationRow,
  Zone,
} from "@/types";

export async function fetchField(fieldId: string) {
  const data = await tryFetch<Field>(`/api/fields/${fieldId}`);
  return { data, error: data ? null : "Field not found" };
}

export async function fetchFieldState(fieldId: string) {
  const data = await tryFetch<FieldTwinState>(`/api/fields/${fieldId}/state`);
  return { data, error: data ? null : "Field digital twin state not recorded" };
}

export async function fetchZones(fieldId: string) {
  const data = await tryFetch<{ zones: Zone[]; zoneStates: any[] }>(`/api/fields/${fieldId}/zones`);
  return {
    data: data ?? { zones: [], zoneStates: [] },
    error: data ? null : "Zones unavailable",
  };
}

export async function fetchWeather(fieldId: string) {
  const data = await tryFetch<{
    source: string;
    status?: string;
    forecast: WeatherForecastRow[];
    observations: WeatherObservationRow[];
    summary: {
      nextRainProbabilityPct: number;
      nextRainInHours: number;
      tempNowC: number;
    } | null;
    error?: string;
  }>(`/api/fields/${fieldId}/weather`);

  return {
    data: data ?? {
      source: "Open-Meteo",
      status: "unavailable",
      forecast: [],
      observations: [],
      summary: null,
      error: "Unable to retrieve the current weather forecast.",
    },
    error: data ? null : "Weather service unreachable",
  };
}

export async function fetchSatellite(fieldId: string) {
  const data = await tryFetch<{
    source: string;
    status: string;
    series: SatelliteObservation[];
    message?: string;
  }>(`/api/fields/${fieldId}/satellite`);

  return {
    data: data ?? {
      source: "Sentinel-2 MSI",
      status: "unconfigured",
      series: [],
      message: "Satellite imagery integration not configured.",
    },
    error: data ? null : "Satellite service unreachable",
  };
}

export async function fetchSensors(fieldId: string) {
  const data = await tryFetch<{ source: string; sensors: Sensor[] }>(`/api/fields/${fieldId}/sensors`);
  return {
    data: data ?? { source: "IoT Sensor Network", sensors: [] },
    error: data ? null : "Sensors service unreachable",
  };
}
