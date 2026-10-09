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
  const data = await tryFetch<{ zones: any[]; zoneStates: any[] }>(`/api/fields/${fieldId}/zones`);
  if (!data || !Array.isArray(data.zones)) {
    return { data: { zones: [], zoneStates: [] }, error: "Zones unavailable" };
  }

  const normalizedZones: Zone[] = data.zones.map((z: any) => {
    let geom = z.geometry;
    if (typeof geom === "string") {
      try { geom = JSON.parse(geom); } catch { geom = null; }
    }
    if (!geom && z.geometry_json) {
      try { geom = JSON.parse(z.geometry_json); } catch { geom = null; }
    }
    return {
      id: z.id,
      name: z.name,
      areaHa: z.areaHa ?? z.area_ha ?? 1.0,
      soilType: z.soilType ?? z.soil_type ?? "Loam",
      geometry: geom,
      moisturePct: Number(z.moisturePct ?? z.moisture_pct ?? 0),
      stressRiskPct: Number(z.stressRiskPct ?? z.stress_risk_pct ?? 0),
      waterRequirementL: Number(z.waterRequirementL ?? z.water_requirement_l ?? 0),
      rainExposure: z.rainExposure ?? z.rain_exposure ?? "Medium",
      lastIrrigatedHoursAgo: Number(z.lastIrrigatedHoursAgo ?? z.last_irrigated_hours_ago ?? 0),
      ndvi: Number(z.ndvi ?? 0.72),
      priority: Number(z.priority ?? 1),
    };
  });

  return {
    data: { zones: normalizedZones, zoneStates: data.zoneStates ?? [] },
    error: null,
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
