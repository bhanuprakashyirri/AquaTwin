/**
 * Central demo constants — single source of truth for the frontend demo engine.
 * Mirrors backend/app/services/demo_data.py.
 */

export const FC = 34.0; // field capacity %vol
export const WP = 14.0; // wilting point %vol
export const ZONE_DEPTH_MM = 300.0;
export const MAD = 0.45;
export const ET0_FACTOR = 0.0345; // solar radiation (MJ/m2/h) -> ET0 (mm/h)
export const PERCOLATION_MM_H = 0.35; // paddy seepage + percolation
export const LITRES_TO_PCT = 0.0195; // demo calibration: 720 L ≈ +14 pct points
export const REFILL_TARGET_PCT = 23.5; // carryover target for recommendation
export const STRESS_MIDPOINT_PCT = 16.95; // logistic midpoint for stress proxy
export const STRESS_SCALE_PCT = 1.87; // logistic width for stress proxy
export const STRESS_THRESHOLD_PCT = 15; // configured stress threshold

export const MAP_CENTER: [number, number] = [81.5212, 16.5449]; // [lng, lat] Bhimavaram demo area

export const LAYERS = [
  { key: "moisture", label: "Soil Moisture" },
  { key: "stress", label: "Crop Stress" },
  { key: "ndvi", label: "Vegetation Health (NDVI-style)" },
  { key: "priority", label: "Irrigation Priority" },
] as const;

export const WATER_BUDGET_PRESETS = [500, 1000, 1500, 2000, 3000];
