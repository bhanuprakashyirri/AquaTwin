export type LayerKind = "moisture" | "stress" | "ndvi" | "priority";

export interface GeoPoint {
  type: "Point";
  coordinates: [number, number]; // [lon, lat]
}

export interface GeoPolygon {
  type: "Polygon";
  coordinates: [number, number][][]; // rings of [lon, lat]
}

export interface Crop {
  name: string;
  variety: string;
  growthStage: string;
  daysAfterSowing: number;
  cropCoefficient: number;
}

export interface Sensor {
  id: string;
  zoneId: string;
  kind: "soil_moisture" | "temperature" | "rain_gauge";
  position: GeoPoint;
  depthCm?: number | null;
  lastValue: number;
  lastReadingAt: string;
  status: "live" | "demo" | "offline";
}

export interface Zone {
  id: string;
  name: string;
  areaHa: number;
  soilType: string;
  geometry: GeoPolygon;
  moisturePct: number;
  stressRiskPct: number;
  waterRequirementL: number;
  rainExposure: "Low" | "Medium" | "High";
  lastIrrigatedHoursAgo: number;
  ndvi: number;
  priority: number;
}

export interface ZoneState {
  zoneId: string;
  moisturePct: number;
  stressRiskPct: number;
  waterRequirementL: number;
  confidencePct: number;
}

export interface Field {
  id: string;
  name: string;
  areaHa: number;
  crop: Crop;
  geometry: GeoPolygon;
  sowingDate: string;
  soilTexture: string;
}

export interface Farm {
  id: string;
  userId?: string;
  name: string;
  country?: string;
  stateRegion?: string;
  districtCity?: string;
  location: string;
  totalArea?: number;
  preferredUnit?: "ha" | "acres";
  crop?: string;
  cropVariety?: string;
  growthStage?: string;
  plantingDate?: string;
  fields: Field[];
}

export interface WeatherForecastRow {
  time: string;
  temperatureC: number;
  humidityPct: number;
  windKph: number;
  solarRadMJm2: number;
  rainfallMm: number;
  rainProbabilityPct: number;
}

export interface WeatherObservationRow {
  time: string;
  temperatureC: number;
  humidityPct: number;
  windKph: number;
  solarRadMJm2: number;
  rainfallMm: number;
}

export interface SatelliteObservation {
  time: string;
  ndvi: number;
  ndwi: number;
  source: string;
}

export interface IrrigationEvent {
  id?: string;
  date: string;
  zone: string;
  appliedWaterL: number;
  predictedRequirementL: number;
  moistureResponsePct: number;
  decision: "Irrigated" | "Waited" | "Partial";
  reason: string;
}

export interface FieldTwinState {
  fieldId: string;
  rootZoneMoisturePct: number;
  fieldCapacityPct: number;
  wiltingPointPct: number;
  evapotranspirationMmDay: number;
  effectiveRainfallMm48h: number;
  cropCoefficient: number;
  soilWaterHoldingMm: number;
  availableWaterMm: number;
  moisture6hDeltaPct: number;
  updatedAt: string;
}

export interface TimelinePoint {
  hour: number;
  time: string;
  moisturePct: number;
}

export interface ScenarioFactor {
  label: string;
  value: string;
  weight: number;
}

export interface Scenario {
  key: string;
  label: string;
  description: string;
  waterUsedL: number;
  predictedMoisturePct: number;
  minMoisturePct: number;
  stressRiskPct: number;
  wasteRisk: "NONE" | "LOW" | "MEDIUM" | "HIGH";
  timeline: TimelinePoint[];
  factors: ScenarioFactor[];
  recommended: boolean;
}

export interface SimulationResult {
  generatedAt: string;
  baseline: { moisturePct: number; fieldCapacityPct: number; wiltingPointPct: number; availableWaterL: number };
  scenarios: Scenario[];
  recommendedKey: string;
}

export interface RainUncertaintyScenario {
  key: string;
  label: string;
  rainFraction: number;
  endMoisturePct: number;
  minMoisturePct: number;
  stressRiskPct: number;
  timeline: TimelinePoint[];
  verdict: string;
}

export interface ZoneAllocation {
  zoneId: string;
  zoneName: string;
  needL: number;
  allocatedL: number;
  priority: number;
  stressBeforePct: number;
  stressAfterPct: number;
  moistureAfterPct: number;
}

export interface OptimizationResult {
  availableWaterL: number;
  totalNeedL: number;
  totalAllocatedL: number;
  allocations: ZoneAllocation[];
  constraintStatus: string;
  waterSavedL: number;
  explanation: string;
  solver: string;
}

export interface RecommendationFactor {
  label: string;
  value: string;
  weight: number;
}

export interface Recommendation {
  action: string;
  headline: string;
  reason: string;
  waterSavedL: number;
  availableWaterL?: number;
  waterUsedL?: number;
  stressRiskPct: number;
  confidencePct: number;
  nextEvaluationAt: string;
  factors: RecommendationFactor[];
  recommendedKey: string;
  status?: string;
}

export interface WaterFingerprint {
  moistureRetention: number;
  dryingRatePctPerDay: number;
  irrigationResponsePct: number;
  rainResponsePct: number;
  recoveryHours: number;
  notes: string[];
}

export interface SystemStatus {
  sensorStream: "LIVE" | "DEMO" | "OFFLINE";
  weather: "UPDATED" | "UNAVAILABLE" | string;
  satelliteLastSync: string | null;
  digitalTwin: "ACTIVE" | "IDLE" | string;
  demoMode: boolean;
}

export interface SensorFrame {
  type: string;
  step: number;
  timestamp: string;
  source: string;
  sensors: Sensor[];
}

// ---------------------------------------------------------------------------
// Missed-Rain Protection & Electricity-Slot Safety engine
// ---------------------------------------------------------------------------

export interface MissedRainFieldState {
  theta: number;
  root_depth_mm: number;
  soil_texture: string;
  crop_key: string;
  growth_stage: string;
  irrigation_efficiency: number;
  water_budget_mm: number;
  is_rice?: boolean;
  pond_mm?: number;
  data_generated_at?: string;
}

export interface PowerSlot {
  start: string;
  hours: number;
  reliable: boolean;
}

export interface DailyForecastInput {
  rain_mm: number;
  et0_mm: number;
  kc: number;
  rain_probability: number;
  hours_since_issue?: number;
}

export interface MissedRainRequest {
  field_state: MissedRainFieldState;
  power_slots: PowerSlot[];
  daily_forecast: DailyForecastInput[];
  policy_overrides?: Record<string, unknown>;
  now?: string;
}

export interface MissedRainScenarioResult {
  plan: string;
  scenario_results: Array<{
    scenario: string;
    stress_risk: number;
    [key: string]: unknown;
  }>;
  expected_upside?: number;
  score?: number;
}

export interface MissedRainResult {
  current_power_slot: { start: string; hours: number } | null;
  next_feasible_power_slot: { start: string; hours: number } | null;
  forecast_rain_probability: number | null;
  forecast_uncertainty_status: string;
  no_rain_scenario_stress_risk: number;
  recommended_irrigation_action: string;
  recommended_irrigation_amount_mm: number;
  risk_of_waiting_until_next_slot: number;
  reason_for_recommendation: string;
  farmer_warning: string | null;
  data_quality_status: string;
  confidence_status: string;
  scenario_analysis: MissedRainScenarioResult[];
  guard: { trigger: boolean; reason?: string; verdict?: string };
  policy_used: Record<string, unknown>;
  infeasible: boolean;
  infeasibility_reason?: string;
  status?: string;
  message?: string;
}

export interface SafetyPolicy {
  policy: Record<string, unknown>;
  crops: Record<string, { mad: number; stage_sensitivity: number[] }>;
  dataset: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Analytics summary (168h twin prediction + history + weather)
// ---------------------------------------------------------------------------

export interface AnalyticsSummary {
  moistureTimeline: TimelinePoint[];
  history: IrrigationEvent[];
  forecast: WeatherForecastRow[];
  observations: WeatherObservationRow[];
}

// ---------------------------------------------------------------------------
// Backend health
// ---------------------------------------------------------------------------

export interface BackendHealth {
  status: string;
  service: string;
  environment: string;
  apiPrefix: string;
}
