/**
 * Seeded demo data — deterministic, realistic, zero external dependencies.
 * Mirrors backend/app/services/demo_data.py (values kept in sync).
 */

import type {
  Farm,
  Field,
  IrrigationEvent,
  SatelliteObservation,
  Sensor,
  WeatherForecastRow,
  WeatherObservationRow,
  Zone,
} from "@/types";

export const DEMO_NOW = new Date("2026-09-29T09:41:00Z");

function iso(dt: Date): string {
  return dt.toISOString();
}

export function nowIso(): string {
  return DEMO_NOW.toISOString();
}

// ---------------------------------------------------------------- geo
// Realistic placement: coastal Andhra Pradesh, India (near Bhimavaram).
// Not an actual customer's farm — demo geography.

const LON = 81.5212;
const LAT = 16.5449;

function off(dlon: number, dlat: number): [number, number] {
  return [
    Math.round((LON + dlon) * 1e6) / 1e6,
    Math.round((LAT + dlat) * 1e6) / 1e6,
  ];
}

export const FIELD_GEOM = {
  type: "Polygon" as const,
  coordinates: [
    [
      off(-0.0018, -0.0013), off(0.0018, -0.0013), off(0.0018, 0.0013),
      off(-0.0018, 0.0013), off(-0.0018, -0.0013),
    ],
  ],
};

export const ZONE_GEOMS: Record<string, { type: "Polygon"; coordinates: [number, number][][] }> = {
  "zone-a": { type: "Polygon", coordinates: [[
    off(-0.0018, -0.0013), off(0.00005, -0.0013), off(0.00005, -0.00002),
    off(-0.0018, -0.00002), off(-0.0018, -0.0013),
  ]] },
  "zone-b": { type: "Polygon", coordinates: [[
    off(0.00005, -0.00002), off(0.0018, -0.00002), off(0.0018, 0.0013),
    off(0.00005, 0.0013), off(0.00005, -0.00002),
  ]] },
  "zone-c": { type: "Polygon", coordinates: [[
    off(0.00005, -0.0013), off(0.0018, -0.0013), off(0.0018, -0.00002),
    off(0.00005, -0.00002), off(0.00005, -0.0013),
  ]] },
  "zone-d": { type: "Polygon", coordinates: [[
    off(-0.0018, -0.00002), off(0.00005, -0.00002), off(0.00005, 0.0013),
    off(-0.0018, 0.0013), off(-0.0018, -0.00002),
  ]] },
};

// ---------------------------------------------------------------- sensors

function sensor(
  id: string, zoneId: string, kind: Sensor["kind"],
  dlon: number, dlat: number, lastValue: number, depthCm?: number,
): Sensor {
  return {
    id, zoneId, kind,
    position: { type: "Point", coordinates: off(dlon, dlat) },
    depthCm: depthCm ?? null,
    lastValue,
    lastReadingAt: iso(new Date(DEMO_NOW.getTime() - 2 * 60_000)),
    status: "demo",
  };
}

export const SENSORS: Sensor[] = [
  sensor("s1", "zone-a", "soil_moisture", -0.0012, 0.0006, 27.4, 30),
  sensor("s2", "zone-a", "temperature", -0.0006, -0.0006, 31.2),
  sensor("s3", "zone-b", "soil_moisture", 0.0009, 0.0006, 21.8, 30),
  sensor("s4", "zone-b", "temperature", 0.0009, -0.0006, 32.1),
  sensor("s5", "zone-c", "soil_moisture", -0.0012, -0.0006, 26.1, 30),
  sensor("s6", "zone-c", "temperature", -0.0006, 0.0006, 30.6),
  sensor("s7", "zone-d", "soil_moisture", 0.0009, -0.0006, 23.5, 30),
  sensor("s8", "zone-d", "rain_gauge", -0.0006, 0, 0),
];

// ---------------------------------------------------------------- zones / field / farm

export const ZONES: Zone[] = [
  {
    id: "zone-a", name: "Zone A", areaHa: 3, soilType: "Sandy loam",
    geometry: ZONE_GEOMS["zone-a"],
    moisturePct: 26.4, stressRiskPct: 9, waterRequirementL: 400,
    rainExposure: "Medium", lastIrrigatedHoursAgo: 30, ndvi: 0.62, priority: 4,
  },
  {
    id: "zone-b", name: "Zone B", areaHa: 3, soilType: "Clay loam",
    geometry: ZONE_GEOMS["zone-b"],
    moisturePct: 21.8, stressRiskPct: 22, waterRequirementL: 900,
    rainExposure: "Medium", lastIrrigatedHoursAgo: 18, ndvi: 0.58, priority: 1,
  },
  {
    id: "zone-c", name: "Zone C", areaHa: 2, soilType: "Sandy loam",
    geometry: ZONE_GEOMS["zone-c"],
    moisturePct: 25.6, stressRiskPct: 12, waterRequirementL: 600,
    rainExposure: "High", lastIrrigatedHoursAgo: 41, ndvi: 0.66, priority: 3,
  },
  {
    id: "zone-d", name: "Zone D", areaHa: 2, soilType: "Loam",
    geometry: ZONE_GEOMS["zone-d"],
    moisturePct: 23.2, stressRiskPct: 18, waterRequirementL: 800,
    rainExposure: "Medium", lastIrrigatedHoursAgo: 24, ndvi: 0.6, priority: 2,
  },
];

export const FIELD: Field = {
  id: "field-a",
  name: "North Plot — Paddy/Rice Rotation",
  areaHa: 10,
  crop: {
    name: "Rice",
    variety: "MTU-7029 (Swarna)",
    growthStage: "Reproductive — panicle initiation",
    daysAfterSowing: 58,
    cropCoefficient: 1.12,
  },
  geometry: FIELD_GEOM,
  sowingDate: "2026-08-02",
  soilTexture: "Sandy loam to clay loam",
};

export const FARM: Farm = {
  id: "farm-srkr-demo",
  name: "Kisan Bhimavaram Demo Farm",
  location: "Bhimavaram, Andhra Pradesh, India",
  fields: [FIELD],
};

// ---------------------------------------------------------------- weather

export const FORECAST_48H: WeatherForecastRow[] = Array.from({ length: 48 }, (_, h) => {
  const t = new Date(DEMO_NOW.getTime() + h * 3_600_000);
  const diurnal = Math.sin(((t.getUTCHours() - 6) / 24) * 2 * Math.PI);
  let prob = 0;
  let rain = 0;
  if (h >= 6 && h <= 12) {
    prob = 78 - 8 * (h - 6);
    rain = 3.5 * Math.exp(-((h - 9) ** 2) / 4);
  } else if (h >= 24 && h <= 30) {
    prob = 45 - 5 * (h - 24);
    rain = 2 * Math.exp(-((h - 27) ** 2) / 4);
  } else {
    prob = 10 + 8 * Math.sin(h);
  }
  return {
    time: iso(t),
    temperatureC: Math.round((27.5 + 4.5 * diurnal + 0.01 * h) * 10) / 10,
    humidityPct: Math.min(98, Math.max(30, Math.round(72 - 12 * diurnal + 2 * Math.sin(h / 7)))),
    windKph: Math.round((8 + 3 * Math.sin(h / 5)) * 10) / 10,
    solarRadMJm2: Math.round(Math.max(0, 22 * Math.sin(((t.getUTCHours() - 6) / 12) * Math.PI)) * 10) / 10,
    rainfallMm: Math.round(rain * 100) / 100,
    rainProbabilityPct: Math.max(5, prob),
  };
});

// deterministic PRNG (mulberry32) so observations are stable
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const OBSERVATIONS_7D: WeatherObservationRow[] = (() => {
  const rnd = mulberry32(42);
  const rows: WeatherObservationRow[] = [];
  for (let d = 7; d >= 1; d--) {
    for (const h of [6, 9, 12, 15, 18]) {
      const t = new Date(DEMO_NOW.getTime() - d * 86_400_000 + h * 3_600_000);
      rows.push({
        time: iso(t),
        temperatureC: Math.round((27 + 4 * Math.sin(((h - 6) / 12) * Math.PI) + (rnd() - 0.5) * 0.8) * 10) / 10,
        humidityPct: Math.round(70 + (rnd() - 0.5) * 8),
        windKph: Math.round((9 + (rnd() - 0.5) * 4) * 10) / 10,
        solarRadMJm2: Math.round(Math.max(0, 21 * Math.sin(((h - 6) / 12) * Math.PI)) * 10) / 10,
        rainfallMm: rnd() < 0.25 ? Math.round(rnd() * 3 * 100) / 100 : 0,
      });
    }
  }
  return rows;
})();

export const SATELLITE_SERIES: SatelliteObservation[] = (() => {
  const rnd = mulberry32(7);
  const rows: SatelliteObservation[] = [];
  for (let d = 30; d >= 5; d -= 5) {
    const t = new Date(DEMO_NOW.getTime() - d * 86_400_000);
    rows.push({
      time: iso(t),
      ndvi: Math.round(Math.min(0.85, Math.max(0.1, 0.42 + 0.0035 * (30 - d) + (rnd() - 0.5) * 0.024)) * 1000) / 1000,
      ndwi: Math.round(Math.min(0.2, Math.max(-0.3, -0.08 + 0.002 * (30 - d) + (rnd() - 0.5) * 0.02)) * 1000) / 1000,
      source: "Satellite-derived demo layer",
    });
  }
  return rows;
})();

// ---------------------------------------------------------------- irrigation history

export const IRRIGATION_HISTORY: IrrigationEvent[] = (() => {
  const rnd = mulberry32(99);
  const decisions: Array<[IrrigationEvent["decision"], string]> = [
    ["Irrigated", "High stress risk"],
    ["Waited", "Rain probability above threshold"],
    ["Irrigated", "Root-zone below refill point"],
    ["Partial", "Pre-rain deficit irrigation"],
    ["Irrigated", "Forecast dry window 48h"],
    ["Waited", "Moisture above MAD threshold"],
    ["Irrigated", "Flowering stage demand peak"],
    ["Waited", "Effective rainfall received"],
  ];
  const rows: IrrigationEvent[] = [];
  for (let i = 0; i < 28; i++) {
    const t = new Date(DEMO_NOW.getTime() - (Math.floor(i / 2) + 1) * 86_400_000 - (i % 2) * 7 * 3_600_000);
    const [decision, reason] = decisions[i % decisions.length];
    const zone = ["Zone A", "Zone B", "Zone C", "Zone D"][i % 4];
    const pred = [420, 720, 560, 640][i % 4] + Math.round((rnd() - 0.5) * 80);
    let applied = 0;
    let resp = 1.5;
    if (decision === "Waited") {
      resp = Math.round((1.5 + (rnd() - 0.5) * 2) * 10) / 10;
    } else if (decision === "Partial") {
      applied = Math.round(pred * 0.6);
      resp = Math.round((8 + (rnd() - 0.5) * 4) * 10) / 10;
    } else {
      applied = Math.round(pred * (0.9 + rnd() * 0.2));
      resp = Math.round((13 + (rnd() - 0.5) * 5) * 10) / 10;
    }
    rows.push({
      date: iso(t), zone, appliedWaterL: applied,
      predictedRequirementL: pred, moistureResponsePct: resp,
      decision, reason,
    });
  }
  return rows;
})();

// ---------------------------------------------------------------- twin state

export const FIELD_STATE = {
  fieldId: "field-a",
  rootZoneMoisturePct: 24.6,
  fieldCapacityPct: 34.0,
  wiltingPointPct: 14.0,
  evapotranspirationMmDay: 4.8,
  effectiveRainfallMm48h: 11.2,
  cropCoefficient: 1.12,
  soilWaterHoldingMm: 68.0,
  availableWaterMm: 19.4,
  moisture6hDeltaPct: -2.4,
  updatedAt: nowIso(),
};
