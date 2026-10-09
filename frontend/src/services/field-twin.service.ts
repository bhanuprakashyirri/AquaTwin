/**
 * Field Twin, zones, sensors, satellite, and weather services.
 */

import {
  FIELD,
  FIELD_STATE,
  FORECAST_48H,
  OBSERVATIONS_7D,
  SATELLITE_SERIES,
  SENSORS,
  ZONES,
} from "@/lib/demo-data";
import { tryFetch, withFallback } from "./api-client";
import type {
  Field,
  FieldTwinState,
  SatelliteObservation,
  Sensor,
  WeatherForecastRow,
  WeatherObservationRow,
  Zone,
} from "@/types";

export function fetchField(fieldId: string) {
  return withFallback(
    () => tryFetch<Field>(`/api/fields/${fieldId}`),
    () => FIELD
  );
}

export function fetchFieldState(fieldId: string) {
  return withFallback(
    () => tryFetch<FieldTwinState>(`/api/fields/${fieldId}/state`),
    () => ({ ...FIELD_STATE, updatedAt: new Date().toISOString() })
  );
}

export function fetchZones(fieldId: string) {
  return withFallback(
    () => tryFetch<{ zones: Zone[] }>(`/api/fields/${fieldId}/zones`),
    () => ({ zones: ZONES })
  );
}

export function fetchWeather(fieldId: string) {
  return withFallback(
    () =>
      tryFetch<{
        source: string;
        forecast: WeatherForecastRow[];
        observations: WeatherObservationRow[];
        summary: {
          nextRainProbabilityPct: number;
          nextRainInHours: number;
          tempNowC: number;
        };
      }>(`/api/fields/${fieldId}/weather`),
    () => {
      let nextRainH = 0;
      let nextRainP = 0;
      for (let h = 0; h < FORECAST_48H.length; h++) {
        if (
          FORECAST_48H[h].rainProbabilityPct >= 50 &&
          FORECAST_48H[h].rainfallMm > 0.5
        ) {
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
    }
  );
}

export function fetchSatellite(fieldId: string) {
  return withFallback(
    () =>
      tryFetch<{ source: string; series: SatelliteObservation[] }>(
        `/api/fields/${fieldId}/satellite`
      ),
    () => ({ source: "Satellite-derived demo layer", series: SATELLITE_SERIES })
  );
}

export function fetchSensors(fieldId: string) {
  return withFallback(
    () =>
      tryFetch<{ source: string; sensors: Sensor[] }>(
        `/api/fields/${fieldId}/sensors`
      ),
    () => ({ source: "Simulated Sensor Stream", sensors: SENSORS })
  );
}
